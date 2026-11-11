#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
import sys
from typing import Dict, List

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.viator.common import create_session, load_pb_info


COLLECTION_NAME = "viator_pages"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import classified Viator CSV into PocketBase viator_pages.")
    parser.add_argument("--input", required=True, nargs="+", help="One or more classified CSV paths")
    parser.add_argument("--dry-run", action="store_true", help="Validate and diff only")
    return parser.parse_args()


def normalize_payload(row: Dict[str, str]) -> Dict[str, object]:
    raw_is_private = str(row.get("is_private") or "").strip().lower()
    return {
        "url": (row.get("url") or "").strip(),
        "title": (row.get("title") or "").strip(),
        "country": (row.get("country") or "").strip(),
        "city": (row.get("city") or "").strip(),
        "page_type": (row.get("page_type") or "").strip(),
        "intent_primary": (row.get("intent_primary") or "").strip(),
        "content_type": (row.get("content_type") or "").strip(),
        "is_private": raw_is_private in {"true", "1", "yes"},
        "dsa_campaign": (row.get("dsa_campaign") or "").strip(),
        "dsa_adgroup": (row.get("dsa_adgroup") or "").strip(),
        "notes": (row.get("notes") or "").strip(),
        "classification_confidence": float(row.get("classification_confidence") or 0),
        "rule_hits": parse_rule_hits(row.get("rule_hits") or "[]"),
    }


def parse_rule_hits(raw_value: str) -> List[str]:
    try:
        parsed = json.loads(raw_value)
        if isinstance(parsed, list):
            return [str(item) for item in parsed]
    except json.JSONDecodeError:
        pass
    return []


def fetch_existing(session, pb_url: str) -> Dict[str, Dict[str, object]]:
    existing: Dict[str, Dict[str, object]] = {}
    page = 1
    while True:
        resp = session.get(
            f"{pb_url}/api/collections/{COLLECTION_NAME}/records",
            params={"page": page, "perPage": 500, "fields": "id,url,title,country,city,page_type,intent_primary,content_type,is_private,dsa_campaign,dsa_adgroup,notes,classification_confidence,rule_hits"},
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
        with Path(input_path).open("r", encoding="utf-8", newline="") as fh:
            rows = list(csv.DictReader(fh))

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
