#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path
from typing import Dict, List

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.trip.trip_classifier import TripClassifier


REVIEW_FIELDS = [
    "url",
    "title",
    "language",
    "pattern",
    "country",
    "city",
    "geo_entity",
    "geo_category",
    "topic_type",
    "intent_primary",
    "content_type",
    "sub_tag",
    "readiness_hint",
    "remaining_commission_potential",
    "post_booking_risk",
    "trip_mode_risk",
    "market_fit",
    "is_active",
    "traffic",
    "keyword_count",
    "traffic_change",
    "semrush_signal_hint",
    "exclusion_reason",
]


def row_for_review(result: Dict[str, object]) -> Dict[str, object]:
    metadata = result.get("metadata", {}) if isinstance(result.get("metadata"), dict) else {}
    return {
        "url": result.get("url", ""),
        "title": result.get("title", ""),
        "language": result.get("language", ""),
        "pattern": result.get("pattern", ""),
        "country": result.get("country", ""),
        "city": result.get("city", ""),
        "geo_entity": result.get("geo_entity", ""),
        "geo_category": result.get("geo_category", ""),
        "topic_type": result.get("topic_type", ""),
        "intent_primary": result.get("intent_primary", ""),
        "content_type": result.get("content_type", ""),
        "sub_tag": result.get("sub_tag", ""),
        "readiness_hint": result.get("readiness_hint", ""),
        "remaining_commission_potential": result.get("remaining_commission_potential", ""),
        "post_booking_risk": result.get("post_booking_risk", ""),
        "trip_mode_risk": result.get("trip_mode_risk", ""),
        "market_fit": result.get("market_fit", ""),
        "is_active": result.get("is_active", ""),
        "traffic": result.get("traffic", ""),
        "keyword_count": result.get("keyword_count", ""),
        "traffic_change": result.get("traffic_change", ""),
        "semrush_signal_hint": metadata.get("semrush_signal_hint", ""),
        "exclusion_reason": metadata.get("exclusion_reason", ""),
    }


def write_csv(path: Path, rows: List[Dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=REVIEW_FIELDS)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row.get(key, "") for key in REVIEW_FIELDS})


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Trip classifier review and export review buckets.")
    parser.add_argument("--input", required=True, help="Input Trip CSV path")
    parser.add_argument("--limit", type=int, default=100, help="Max rows to review")
    parser.add_argument("--output-dir", default="tmp/trip-review", help="Output directory")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_dir = Path(args.output_dir)
    classifier = TripClassifier()

    results: List[Dict[str, object]] = []
    with input_path.open("r", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        for idx, row in enumerate(reader):
            if idx >= args.limit:
                break
            results.append(classifier.classify_row(row))

    review_rows = [row_for_review(result) for result in results]
    active_unknown_geo = [row for row in review_rows if row["is_active"] and row["geo_entity"] == "unknown"]
    active_weather = [row for row in review_rows if row["is_active"] and row["topic_type"] == "weather"]
    active_local_risk = [row for row in review_rows if row["is_active"] and row["trip_mode_risk"] == "high"]
    excluded_rows = [row for row in review_rows if not row["is_active"]]
    active_high_transactional = []
    for result, review_row in zip(results, review_rows):
        metadata = result.get("metadata", {}) if isinstance(result.get("metadata"), dict) else {}
        ratios = metadata.get("semrush_ratios", {}) if isinstance(metadata.get("semrush_ratios"), dict) else {}
        if review_row["is_active"] and float(ratios.get("transactional_ratio", 0) or 0) >= 0.4:
            active_high_transactional.append(review_row)

    summary = {
        "input": str(input_path),
        "rows_reviewed": len(results),
        "active_rows": sum(1 for row in review_rows if row["is_active"]),
        "active_unknown_geo": len(active_unknown_geo),
        "active_weather": len(active_weather),
        "active_local_risk": len(active_local_risk),
        "active_high_transactional": len(active_high_transactional),
        "excluded_rows": len(excluded_rows),
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    (output_dir / "classified_sample.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(output_dir / "review_all.csv", review_rows)
    write_csv(output_dir / "active_unknown_geo.csv", active_unknown_geo)
    write_csv(output_dir / "active_weather.csv", active_weather)
    write_csv(output_dir / "active_local_risk.csv", active_local_risk)
    write_csv(output_dir / "active_high_transactional.csv", active_high_transactional)
    write_csv(output_dir / "excluded_rows.csv", excluded_rows)

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
