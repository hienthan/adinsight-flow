#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Trip classifier review across multiple CSV files.")
    parser.add_argument("--input-dir", default="data/trip", help="Directory containing Trip CSV files")
    parser.add_argument("--output-dir", default="tmp/trip-review-full", help="Review output directory")
    parser.add_argument("--translate-live", action="store_true", help="Enable live zh->EN translation during review")
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    csv_files = sorted(input_dir.glob("*.csv"))
    if not csv_files:
        print("No CSV files found.", file=sys.stderr)
        return 1

    summaries = []
    for csv_file in csv_files:
        review_dir = output_dir / csv_file.stem
        cmd = [
            sys.executable,
            str(REPO_ROOT / "scripts" / "trip" / "review_trip_classifier.py"),
            "--input",
            str(csv_file),
            "--limit",
            str(max(sum(1 for _ in csv_file.open("r", encoding="utf-8")) - 1, 0)),
            "--output-dir",
            str(review_dir),
        ]
        if args.translate_live:
            cmd.append("--translate-live")
        proc = subprocess.run(cmd, capture_output=True, text=True, cwd=REPO_ROOT)
        if proc.returncode != 0:
            print(proc.stdout)
            print(proc.stderr, file=sys.stderr)
            return proc.returncode
        summary = json.loads(proc.stdout)
        summaries.append(summary)
        print(json.dumps(summary, ensure_ascii=False))

    aggregate = {
        "files": len(summaries),
        "rows_reviewed": sum(item["rows_reviewed"] for item in summaries),
        "active_rows": sum(item["active_rows"] for item in summaries),
        "active_unknown_geo": sum(item["active_unknown_geo"] for item in summaries),
        "active_weather": sum(item["active_weather"] for item in summaries),
        "active_local_risk": sum(item["active_local_risk"] for item in summaries),
        "active_high_transactional": sum(item["active_high_transactional"] for item in summaries),
        "excluded_rows": sum(item["excluded_rows"] for item in summaries),
        "transport_rows": sum(item.get("transport_rows", 0) for item in summaries),
        "active_transport_high_fit": sum(item.get("active_transport_high_fit", 0) for item in summaries),
        "active_transport_domestic_tw": sum(item.get("active_transport_domestic_tw", 0) for item in summaries),
        "active_transport_utility": sum(item.get("active_transport_utility", 0) for item in summaries),
        "active_transport_unknown_geo": sum(item.get("active_transport_unknown_geo", 0) for item in summaries),
    }
    (output_dir / "aggregate_summary.json").write_text(json.dumps(aggregate, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"aggregate": aggregate}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
