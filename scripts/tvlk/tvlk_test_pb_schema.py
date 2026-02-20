#!/usr/bin/env python3
import requests
import sys
import os

def get_pb_info():
    info = {}
    try:
        with open('db/pb_info.txt', 'r') as f:
            for line in f:
                if ':' in line:
                    k, v = line.split(':', 1)
                    info[k.strip()] = v.strip()
    except FileNotFoundError:
        print("❌ ERROR: db/pb_info.txt not found!")
        return None
    return info

def test_pb_setup():
    print("--- Traveloka PocketBase Schema Verification ---")
    info = get_pb_info()
    if not info: return

    pb_url = info.get('pb_url')
    email = info.get('email')
    password = info.get('password')

    # 1. Auth
    auth_url = f"{pb_url}/api/collections/_superusers/auth-with-password"
    try:
        resp = requests.post(auth_url, json={"identity": email, "password": password}, timeout=10)
        if resp.status_code != 200:
            print(f"❌ Auth failed: {resp.status_code}")
            return
        token = resp.json().get('token')
        print("✅ Authentication successful")
    except Exception as e:
        print(f"❌ Auth error: {e}")
        return

    headers = {"Authorization": f"Bearer {token}"}
    collection_name = "tvlk_pages"

    # 2. Check Collection
    try:
        resp = requests.get(f"{pb_url}/api/collections/{collection_name}", headers=headers, timeout=10)
        if resp.status_code == 404:
            print(f"❌ Collection '{collection_name}' NOT FOUND.")
            print("   Please create it in PocketBase Admin UI with the following fields:")
            print("   platform, url, url_suffix, slug, slug_en, title_en, city, country, sitemap_tag, content_type, language, tier, funnel_stage, sub_tag, metadata, is_active, canonical_id")
            return
        elif resp.status_code != 200:
            print(f"❌ Error accessing collection: {resp.status_code}")
            return
        
        schema = resp.json().get('fields', [])
        existing_fields = {f.get('name') for f in schema}
        print(f"✅ Collection '{collection_name}' found")
    except Exception as e:
        print(f"❌ Error: {e}")
        return

    # 3. Verify Fields
    required_fields = [
        'platform', 'url', 'url_suffix', 'slug', 'slug_en', 'title_en', 
        'city', 'country', 'sitemap_tag', 'content_type', 'language', 
        'tier', 'funnel_stage', 'sub_tag', 'metadata', 'is_active', 'canonical_id'
    ]
    
    missing = []
    for field in required_fields:
        if field not in existing_fields:
            missing.append(field)
    
    if missing:
        print(f"❌ Missing fields in '{collection_name}': {missing}")
        print("   Please add these fields in the PocketBase Admin UI.")
    else:
        print(f"✅ All {len(required_fields)} required fields are present.")
        print("\n--- ALL TESTS PASSED ---")

if __name__ == "__main__":
    test_pb_setup()
