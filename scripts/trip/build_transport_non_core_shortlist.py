#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter
from pathlib import Path
from typing import Dict, List, Tuple


EXPORT_FIELDS = [
    "bucket",
    "reason",
    "traffic",
    "keyword_count",
    "title",
    "url",
    "pattern",
    "language",
    "country",
    "city",
    "geo_entity",
    "topic_type",
    "market_fit",
    "is_active",
]


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def get_path(url: str) -> str:
    try:
        return re.sub(r"^https?://[^/]+", "", url).strip("/")
    except Exception:
        return ""


def has_any(text: str, phrases: List[str]) -> bool:
    return any(phrase in text for phrase in phrases)


def classify_non_core(row: Dict[str, object]) -> Tuple[str, str]:
    pattern = str(row.get("pattern") or "")
    title = normalize(str(row.get("title") or ""))
    path = normalize(get_path(str(row.get("url") or "")))
    traffic = float(row.get("traffic") or 0)
    is_active = bool(row.get("is_active"))
    topic_type = str(row.get("topic_type") or "")

    if pattern == "guide/transport":
        return ("core_transport", "guide_transport_core")

    if not is_active:
        return ("exclude_non_core", "inactive")

    if traffic <= 0:
        return ("exclude_non_core", "zero_traffic")

    if (
        pattern.startswith("flights/")
        or pattern.startswith("hotels/")
        or pattern in {"things-to-do/experiences", "moments/theme", "travel-guide/attraction"}
    ):
        return ("exclude_non_core", "non_core_pattern_noise")

    negative_phrases = [
        "food",
        "restaurant",
        "hotel",
        "attraction",
        "museum",
        "shopping",
        "night market",
        "stay",
    ]
    if has_any(title, negative_phrases) or has_any(path, negative_phrases):
        return ("exclude_non_core", "mixed_non_transport_topic")

    route_signals = [" to ", "airport", "station", "transfer", "jr pass", "transportation guide"]
    if pattern.startswith("transport/") and pattern != "transport/city":
        if has_any(title, route_signals) or has_any(path, route_signals):
            if traffic >= 20:
                return ("keep_strong", "transport_route_or_hub")
            return ("keep_review", "transport_route_low_volume")
        return ("keep_review", "transport_pattern_review")

    if pattern == "things-to-do/transport":
        if "jr pass" in title or "jr pass" in path:
            return ("keep_strong", "jr_pass_transport")
        return ("keep_review", "transport_product_review")

    if pattern == "blog":
        if topic_type == "local_daytrip":
            return ("exclude_non_core", "local_daytrip_blog")
        if has_any(title, ["airport", "station", "transport", "rail", "train", "bus"]):
            if traffic >= 30:
                return ("keep_review", "high_volume_transport_blog")
            return ("exclude_non_core", "low_value_transport_blog")
        return ("exclude_non_core", "generic_blog")

    if pattern == "transport/city":
        if traffic >= 10:
            return ("keep_review", "airport_code_city_route")
        return ("exclude_non_core", "low_value_city_code_route")

    return ("exclude_non_core", "out_of_scope_non_core")


def write_csv(path: Path, rows: List[Dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=EXPORT_FIELDS)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row.get(field, "") for field in EXPORT_FIELDS})


def main() -> int:
    parser = argparse.ArgumentParser(description="Build non-core transport shortlist from classified Trip transport batch.")
    parser.add_argument("--input", required=True, help="Classified JSON file")
    parser.add_argument("--output-dir", required=True, help="Output directory")
    args = parser.parse_args()

    rows = json.loads(Path(args.input).read_text(encoding="utf-8"))
    output_dir = Path(args.output_dir)

    scored: List[Dict[str, object]] = []
    for row in rows:
        bucket, reason = classify_non_core(row)
        enriched = {
            "bucket": bucket,
            "reason": reason,
            "traffic": row.get("traffic"),
            "keyword_count": row.get("keyword_count"),
            "title": row.get("title"),
            "url": row.get("url"),
            "pattern": row.get("pattern"),
            "language": row.get("language"),
            "country": row.get("country"),
            "city": row.get("city"),
            "geo_entity": row.get("geo_entity"),
            "topic_type": row.get("topic_type"),
            "market_fit": row.get("market_fit"),
            "is_active": row.get("is_active"),
        }
        scored.append(enriched)

    def sort_rows(source: List[Dict[str, object]]) -> List[Dict[str, object]]:
        return sorted(source, key=lambda row: float(row.get("traffic") or 0), reverse=True)

    keep_strong = sort_rows([row for row in scored if row["bucket"] == "keep_strong"])
    keep_review = sort_rows([row for row in scored if row["bucket"] == "keep_review"])
    exclude_non_core = sort_rows([row for row in scored if row["bucket"] == "exclude_non_core"])

    write_csv(output_dir / "transport_non_core_keep_strong.csv", keep_strong)
    write_csv(output_dir / "transport_non_core_keep_review.csv", keep_review)
    write_csv(output_dir / "transport_non_core_exclude.csv", exclude_non_core)
    write_csv(output_dir / "transport_non_core_all.csv", sort_rows([row for row in scored if row["bucket"] != "core_transport"]))

    summary = {
        "keep_strong": len(keep_strong),
        "keep_review": len(keep_review),
        "exclude_non_core": len(exclude_non_core),
        "reasons": Counter(row["reason"] for row in scored if row["bucket"] != "core_transport"),
    }
    (output_dir / "summary.json").write_text(
        json.dumps(
            {
                "keep_strong": len(keep_strong),
                "keep_review": len(keep_review),
                "exclude_non_core": len(exclude_non_core),
                "reasons": dict(summary["reasons"]),
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(json.dumps({"keep_strong": len(keep_strong), "keep_review": len(keep_review), "exclude_non_core": len(exclude_non_core), "reasons": dict(summary["reasons"])}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
