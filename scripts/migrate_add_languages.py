#!/usr/bin/env python3
"""
Add languages field to existing pages collection
Migrates existing zh-HK records to use languages array.
"""

import requests
import time

PB_URL = "http://127.0.0.1:8090"

def migrate_languages():
    print("=== Migrating Pages to Languages Array ===\n")
    
    # Get all records
    print("1. Fetching all records...")
    all_records = []
    page = 1
    
    while True:
        url = f"{PB_URL}/api/collections/pages/records?page={page}&perPage=500"
        resp = requests.get(url)
        
        if resp.status_code != 200:
            print(f"   Error: {resp.status_code}")
            break
        
        data = resp.json()
        all_records.extend(data['items'])
        print(f"   Fetched page {page}/{data['totalPages']} ({len(all_records)} records so far)")
        
        if page >= data['totalPages']:
            break
        page += 1
    
    print(f"\n2. Total records to migrate: {len(all_records)}")
    
    # Update each record
    print("\n3. Adding languages field...")
    updated = 0
    errors = 0
    
    for i, record in enumerate(all_records, 1):
        # Check if already has languages field
        if 'languages' in record and record['languages']:
            continue
        
        # Get current language
        current_lang = record.get('language', 'zh-HK')
        
        # Update with languages array
        update_url = f"{PB_URL}/api/collections/pages/records/{record['id']}"
        payload = {
            "languages": [current_lang]
        }
        
        resp = requests.patch(update_url, json=payload)
        
        if resp.status_code == 200:
            updated += 1
        else:
            errors += 1
            if errors < 5:  # Show first 5 errors
                print(f"   Error updating {record['id']}: {resp.text}")
        
        if i % 1000 == 0:
            print(f"   Progress: {i}/{len(all_records)} ({updated} updated, {errors} errors)")
            time.sleep(0.1)  # Small delay to avoid overwhelming PB
    
    print(f"\n✅ Migration complete!")
    print(f"   Updated: {updated}")
    print(f"   Errors: {errors}")
    print(f"   Already migrated: {len(all_records) - updated - errors}")

if __name__ == "__main__":
    try:
        migrate_languages()
    except Exception as e:
        print(f"❌ Error: {e}")
        print("Make sure PocketBase is running at http://127.0.0.1:8090")
