#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
from pathlib import Path

from processing_core import build_custom_label, row_matches_filters
from session_store import load_session, session_dir


def main() -> None:
    parser = argparse.ArgumentParser(description="Export a DSA URL filter session to CSV.")
    parser.add_argument("--session-id", required=True)
    parser.add_argument("--output", default="")
    parser.add_argument("--include-countries", default="")
    parser.add_argument("--exclude-countries", default="")
    parser.add_argument("--include-status", default="all", choices=["all", "included", "excluded"])
    parser.add_argument("--classification", default="all", choices=["all", "matched", "unknown"])
    parser.add_argument("--confidence", default="all", choices=["all", "high", "medium", "low"])
    parser.add_argument("--search-term", default="")
    parser.add_argument("--exclude-term", default="")
    parser.add_argument("--fields", default="page_country|classification|headline")
    parser.add_argument("--custom-label", default="")
    args = parser.parse_args()

    session = load_session(args.session_id)
    filter_payload = {
        "search_term": args.search_term,
        "exclude_term": args.exclude_term,
        "include_countries": args.include_countries,
        "exclude_countries": args.exclude_countries,
        "include_status": args.include_status,
        "classification": args.classification,
        "confidence": args.confidence,
    }
    rows = [row for row in session["rows"] if row_matches_filters(row, filter_payload) and row.get("include", True)]
    selected_fields = [field for field in args.fields.split("|") if field]

    output_path = Path(args.output) if args.output else session_dir(args.session_id) / "export.csv"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["Page URL", "Custom Label"])
        for row in rows:
            writer.writerow([
                row.get("url_normalized", ""),
                build_custom_label(row, selected_fields, args.custom_label),
            ])

    print(output_path)


if __name__ == "__main__":
    main()
