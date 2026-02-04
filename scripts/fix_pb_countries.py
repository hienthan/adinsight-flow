#!/usr/bin/env python3
"""
Fix Country Duplicates in PocketBase
Updates all records in the 'pages' collection to have normalized country names.
Also cleans up 'platform_metadata' to remove duplicate country entries.
"""

import json
import requests
import sys
import os

# Add scripts/lib to path to use GeoEngine
sys.path.append(os.path.join(os.path.dirname(__file__), 'scripts'))
from lib.geo_engine import engine as geo_engine

PB_URL = "http://127.0.0.1:8090"

def get_all_records(collection, filter_str=""):
    records = []
    page = 1
    while True:
        url = f"{PB_URL}/api/collections/{collection}/records?page={page}&perPage=500&filter={filter_str}"
        resp = requests.get(url)
        if resp.status_code != 200:
            break
        data = resp.json()
        records.extend(data['items'])
        if page >= data['totalPages']:
            break
        page += 1
    return records

def fix_pocketbase():
    print("=== Fixing Country Duplicates in PocketBase ===\n")

    # 1. Fix 'pages' collection
    print("1. Checking 'pages' collection...")
    # Only get records that might need fixing
    # (Checking all since "Vietnam" and "Viet Nam" both exist)
    records = get_all_records("pages")
    print(f"   Found {len(records)} records.")

    updates = 0
    for r in records:
        old_country = r.get('country')
        if old_country:
            new_country = geo_engine.normalize_country(old_country)
            if old_country != new_country:
                # Update record
                update_url = f"{PB_URL}/api/collections/pages/records/{r['id']}"
                resp = requests.patch(update_url, json={"country": new_country})
                if resp.status_code == 200:
                    updates += 1
                if updates % 100 == 0 and updates > 0:
                    print(f"   Updated {updates} records...")

    print(f"   ✅ Updated {updates} records in 'pages'.")

    # 2. Fix 'platform_metadata' collection
    print("\n2. Cleaning up 'platform_metadata'...")
    meta_records = get_all_records("platform_metadata", 'type="country"')
    
    seen_normalized = {}
    to_delete = []
    
    for r in meta_records:
        normalized = geo_engine.normalize_country(r['value'])
        if normalized not in seen_normalized:
            seen_normalized[normalized] = r
            if r['value'] != normalized:
                # Update to normalized name
                requests.patch(f"{PB_URL}/api/collections/platform_metadata/records/{r['id']}", json={"value": normalized})
        else:
            # Duplicate normalized entry
            to_delete.append(r['id'])
    
    for rid in to_delete:
        requests.delete(f"{PB_URL}/api/collections/platform_metadata/records/{rid}")
    
    print(f"   ✅ Removed {len(to_delete)} duplicate metadata entries.")
    print(f"   ✅ Standardized metadata labels.")

if __name__ == "__main__":
    try:
        fix_pocketbase()
    except Exception as e:
        print(f"Error connecting to PocketBase: {e}")
        print("Make sure PocketBase is running at http://127.0.0.1:8090")
