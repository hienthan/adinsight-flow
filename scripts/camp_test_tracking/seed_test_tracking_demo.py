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


def find_platform_id(platforms: List[Dict[str, Any]], keyword: str) -> str | None:
    keyword = keyword.lower()
    for platform in platforms:
        haystack = " ".join([
            str(platform.get("display_name", "")),
            str(platform.get("platform_name", "")),
            str(platform.get("marketplace", "")),
        ]).lower()
        if keyword in haystack:
            return platform["id"]
    return None


def linked_campaign_ids(campaigns: List[Dict[str, Any]], platform_id: str, limit: int = 2) -> List[str]:
    scoped = [campaign["id"] for campaign in campaigns if campaign.get("platform") == platform_id]
    return scoped[:limit]


def build_track_key(platform_id: str, source_market: str, destination_country: str, destination_city: str, pattern_topic: str, lane_scope: str = "destination") -> str:
    if lane_scope == "market_only":
        return "|".join([platform_id, source_market, "no_destination", "all", pattern_topic])
    city_part = destination_city or "all"
    return "|".join([platform_id, source_market, destination_country, city_part, pattern_topic])


def upsert_track(session, pb_url: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    existing = fetch_all(session, pb_url, TRACKS_COLLECTION, params={"filter": f'track_key = "{payload["track_key"]}"'})
    if not existing:
        existing = fetch_all(
            session,
            pb_url,
            TRACKS_COLLECTION,
            params={"filter": f'title = "{payload["title"]}"'},
        )
    if existing:
        record_id = existing[0]["id"]
        resp = session.patch(
            f"{pb_url}/api/collections/{TRACKS_COLLECTION}/records/{record_id}",
            data=json.dumps(payload),
            timeout=30,
        )
        if not resp.ok:
            print(resp.text)
        resp.raise_for_status()
        print(f"Updated track: {payload['title']}")
        return resp.json()

    resp = session.post(
        f"{pb_url}/api/collections/{TRACKS_COLLECTION}/records",
        data=json.dumps(payload),
        timeout=30,
    )
    if not resp.ok:
        print(resp.text)
    resp.raise_for_status()
    print(f"Created track: {payload['title']}")
    return resp.json()


def ensure_update(session, pb_url: str, payload: Dict[str, Any]) -> None:
    escaped_type = payload["update_type"]
    existing = fetch_all(
        session,
        pb_url,
        UPDATES_COLLECTION,
        params={"filter": f'test_track = "{payload["test_track"]}" && update_type = "{escaped_type}"'},
    )
    if existing:
        print(f"Skipped update log (exists): {escaped_type} for {payload['test_track']}")
        return

    resp = session.post(
        f"{pb_url}/api/collections/{UPDATES_COLLECTION}/records",
        data=json.dumps(payload),
        timeout=30,
    )
    if not resp.ok:
        print(resp.text)
    resp.raise_for_status()
    print(f"Created update log: {escaped_type} for {payload['test_track']}")


def prune_legacy_seed_tracks(session, pb_url: str, desired_track_keys: List[str]) -> None:
    existing_seed_tracks = fetch_all(
        session,
        pb_url,
        TRACKS_COLLECTION,
        params={"filter": 'metadata.seed = true'},
    )
    desired = set(desired_track_keys)
    for track in existing_seed_tracks:
        if track.get("track_key") in desired:
            continue
        resp = session.delete(f"{pb_url}/api/collections/{TRACKS_COLLECTION}/records/{track['id']}", timeout=30)
        resp.raise_for_status()
        print(f"Deleted legacy seed track: {track.get('title', track['id'])}")


def main() -> int:
    info = load_pb_info()
    pb_url = info.get("pb_url", "http://127.0.0.1:8090")
    session = create_session(pb_url, info["email"], info["password"])

    platforms = fetch_all(session, pb_url, "campaign_platforms", params={"sort": "display_name"})
    campaigns = fetch_all(session, pb_url, "campaigns", params={"sort": "name"})
    campaign_name_by_id = {campaign["id"]: campaign.get("name", campaign["id"]) for campaign in campaigns}

    viator_id = find_platform_id(platforms, "viator")
    traveloka_id = find_platform_id(platforms, "traveloka")
    trip_id = find_platform_id(platforms, "trip")
    klook_id = find_platform_id(platforms, "klook")

    if not viator_id or not traveloka_id or not trip_id or not klook_id:
        raise RuntimeError("Missing one of required platforms: viator, traveloka, trip, klook.")

    seed_tracks = [
        {
            "track_key": build_track_key(viator_id, "US", "japan", "", "ticket"),
            "title": "Viator US -> Japan | Ticket",
            "platform": viator_id,
            "lane_scope": "destination",
            "source_market": "US",
            "destination_country": "japan",
            "destination_city": "",
            "pattern_topic": "ticket",
            "category": "ticket",
            "test_type": "cookie",
            "status": "testing",
            "result": "neutral",
            "priority": "high",
            "cookie_test_state": "on",
            "summary_note": "<p>Dang test lane tickets cho Japan de theo doi cookie stability va chat luong traffic.</p>",
            "failure_note": "",
            "next_action": "Review sau 7 ngay va check CTR, CPC, search term quality.",
            "do_not_retest": False,
            "linked_campaigns": linked_campaign_ids(campaigns, viator_id),
            "main_tags": ["us", "japan", "ticket", "cookie"],
            "started_at": "2026-05-08",
            "last_reviewed_at": "2026-05-08",
            "last_state_changed_at": "2026-05-08",
            "owner": "hien",
            "metadata": {"seed": True},
        },
        {
            "track_key": build_track_key(traveloka_id, "HK", "france", "", "family_topic"),
            "title": "Traveloka HK -> France | Family Topic",
            "platform": traveloka_id,
            "lane_scope": "destination",
            "source_market": "HK",
            "destination_country": "france",
            "destination_city": "",
            "pattern_topic": "family_topic",
            "category": "tour",
            "test_type": "topic_validation",
            "status": "failed",
            "result": "negative",
            "priority": "high",
            "cookie_test_state": "not_applicable",
            "summary_note": "<p>Da test topic family cho France nhung khong tao du volume chat luong.</p>",
            "failure_note": "<p>CTR thap, search intent loang, kho scale.</p>",
            "next_action": "Khong retest y nguyen. Neu quay lai thi can angle moi.",
            "do_not_retest": True,
            "linked_campaigns": linked_campaign_ids(campaigns, traveloka_id),
            "main_tags": ["hk", "france", "family_topic", "failed"],
            "started_at": "2026-04-20",
            "last_reviewed_at": "2026-04-28",
            "last_state_changed_at": "2026-04-28",
            "owner": "hien",
            "metadata": {"seed": True},
        },
        {
            "track_key": build_track_key(trip_id, "HK", "spain", "", "private_tour"),
            "title": "Trip HK -> Spain | Private Tour",
            "platform": trip_id,
            "lane_scope": "destination",
            "source_market": "HK",
            "destination_country": "spain",
            "destination_city": "",
            "pattern_topic": "private_tour",
            "category": "tour",
            "test_type": "country_launch",
            "status": "watching",
            "result": "mixed",
            "priority": "medium",
            "cookie_test_state": "off",
            "summary_note": "<p>Private tours o Spain da co dau hieu on hon nhung chua du de ket luan winner.</p>",
            "failure_note": "",
            "next_action": "Watch them 5-7 ngay nua truoc khi chot scale.",
            "do_not_retest": False,
            "linked_campaigns": linked_campaign_ids(campaigns, trip_id),
            "main_tags": ["hk", "spain", "private_tour", "watching"],
            "started_at": "2026-05-02",
            "last_reviewed_at": "2026-05-07",
            "last_state_changed_at": "2026-05-07",
            "owner": "hien",
            "metadata": {"seed": True},
        },
        {
            "track_key": build_track_key(klook_id, "MY", "", "", "esim", "market_only"),
            "title": "Klook MY | Esim",
            "platform": klook_id,
            "lane_scope": "market_only",
            "source_market": "MY",
            "destination_country": "",
            "destination_city": "",
            "pattern_topic": "esim",
            "category": "utility",
            "test_type": "topic_validation",
            "status": "testing",
            "result": "positive",
            "priority": "medium",
            "cookie_test_state": "on",
            "summary_note": "<p>Dang test do nhan biet brand/platform cho eSIM trong market MY ma khong target destination cu the.</p>",
            "failure_note": "",
            "next_action": "Theo doi search term va volume 5 ngay nua truoc khi mo rong keyword cluster.",
            "do_not_retest": False,
            "linked_campaigns": linked_campaign_ids(campaigns, klook_id),
            "main_tags": ["my", "market_only", "esim", "utility"],
            "started_at": "2026-05-10",
            "last_reviewed_at": "2026-05-10",
            "last_state_changed_at": "2026-05-10",
            "owner": "hien",
            "metadata": {"seed": True},
        },
    ]

    prune_legacy_seed_tracks(session, pb_url, [payload["track_key"] for payload in seed_tracks])

    created_tracks = [upsert_track(session, pb_url, payload) for payload in seed_tracks]

    updates = [
        {
            "test_track": created_tracks[0]["id"],
            "update_type": "launch_note",
            "status_snapshot": "testing",
            "result_snapshot": "neutral",
            "note": "<p>Khoi dong lane Japan tickets de xem cookie va chat luong traffic co on dinh khong.</p>",
            "source_market_snapshot": "US",
            "destination_country_snapshot": "japan",
            "destination_city_snapshot": "",
            "pattern_topic_snapshot": "ticket",
            "category_snapshot": "ticket",
            "linked_campaigns_snapshot": [{"id": cid, "name": campaign_name_by_id.get(cid, cid)} for cid in created_tracks[0].get("linked_campaigns", [])],
            "important_flag": True,
            "created_by": "seed_script",
            "metadata": {"seed": True},
        },
        {
            "test_track": created_tracks[1]["id"],
            "update_type": "failure_note",
            "status_snapshot": "failed",
            "result_snapshot": "negative",
            "note": "<p>Topic family cho France fail vi CTR va search intent khong tap trung. Danh dau khong retest y nguyen.</p>",
            "source_market_snapshot": "HK",
            "destination_country_snapshot": "france",
            "destination_city_snapshot": "",
            "pattern_topic_snapshot": "family_topic",
            "category_snapshot": "tour",
            "linked_campaigns_snapshot": [{"id": cid, "name": campaign_name_by_id.get(cid, cid)} for cid in created_tracks[1].get("linked_campaigns", [])],
            "important_flag": True,
            "created_by": "seed_script",
            "metadata": {"seed": True},
        },
        {
            "test_track": created_tracks[2]["id"],
            "update_type": "performance_review",
            "status_snapshot": "watching",
            "result_snapshot": "mixed",
            "note": "<p>Spain private tours co tin hieu duoc, nhung can them vai ngay de xac nhan do ben.</p>",
            "source_market_snapshot": "HK",
            "destination_country_snapshot": "spain",
            "destination_city_snapshot": "",
            "pattern_topic_snapshot": "private_tour",
            "category_snapshot": "tour",
            "linked_campaigns_snapshot": [{"id": cid, "name": campaign_name_by_id.get(cid, cid)} for cid in created_tracks[2].get("linked_campaigns", [])],
            "important_flag": False,
            "created_by": "seed_script",
            "metadata": {"seed": True},
        },
        {
            "test_track": created_tracks[3]["id"],
            "update_type": "launch_note",
            "status_snapshot": "testing",
            "result_snapshot": "positive",
            "note": "<p>Khoi dong lane market-only cho eSIM o MY de do nhan biet brand va intent nang cap sang destination lanes sau.</p>",
            "source_market_snapshot": "MY",
            "destination_country_snapshot": "",
            "destination_city_snapshot": "",
            "pattern_topic_snapshot": "esim",
            "category_snapshot": "utility",
            "linked_campaigns_snapshot": [{"id": cid, "name": campaign_name_by_id.get(cid, cid)} for cid in created_tracks[3].get("linked_campaigns", [])],
            "important_flag": False,
            "created_by": "seed_script",
            "metadata": {"seed": True},
        },
    ]

    for payload in updates:
        ensure_update(session, pb_url, payload)

    print(json.dumps({
        "tracks": len(created_tracks),
        "updates": len(updates),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
