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


def classify_file(input_path: Path) -> List[Dict[str, object]]:
    classifier = TripClassifier()
    results: List[Dict[str, object]] = []
    with input_path.open("r", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            results.append(classifier.classify_row(row))
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description="Classify Trip CSV files into trip_pages-style JSON.")
    parser.add_argument("--input", required=True, nargs="+", help="Input CSV file(s)")
    parser.add_argument("--output-dir", required=True, help="Output directory for classified JSON")
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    for raw_path in args.input:
        input_path = Path(raw_path)
        results = classify_file(input_path)
        output_path = output_dir / f"{input_path.stem}.classified.json"
        output_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps({
            "input": str(input_path),
            "output": str(output_path),
            "rows": len(results),
            "active_rows": sum(1 for row in results if row.get("is_active")),
        }, ensure_ascii=False))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
