import json
import requests
import os
import sys
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

# --- CONFIG ---
CONCURRENT_THREADS = 15 
RECENT_YEAR = 2025


def is_unknown_geo(value):
    return (value or "").strip().lower() in {"", "unknown", "n/a", "na", "-"}


def geo_score(country, city):
    score = 0
    if not is_unknown_geo(country):
        score += 2  # prioritize country quality
    if not is_unknown_geo(city):
        score += 1
    return score


def should_patch_geo(old_country, old_city, new_country, new_city):
    old_s = geo_score(old_country, old_city)
    new_s = geo_score(new_country, new_city)
    return new_s > old_s


def detect_year(text):
    if not text:
        return ""
    if "2025" in text:
        return "2025"
    m = re.search(r"(20\d{2})", text)
    return m.group(1) if m else ""


def derive_tier_from_title(stage, translated_title):
    year = detect_year(translated_title)
    if year:
        y = int(year)
        if y == RECENT_YEAR:
            return "4", year, "year_override"
        if y < RECENT_YEAR:
            return "5", year, "year_override"
    base_map = {
        "readiness": "1",
        "planning": "2",
        "awareness": "3",
    }
    return base_map.get(stage or "awareness", "3"), year, "funnel_stage"

def get_pb_info():
    info = {}
    try:
        with open('db/pb_info.txt', 'r') as f:
            for line in f:
                if ':' in line:
                    k, v = line.split(':', 1)
                    info[k.strip()] = v.strip()
    except: pass
    return info

