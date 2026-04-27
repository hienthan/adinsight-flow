#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Dict, List

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.trip.trip_classifier import TripClassifier


TEST_CASES: List[Dict[str, object]] = [
    {
        "name": "Thailand arrival card",
        "row": {
            "URL": "https://hk.trip.com/guide/info/%E6%B3%B0%E5%9C%8B%E5%85%A5%E5%A2%83%E5%8D%A1.html",
            "Traffic": "2142",
            "Traffic (%)": "0.08",
            "Number of Keywords": "18",
            "Traffic Change": "2142",
            "Traffic with commercial intents in top 20": "144",
            "Traffic with informational intents in top 20": "2132",
            "Traffic with navigational intents in top 20": "10",
            "Traffic with transactional intents in top 20": "0",
        },
        "expect": {
            "country": "thailand",
            "topic_type": "entry_document",
            "intent_primary": "travel_requirements",
            "readiness_hint": "high",
            "is_active": True,
        },
    },
    {
        "name": "Taiwan plug guide",
        "row": {
            "URL": "https://hk.trip.com/guide/destination/%E5%8F%B0%E7%81%A3%E6%8F%92%E9%A0%AD.html",
            "Traffic": "3498",
            "Traffic (%)": "0.14",
            "Number of Keywords": "121",
            "Traffic Change": "819",
            "Traffic with commercial intents in top 20": "0",
            "Traffic with informational intents in top 20": "3497",
            "Traffic with navigational intents in top 20": "0",
            "Traffic with transactional intents in top 20": "0",
        },
        "expect": {
            "country": "taiwan",
            "topic_type": "plug_voltage",
            "intent_primary": "travel_readiness",
            "readiness_hint": "high",
            "is_active": True,
        },
    },
    {
        "name": "Travel guide destination country hub",
        "row": {
            "URL": "https://hk.trip.com/travel-guide/destination/thailand-100021/",
            "Traffic": "11070",
            "Traffic (%)": "0.45",
            "Number of Keywords": "41",
            "Traffic Change": "10760",
            "Traffic with commercial intents in top 20": "0",
            "Traffic with informational intents in top 20": "11070",
            "Traffic with navigational intents in top 20": "0",
            "Traffic with transactional intents in top 20": "3",
        },
        "expect": {
            "country": "thailand",
            "topic_type": "destination_guide",
            "intent_primary": "destination_research",
            "readiness_hint": "medium",
            "is_active": True,
        },
    },
    {
        "name": "Promo page should be excluded",
        "row": {
            "URL": "https://hk.trip.com/blog/trip-com-promo-code/",
            "Traffic": "29395",
            "Traffic (%)": "1.2",
            "Number of Keywords": "343",
            "Traffic Change": "22612",
            "Traffic with commercial intents in top 20": "67",
            "Traffic with informational intents in top 20": "29270",
            "Traffic with navigational intents in top 20": "58",
            "Traffic with transactional intents in top 20": "98",
        },
        "expect": {
            "topic_type": "generic_info",
            "is_active": False,
        },
    },
    {
        "name": "Local HK guide should be excluded",
        "row": {
            "URL": "https://hk.trip.com/guide/destination/%E6%9D%B1%E6%B6%8C%E5%A5%BD%E5%8E%BB%E8%99%95.html",
            "Traffic": "7036",
            "Traffic (%)": "0.28",
            "Number of Keywords": "39",
            "Traffic Change": "-2819",
            "Traffic with commercial intents in top 20": "7",
            "Traffic with informational intents in top 20": "7029",
            "Traffic with navigational intents in top 20": "0",
            "Traffic with transactional intents in top 20": "2874",
        },
        "expect": {
            "geo_entity": "tung_chung",
            "topic_type": "local_daytrip",
            "trip_mode_risk": "high",
            "is_active": False,
        },
    },
]


def main() -> int:
    classifier = TripClassifier()
    failures = 0

    for case in TEST_CASES:
        result = classifier.classify_row(case["row"])  # type: ignore[arg-type]
        print(f"CASE: {case['name']}")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        for key, expected in case["expect"].items():  # type: ignore[union-attr]
            if result.get(key) != expected:
                failures += 1
                print(f"ASSERTION FAILED: {key}: expected={expected!r} actual={result.get(key)!r}")
        print("---")

    if failures:
        print(f"FAILED ASSERTIONS: {failures}")
        return 1

    print("All classifier checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
