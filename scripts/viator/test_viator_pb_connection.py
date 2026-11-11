#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

import requests

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.viator.common import create_session, load_pb_info


COLLECTION_NAME = "viator_pages"
REQUIRED_FIELDS = {
    "url",
    "title",
    "country",
    "city",
    "page_type",
    "intent_primary",
    "content_type",
    "is_private",
    "dsa_campaign",
    "dsa_adgroup",
    "notes",
    "classification_confidence",
    "rule_hits",
}


def main() -> int:
    info = load_pb_info()
    pb_url = info.get("pb_url", "http://127.0.0.1:8090")

    try:
        health = requests.get(f"{pb_url}/api/health", timeout=10)
        health.raise_for_status()
        print(f"OK health {pb_url}")
    except Exception as exc:
        print(f"FAIL health: {exc}")
        return 1

    try:
        session = create_session(pb_url, info["email"], info["password"])
        print("OK auth")
    except Exception as exc:
        print(f"FAIL auth: {exc}")
        return 1

    try:
        resp = session.get(f"{pb_url}/api/collections/{COLLECTION_NAME}", timeout=15)
        resp.raise_for_status()
        collection = resp.json()
    except Exception as exc:
        print(f"FAIL collection: {exc}")
        return 1

    field_names = {field.get("name") for field in collection.get("fields", [])}
    missing = sorted(REQUIRED_FIELDS - field_names)
    if missing:
        print(f"FAIL missing fields: {missing}")
        return 1

    list_resp = session.get(
        f"{pb_url}/api/collections/{COLLECTION_NAME}/records",
        params={"perPage": 1},
        timeout=15,
    )
    list_resp.raise_for_status()
    total_items = list_resp.json().get("totalItems", 0)

    print(f"OK collection {COLLECTION_NAME}")
    print(f"OK fields {sorted(REQUIRED_FIELDS)}")
    print(f"OK records total={total_items}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
