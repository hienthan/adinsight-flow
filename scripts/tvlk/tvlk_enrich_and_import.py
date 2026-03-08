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

# Add global lib and local lib to path
import sys
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'lib'))  # ../lib for geo_engine
sys.path.append(os.path.join(os.path.dirname(__file__), 'lib'))                  # ./lib for tvlk specific

from geo_engine import engine as geo_engine
from tvlk_affiliate_scorer import evaluate_url

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

# Load exclude keywords
EXCLUDE_PATTERNS = []
FATAL_PATTERNS = []
FATAL_CATEGORIES = {"local_commuter_transport", "utility_and_bills", "gaming_topup", "local_cinema"}

try:
    with open(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'lib', 'exclude_keywords.json'), 'r') as f:
        exclude_data = json.load(f)
        for category, words in exclude_data.items():
            for kw in words:
                escaped_kw = re.escape(kw).replace(r'\-', r'[\s\-]')
                pattern = r'\b' + escaped_kw + r'(?:s|\'s|es)?\b'
                compiled = re.compile(pattern, re.IGNORECASE)
                
                if category in FATAL_CATEGORIES:
                    FATAL_PATTERNS.append(compiled)
                else:
                    EXCLUDE_PATTERNS.append(compiled)
except Exception as e:
    print(f"Warning: Failed to load exclude_keywords.json - {e}")

# Load safe (allowlist) keywords
SAFE_KEYWORDS = []
try:
    with open(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'lib', 'safe_travel_keywords.json'), 'r') as f:
        safe_data = json.load(f)
        for category, words in safe_data.items():
            SAFE_KEYWORDS.extend(words)
except Exception as e:
    print(f"Warning: Failed to load safe_travel_keywords.json - {e}")

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
        
    # Check cache first (convert to lowercase for robust matching)
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
            
            result = "".join(translated_parts).strip()
            
            # Save new translation to in-memory cache
            if result:
                with cache_lock:
                    TRANSLATION_CACHE[text_lower] = result
                    
            return result
    except Exception:
        pass
    return ""

def get_taxonomy(slug: str, title_en: str, geo_category: str) -> Dict[str, str]:
    """
    Determine content_type and sub_tag using a mix of Geo category overrides and keyword spotting.
    """
    slug_lower = slug.lower()
    title_lower = title_en.lower()
    
    content_type = "poi_landmark"
    sub_tag = "general"
    
    # Geo category overrides
    if geo_category == 'airport':
        content_type = "airport_transfer_or_service"
    elif geo_category == 'station':
        content_type = "train_station"
    elif geo_category == 'seaport':
        content_type = "seaport"
    elif geo_category == 'landmark':
        content_type = "poi_landmark"
    elif geo_category == 'resort_area':
        content_type = "resort"
    elif geo_category == 'shopping_district':
        content_type = "shopping"
        
    # Keyword overrides
    if "itinerary" in slug_lower or "itinerary" in title_lower:
        content_type = "travel_guide"
        sub_tag = "itinerary"
    elif "visa" in slug_lower or "paspor" in slug_lower:
        content_type = "travel_document"
        sub_tag = "visa"
    elif "bus" in title_lower or "-trp" in slug_lower[-5:]:
        content_type = "transport_guide"
        sub_tag = "bus"
    elif "train" in title_lower or "kereta" in slug_lower:
        content_type = "transport_guide"
        sub_tag = "train"
    elif "mrt" in slug_lower or "lrt" in slug_lower:
        content_type = "transport_guide"
        sub_tag = "local_transit"
    elif "kuliner" in slug_lower or "makanan" in slug_lower or "cafe" in slug_lower:
        content_type = "food_lifestyle"
        sub_tag = "food"
    elif "spa" in slug_lower or "massage" in slug_lower:
        content_type = "beauty_spa"
        sub_tag = "spa"
    elif "tour" in slug_lower or "-ta" in slug_lower[-4:]:
        content_type = "tour_activity"
        sub_tag = "tour"
    elif "hotel" in slug_lower or "-acc" in slug_lower[-5:]:
        content_type = "accommodation"
        sub_tag = "hotel"
        
    return {"content_type": content_type, "sub_tag": sub_tag}

