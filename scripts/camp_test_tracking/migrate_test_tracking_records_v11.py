#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.viator.common import create_session, load_pb_info  # noqa: E402


TRACKS_COLLECTION = "campaign_test_tracks"
UPDATES_COLLECTION = "campaign_test_updates"
SOURCE_MARKETS = {"HK", "TW", "SG", "TH", "US", "ID", "MY", "VN", "PH"}


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


def patch_record(session, pb_url: str, collection: str, record_id: str, payload: Dict[str, Any]) -> None:
    resp = session.patch(
        f"{pb_url}/api/collections/{collection}/records/{record_id}",
        data=json.dumps(payload),
        timeout=30,
    )
    resp.raise_for_status()


def slug_title(value: str) -> str:
    return value.replace("_", " ").strip().title()


def infer_source_market(track: Dict[str, Any], platform_label: str) -> Tuple[str, str]:
    existing = (track.get("source_market") or "").strip().upper()
    if existing:
        return existing, "existing"

    metadata = track.get("metadata") or {}
    for key in ("source_market", "sourceMarket"):
        value = str(metadata.get(key, "")).strip().upper()
        if value in SOURCE_MARKETS:
            return value, f"metadata:{key}"

    title = str(track.get("title", ""))
    for market in sorted(SOURCE_MARKETS, key=len, reverse=True):
        if re.search(rf"\b{re.escape(market)}\b", title):
            return market, "title"

    fallback_by_platform = {
        "viator": "US",
        "traveloka": "HK",
        "trip": "HK",
        "klook": "TW",
    }
    lowered = platform_label.lower()
    for keyword, market in fallback_by_platform.items():
        if keyword in lowered:
            return market, f"platform_fallback:{keyword}"

    return "US", "default_fallback"


def infer_category(pattern_topic: str, test_type: str) -> str:
    topic = pattern_topic.lower()
    if any(token in topic for token in ("esim", "arrival_card", "plugs", "plug", "sim")):
        return "utility"
    if "ticket" in topic:
        return "ticket"
    if any(token in topic for token in ("tour", "things_to_do", "activity", "private")):
        return "tour"
    if any(token in topic for token in ("transport", "airport", "transfer")):
        return "transport"
    if test_type == "landing_page":
        return "landing_page"
    return "general"


def build_track_key(
    track: Dict[str, Any],
    lane_scope: str,
    source_market: str,
    destination_country: str,
    destination_city: str,
    pattern_topic: str,
) -> str:
    platform_id = track.get("platform") or "unknown_platform"
    if lane_scope == "market_only":
        return "|".join([platform_id, source_market, "no_destination", "all", pattern_topic])
    city_part = destination_city or "all"
    return "|".join([platform_id, source_market, destination_country, city_part, pattern_topic])


def build_title(
    lane_scope: str,
    platform_label: str,
    source_market: str,
    destination_country: str,
    destination_city: str,
    pattern_topic: str,
) -> str:
    if lane_scope == "market_only":
        return f"{platform_label} {source_market} | {slug_title(pattern_topic)}"
    destination = slug_title(destination_country)
    if destination_city:
        destination = f"{slug_title(destination_city)}, {destination}"
    return f"{platform_label} {source_market} -> {destination} | {slug_title(pattern_topic)}"


def normalize_status(value: str | None) -> str:
    if value == "stable_winner":
        return "live"
    return value or "planned"


def migrate_track(track: Dict[str, Any], platform_lookup: Dict[str, str]) -> Tuple[Dict[str, Any], List[str]]:
    notes: List[str] = []
    platform_label = platform_lookup.get(track.get("platform", ""), "Unknown Platform")
    source_market, source_reason = infer_source_market(track, platform_label)
    if source_reason != "existing":
        notes.append(f"source_market:{source_reason}")

    destination_country = (track.get("destination_country") or track.get("country") or "").strip().lower()
    destination_city = (track.get("destination_city") or "").strip().lower()
    pattern_topic = (track.get("pattern_topic") or track.get("topic") or "").strip().lower()
    lane_scope = (track.get("lane_scope") or "").strip() or ("destination" if destination_country else "market_only")
    category = (track.get("category") or "").strip().lower() or infer_category(pattern_topic, str(track.get("test_type", "")))
    status = normalize_status(track.get("status"))

    payload = {
        "track_key": build_track_key(track, lane_scope, source_market, destination_country, destination_city, pattern_topic),
        "title": build_title(lane_scope, platform_label, source_market, destination_country, destination_city, pattern_topic),
        "lane_scope": lane_scope,
        "source_market": source_market,
        "destination_country": destination_country if lane_scope == "destination" else "",
        "destination_city": destination_city if lane_scope == "destination" else "",
        "pattern_topic": pattern_topic,
        "category": category,
        "status": status,
        "last_state_changed_at": track.get("last_state_changed_at") or track.get("last_result_changed_at") or "",
    }
    return payload, notes


def migrate_update(update: Dict[str, Any]) -> Dict[str, Any]:
    payload = {
        "status_snapshot": normalize_status(update.get("status_snapshot")),
        "source_market_snapshot": update.get("source_market_snapshot") or "",
        "destination_country_snapshot": update.get("destination_country_snapshot") or update.get("country_snapshot") or "",
        "destination_city_snapshot": update.get("destination_city_snapshot") or "",
        "pattern_topic_snapshot": update.get("pattern_topic_snapshot") or update.get("topic_snapshot") or "",
        "category_snapshot": update.get("category_snapshot") or "",
    }
    return payload


def main() -> int:
    info = load_pb_info()
    pb_url = info.get("pb_url", "http://127.0.0.1:8090")
    session = create_session(pb_url, info["email"], info["password"])

    platforms = fetch_all(session, pb_url, "campaign_platforms", params={"fields": "id,display_name,platform_name"})
    platform_lookup = {
        platform["id"]: platform.get("display_name") or platform.get("platform_name") or "Unknown Platform"
        for platform in platforms
    }

    tracks = fetch_all(session, pb_url, TRACKS_COLLECTION)
    updates = fetch_all(session, pb_url, UPDATES_COLLECTION)

    track_updates = 0
    update_updates = 0
    heuristics: List[Dict[str, Any]] = []

    for track in tracks:
        payload, notes = migrate_track(track, platform_lookup)
        patch_record(session, pb_url, TRACKS_COLLECTION, track["id"], payload)
        track_updates += 1
        if notes:
            heuristics.append({"track_id": track["id"], "title": payload["title"], "notes": notes})

    for update in updates:
        payload = migrate_update(update)
        patch_record(session, pb_url, UPDATES_COLLECTION, update["id"], payload)
        update_updates += 1

    print(json.dumps({
        "tracks_updated": track_updates,
        "updates_updated": update_updates,
        "heuristic_source_market_records": heuristics,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
