#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import Dict, List


REVIEW_FIELDS = [
    "traffic",
    "title",
    "url",
    "language",
    "country",
    "city",
    "geo_entity",
    "geo_category",
    "transport_scope",
    "transport_trip_stage",
    "transport_affiliate_fit",
    "transport_geo_scope",
    "transport_risk_flags",
    "market_fit",
    "topic_type",
    "intent_primary",
    "content_type",
    "sub_tag",
]


def read_csv(path: Path) -> List[Dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as fh:
        return list(csv.DictReader(fh))


def write_csv(path: Path, rows: List[Dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=REVIEW_FIELDS)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row.get(field, "") for field in REVIEW_FIELDS})


def dedupe_by_url(rows: List[Dict[str, str]]) -> List[Dict[str, str]]:
    seen = set()
    deduped: List[Dict[str, str]] = []
    for row in rows:
        url = row.get("url", "")
        if not url or url in seen:
            continue
        seen.add(url)
        deduped.append(row)
    return deduped


def sort_by_traffic(rows: List[Dict[str, str]]) -> List[Dict[str, str]]:
    return sorted(rows, key=lambda row: float(row.get("traffic", "0") or 0), reverse=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Build compact ChatGPT review shortlists from transport review CSV buckets.")
    parser.add_argument("--review-dir", required=True, help="Directory produced by review_trip_classifier.py")
    parser.add_argument("--topn", type=int, default=30, help="Rows to keep per shortlist")
    args = parser.parse_args()

    review_dir = Path(args.review_dir)
    unknown_rows = sort_by_traffic(dedupe_by_url(read_csv(review_dir / "active_transport_unknown_geo.csv")))[: args.topn]
    high_fit_rows = sort_by_traffic(dedupe_by_url(read_csv(review_dir / "active_transport_high_fit.csv")))[: args.topn]

    write_csv(review_dir / "chatgpt_transport_unknown_top.csv", unknown_rows)
    write_csv(review_dir / "chatgpt_transport_high_fit_top.csv", high_fit_rows)

    print(f"unknown_top={len(unknown_rows)}")
    print(f"high_fit_top={len(high_fit_rows)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
