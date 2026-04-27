#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.viator.common import create_session, load_pb_info


COLLECTION_NAME = "trip_pages"


def text_field(name: str, *, required: bool = False) -> Dict[str, Any]:
    return {
        "name": name,
        "type": "text",
        "required": required,
        "hidden": False,
        "presentable": False,
        "system": False,
        "autogeneratePattern": "",
        "pattern": "",
        "min": 0,
        "max": 0,
    }


def url_field(name: str, *, required: bool = False) -> Dict[str, Any]:
    return {
        "name": name,
        "type": "url",
        "required": required,
        "hidden": False,
        "presentable": False,
        "system": False,
        "onlyDomains": None,
        "exceptDomains": None,
    }


def number_field(name: str, *, required: bool = False, only_int: bool = False) -> Dict[str, Any]:
    return {
        "name": name,
        "type": "number",
        "required": required,
        "hidden": False,
        "presentable": False,
        "system": False,
        "onlyInt": only_int,
        "min": None,
        "max": None,
    }


def bool_field(name: str, *, required: bool = False) -> Dict[str, Any]:
    return {
        "name": name,
        "type": "bool",
        "required": required,
        "hidden": False,
        "presentable": False,
        "system": False,
    }


def json_field(name: str, *, required: bool = False) -> Dict[str, Any]:
    return {
        "name": name,
        "type": "json",
        "required": required,
        "hidden": False,
        "presentable": False,
        "system": False,
        "maxSize": 0,
    }


def build_fields() -> List[Dict[str, Any]]:
    return [
        url_field("url", required=True),
        text_field("title", required=True),
        text_field("language", required=True),
        text_field("pattern", required=True),
        number_field("traffic"),
        number_field("traffic_pct"),
        number_field("keyword_count", only_int=True),
        number_field("traffic_change"),
        json_field("semrush_metrics"),
        text_field("country"),
        text_field("city"),
        text_field("geo_entity"),
        text_field("geo_category"),
        text_field("topic_type"),
        text_field("intent_primary"),
        text_field("content_type"),
        text_field("sub_tag"),
        text_field("readiness_hint"),
        text_field("remaining_commission_potential"),
        text_field("post_booking_risk"),
        text_field("trip_mode_risk"),
        text_field("market_fit"),
        bool_field("is_active"),
        json_field("metadata"),
        text_field("notes"),
    ]


def build_indexes() -> List[str]:
    return [
        "CREATE UNIQUE INDEX `idx_trip_pages_url` ON `trip_pages` (`url`)",
        "CREATE INDEX `idx_trip_pages_language_pattern` ON `trip_pages` (`language`, `pattern`)",
        "CREATE INDEX `idx_trip_pages_geo` ON `trip_pages` (`country`, `city`, `geo_category`)",
        "CREATE INDEX `idx_trip_pages_taxonomy` ON `trip_pages` (`intent_primary`, `content_type`, `sub_tag`)",
        "CREATE INDEX `idx_trip_pages_review` ON `trip_pages` (`topic_type`, `readiness_hint`, `is_active`)",
    ]


def build_payload() -> Dict[str, Any]:
    return {
        "name": COLLECTION_NAME,
        "type": "base",
        "system": False,
        "listRule": None,
        "viewRule": None,
        "createRule": None,
        "updateRule": None,
        "deleteRule": None,
        "fields": build_fields(),
        "indexes": build_indexes(),
    }


def get_collection(session, pb_url: str) -> Dict[str, Any] | None:
    resp = session.get(f"{pb_url}/api/collections/{COLLECTION_NAME}", timeout=20)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp.json()


def create_collection(session, pb_url: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    resp = session.post(
        f"{pb_url}/api/collections",
        data=json.dumps(payload),
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def print_summary(collection: Dict[str, Any]) -> None:
    print(f"Collection: {collection['name']}")
    print("Fields:")
    for field in collection.get("fields", []):
        if field.get("system"):
            continue
        print(f"- {field['name']}: {field['type']}")
    print("Indexes:")
    for index in collection.get("indexes", []):
        print(f"- {index}")


def main() -> int:
    info = load_pb_info()
    pb_url = info.get("pb_url", "http://127.0.0.1:8090")
    session = create_session(pb_url, info["email"], info["password"])

    existing = get_collection(session, pb_url)
    if existing:
        print(f"Collection '{COLLECTION_NAME}' already exists. No changes applied.")
        print_summary(existing)
        return 0

    created = create_collection(session, pb_url, build_payload())
    print(f"Created collection '{COLLECTION_NAME}'.")
    print_summary(created)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
