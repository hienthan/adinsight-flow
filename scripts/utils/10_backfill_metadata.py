import requests
import json
import time

# Configuration
PB_URL = "http://127.0.0.1:8090"
# Hardcoded superuser credentials for local dev
ADMIN_EMAIL = "hien.thanquang@gmail.com"
ADMIN_PASS = "1234567890"

def get_token():
    print(f"Authenticating as {ADMIN_EMAIL}...")
    try:
        resp = requests.post(f"{PB_URL}/api/admins/auth-with-password", json={
            "identity": ADMIN_EMAIL,
            "password": ADMIN_PASS
        })
        resp.raise_for_status()
        return resp.json()["token"]
    except Exception as e:
        print(f"❌ Auth failed: {e}")
        exit(1)

def backfill_metadata():
    token = get_token()
    headers = {"Authorization": f"{token}"}
    
    # 1. Fetch all unique sub_tags from mobility pages
    print("Fetching unique sub_tags from pages...")
    # NOTE: Pocketbase doesn't support distinct query easily via API
    # We'll fetch all mobility records (small dataset < 1000) and process in Python
    try:
        resp = requests.get(
            f"{PB_URL}/api/collections/pages/records",
            params={
                "filter": "sitemap_tag='mobility'",
                "fields": "sub_tag,country",
                "perPage": 5000
            },
            headers=headers
        )
        resp.raise_for_status()
        records = resp.json()["items"]
        
        sub_tags = set(r['sub_tag'] for r in records if r.get('sub_tag'))
        countries = set(r['country'] for r in records if r.get('country'))
        
        print(f"Found {len(sub_tags)} unique sub_tags: {sub_tags}")
        print(f"Found {len(countries)} unique countries: {countries}")
        
    except Exception as e:
        print(f"❌ Failed to fetch pages: {e}")
        return

    # 2. Check existing metadata to avoid duplicates
    existing_meta = set()
    try:
        resp = requests.get(
            f"{PB_URL}/api/collections/platform_metadata/records",
            params={"perPage": 500},
            headers=headers
        )
        for r in resp.json()["items"]:
            existing_meta.add((r['type'], r['value']))
    except Exception:
        pass

    # 3. Insert missing metadata
    count = 0
    
    # Process sub_tags
    for tag in sub_tags:
        if ('sub_tag', tag) not in existing_meta:
            try:
                requests.post(
                    f"{PB_URL}/api/collections/platform_metadata/records",
                    json={"type": "sub_tag", "value": tag, "platform": "klook"},
                    headers=headers
                )
                print(f"✅ Added sub_tag: {tag}")
                count += 1
            except Exception as e:
                print(f"❌ Failed to add {tag}: {e}")

    # Process countries
    for country in countries:
        if ('country', country) not in existing_meta:
            try:
                requests.post(
                    f"{PB_URL}/api/collections/platform_metadata/records",
                    json={"type": "country", "value": country, "platform": "klook"},
                    headers=headers
                )
                print(f"✅ Added country: {country}")
                count += 1
            except Exception as e:
                print(f"❌ Failed to add {country}: {e}")

    print(f"\n🎉 Backfill complete! Added {count} new metadata records.")

if __name__ == "__main__":
    backfill_metadata()
