#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.viator.common import create_session, load_pb_info  # noqa: E402


TRACKS_COLLECTION = "campaign_test_tracks"
UPDATES_COLLECTION = "campaign_test_updates"
BASE_REQUIRED_TRACK_FIELDS = ["track_key", "lane_scope", "source_market", "pattern_topic", "status"]


def fetch_all(session, pb_url: str, collection: str, *, params: Dict[str, Any] | None = None) -> List[Dict[str, Any]]:
    page = 1
    items: List[Dict[str, Any]] = []
    while True:
        request_params = {"page": page, "perPage": 200}
        if params:
            request_params.update(params)
        resp = session.get(f"{pb_url}/api/collections/{collection}/records", params=request_params, timeout=30)
        resp.raise_for_status()
        payload = resp.json()
        items.extend(payload.get("items", []))
        if page >= payload.get("totalPages", 1):
            break
        page += 1
    return items


def find_missing_fields(record: Dict[str, Any], fields: List[str]) -> List[str]:
    missing: List[str] = []
    for field in fields:
        value = record.get(field)
        if value is None:
            missing.append(field)
            continue
        if isinstance(value, str) and not value.strip():
            missing.append(field)
    return missing


def main() -> int:
    info = load_pb_info()
    pb_url = info.get("pb_url", "http://127.0.0.1:8090")
    session = create_session(pb_url, info["email"], info["password"])

    tracks = fetch_all(session, pb_url, TRACKS_COLLECTION)
    updates = fetch_all(session, pb_url, UPDATES_COLLECTION)

    missing_track_fields = []
    duplicate_track_keys: Dict[str, int] = {}

    for track in tracks:
        required_fields = list(BASE_REQUIRED_TRACK_FIELDS)
        if (track.get("lane_scope") or "destination") == "destination":
            required_fields.append("destination_country")
        missing = find_missing_fields(track, required_fields)
        if missing:
            missing_track_fields.append({
                "id": track["id"],
                "title": track.get("title"),
                "missing": missing,
            })
        track_key = str(track.get("track_key", "")).strip()
        if track_key:
            duplicate_track_keys[track_key] = duplicate_track_keys.get(track_key, 0) + 1

    duplicate_track_keys = {key: count for key, count in duplicate_track_keys.items() if count > 1}

    legacy_track_fields_present = any(("country" in track or "topic" in track or "last_result_changed_at" in track) for track in tracks)
    legacy_update_fields_present = any(("country_snapshot" in update or "topic_snapshot" in update) for update in updates)

    print(json.dumps({
        "tracks": len(tracks),
        "updates": len(updates),
        "missing_track_fields": missing_track_fields,
        "duplicate_track_keys": duplicate_track_keys,
        "legacy_track_fields_present": legacy_track_fields_present,
        "legacy_update_fields_present": legacy_update_fields_present,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