def import_to_pb(json_path, platform_key):
    info = get_pb_info()
    pb_url = info.get('pb_url', 'http://127.0.0.1:8090')
    email = info.get('email')
    password = info.get('password')

    # Use _superusers collection for admin auth (confirmed in PocketBase v0.35.0)
    auth_url = f"{pb_url}/api/collections/_superusers/auth-with-password"
    print(f"Authenticating as superuser...")
    print(f"  Email: {email}")
    resp = requests.post(auth_url, json={"identity": email, "password": password})
    
    if resp.status_code != 200:
        print(f"❌ Authentication failed (HTTP {resp.status_code})")
        print(f"   URL: {auth_url}")
        print(f"   Response: {resp.text[:300]}")
        return
    
    token = resp.json()['token']
    print("✅ Authentication successful")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    with requests.Session() as session:
        session.headers.update(headers)
        
        pages_fields = set()
        pages_schema_resp = session.get(f"{pb_url}/api/collections/pages")
        if pages_schema_resp.status_code == 200:
            try:
                schema_data = pages_schema_resp.json()
                for f in schema_data.get('fields', []):
                    name = f.get('name')
                    if name:
                        pages_fields.add(name)
            except Exception:
                pass
        
        def has_field(field_name):
            # Fallback to True if schema couldn't be loaded
            return not pages_fields or field_name in pages_fields
        
        plat_resp = session.get(f"{pb_url}/api/collections/platforms/records?filter=(key='{platform_key}')")
        if plat_resp.status_code != 200 or plat_resp.json().get('totalItems', 0) == 0:
            create_plat = session.post(f"{pb_url}/api/collections/platforms/records", json={"key": platform_key, "name": platform_key.capitalize()})
            platform_id = create_plat.json()['id']
        else:
            platform_id = plat_resp.json()['items'][0]['id']
        
        if not os.path.exists(json_path): return
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        print(f"Starting IDEMPOTENT Upsert of {len(data)} records...")
        
        countries = set()
        sitemaps = set()
        sub_tags = set()  # NEW: track sub_tags for metadata
        
        def upsert_record(item):
            """
            Upsert record with multi-language deduplication.
            
            Dedup Key Strategy:
            - URLs with canonical_id: (platform, canonical_id)
            - URLs without canonical_id (e.g., mobility): (platform, sitemap_tag, sub_tag, slug)
            
            This ensures same landing page across languages = one record with merged languages array.
            """
            canonical_id = item['canonical_id']
            
            # Define deduplication search filter based on URL type
            if canonical_id and canonical_id != "0":
                # Activity URLs: Use canonical_id (numeric ID from URL)
                search_filter = f"(platform='{platform_id}' && canonical_id='{canonical_id}')"
            else:
                # Mobility/Blog URLs: Use slug-based composite key
                sitemap_tag = item.get('sitemap_tag', '')
                sub_tag = item.get('sub_tag', '')
                slug = item.get('slug', '')
                search_filter = f"(platform='{platform_id}' && sitemap_tag='{sitemap_tag}' && sub_tag='{sub_tag}' && slug='{slug}')"
            
            # Search for existing record
            search_resp = session.get(f"{pb_url}/api/collections/pages/records", params={"filter": search_filter, "perPage": 1})
            
            try:
                search_data = search_resp.json()
                if search_data.get('totalItems', 0) > 0:
                    # Record EXISTS - ONLY update languages array
                    existing = search_data['items'][0]
                    record_id = existing['id']
                    
                    # Merge languages array
                    existing_langs = existing.get('languages', [])
                    if not existing_langs:
                        # Fallback if languages is null/empty
                        existing_langs = []
                    
                    new_lang = item.get('language', 'zh-HK')
                    update_payload = {}

                    if new_lang not in existing_langs:
                        existing_langs.append(new_lang)
                        update_payload["languages"] = existing_langs

                    # Scope-limited geo patch for Klook blog zh-HK.
                    is_klook_blog_zhhk = (
                        platform_key == "klook"
                        and item.get("sitemap_tag", "") == "blog"
                        and ("zh-HK" in (item.get("languages", []) or []) or item.get("language") == "zh-HK")
                    )

                    if is_klook_blog_zhhk:
                        old_country = existing.get("country", "Unknown")
                        old_city = existing.get("city", "Unknown")
                        new_country = item.get("country", "Unknown")
                        new_city = item.get("city", "Unknown")
                        metadata_updates = {}

                        if should_patch_geo(old_country, old_city, new_country, new_city):
                            update_payload["country"] = new_country
                            update_payload["city"] = new_city
                            metadata_updates["geo_source"] = item.get("metadata", {}).get("geo_source", "unknown")
                            metadata_updates["geo_updated_at"] = datetime.now(timezone.utc).isoformat()

                        new_stage = item.get("funnel_stage")
                        old_stage = existing.get("funnel_stage")
                        if has_field("funnel_stage") and new_stage and new_stage != old_stage:
                            update_payload["funnel_stage"] = new_stage
                            metadata_updates["funnel_source"] = item.get("metadata", {}).get("funnel_source", "translated_title_vi")
                            metadata_updates["funnel_rule_hit"] = item.get("metadata", {}).get("funnel_rule_hit", "")
                            metadata_updates["funnel_updated_at"] = datetime.now(timezone.utc).isoformat()

                        # Recompute tier from translated_title_vi to avoid stale/missing year overrides.
                        existing_title = existing.get("translated_title_vi") or item.get("translated_title_vi", "")
                        stage_for_tier = new_stage or old_stage or "awareness"
                        tier_from_title, year_detected, tier_source = derive_tier_from_title(stage_for_tier, existing_title)
                        new_tier = tier_from_title
                        old_tier = existing.get("tier")
                        if new_tier and new_tier != old_tier:
                            update_payload["tier"] = new_tier
                            metadata_updates["tier_source"] = tier_source
                            metadata_updates["year_detected"] = year_detected
                            metadata_updates["tier_updated_at"] = datetime.now(timezone.utc).isoformat()

                        if metadata_updates and has_field("metadata"):
                            existing_meta = existing.get("metadata") if isinstance(existing.get("metadata"), dict) else {}
                            next_meta = dict(existing_meta)
                            next_meta.update(metadata_updates)
                            update_payload["metadata"] = next_meta

                    if update_payload:
                        session.patch(f"{pb_url}/api/collections/pages/records/{record_id}", json=update_payload)
                        if "country" in update_payload or "city" in update_payload:
                            return ("UPDATE_GEO", 200)
                        if "funnel_stage" in update_payload:
                            return ("UPDATE_FUNNEL", 200)
                        if "tier" in update_payload:
                            return ("UPDATE_TIER", 200)
                        return ("UPDATE_LANG", 200)
                    return ("SKIP", 200)
            except Exception as e:
                pass  # Fall through to create
            
            # Create NEW record (either canonical_id=0 OR no existing match)
            try:
                payload = {
                    "platform": platform_id,
                    "canonical_id": item['canonical_id'],
                    "languages": item.get('languages', [item.get('language', 'zh-HK')]),
                    "content_type": item.get('content_type', 'activity'),
                    "url": item['url'],
                    "slug": item['slug'],
                    "decoded_slug": item.get('decoded_slug', item.get('slug', '')),
                    "sitemap_tag": item['sitemap_tag'],
                    "sub_tag": item.get('sub_tag', ''),  # NEW: sub_tag field for mobility URLs
                    "country": item['country'],
                    "city": item.get('city', 'Unknown'),
                    "tier": item['tier'],
                    "is_private": item['is_private'],
                    "translated_title_vi": item['translated_title_vi'],
                    "include_for_dsa": item['include_for_dsa'],
                    "exclude_for_dsa": item['exclude_for_dsa'],
                    "metadata": item.get('metadata', None)
                }
                if has_field("language"):
                    payload["language"] = item.get('language', 'zh-HK')
                if has_field("funnel_stage"):
                    payload["funnel_stage"] = item.get('funnel_stage', 'awareness')
                resp = session.post(f"{pb_url}/api/collections/pages/records", json=payload)
                
                # CRITICAL: Check response status
                if resp.status_code not in [200, 201]:
                    error_detail = resp.text
                    print(f"❌ ERROR creating record (HTTP {resp.status_code}): {error_detail}")
                    print(f"   URL: {item.get('url', 'unknown')}")
                    print(f"   Payload: {payload}")
                    return ("ERROR", resp.status_code)
                
                return ("CREATE", 201)
            except Exception as e:
                print(f"❌ EXCEPTION creating record: {e}")
                print(f"   URL: {item.get('url', 'unknown')}")
                return ("ERROR", 500)

        with ThreadPoolExecutor(max_workers=CONCURRENT_THREADS) as executor:
            results = list(executor.map(upsert_record, data))
        
        # Count and log results
        create_count = sum(1 for r in results if r[0] == "CREATE")
        update_count = sum(1 for r in results if r[0] == "UPDATE_LANG")
        update_geo_count = sum(1 for r in results if r[0] == "UPDATE_GEO")
        update_funnel_count = sum(1 for r in results if r[0] == "UPDATE_FUNNEL")
        update_tier_count = sum(1 for r in results if r[0] == "UPDATE_TIER")
        skip_count = sum(1 for r in results if r[0] == "SKIP")
        error_count = sum(1 for r in results if r[0] == "ERROR")
        
        print(f"\n📊 Import Results:")
        print(f"  ✅ Created: {create_count}")
        print(f"  🔄 Updated: {update_count}")
        print(f"  🧭 Geo Updated: {update_geo_count}")
        print(f"  🎯 Funnel Updated: {update_funnel_count}")
        print(f"  🏷️ Tier Updated: {update_tier_count}")
        print(f"  ⏭️  Skipped: {skip_count}")
        print(f"  ❌ Errors: {error_count}")
            
        print(f"Sync complete.")

        # 5. Refresh Metadata
        print("Cleaning and refreshing platform metadata...")
        meta_all = []
        page = 1
        while True:
            r = session.get(f"{pb_url}/api/collections/platform_metadata/records", params={"filter": f"platform='{platform_id}'", "page": page, "perPage": 200})
            items = r.json().get('items', [])
            if not items: break
            meta_all.extend(items)
            page += 1
        
        for m in meta_all:
            session.delete(f"{pb_url}/api/collections/platform_metadata/records/{m['id']}")

        for item in data:
            countries.add(item['country']) # Include Unknown for debugging
            sitemaps.add((item['sitemap_tag'], item['language']))
            # Collect sub_tags if present
            if item.get('sub_tag'):
                sub_tags.add(item['sub_tag'])

        print(f"Collected {len(sub_tags)} unique sub_tags: {sub_tags}")

        print("Verifying standardized platform metadata...")
        for country in sorted(list(countries)):
            session.post(f"{pb_url}/api/collections/platform_metadata/records", json={"platform": platform_id, "type": "country", "value": country})
        
        for name, lang in sitemaps:
            val = f"{name}:{lang}"
            session.post(f"{pb_url}/api/collections/platform_metadata/records", json={"platform": platform_id, "type": "sitemap_tag", "value": val})
        
        # Add sub_tag metadata
        for tag in sorted(list(sub_tags)):
            session.post(f"{pb_url}/api/collections/platform_metadata/records", json={"platform": platform_id, "type": "sub_tag", "value": tag})


    print("Success!")

if __name__ == "__main__":
    if len(sys.argv) >= 3:
        import_to_pb(sys.argv[1], sys.argv[2])
