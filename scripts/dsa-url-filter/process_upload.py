#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from processing_core import build_summary, parse_rows
from session_store import cleanup_expired_sessions, create_session_meta, rows_path, summary_path, write_json
def main() -> None:
    parser = argparse.ArgumentParser(description="Process uploaded DSA URL CSV into a temporary session.")
    parser.add_argument("--input", required=True, help="Path to the uploaded CSV")
    parser.add_argument("--platform", default="klook", help="Platform key")
    parser.add_argument("--session-id", required=True, help="Temporary session id")
    args = parser.parse_args()

    cleanup_expired_sessions()

    input_path = Path(args.input).expanduser().resolve()
    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    rows, country_options = parse_rows(input_path)
    summary = build_summary(rows)
    meta = create_session_meta(args.session_id, input_path.name, args.platform, len(rows), country_options)

    write_json(rows_path(args.session_id), rows)
    write_json(summary_path(args.session_id), summary)

    print(json.dumps({
        "session_id": args.session_id,
        "meta": meta,
        "summary": summary,
        "country_options": country_options,
        "rows": rows[:50],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
