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

# Add ./lib to path
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), 'lib'))
from geo_engine import engine as geo_engine
from tier_classifier import classify_tier

# --- Constants ---
TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single"
SITEMAP_TAG = "activities" # Default for this file
PLATFORM_NAME = "traveloka"
COLLECTION_NAME = "tvlk_pages"

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
    params = {
        "client": "gtx",
        "sl": source_lang,
        "tl": "en",
        "dt": "t",
        "q": text,
    }
    try:
        # Respectful delay to avoid blocking
        time.sleep(0.1) 
        resp = requests.get(TRANSLATE_URL, params=params, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            translated_parts = []
            if isinstance(data, list) and data and isinstance(data[0], list):
                for seg in data[0]:
                    if isinstance(seg, list) and seg:
                        translated_parts.append(seg[0] or "")
            return "".join(translated_parts).strip()
    except Exception:
        pass
    return ""

def classify_content(title_en: str, slug: str) -> Dict[str, str]:
    """
    Classify based on tvlk_taxonomy.md
    """
    title_lower = title_en.lower()
    slug_lower = slug.lower()
    
    # 1. Default
    result = {
        "content_type": "activity_attraction",
        "funnel_stage": "awareness",
        "sub_tag": "attraction"
    }

    # 2. Suffix Based
    if slug_lower.endswith("-ta"):
        result["content_type"] = "activity_attraction"
    elif slug_lower.endswith("-trp"):
        result["content_type"] = "transport_tour"
        result["funnel_stage"] = "planning"
        result["sub_tag"] = "tour"
    elif slug_lower.endswith("-acc"):
        result["content_type"] = "accommodation"
        result["funnel_stage"] = "planning"
        result["sub_tag"] = "accommodation"

    # 3. Keyword Overrides
    keywords = {
        "itinerary": ("travel_guide", "planning", "itinerary"),
        "visa": ("travel_document", "planning", "visa"),
        "paspor": ("travel_document", "planning", "visa"),
        "bus": ("transport_guide", "readiness", "transport"),
        "train": ("transport_guide", "readiness", "transport"),
        "mrt": ("transport_guide", "readiness", "transport"),
        "lrt": ("transport_guide", "readiness", "transport"),
        "tiket": ("activity_booking", "readiness", "booking"),
        "harga": ("activity_booking", "readiness", "booking"),
        "kuliner": ("food_lifestyle", "awareness", "food"),
        "makanan": ("food_lifestyle", "awareness", "food"),
        "cafe": ("food_lifestyle", "awareness", "food"),
    }

    for kw, (ctype, funnel, stag) in keywords.items():
        if kw in slug_lower or kw in title_lower:
            result["content_type"] = ctype
            result["funnel_stage"] = funnel
            result["sub_tag"] = stag
            break

    return result

# --- Core Enrichment ---

def process_url(url: str, platform_id: str) -> Optional[Dict]:
    try:
        path = urlparse(url).path.rstrip('/')
        parts = path.split('/')
        if len(parts) < 2: return None
        
        # Canonical ID is usually the last part if numeric
        id_part = parts[-1]
        raw_slug = parts[-2] if id_part.isdigit() else id_part
        canonical_id = id_part if id_part.isdigit() else ""
        
        # Clean slug for display/translation
        slug = unquote(raw_slug)
        
        # Extract suffix if exists
        suffix = ""
        if '-' in raw_slug:
            potential_suffix = raw_slug.split('-')[-1]
            if len(potential_suffix) <= 5 and not potential_suffix.isdigit():
                suffix = f"-{potential_suffix}"

        # Translation
        # logic from 01_TVLK_PAGES.md: if slug is enough, use it for title
        title_en = translate_to_en(slug.replace('-', ' '))
        
        # Geo Detection
        country, city = geo_engine.detect_geo(slug)
        
        # Classification
        taxo = classify_content(title_en, raw_slug)

        return {
            "platform": platform_id,
            "url": url,
            "url_suffix": suffix,
            "slug": slug,
            "slug_en": "", # We might not need separate slug_en for TVLK as per notes
            "title_en": title_en,
            "city": city,
            "country": country,
            "sitemap_tag": SITEMAP_TAG,
            "content_type": taxo["content_type"],
            "funnel_stage": taxo["funnel_stage"],
            "sub_tag": taxo["sub_tag"],
            "canonical_id": canonical_id,
            "language": "id-id",
            "is_active": True,
            "tier": classify_tier(raw_slug),
            "metadata": {
                "raw_slug": raw_slug,
                "processed_at": time.strftime("%Y-%m-%d %H:%M:%S")
            }
        }
    except Exception as e:
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

    # 1. Auth & Setup
    info = get_pb_info()
    if not info:
        print("❌ Error: No pb_info.txt found")
        return
        
    pb_url = info['pb_url']
    token = authenticate(pb_url, info['email'], info['password'])
    if not token:
        print("❌ Auth failed")
        return
        
    # Get Platform ID for 'traveloka'
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{pb_url}/api/collections/platforms/records?filter=(key='{PLATFORM_NAME}')", headers=headers)
    if resp.status_code != 200 or not resp.json().get('items'):
        print(f"❌ Platform '{PLATFORM_NAME}' not found in DB")
        return
    platform_id = resp.json()['items'][0]['id']

    # 2. Read URLs
    with open(args.input, 'r') as f:
        urls = [line.strip() for line in f if line.strip()]
    
    if args.offset:
        urls = urls[args.offset:]
    if args.limit:
        urls = urls[:args.limit]

    print(f"--- Processing {len(urls)} URLs ---")
    
    results = []
    # Using ThreadPool for faster translation calls
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

    # 3. Batch Import
    print(f"--- Importing {len(results)} records to {COLLECTION_NAME} ---")
    success = 0
    for i in range(0, len(results), args.batch):
        batch = results[i:i + args.batch]
        # PocketBase doesn't have a single batch create API for records without SDK
        # We'll just loop for now, or use a custom endpoint if exists.
        # But for correctness in this environment, individual calls are safer.
        for item in batch:
            try:
                # Upsert logic based on URL (Unique field)
                # First check if exists
                check_resp = requests.get(
                    f"{pb_url}/api/collections/{COLLECTION_NAME}/records?filter=(url='{item['url']}')",
                    headers=headers
                )
                
                if check_resp.status_code == 200 and check_resp.json().get('items'):
                    # Update
                    rec_id = check_resp.json()['items'][0]['id']
                    requests.patch(f"{pb_url}/api/collections/{COLLECTION_NAME}/records/{rec_id}", 
                                  json=item, headers=headers)
                else:
                    # Create
                    requests.post(f"{pb_url}/api/collections/{COLLECTION_NAME}/records", 
                                 json=item, headers=headers)
                success += 1
            except Exception as e:
                print(f"Error importing {item['url']}: {e}")

    print(f"\n✅ Done! Successfully processed and imported {success} records.")

if __name__ == "__main__":
    main()
