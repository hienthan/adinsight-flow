#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from pathlib import Path
from typing import Dict, List

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.trip.trip_classifier import TripClassifier


def count_csv_rows(input_path: Path) -> int:
    with input_path.open("r", encoding="utf-8", newline="") as fh:
        return max(sum(1 for _ in fh) - 1, 0)


def classify_file(input_path: Path, progress_every: int = 250) -> List[Dict[str, object]]:
    classifier = TripClassifier()
    results: List[Dict[str, object]] = []
    total_rows = count_csv_rows(input_path)
    with input_path.open("r", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        for idx, row in enumerate(reader, start=1):
            results.append(classifier.classify_row(row))
            if progress_every > 0 and (idx % progress_every == 0 or idx == total_rows):
                print(json.dumps({
                    "type": "progress",
                    "input": str(input_path),
                    "processed_rows": idx,
                    "total_rows": total_rows,
                    "translation_stats": classifier.translation_stats(),
                }, ensure_ascii=False), flush=True)
    classifier.flush()
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description="Classify Trip CSV files into trip_pages-style JSON.")
    parser.add_argument("--input", required=True, nargs="+", help="Input CSV file(s)")
    parser.add_argument("--output-dir", required=True, help="Output directory for classified JSON")
    parser.add_argument("--translate-live", action="store_true", help="Enable live zh->EN translation during classification")
    args = parser.parse_args()

    if args.translate_live:
        os.environ["TRIP_TRANSLATE_LIVE"] = "1"

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    for raw_path in args.input:
        input_path = Path(raw_path)
        results = classify_file(input_path)
        output_path = output_dir / f"{input_path.stem}.classified.json"
        output_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps({
            "type": "file_complete",
            "input": str(input_path),
            "output": str(output_path),
            "rows": len(results),
            "active_rows": sum(1 for row in results if row.get("is_active")),
        }, ensure_ascii=False))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
