#!/usr/bin/env python3
import json
import os
import re
import time
import requests
import argparse
from typing import List, Dict, Optional, Tuple
from urllib.parse import unquote, urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

# Add global lib and local libs to path
import sys
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'lib'))  # ../lib for geo_engine
sys.path.append(os.path.join(os.path.dirname(__file__), 'url_classifier_v5'))     # V5 engine path

from geo_engine import engine as global_geo_engine
from engine import ClassifierEngine

# --- Setup V5 Engine ---
base_dir = os.path.dirname(__file__)
stopwords_path = os.path.join(base_dir, "geo_kb", "geo_stopwords.json")
exclude_path = os.path.join(base_dir, "..", "lib", "exclude_keywords.json")
geo_kb_dir = os.path.join(base_dir, "geo_kb")
intent_kw_path = os.path.join(base_dir, "intent-detection", "intent_keywords.json")
intent_pat_path = os.path.join(base_dir, "intent-detection", "travel_pattern_signals.json")
content_tax_path = os.path.join(base_dir, "intent-detection", "content_taxonomy.json")

v5_engine = ClassifierEngine(
    stopwords_path=stopwords_path,
    exclude_keywords_path=exclude_path,
    geo_kb_dir=geo_kb_dir,
    intent_keywords_path=intent_kw_path,
    intent_patterns_path=intent_pat_path,
    content_taxonomy_path=content_tax_path
)

# --- Constants ---
TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single"
SITEMAP_TAG = "activities" # Default for this file
PLATFORM_NAME = "traveloka"
COLLECTION_NAME = "tvlk_pages"

# --- Load Translation Cache ---
CACHE_FILE = os.path.join(os.path.dirname(__file__), 'lib', 'id_en_cache.json')
TRANSLATION_CACHE = {}
if os.path.exists(CACHE_FILE):
    try:
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            TRANSLATION_CACHE = json.load(f)
    except Exception as e:
        print(f"Warning: Failed to load translation cache: {e}")

# Use a lock to prevent race conditions during cache updates
cache_lock = threading.Lock()

# The 3-Layer Junk URL Rescue is now natively processed inside slug_parser.py

# --- Common Utilities ---
def get_pb_info():
    info = {}
    try:
        with open('db/pb_info.txt', 'r') as f:
            for line in f:
                if ':' in line:
                    k, v = line.split(':', 1)
                    info[k.strip()] = v.strip()
    except Exception:
        return None
    return info

def authenticate(pb_url, email, password):
    auth_url = f"{pb_url}/api/collections/_superusers/auth-with-password"
    try:
        resp = requests.post(auth_url, json={"identity": email, "password": password}, timeout=10)
        if resp.status_code == 200:
            return resp.json().get('token')
    except Exception:
        pass
    return None

