#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.trip.trip_classifier import TripClassifier, normalize_text


def load_bucket_urls(path: Path) -> Tuple[Set[str], Dict[str, str]]:
    urls: Set[str] = set()
    reasons: Dict[str, str] = {}
    with path.open("r", encoding="utf-8", newline="") as fh:
        for row in csv.DictReader(fh):
            url = (row.get("url") or "").strip()
            if not url:
                continue
            urls.add(url)
            reasons[url] = (row.get("reason") or "").strip()
    return urls, reasons


def infer_non_core_topic(row: Dict[str, object], translated_text: str) -> Dict[str, str]:
    topic_type = str(row.get("topic_type") or "")
    normalized = normalize_text(translated_text)
    if topic_type == "airport_transport" or "airport" in normalized:
        return {
            "topic_type": "airport_transport",
            "sub_tag": "transport",
            "intent_primary": "transport",
            "content_type": "transport_info",
        }
    return {
        "topic_type": "city_transport",
        "sub_tag": "transport",
        "intent_primary": "transport",
        "content_type": "transport_info",
    }


def enrich_row(
    classifier: TripClassifier,
    row: Dict[str, object],
    bucket: str,
    reason: str,
) -> Dict[str, object]:
    metadata = dict(row.get("metadata") or {})
    source_text = str(metadata.get("source_text") or row.get("title") or "")
    translated_text = str(metadata.get("translated_source_text") or row.get("title") or source_text)
    language = str(row.get("language") or "")
    geo = {
        "country": str(row.get("country") or "Unknown"),
        "city": str(row.get("city") or "Unknown"),
        "geo_entity": str(row.get("geo_entity") or "unknown"),
        "geo_category": str(row.get("geo_category") or "non_geo"),
        "title_en": "",
    }
    topic = infer_non_core_topic(row, translated_text)
    raw = source_text
    normalized = normalize_text(source_text)
    translated_normalized = normalize_text(translated_text)
    url = str(row.get("url") or "")
    scope = classifier.detect_transport_scope(raw, normalized, translated_normalized, url, topic)

    pattern = str(row.get("pattern") or "")
    if not scope:
        if pattern.startswith("transport/") and "to" in translated_normalized:
            scope = "intercity_route"
        elif "station" in translated_normalized:
            scope = "station_guide"
        elif "airport" in translated_normalized:
            scope = "airport_general"
        else:
            scope = "city_transit"

    trip_stage = classifier.detect_transport_trip_stage(scope)
    geo_scope = classifier.detect_transport_geo_scope(language, geo, scope, topic)
    ratios = metadata.get("semrush_ratios", {}) if isinstance(metadata.get("semrush_ratios"), dict) else {}
    semrush_ratios = {
        "informational_ratio": float(ratios.get("informational_ratio", 0) or 0),
        "commercial_ratio": float(ratios.get("commercial_ratio", 0) or 0),
        "navigational_ratio": float(ratios.get("navigational_ratio", 0) or 0),
        "transactional_ratio": float(ratios.get("transactional_ratio", 0) or 0),
    }
    fit = classifier.score_transport_affiliate_fit(scope, geo_scope, semrush_ratios)
    if bucket == "keep_strong":
        if fit in {"", "low"}:
            fit = "medium" if geo_scope == "domestic_tw" else "high"
    elif bucket == "keep_review" and fit == "":
        fit = "medium" if scope in {"intercity_route", "airport_general", "station_guide", "airport_to_city"} else "low"

    interpretation = classifier.interpret(topic, geo, language)
    risk_flags = classifier.collect_transport_risk_flags(
        scope=scope,
        trip_stage=trip_stage,
        geo_scope=geo_scope,
        geo=geo,
        semrush_ratios=semrush_ratios,
        combined_text=f"{normalized} {translated_normalized}",
    )
    if "non_core_transport" not in risk_flags:
        risk_flags.append("non_core_transport")
    if bucket not in risk_flags:
        risk_flags.append(bucket)

    metadata["non_core_transport_bucket"] = bucket
    metadata["non_core_transport_reason"] = reason

    row.update(
        {
            "topic_type": topic["topic_type"],
            "intent_primary": topic["intent_primary"],
            "content_type": topic["content_type"],
            "sub_tag": topic["sub_tag"],
            "readiness_hint": interpretation["readiness_hint"],
            "remaining_commission_potential": interpretation["remaining_commission_potential"],
            "post_booking_risk": interpretation["post_booking_risk"],
            "trip_mode_risk": interpretation["trip_mode_risk"],
            "market_fit": interpretation["market_fit"],
            "transport_scope": scope,
            "transport_trip_stage": trip_stage,
            "transport_affiliate_fit": fit,
            "transport_geo_scope": geo_scope,
            "transport_risk_flags": risk_flags,
            "metadata": metadata,
        }
    )
    return row


def main() -> int:
    parser = argparse.ArgumentParser(description="Enrich shortlisted non-core transport URLs with transport fields.")
    parser.add_argument("--input", required=True, help="Classified JSON input")
    parser.add_argument("--keep-strong", required=True, help="CSV shortlist of keep_strong URLs")
    parser.add_argument("--keep-review", required=True, help="CSV shortlist of keep_review URLs")
    parser.add_argument("--output", required=True, help="Output classified JSON path")
    args = parser.parse_args()

    rows: List[Dict[str, object]] = json.loads(Path(args.input).read_text(encoding="utf-8"))
    keep_strong_urls, strong_reasons = load_bucket_urls(Path(args.keep_strong))
    keep_review_urls, review_reasons = load_bucket_urls(Path(args.keep_review))
    classifier = TripClassifier()

    updated = 0
    for row in rows:
        url = str(row.get("url") or "")
        if url in keep_strong_urls:
            enrich_row(classifier, row, "keep_strong", strong_reasons.get(url, ""))
            updated += 1
        elif url in keep_review_urls:
            enrich_row(classifier, row, "keep_review", review_reasons.get(url, ""))
            updated += 1

    Path(args.output).write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"updated_rows": updated, "output": args.output}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
