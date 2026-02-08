import re
import json
import os
import sys
from lib.geo_engine import engine as geo_engine

def translate_slug(slug):
    """Convert slug to human-readable title (remove dashes, title case)"""
    clean_slug = re.sub(r'^\d+-', '', slug)
    clean_text = clean_slug.replace('-', ' ')
    if not clean_text: return ""
    return clean_text.title()

def extract_sub_tag(url):
    """Extract transport type from URL pattern: /zh-XX/{sub_tag}/..."""
    match = re.search(r'/zh-[A-Z]{2}/([^/]+)/', url)
    if match:
        return match.group(1)
    return ""

def classify_mobility_tier(sub_tag):
    """
    Tier classification for mobility URLs based on transport type
    Tier 1: Rail/train (high booking intent)
    Tier 2: Bus/ferry (medium intent)
    Tier 3: Other transport
    """
    sub_tag_lower = sub_tag.lower()
    
    # Tier 1: Rail services
    if any(keyword in sub_tag_lower for keyword in ['rail', 'train', 'shinkansen', 'high-speed']):
        return "1"
    
    # Tier 2: Bus and ferry services
    if any(keyword in sub_tag_lower for keyword in ['bus', 'ferry', 'boat']):
        return "2"
    
    # Tier 3: Other transport
    return "3"

def detect_mobility_geo(url, sub_tag):
    """
    Detect country and city from mobility URL
    Strategy:
    1. Try to extract location from route parts
    2. Fallback to sub_tag analysis (e.g., japan-rail -> Japan)
    3. Use geo_engine for known location keywords
    """
    # Extract the route portion after sub_tag
    pattern = rf'/zh-[A-Z]{{2}}/{re.escape(sub_tag)}/(.+?)/?$'
    match = re.search(pattern, url)
    
    if match:
        route_string = match.group(1)
        # Try to detect geo from the route string using existing engine
        country, city = geo_engine.detect_geo(route_string)
        
        if country != "Unknown":
            return country, city
    
    # Fallback: analyze sub_tag itself
    # e.g., "japan-rail" -> "Japan"
    tag_parts = sub_tag.lower().split('-')
    for part in tag_parts:
        if len(part) < 3:
            continue
        country, city = geo_engine.detect_geo(part)
        if country != "Unknown":
            return country, city
    
    return "Unknown", "Unknown"

def process_mobility_url(url, tag_name, lang="zh-HK"):
    """
    Process a single mobility URL and extract metadata
    
    Mobility URLs have pattern:
    https://www.klook.com/zh-HK/{transport-type}/{route-info}/
    
    Key differences from activity URLs:
    - canonical_id is always "0" (no unique ID in URL)
    - sub_tag is the transport type
    - slug is the full route information
    """
    # Extract language if present in URL
    lang_match = re.search(r'/zh-([A-Z]{2})/', url)
    if lang_match:
        detected_lang = f"zh-{lang_match.group(1)}"
        lang = detected_lang
    
    # Extract sub_tag (transport type)
    sub_tag = extract_sub_tag(url)
    if not sub_tag:
        return None
    
    # Extract slug (everything after sub_tag)
    pattern = rf'/zh-[A-Z]{{2}}/{re.escape(sub_tag)}/(.+?)/?$'
    match = re.search(pattern, url)
    if not match:
        return None
    
    slug = match.group(1).rstrip('/')
    
    # STRATEGY CHANGE (Option A): 
    # Use canonical_id="0" for ALL mobility URLs.
    # Use FULL PATH as slug for uniqueness.
    # This robustly handles simple paths AND complex routes.
    canonical_id = "0"
    
    # Detect location
    country, city = detect_mobility_geo(url, sub_tag)
    
    # Classify tier based on transport type
    tier = classify_mobility_tier(sub_tag)
    
    # Translate slug to smart title
    translated_title = translate_slug(slug)
    
    # Detect location
    country, city = detect_mobility_geo(url, sub_tag)
    
    # Classify tier based on transport type
    tier = classify_mobility_tier(sub_tag)
    
    # Translate slug to smart title
    translated_title = translate_slug(slug)
    
    return {
        "canonical_id": canonical_id,
        "language": lang,
        "languages": [lang],
        "content_type": "mobility",
        "url": url,
        "slug": slug,
        "sitemap_tag": tag_name,
        "sub_tag": sub_tag,
        "country": country,
        "city": city,
        "tier": tier,
        "is_private": False,  # Mobility URLs are typically not private
        "translated_title_vi": translated_title,
        "include_for_dsa": tier in ["1", "2"],
        "exclude_for_dsa": tier == "3"
    }

def main_process(file_path, tag_name, lang="zh-HK"):
    """
    Process mobility URLs file and generate JSON output
    """
    print(f"Processing mobility URLs: {file_path} (language: {lang})")
    records = []
    
    # Check if it's XML or TXT
    if file_path.endswith('.xml'):
        import xml.etree.ElementTree as ET
        tree = ET.parse(file_path)
        root = tree.getroot()
        namespace = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        urls = [n.text for n in root.findall('.//ns:loc', namespace)]
    else:
        # Assume raw text file with one URL per line
        with open(file_path, 'r', encoding='utf-8') as f:
            urls = [line.strip() for line in f if line.strip()]
    
    print(f"Found {len(urls)} URLs. Processing...")
    
    for url in urls:
        rec = process_mobility_url(url, tag_name, lang)
        if rec:
            records.append(rec)
            if len(records) % 1000 == 0:
                print(f"Processed {len(records)} records...")
    
    # Save results
    os.makedirs('data', exist_ok=True)
    out_path = f'data/klook_{tag_name}_{lang}_preview.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Done! Saved {len(records)} records to {out_path}")
    
    # Print statistics
    sub_tags = {}
    for rec in records:
        sub_tag = rec.get('sub_tag', 'unknown')
        sub_tags[sub_tag] = sub_tags.get(sub_tag, 0) + 1
    
    print("\n📊 Sub-tag Distribution:")
    for tag, count in sorted(sub_tags.items(), key=lambda x: -x[1]):
        print(f"  {tag}: {count}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 scripts/06_klook_mobility_ingest.py <file_path> <tag_name> [language]")
        print("Example: python3 scripts/06_klook_mobility_ingest.py sitemap-sample/klook/mobility-urls.txt mobility zh-HK")
    else:
        lang = sys.argv[3] if len(sys.argv) > 3 else "zh-HK"
        main_process(sys.argv[1], sys.argv[2], lang)