def translate_to_en(text: str, source_lang: str = "id") -> str:
    if not text:
        return ""
        
    text_lower = text.lower()
    with cache_lock:
        if text_lower in TRANSLATION_CACHE:
            return TRANSLATION_CACHE[text_lower]
            
    params = {
        "client": "gtx",
        "sl": source_lang,
        "tl": "en",
        "dt": "t",
        "q": text,
    }
    try:
        time.sleep(0.1) 
        resp = requests.get(TRANSLATE_URL, params=params, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            translated_parts = []
            if isinstance(data, list) and data and isinstance(data[0], list):
                for seg in data[0]:
                    if isinstance(seg, list) and seg:
                        translated_parts.append(seg[0] or "")
            
            result = "".join(translated_parts).strip()
            
            if result:
                with cache_lock:
                    TRANSLATION_CACHE[text_lower] = result
                    
            return result
    except Exception:
        pass
    return ""

def process_url(url: str, platform_id: str) -> Optional[Dict]:
    try:
        path = urlparse(url).path.rstrip('/')
        parts = path.split('/')
        if len(parts) < 2: return None
        
        id_part = parts[-1]
        raw_slug = parts[-2] if id_part.isdigit() else id_part
        canonical_id = id_part if id_part.isdigit() else ""
        slug = unquote(raw_slug)
        
        suffix = ""
        slug_for_translation = slug
        if '-' in raw_slug:
            potential_suffix = raw_slug.split('-')[-1]
            if len(potential_suffix) <= 5 and not potential_suffix.isdigit():
                suffix = f"-{potential_suffix}"
                if suffix.lower() in ['-ta', '-trp', '-acc']:
                    slug_for_translation = slug[:-len(suffix)]

        # 1. Threaded Google Translate Caching
        title_en = translate_to_en(slug_for_translation.replace('-', ' '))
        
        # 2. V5 Engine Execution
        v5_res = v5_engine.process_url(url)
        
        final_city = v5_res["city"]
        final_province = v5_res["province"]
        final_country = v5_res["country"]
        final_entity = v5_res["geo_entity"]
        geo_type = v5_res["geo_type"]
        
        # 3. Global Geo Fallback Integration
        # If V5 Indo Geo missed, we consult the global geo NLP on the title_en & slug
        if not final_entity or geo_type == "legacy":
            global_geo_data = global_geo_engine.detect_geo_structured(slug, title_en)
            if global_geo_data.get('country') and global_geo_data['country'] != "Unknown":
                final_country = global_geo_data.get('country')
                final_city = global_geo_data.get('city', "")
                final_province = global_geo_data.get('province', "")
                final_entity = final_city if final_city else final_country
                geo_type = "global_nlp"
                v5_res["geo_entity"] = final_entity
                v5_res["city"] = final_city
                v5_res["province"] = final_province
                v5_res["country"] = final_country
                v5_res["geo_type"] = geo_type
                
                # Regenerate DSA Campaign with global fallbacks
                v5_res["dsa_campaign"] = v5_engine.scorer.generate_dsa_campaign(
                    v5_res["intent_primary"], geo_type, final_province, final_city, final_entity
                )

        # Apply default fallbacks for missing geo values
        final_city = final_city if final_city else "Unknown"
        final_province = final_province if final_province else "Unknown"
        final_country = final_country if final_country else "Unknown"
        final_entity = final_entity if final_entity else "Unknown"
        
        # 4. Map output to original Pocketbase Schema requirements
        return {
            "platform": platform_id,
            "url": url,
            "url_suffix": suffix,
            "slug": slug,
            "slug_en": "", 
            "title_en": title_en,
            "city": final_city,
            "sub_city": "Unknown", # V5 currently doesn't map Sub City natively, defaults Unknown
            "province": final_province,
            "country": final_country,
            "geo_category": geo_type,
            "geo_entity": final_entity,
            "geo_type": geo_type,
            "geo_score": v5_res.get("geo_score", 0),
            "entity_count": v5_res.get("entity_count", 0),
            "display_name": final_entity,
            "sitemap_tag": SITEMAP_TAG,
            "content_type": v5_res["content_type"],
            "sub_tag": v5_res["sub_tag"],
            "canonical_id": canonical_id,
            "language": "id-id",
            "is_active": v5_res["is_active"],
            "affiliate_tier": "a1" if v5_res["final_score"] > 8 else "a2", # Simplified tiering
            "cpc_risk_score": 0.0,
            "cookie_score": 0.0,
            "intent_score": v5_res["intent_score"],
            "affiliate_score": v5_res["final_score"],
            "intent_primary": v5_res["intent_primary"],
            "intent_type": v5_res["intent_primary"],
            "intent_patterns": v5_res.get("detected_patterns", []),
            "infra_type": v5_res.get("infra_type", ""),
            "travel_distance_bias": "regional",
            "intent_match_risk": 0.5,
            "time_sensitive": "",
            "dsa_campaign": v5_res["dsa_campaign"],
            "slug_tokens": v5_res.get("slug_tokens", []),
            "detected_keywords": v5_res.get("detected_keywords", []),
            "detected_patterns": v5_res.get("detected_patterns", []),
            "metadata": {
                "raw_slug": raw_slug,
                "processed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "v5_patterns": v5_res.get("detected_patterns", []),
                "v5_planning_signal": v5_res.get("planning_signal", 0)
            }
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error processing {url}: {e}")
        return None

# --- Main Flow ---

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="sitemap-sample/tvlk/cleaned_activities.txt")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--batch", type=int, default=50)
    args = parser.parse_args()

    info = get_pb_info()
    if not info:
        print("❌ Error: No pb_info.txt found")
        return
        
    pb_url = info['pb_url']
    token = authenticate(pb_url, info['email'], info['password'])
    if not token:
        print("❌ Auth failed")
        return
        
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{pb_url}/api/collections/platforms/records?filter=(key='{PLATFORM_NAME}')", headers=headers)
    if resp.status_code != 200 or not resp.json().get('items'):
        print(f"❌ Platform '{PLATFORM_NAME}' not found in DB")
        return
    platform_id = resp.json()['items'][0]['id']

    with open(args.input, 'r') as f:
        urls = [line.strip() for line in f if line.strip()]
    
    if args.offset:
        urls = urls[args.offset:]
    if args.limit:
        urls = urls[:args.limit]

    print(f"--- Processing {len(urls)} URLs with V5 Engine ---")
    
    results = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(process_url, url, platform_id): url for url in urls}
        count = 0
        for future in as_completed(futures):
            res = future.result()
            if res:
                results.append(res)
            count += 1
            if count % 10 == 0:
                print(f"Enriched {count}/{len(urls)}...")

    print(f"--- Importing {len(results)} records to {COLLECTION_NAME} ---")
    success = 0
    for i in range(0, len(results), args.batch):
        batch = results[i:i + args.batch]
        for item in batch:
            try:
                check_resp = requests.get(
                    f"{pb_url}/api/collections/{COLLECTION_NAME}/records?filter=(url='{item['url']}')",
                    headers=headers
                )
                
                if check_resp.status_code == 200 and check_resp.json().get('items'):
                    rec_id = check_resp.json()['items'][0]['id']
                    res = requests.patch(f"{pb_url}/api/collections/{COLLECTION_NAME}/records/{rec_id}", 
                                  json=item, headers=headers)
                else:
                    res = requests.post(f"{pb_url}/api/collections/{COLLECTION_NAME}/records", 
                                 json=item, headers=headers)
                                 
                if res.status_code >= 400:
                    print(f"❌ API Error importing {item['url']}: {res.text}")
                else:
                    success += 1
            except Exception as e:
                print(f"❌ Network Error importing {item['url']}: {e}")

    print(f"\n✅ Done! Successfully processed and imported {success} records using V5 Engine.")
    
    try:
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(TRANSLATION_CACHE, f, indent=2, ensure_ascii=False)
        print(f"💾 Saved {len(TRANSLATION_CACHE)} translations to cache.")
    except Exception as e:
        print(f"Error saving translation cache: {e}")

if __name__ == "__main__":
    main()
