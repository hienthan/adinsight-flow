#!/usr/bin/env python3
import argparse
import json
from typing import Dict, List, Optional

import requests


COLLECTION_NAME = "tvlk_pages"
ALLOWED_FIELDS = {"last_http_status", "last_check_error", "last_checked_at", "is_active"}


def get_pb_info() -> Optional[Dict[str, str]]:
    info: Dict[str, str] = {}
    try:
        with open("db/pb_info.txt", "r", encoding="utf-8") as handle:
            for line in handle:
                if ":" in line:
                    key, value = line.split(":", 1)
                    info[key.strip()] = value.strip()
    except OSError:
        return None
    return info


def authenticate(pb_url: str, email: str, password: str) -> Optional[str]:
    response = requests.post(
        f"{pb_url}/api/collections/_superusers/auth-with-password",
        json={"identity": email, "password": password},
        timeout=10,
    )
    if response.status_code != 200:
        return None
    return response.json().get("token")


def sanitize_patch_payload(payload: Dict) -> Dict:
    return {key: value for key, value in payload.items() if key in ALLOWED_FIELDS}


def load_updates(path: str) -> List[Dict]:
    with open(path, "r", encoding="utf-8") as handle:
        rows = json.load(handle)

    updates: List[Dict] = []
    for row in rows:
        record_id = row["record_id"]
        payload = sanitize_patch_payload(row.get("patch_payload", {}))
        if not payload:
            continue
        updates.append({"record_id": record_id, "payload": payload, "url": row.get("url", "")})
    return updates


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Apply PocketBase updates from a reviewed 404 checker log.")
    parser.add_argument("log_path")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    info = get_pb_info()
    if not info:
        print("ERROR: db/pb_info.txt not found or unreadable.")
        return 1

    token = authenticate(info["pb_url"], info["email"], info["password"])
    if not token:
        print("ERROR: PocketBase authentication failed.")
        return 1

    updates = load_updates(args.log_path)
    headers = {"Authorization": f"Bearer {token}"}
    success = 0

    for update in updates:
        if args.dry_run:
            print(update["record_id"], update["payload"])
            success += 1
            continue

        response = requests.patch(
            f"{info['pb_url']}/api/collections/{COLLECTION_NAME}/records/{update['record_id']}",
            headers=headers,
            json=update["payload"],
            timeout=15,
        )
        response.raise_for_status()
        success += 1

    print(f"Applied {success} updates from {args.log_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
