#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.trip.create_trip_pages_collection import (  # noqa: E402
    COLLECTION_NAME,
    build_fields,
    build_indexes,
)
from scripts.viator.common import create_session, load_pb_info  # noqa: E402


def get_collection(session, pb_url: str) -> Dict[str, Any]:
    resp = session.get(f"{pb_url}/api/collections/{COLLECTION_NAME}", timeout=20)
    resp.raise_for_status()
    return resp.json()


def merge_fields(existing_fields: List[Dict[str, Any]], desired_fields: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    merged: List[Dict[str, Any]] = []
    by_name = {field.get("name"): field for field in existing_fields}
    desired_names = {field["name"] for field in desired_fields}

    for desired in desired_fields:
        name = desired["name"]
        if name in by_name:
            merged.append(by_name[name])
        else:
            merged.append(desired)

    for field in existing_fields:
        name = field.get("name")
        if name not in desired_names:
            merged.append(field)

    return merged


def merge_indexes(existing_indexes: List[str], desired_indexes: List[str]) -> List[str]:
    merged = list(existing_indexes)
    existing_set = set(existing_indexes)
    for index in desired_indexes:
        if index not in existing_set:
            merged.append(index)
    return merged


def update_collection(session, pb_url: str, collection_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    resp = session.patch(
        f"{pb_url}/api/collections/{collection_id}",
        data=json.dumps(payload),
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def field_names(fields: List[Dict[str, Any]]) -> List[str]:
    return [field.get("name", "") for field in fields if not field.get("system")]


def main() -> int:
    info = load_pb_info()
    pb_url = info.get("pb_url", "http://127.0.0.1:8090")
    session = create_session(pb_url, info["email"], info["password"])

    existing = get_collection(session, pb_url)
    existing_fields = existing.get("fields", [])
    existing_indexes = existing.get("indexes", [])

    desired_fields = build_fields()
    desired_indexes = build_indexes()

    merged_fields = merge_fields(existing_fields, desired_fields)
    merged_indexes = merge_indexes(existing_indexes, desired_indexes)

    payload = {
        "name": existing["name"],
        "type": existing["type"],
        "system": existing.get("system", False),
        "listRule": existing.get("listRule"),
        "viewRule": existing.get("viewRule"),
        "createRule": existing.get("createRule"),
        "updateRule": existing.get("updateRule"),
        "deleteRule": existing.get("deleteRule"),
        "fields": merged_fields,
        "indexes": merged_indexes,
    }

    updated = update_collection(session, pb_url, existing["id"], payload)

    before = set(field_names(existing_fields))
    after = set(field_names(updated.get("fields", [])))
    added = sorted(after - before)

    print(json.dumps({
        "collection": updated["name"],
        "added_fields": added,
        "indexes": updated.get("indexes", []),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
