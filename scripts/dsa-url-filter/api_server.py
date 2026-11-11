#!/usr/bin/env python3
from __future__ import annotations

import argparse
import cgi
import csv
import io
import json
import traceback
import sys
import tempfile
import uuid
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from processing_core import build_custom_label, build_summary, parse_rows, row_matches_filters
from session_store import (
    cleanup_expired_sessions,
    create_session_meta,
    load_session,
    rows_path,
    summary_path,
    write_json,
)


MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_ROWS = 20_000


def json_bytes(payload: dict) -> bytes:
    return json.dumps(payload, ensure_ascii=False).encode("utf-8")


def bad_request(message: str, status: HTTPStatus = HTTPStatus.BAD_REQUEST) -> tuple[int, bytes]:
    return status, json_bytes({"error": message})


class DsaFilterApiHandler(BaseHTTPRequestHandler):
    server_version = "DsaFilterApi/0.1"

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def do_GET(self) -> None:
        try:
            cleanup_expired_sessions()
            parsed = urlparse(self.path)
            path = parsed.path.rstrip("/")
            query = parse_qs(parsed.query)

            if path == "/api/dsa-filter/url/health":
                self._send_json(HTTPStatus.OK, {"ok": True})
                return

            if path.startswith("/api/dsa-filter/url/sessions/") and path.endswith("/export"):
                session_id = path.split("/")[-2]
                self._handle_export(session_id, query)
                return

            if path.startswith("/api/dsa-filter/url/sessions/"):
                session_id = path.split("/")[-1]
                self._handle_get_session(session_id, query)
                return

            self._send_json(HTTPStatus.NOT_FOUND, {"error": "Not found"})
        except Exception as error:
            self._handle_uncaught_error(error)

    def do_POST(self) -> None:
        try:
            cleanup_expired_sessions()
            parsed = urlparse(self.path)
            path = parsed.path.rstrip("/")

            if path == "/api/dsa-filter/url/sessions":
                self._handle_create_session()
                return

            if path.startswith("/api/dsa-filter/url/sessions/") and path.endswith("/rows/include"):
                session_id = path.split("/")[-3]
                self._handle_include_patch(session_id)
                return

            self._send_json(HTTPStatus.NOT_FOUND, {"error": "Not found"})
        except Exception as error:
            self._handle_uncaught_error(error)

    def _handle_create_session(self) -> None:
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            content_length = 0

        if content_length > MAX_UPLOAD_BYTES:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": "File too large. Max 10MB."})
            return

        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={
                "REQUEST_METHOD": "POST",
                "CONTENT_TYPE": self.headers.get("Content-Type", ""),
            },
        )

        upload_field = form["file"] if "file" in form else None
        if upload_field is None or not getattr(upload_field, "file", None):
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Missing upload file."})
            return

        platform = form.getfirst("platform", "klook")
        file_name = upload_field.filename or "upload.csv"
        suffix = Path(file_name).suffix or ".csv"

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_handle:
            temp_handle.write(upload_field.file.read())
            temp_path = Path(temp_handle.name)

        try:
            rows, country_options = parse_rows(temp_path)
        except Exception as error:
            temp_path.unlink(missing_ok=True)
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
            return
        finally:
            temp_path.unlink(missing_ok=True)

        if len(rows) > MAX_ROWS:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": f"Too many rows. Max {MAX_ROWS:,} rows."})
            return

        session_id = f"dur_{uuid.uuid4().hex[:12]}"
        summary = build_summary(rows)
        meta = create_session_meta(session_id, file_name, platform, len(rows), country_options)
        write_json(rows_path(session_id), rows)
        write_json(summary_path(session_id), summary)

        payload = {
            "session_id": session_id,
            "meta": meta,
            "summary": summary,
            "country_options": country_options,
            "rows": rows[:200],
            "total_filtered_rows": len(rows),
        }
        self._send_json(HTTPStatus.OK, payload)

    def _handle_get_session(self, session_id: str, query: dict[str, list[str]]) -> None:
        try:
            session = load_session(session_id)
        except FileNotFoundError:
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "Session not found."})
            return

        filters = {
            "search_term": query.get("search_term", [""])[0],
            "exclude_term": query.get("exclude_term", [""])[0],
            "include_countries": query.get("include_countries", [""])[0],
            "exclude_countries": query.get("exclude_countries", [""])[0],
            "include_status": query.get("include_status", ["all"])[0],
            "classification": query.get("classification", ["all"])[0],
            "confidence": query.get("confidence", ["all"])[0],
        }

        rows = [row for row in session["rows"] if row_matches_filters(row, filters)]
        filtered_summary = build_summary(rows)
        payload = {
            "session_id": session_id,
            "meta": session["meta"],
            "summary": filtered_summary,
            "country_options": session["meta"].get("country_options", []),
            "rows": rows,
            "total_filtered_rows": len(rows),
        }
        self._send_json(HTTPStatus.OK, payload)

    def _handle_include_patch(self, session_id: str) -> None:
        try:
            session = load_session(session_id)
        except FileNotFoundError:
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "Session not found."})
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(content_length).decode("utf-8"))
        except Exception:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Invalid JSON payload."})
            return

        row_ids = {int(value) for value in payload.get("row_ids", [])}
        include = bool(payload.get("include", True))

        updated_rows = []
        for row in session["rows"]:
            if row.get("row_id") in row_ids:
                row = {**row, "include": include}
            updated_rows.append(row)

        write_json(rows_path(session_id), updated_rows)
        write_json(summary_path(session_id), build_summary(updated_rows))
        self._send_json(HTTPStatus.OK, {"ok": True, "updated_count": len(row_ids)})

    def _handle_export(self, session_id: str, query: dict[str, list[str]]) -> None:
        try:
            session = load_session(session_id)
        except FileNotFoundError:
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "Session not found."})
            return

        filters = {
            "search_term": query.get("search_term", [""])[0],
            "exclude_term": query.get("exclude_term", [""])[0],
            "include_countries": query.get("include_countries", [""])[0],
            "exclude_countries": query.get("exclude_countries", [""])[0],
            "include_status": query.get("include_status", ["all"])[0],
            "classification": query.get("classification", ["all"])[0],
            "confidence": query.get("confidence", ["all"])[0],
        }

        selected_fields = [field for field in query.get("fields", [""])[0].split("|") if field]
        custom_label = query.get("custom_label", [""])[0]
        file_name = query.get("file_name", ["dsa-url-filter-export"])[0]

        export_rows = [
            row for row in session["rows"]
            if row_matches_filters(row, filters) and row.get("include", True)
        ]

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Page URL", "Custom Label"])
        for row in export_rows:
            writer.writerow([
                row.get("url_normalized", ""),
                build_custom_label(row, selected_fields, custom_label),
            ])

        csv_text = output.getvalue()
        output.close()

        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "text/csv; charset=utf-8")
        self.send_header("Content-Disposition", f'attachment; filename="{file_name}.csv"')
        self.end_headers()
        self.wfile.write(csv_text.encode("utf-8"))

    def _send_json(self, status: int, payload: dict) -> None:
        body = json_bytes(payload)
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _handle_uncaught_error(self, error: Exception) -> None:
        traceback.print_exc()
        try:
            self._send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {
                "error": str(error) or "Internal server error.",
            })
        except BrokenPipeError:
            pass


def main() -> None:
    parser = argparse.ArgumentParser(description="Run local API bridge for DSA URL Filter.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()

    cleanup_expired_sessions()
    server = ThreadingHTTPServer((args.host, args.port), DsaFilterApiHandler)
    print(f"DSA URL Filter API listening on http://{args.host}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
