#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, List

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.viator.common import create_session, load_pb_info


COLLECTION_NAME = "trip_pages"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import classified Trip JSON into PocketBase trip_pages.")
    parser.add_argument("--input", required=True, nargs="+", help="One or more classified JSON files")
    parser.add_argument("--dry-run", action="store_true", help="Validate and diff only")
    return parser.parse_args()


def normalize_payload(row: Dict[str, object]) -> Dict[str, object]:
    return {
        "url": str(row.get("url") or "").strip(),
        "title": str(row.get("title") or "").strip(),
        "language": str(row.get("language") or "").strip(),
        "pattern": str(row.get("pattern") or "").strip(),
        "traffic": row.get("traffic"),
        "traffic_pct": row.get("traffic_pct"),
        "keyword_count": row.get("keyword_count"),
        "traffic_change": row.get("traffic_change"),
        "semrush_metrics": row.get("semrush_metrics") or {},
        "country": str(row.get("country") or "").strip(),
        "city": str(row.get("city") or "").strip(),
        "geo_entity": str(row.get("geo_entity") or "").strip(),
        "geo_category": str(row.get("geo_category") or "").strip(),
        "topic_type": str(row.get("topic_type") or "").strip(),
        "intent_primary": str(row.get("intent_primary") or "").strip(),
        "content_type": str(row.get("content_type") or "").strip(),
        "sub_tag": str(row.get("sub_tag") or "").strip(),
        "readiness_hint": str(row.get("readiness_hint") or "").strip(),
        "remaining_commission_potential": str(row.get("remaining_commission_potential") or "").strip(),
        "post_booking_risk": str(row.get("post_booking_risk") or "").strip(),
        "trip_mode_risk": str(row.get("trip_mode_risk") or "").strip(),
        "market_fit": str(row.get("market_fit") or "").strip(),
        "is_active": bool(row.get("is_active")),
        "metadata": row.get("metadata") or {},
        "notes": str(row.get("notes") or "").strip(),
    }


def fetch_existing(session, pb_url: str) -> Dict[str, Dict[str, object]]:
    existing: Dict[str, Dict[str, object]] = {}
    page = 1
    fields = ",".join([
        "id","url","title","language","pattern","traffic","traffic_pct","keyword_count","traffic_change",
        "semrush_metrics","country","city","geo_entity","geo_category","topic_type","intent_primary",
        "content_type","sub_tag","readiness_hint","remaining_commission_potential","post_booking_risk",
        "trip_mode_risk","market_fit","is_active","metadata","notes"
    ])
    while True:
        resp = session.get(
            f"{pb_url}/api/collections/{COLLECTION_NAME}/records",
            params={"page": page, "perPage": 500, "fields": fields},
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        for item in data.get("items", []):
            existing[item["url"]] = item
        if page >= data.get("totalPages", 1):
            break
        page += 1
    return existing


def diff_payload(existing: Dict[str, object], payload: Dict[str, object]) -> Dict[str, object]:
    changes: Dict[str, object] = {}
    for key, value in payload.items():
        if existing.get(key) != value:
            changes[key] = value
    return changes


def main() -> int:
    args = parse_args()
    info = load_pb_info()
    pb_url = info.get("pb_url", "http://127.0.0.1:8090")
    session = create_session(pb_url, info["email"], info["password"])

    existing = fetch_existing(session, pb_url)
    total_creates = 0
    total_updates = 0
    total_skips = 0
    total_rows = 0

    for input_path in args.input:
        rows = json.loads(Path(input_path).read_text(encoding="utf-8"))
        creates = 0
        updates = 0
        skips = 0

        for row in rows:
            payload = normalize_payload(row)
            if not payload["url"]:
                continue
            current = existing.get(str(payload["url"]))
            if not current:
                creates += 1
                if not args.dry_run:
                    resp = session.post(
                        f"{pb_url}/api/collections/{COLLECTION_NAME}/records",
                        json=payload,
                        timeout=30,
                    )
                    resp.raise_for_status()
                    existing[str(payload["url"])] = {"id": resp.json()["id"], **payload}
                continue

            patch = diff_payload(current, payload)
            if not patch:
                skips += 1
                continue

            updates += 1
            if not args.dry_run:
                resp = session.patch(
                    f"{pb_url}/api/collections/{COLLECTION_NAME}/records/{current['id']}",
                    json=patch,
                    timeout=30,
                )
                resp.raise_for_status()
                existing[str(payload["url"])] = {**current, **patch}

        total_creates += creates
        total_updates += updates
        total_skips += skips
        total_rows += len(rows)

        mode = "DRY RUN" if args.dry_run else "IMPORT"
        print(f"{mode} summary for {input_path}")
        print(f"Creates: {creates}")
        print(f"Updates: {updates}")
        print(f"Skips: {skips}")
        print(f"Rows: {len(rows)}")
        print("---")

    print("TOTAL")
    print(f"Creates: {total_creates}")
    print(f"Updates: {total_updates}")
    print(f"Skips: {total_skips}")
    print(f"Rows: {total_rows}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