def is_junk_url(slug: str, title_en: str, detected_city: str = "", detected_country: str = "") -> Tuple[bool, bool]:
    """
    Check if the slug or English title contains any of the informational/SEO junk keywords.
    Provides 3-layer verification for better accuracy:
    1. Regex check against EXCLUDE_PATTERNS
    2. Overrides using SAFE_KEYWORDS
    3. Overrides using detected Geo Engine locations (City/Country)
    """
    combined_text = f"{slug} {title_en}"
    combined_lower = combined_text.lower()
    
    # Layer 0: Fatal Exclude Patterns (Absolute Kill - NO RESCUE ALLOWED)
    for pattern in FATAL_PATTERNS:
        if pattern.search(combined_text):
            return True, False
    
    # Layer 1: Check against Exclude Patterns
    is_junk = False
    for pattern in EXCLUDE_PATTERNS:
        if pattern.search(combined_text):
            is_junk = True
            break
            
    # Layer 2: Safe Keywords Allowlist Override
    is_protected = False
    if is_junk:
        for safe_kw in SAFE_KEYWORDS:
            # We use simple substring match for the safe keywords against the combined text,
            # converting hyphens to spaces to match both title_en and slug formats.
            safe_spaced = safe_kw.replace('-', ' ')
            if f"-{safe_kw}-" in f"-{slug.lower()}-" or f" {safe_spaced} " in f" {title_en.lower()} ":
                is_protected = True
                is_junk = False
                break
                
    # Layer 3: Geo Engine Override (Protect any URL that explicitly mentions a real city)
    if is_junk and not is_protected:
        valid_geo_found = False
        # We only use 'City' because 'Country' (like 'Indonesia') is too broad and triggers on almost all ID articles
        if detected_city and detected_city.lower() not in ["", "global", "international", "unknown"]:
            valid_geo_found = True
            
        if valid_geo_found:
            is_protected = True
            is_junk = False

    return is_junk, is_protected

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
        slug_for_translation = slug
        if '-' in raw_slug:
            potential_suffix = raw_slug.split('-')[-1]
            if len(potential_suffix) <= 5 and not potential_suffix.isdigit():
                suffix = f"-{potential_suffix}"
                # Remove useless Traveloka internal suffixes before translation
                if suffix.lower() in ['-ta', '-trp', '-acc']:
                    slug_for_translation = slug[:-len(suffix)]

        # Translation
        title_en = translate_to_en(slug_for_translation.replace('-', ' '))
        
        # Geo Detection
        geo_data = geo_engine.detect_geo_structured(slug, title_en)
        
        # Classification & Math
        taxo = get_taxonomy(raw_slug, title_en, geo_data.get('geo_category', ''))
        scores = evaluate_url(url, raw_slug, geo_data)
        
        # Check Junk Content FIRST before taxonomy assignment
        is_active = True
        is_junk, is_protected = is_junk_url(raw_slug, title_en, geo_data.get('city', ''), geo_data.get('country', ''))
        
        if is_junk:
            is_active = False
            scores["affiliate_tier"] = "excluded"
            scores["dsa_campaign"] = "Exclude_System"
        elif is_protected:
            # Protected TOFU content -> Push to A3/Cookie Dropping if not already high score
            if scores["affiliate_score"] < 2.0:
                scores["affiliate_tier"] = "a3"
                scores["dsa_campaign"] = "Discovery_Broad"
                scores["affiliate_score"] = 2.0
            taxo["content_type"] = "travel_guide"
            taxo["sub_tag"] = "tips_and_tricks"

        return {
            "platform": platform_id,
            "url": url,
            "url_suffix": suffix,
            "slug": slug,
            "slug_en": "", 
            "title_en": title_en,
            "city": geo_data.get('city', ''),
            "sub_city": geo_data.get('sub_city', ''),
            "province": geo_data.get('province', ''),
            "country": geo_data.get('country', ''),
            "geo_category": geo_data.get('geo_category', ''),
            "display_name": geo_data.get('display_name', ''),
            "sitemap_tag": SITEMAP_TAG,
            "content_type": taxo["content_type"],
            "sub_tag": taxo["sub_tag"],
            "canonical_id": canonical_id,
            "language": "id-id",
            "is_active": is_active,
            "affiliate_tier": scores["affiliate_tier"],
            "cpc_risk_score": scores["cpc_risk_score"],
            "cookie_score": scores["cookie_score"],
            "intent_score": scores["intent_score"],
            "affiliate_score": scores["affiliate_score"],
            "time_sensitive": scores["time_sensitive"],
            "dsa_campaign": scores["dsa_campaign"],
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
                    res = requests.patch(f"{pb_url}/api/collections/{COLLECTION_NAME}/records/{rec_id}", 
                                  json=item, headers=headers)
                else:
                    # Create
                    res = requests.post(f"{pb_url}/api/collections/{COLLECTION_NAME}/records", 
                                 json=item, headers=headers)
                                 
                if res.status_code >= 400:
                    print(f"❌ API Error importing {item['url']}: {res.text}")
                else:
                    success += 1
            except Exception as e:
                print(f"❌ Network Error importing {item['url']}: {e}")

    print(f"\n✅ Done! Successfully processed and imported {success} records.")
    
    # Save translation cache to disk
    try:
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(TRANSLATION_CACHE, f, indent=2, ensure_ascii=False)
        print(f"💾 Saved {len(TRANSLATION_CACHE)} translations to cache.")
    except Exception as e:
        print(f"Error saving translation cache: {e}")

if __name__ == "__main__":
    main()
