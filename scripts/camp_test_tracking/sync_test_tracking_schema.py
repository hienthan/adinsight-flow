#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict, Iterable, List

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.viator.common import create_session, load_pb_info  # noqa: E402


TRACKS_COLLECTION = "campaign_test_tracks"
UPDATES_COLLECTION = "campaign_test_updates"


def text_field(
    name: str,
    *,
    required: bool = False,
    pattern: str = "",
    presentable: bool = False,
    min_value: int | None = None,
    max_value: int = 0,
) -> Dict[str, Any]:
    return {
        "name": name,
        "type": "text",
        "required": required,
        "hidden": False,
        "presentable": presentable,
        "system": False,
        "autogeneratePattern": "",
        "pattern": pattern,
        "min": min_value if min_value is not None else (1 if required else 0),
        "max": max_value,
    }


def select_field(name: str, values: Iterable[str], *, required: bool = False) -> Dict[str, Any]:
    return {
        "name": name,
        "type": "select",
        "required": required,
        "hidden": False,
        "presentable": False,
        "system": False,
        "maxSelect": 1,
        "values": list(values),
    }


def relation_field(
    name: str,
    *,
    collection_id: str,
    required: bool = False,
    min_select: int = 0,
    max_select: int = 1,
    cascade_delete: bool = False,
) -> Dict[str, Any]:
    return {
        "name": name,
        "type": "relation",
        "required": required,
        "hidden": False,
        "presentable": False,
        "system": False,
        "collectionId": collection_id,
        "minSelect": min_select,
        "maxSelect": max_select,
        "cascadeDelete": cascade_delete,
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


def editor_field(name: str, *, required: bool = False) -> Dict[str, Any]:
    return {
        "name": name,
        "type": "editor",
        "required": required,
        "hidden": False,
        "presentable": False,
        "system": False,
        "convertURLs": False,
        "maxSize": 0,
    }


def date_field(name: str, *, required: bool = False) -> Dict[str, Any]:
    return {
        "name": name,
        "type": "date",
        "required": required,
        "hidden": False,
        "presentable": False,
        "system": False,
        "min": "",
        "max": "",
    }


def build_tracks_fields(platforms_id: str, campaigns_id: str, *, include_legacy_fields: bool) -> List[Dict[str, Any]]:
    slug_pattern = r"^[a-z0-9_\-]+$"
    track_key_pattern = r"^[A-Za-z0-9_\-|]+$"
    source_market_pattern = r"^[A-Z0-9_\-]+$"
    fields = [
        text_field("track_key", required=True, pattern=track_key_pattern),
        text_field("title", required=True, presentable=True),
        relation_field("platform", collection_id=platforms_id, required=True, min_select=1),
        select_field("lane_scope", [
            "destination",
            "market_only",
        ], required=True),
        text_field("source_market", required=True, pattern=source_market_pattern, min_value=2, max_value=12),
        text_field("destination_country", pattern=r"^[a-z0-9_\-]*$"),
        text_field("destination_city", pattern=r"^[a-z0-9_\-]*$"),
        text_field("pattern_topic", required=True, pattern=slug_pattern),
        text_field("category", pattern=r"^[a-z0-9_\-]*$"),
        select_field("test_type", [
            "cookie",
            "country_launch",
            "topic_validation",
            "landing_page",
            "campaign_structure",
            "creative_angle",
            "bidding",
            "scaling",
            "other",
        ], required=True),
        select_field("status", [
            "planned",
            "testing",
            "live",
            "watching",
            "failed",
            "paused",
            "archived",
        ], required=True),
        select_field("result", [
            "positive",
            "neutral",
            "negative",
            "mixed",
        ]),
        select_field("priority", [
            "normal",
            "medium",
            "high",
            "critical",
        ]),
        select_field("cookie_test_state", [
            "not_applicable",
            "on",
            "off",
            "mixed",
        ]),
        editor_field("summary_note"),
        editor_field("failure_note"),
        text_field("next_action"),
        bool_field("do_not_retest"),
        relation_field("linked_campaigns", collection_id=campaigns_id, min_select=0, max_select=999),
        json_field("main_tags"),
        date_field("started_at"),
        date_field("last_reviewed_at"),
        date_field("last_state_changed_at"),
        text_field("owner"),
        json_field("metadata"),
    ]
    if include_legacy_fields:
        insert_at = 8
        fields.insert(insert_at, text_field("country", pattern=r"^[a-z0-9_\-]*$"))
        fields.insert(insert_at + 1, text_field("topic", pattern=r"^[a-z0-9_\-]*$"))
    return fields


def build_tracks_indexes(*, include_unique_track_key: bool) -> List[str]:
    indexes = [
        "CREATE INDEX idx_ctt_platform ON campaign_test_tracks (platform)",
        "CREATE INDEX idx_ctt_lane_scope ON campaign_test_tracks (lane_scope)",
        "CREATE INDEX idx_ctt_source_market ON campaign_test_tracks (source_market)",
        "CREATE INDEX idx_ctt_destination_country ON campaign_test_tracks (destination_country)",
        "CREATE INDEX idx_ctt_destination_city ON campaign_test_tracks (destination_city)",
        "CREATE INDEX idx_ctt_pattern_topic ON campaign_test_tracks (pattern_topic)",
        "CREATE INDEX idx_ctt_category ON campaign_test_tracks (category)",
        "CREATE INDEX idx_ctt_status ON campaign_test_tracks (status)",
        "CREATE INDEX idx_ctt_result ON campaign_test_tracks (result)",
        "CREATE INDEX idx_ctt_test_type ON campaign_test_tracks (test_type)",
        "CREATE INDEX idx_ctt_cookie_state ON campaign_test_tracks (cookie_test_state)",
        "CREATE INDEX idx_ctt_last_reviewed ON campaign_test_tracks (last_reviewed_at)",
        "CREATE INDEX idx_ctt_do_not_retest ON campaign_test_tracks (do_not_retest)",
        "CREATE INDEX idx_ctt_platform_market_scope_dest ON campaign_test_tracks (platform, source_market, lane_scope, destination_country)",
        "CREATE INDEX idx_ctt_platform_market_scope_dest_topic ON campaign_test_tracks (platform, source_market, lane_scope, destination_country, pattern_topic)",
    ]
    if include_unique_track_key:
        indexes.insert(0, "CREATE UNIQUE INDEX idx_ctt_track_key ON campaign_test_tracks (track_key)")
    return indexes


def build_updates_fields(tracks_id: str, *, include_legacy_fields: bool) -> List[Dict[str, Any]]:
    fields = [
        relation_field("test_track", collection_id=tracks_id, required=True, min_select=1, cascade_delete=True),
        select_field("update_type", [
            "launch_note",
            "performance_review",
            "hypothesis_update",
            "failure_note",
            "winner_note",
            "pause_note",
            "retest_note",
            "general_note",
        ], required=True),
        select_field("status_snapshot", [
            "planned",
            "testing",
            "live",
            "watching",
            "failed",
            "paused",
            "archived",
        ]),
        select_field("result_snapshot", [
            "positive",
            "neutral",
            "negative",
            "mixed",
        ]),
        editor_field("note", required=True),
        text_field("source_market_snapshot"),
        text_field("destination_country_snapshot"),
        text_field("destination_city_snapshot"),
        text_field("pattern_topic_snapshot"),
        text_field("category_snapshot"),
        json_field("linked_campaigns_snapshot"),
        bool_field("important_flag"),
        text_field("created_by"),
        json_field("metadata"),
    ]
    if include_legacy_fields:
        insert_at = 8
        fields.insert(insert_at, text_field("country_snapshot"))
        fields.insert(insert_at + 1, text_field("topic_snapshot"))
    return fields


def build_updates_indexes() -> List[str]:
    return [
        "CREATE INDEX idx_ctu_test_track ON campaign_test_updates (test_track)",
        "CREATE INDEX idx_ctu_update_type ON campaign_test_updates (update_type)",
        "CREATE INDEX idx_ctu_important ON campaign_test_updates (important_flag)",
    ]


def base_payload(name: str, fields: List[Dict[str, Any]], indexes: List[str]) -> Dict[str, Any]:
    return {
        "name": name,
        "type": "base",
        "system": False,
        "listRule": "",
        "viewRule": "",
        "createRule": "",
        "updateRule": "",
        "deleteRule": "",
        "fields": fields,
        "indexes": indexes,
    }


def fetch_collection(session, pb_url: str, name: str) -> Dict[str, Any] | None:
    resp = session.get(f"{pb_url}/api/collections/{name}", timeout=20)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp.json()


def must_collection_id(session, pb_url: str, name: str) -> str:
    collection = fetch_collection(session, pb_url, name)
    if not collection:
        raise RuntimeError(f"Required collection '{name}' does not exist.")
    return collection["id"]


def merge_fields(existing_fields: List[Dict[str, Any]], desired_fields: List[Dict[str, Any]], *, drop_field_names: set[str] | None = None) -> List[Dict[str, Any]]:
    drop_field_names = drop_field_names or set()
    existing_by_name = {field.get("name"): field for field in existing_fields}
    desired_names = {field["name"] for field in desired_fields}
    merged: List[Dict[str, Any]] = []

    for desired in desired_fields:
        existing = existing_by_name.get(desired["name"])
        if existing:
            next_field = deepcopy(desired)
            if "id" in existing:
                next_field["id"] = existing["id"]
            if existing.get("system"):
                next_field["system"] = existing["system"]
            merged.append(next_field)
        else:
            merged.append(desired)

    for existing in existing_fields:
        name = existing.get("name")
        if name in drop_field_names:
            continue
        if name not in desired_names:
            merged.append(existing)

    return merged


def merge_indexes(existing_indexes: List[str], desired_indexes: List[str], *, drop_indexes: set[str] | None = None) -> List[str]:
    drop_indexes = drop_indexes or set()
    merged = [index for index in existing_indexes if index not in drop_indexes]
    existing_set = set(merged)
    for index in desired_indexes:
        if index not in existing_set:
            merged.append(index)
    return merged


def build_sync_payload(
    existing: Dict[str, Any],
    desired: Dict[str, Any],
    *,
    drop_field_names: set[str] | None = None,
    drop_indexes: set[str] | None = None,
) -> Dict[str, Any]:
    return {
        "name": existing["name"],
        "type": existing["type"],
        "system": existing.get("system", False),
        "listRule": desired.get("listRule", existing.get("listRule", "")),
        "viewRule": desired.get("viewRule", existing.get("viewRule", "")),
        "createRule": desired.get("createRule", existing.get("createRule", "")),
        "updateRule": desired.get("updateRule", existing.get("updateRule", "")),
        "deleteRule": desired.get("deleteRule", existing.get("deleteRule", "")),
        "fields": merge_fields(existing.get("fields", []), desired.get("fields", []), drop_field_names=drop_field_names),
        "indexes": merge_indexes(existing.get("indexes", []), desired.get("indexes", []), drop_indexes=drop_indexes),
    }


def print_plan(name: str, action: str, details: Dict[str, Any]) -> None:
    print(f"[{action.upper()}] {name}")
    if details.get("fields"):
        print(f"  fields: {', '.join(details['fields'])}")
    if details.get("indexes"):
        print(f"  indexes: {len(details['indexes'])}")
    if details.get("notes"):
        for note in details["notes"]:
            print(f"  - {note}")


def create_collection(session, pb_url: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    resp = session.post(f"{pb_url}/api/collections", data=json.dumps(payload), timeout=30)
    if not resp.ok:
        print(resp.text)
        resp.raise_for_status()
    return resp.json()


def update_collection(session, pb_url: str, collection_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    resp = session.patch(f"{pb_url}/api/collections/{collection_id}", data=json.dumps(payload), timeout=30)
    if not resp.ok:
        print(resp.text)
        resp.raise_for_status()
    return resp.json()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create or sync PocketBase schema for camp test tracking.")
    parser.add_argument("--apply", action="store_true", help="Apply create/update operations. Default is plan only.")
    parser.add_argument(
        "--with-unique-track-key",
        action="store_true",
        help="Also create the unique index on track_key. Use this after data migration/backfill is complete.",
    )
    parser.add_argument(
        "--cleanup-legacy-fields",
        action="store_true",
        help="Drop legacy compatibility fields after migration verification is complete.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    info = load_pb_info()
    pb_url = info.get("pb_url", "http://127.0.0.1:8090")
    session = create_session(pb_url, info["email"], info["password"])

    platforms_id = must_collection_id(session, pb_url, "campaign_platforms")
    campaigns_id = must_collection_id(session, pb_url, "campaigns")

    legacy_track_fields = {"country", "topic", "last_result_changed_at"}
    legacy_update_fields = {"country_snapshot", "topic_snapshot"}
    legacy_track_indexes = {
        "CREATE INDEX idx_ctt_country ON campaign_test_tracks (country)",
        "CREATE INDEX idx_ctt_platform_country_status ON campaign_test_tracks (platform, country, status)",
        "CREATE INDEX idx_ctt_platform_market_dest ON campaign_test_tracks (platform, source_market, destination_country)",
        "CREATE INDEX idx_ctt_platform_market_dest_topic ON campaign_test_tracks (platform, source_market, destination_country, pattern_topic)",
    }

    desired_tracks = base_payload(
        TRACKS_COLLECTION,
        build_tracks_fields(platforms_id, campaigns_id, include_legacy_fields=not args.cleanup_legacy_fields),
        build_tracks_indexes(include_unique_track_key=args.with_unique_track_key),
    )

    existing_tracks = fetch_collection(session, pb_url, TRACKS_COLLECTION)
    tracks_collection: Dict[str, Any]
    if not existing_tracks:
        print_plan(TRACKS_COLLECTION, "create", {
            "fields": [field["name"] for field in desired_tracks["fields"]],
            "indexes": desired_tracks["indexes"],
        })
        tracks_collection = create_collection(session, pb_url, desired_tracks) if args.apply else {"id": f"{TRACKS_COLLECTION}__planned"}
    else:
        tracks_payload = build_sync_payload(
            existing_tracks,
            desired_tracks,
            drop_field_names=legacy_track_fields if args.cleanup_legacy_fields else None,
            drop_indexes=legacy_track_indexes,
        )
        print_plan(TRACKS_COLLECTION, "sync", {
            "fields": [field["name"] for field in desired_tracks["fields"]],
            "indexes": desired_tracks["indexes"],
            "notes": ["Existing extra fields are preserved if present."],
        })
        tracks_collection = update_collection(session, pb_url, existing_tracks["id"], tracks_payload) if args.apply else existing_tracks

    tracks_id = tracks_collection["id"] if args.apply or existing_tracks else must_collection_id(session, pb_url, TRACKS_COLLECTION) if fetch_collection(session, pb_url, TRACKS_COLLECTION) else None
    if not tracks_id:
        print(f"[PENDING] {UPDATES_COLLECTION}")
        print(f"  - depends on {TRACKS_COLLECTION} creation")
        return 0

    desired_updates = base_payload(
        UPDATES_COLLECTION,
        build_updates_fields(tracks_id, include_legacy_fields=not args.cleanup_legacy_fields),
        build_updates_indexes(),
    )

    existing_updates = fetch_collection(session, pb_url, UPDATES_COLLECTION)
    if not existing_updates:
        print_plan(UPDATES_COLLECTION, "create", {
            "fields": [field["name"] for field in desired_updates["fields"]],
            "indexes": desired_updates["indexes"],
        })
        if args.apply:
            create_collection(session, pb_url, desired_updates)
    else:
        updates_payload = build_sync_payload(
            existing_updates,
            desired_updates,
            drop_field_names=legacy_update_fields if args.cleanup_legacy_fields else None,
        )
        print_plan(UPDATES_COLLECTION, "sync", {
            "fields": [field["name"] for field in desired_updates["fields"]],
            "indexes": desired_updates["indexes"],
            "notes": ["Existing extra fields are preserved if present."],
        })
        if args.apply:
            update_collection(session, pb_url, existing_updates["id"], updates_payload)

    print(json.dumps({
        "mode": "apply" if args.apply else "plan",
        "collections": [TRACKS_COLLECTION, UPDATES_COLLECTION],
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
