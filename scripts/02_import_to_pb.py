import json
import requests
import os
import sys
from concurrent.futures import ThreadPoolExecutor

# --- CONFIG ---
CONCURRENT_THREADS = 15 

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

    auth_url = f"{pb_url}/api/collections/_superusers/auth-with-password"
    resp = requests.post(auth_url, json={"identity": email, "password": password})
    if resp.status_code != 200: return
    token = resp.json()['token']
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    with requests.Session() as session:
        session.headers.update(headers)
        
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
        
        def upsert_record(item):
            search_filter = f"(platform='{platform_id}' && canonical_id='{item['canonical_id']}')"
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
                        # Fallback to language field if languages is null/empty
                        existing_langs = [existing.get('language', 'zh-HK')]
                    
                    new_lang = item.get('language', 'zh-HK')
                    
                    if new_lang not in existing_langs:
                        existing_langs.append(new_lang)
                        
                        # ONLY update languages field - keep all other fields unchanged
                        update_payload = {
                            "languages": existing_langs
                        }
                        session.patch(f"{pb_url}/api/collections/pages/records/{record_id}", json=update_payload)
                        return ("UPDATE_LANG", 200)
                    else:
                        return ("SKIP", 200)  # Language already exists
                else:
                    # NEW record - create with ALL fields
                    payload = {
                        "platform": platform_id,
                        "canonical_id": item['canonical_id'],
                        "language": item['language'],
                        "languages": item.get('languages', [item.get('language', 'zh-HK')]),
                        "content_type": item.get('content_type', 'activity'),
                        "url": item['url'],
                        "slug": item['slug'],
                        "sitemap_tag": item['sitemap_tag'],
                        "country": item['country'],
                        "city": item.get('city', 'Unknown'),
                        "tier": item['tier'],
                        "is_private": item['is_private'],
                        "translated_title_vi": item['translated_title_vi'],
                        "include_for_dsa": item['include_for_dsa'],
                        "exclude_for_dsa": item['exclude_for_dsa'],
                        "metadata": item.get('metadata', None)
                    }
                    session.post(f"{pb_url}/api/collections/pages/records", json=payload)
                    return ("CREATE", 201)
            except Exception as e:
                return ("ERROR", 500)

        with ThreadPoolExecutor(max_workers=CONCURRENT_THREADS) as executor:
            results = list(executor.map(upsert_record, data))
            
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

        print("Verifying standardized platform metadata...")
        for country in sorted(list(countries)):
            session.post(f"{pb_url}/api/collections/platform_metadata/records", json={"platform": platform_id, "type": "country", "value": country})
        
        for name, lang in sitemaps:
            val = f"{name}:{lang}"
            session.post(f"{pb_url}/api/collections/platform_metadata/records", json={"platform": platform_id, "type": "sitemap_tag", "value": val})

    print("Success!")

if __name__ == "__main__":
    if len(sys.argv) >= 3:
        import_to_pb(sys.argv[1], sys.argv[2])
