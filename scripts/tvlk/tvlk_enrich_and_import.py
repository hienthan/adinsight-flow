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
from tvlk_tier_classifier import classify_tvlk_url

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

def classify_content(title_en: str, slug: str) -> Dict[str, str]:
    """
    Classify based on tvlk_tier_classifier tailored for Traveloka Indo.
    """
    # Use the new DSA-focused classifier which returns tier, content_type, funnel, sub_tag
    res = classify_tvlk_url(slug)
    
    # Keyword Overrides (still useful for some specific corner cases not caught by tier regex)
    # E.g., if it's a guide/itinerary that somehow survived the junk filter
    title_lower = title_en.lower()
    slug_lower = slug.lower()
    
    keywords = {
        "itinerary": ("travel_guide", "planning", "itinerary"),
        "visa": ("travel_document", "planning", "visa"),
        "paspor": ("travel_document", "planning", "visa"),
        "bus": ("transport_guide", "planning", "transport"),
        "train": ("transport_guide", "planning", "transport"),
        "mrt": ("transport_guide", "readiness", "transport"),
        "lrt": ("transport_guide", "readiness", "transport"),
        "kuliner": ("food_lifestyle", "awareness", "food"),
        "makanan": ("food_lifestyle", "awareness", "food"),
        "cafe": ("food_lifestyle", "awareness", "food"),
    }

    for kw, (ctype, funnel, stag) in keywords.items():
        # Override only if our base result was Tier 3 (Discovery/POI)
        if (kw in slug_lower or kw in title_lower) and res["tier"] == "3":
            res["content_type"] = ctype
            res["funnel_stage"] = funnel
            res["sub_tag"] = stag
            break

    return res

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
        # logic from 01_TVLK_PAGES.md: if slug is enough, use it for title
        title_en = translate_to_en(slug_for_translation.replace('-', ' '))
        
        # Geo Detection
        country, city = geo_engine.detect_geo(slug, title_en)
        
        # Classification
        taxo = classify_content(title_en, raw_slug)
        
        # Check Junk Content FIRST before taxonomy assignment
        is_active = True
        is_junk, is_protected = is_junk_url(raw_slug, title_en, city, country)
        
        if is_junk:
            is_active = False
            # We don't overwrite content_type or sub_tag anymore, so it's easier to audit
            # We just push it to tier 5 to hide it from DSA campaigns
            taxo["tier"] = "5"
        elif is_protected:
            # This is TOFU content protected by Allowlist - Push to Tier 4
            taxo["tier"] = "4"
            taxo["funnel_stage"] = "awareness"
            taxo["content_type"] = "travel_guide"
            taxo["sub_tag"] = "tips_and_tricks"


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
            "is_active": is_active,
            "tier": taxo["tier"],
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
