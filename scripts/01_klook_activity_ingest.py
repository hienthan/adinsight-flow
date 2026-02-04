import xml.etree.ElementTree as ET
import json
import re
import os
import sys
from lib.geo_engine import engine as geo_engine

def translate_slug(slug):
    clean_slug = re.sub(r'^\d+-', '', slug)
    clean_text = clean_slug.replace('-', ' ')
    if not clean_text: return ""
    return clean_text.title()

def classify_tier(slug):
    slug_lower = slug.lower()
    RE_TIER_5 = r'guide|itinerary|best-things|how-to|tips|must-see|review|highlights'
    if re.search(RE_TIER_5, slug_lower): return "5"
    RE_TIER_1 = r'ticket|pass|entry|fast-track|admission'
    if re.search(RE_TIER_1, slug_lower): return "1"
    RE_TIER_2 = r'tour|spa|massage|cruise|class|workshop|airport-transfer|sim-card'
    if re.search(RE_TIER_2, slug_lower): return "2"
    return "3"

def process_url(loc, tag_name, lang="zh-HK"):
    match = re.search(r'/activity/(\d+)-(.*?)/?$', loc)
    if match:
        canonical_id = match.group(1)
        slug = match.group(2)
        country, city = geo_engine.detect_geo(slug)
        tier = classify_tier(slug)
        translated_title = translate_slug(slug)
        return {
            "canonical_id": canonical_id,
            "language": lang,
            "languages": [lang],
            "url": loc,
            "slug": slug,
            "sitemap_tag": tag_name,
            "country": country,
            "city": city,
            "tier": tier,
            "is_private": 'private' in slug.lower(),
            "translated_title_vi": translated_title,
            "include_for_dsa": tier in ["1", "2"],
            "exclude_for_dsa": tier == "5"
        }
    return None

def main_process(file_path, tag_name, lang="zh-HK"):
    print(f"Processing source: {file_path} (language: {lang})")
    records = []
    
    # Check if it's XML or TXT
    if file_path.endswith('.xml'):
        tree = ET.parse(file_path)
        root = tree.getroot()
        namespace = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        urls = [n.text for n in root.findall('.//ns:loc', namespace)]
    else:
        # Assume raw text file with one URL per line
        with open(file_path, 'r', encoding='utf-8') as f:
            urls = [line.strip() for line in f if line.strip()]

    print(f"Found {len(urls)} URLs. Analyzing...")
    for loc in urls:
        rec = process_url(loc, tag_name, lang)
        if rec:
            records.append(rec)
            if len(records) % 10000 == 0:
                print(f"Processed {len(records)} records...")

    # Save results
    os.makedirs('data', exist_ok=True)
    out_path = f'data/klook_{tag_name}_{lang}_preview.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    print(f"Done! Saved {len(records)} records to {out_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 scripts/01_klook_activity_ingest.py <file_path> <tag_name> [language]")
        print("Example: python3 scripts/01_klook_activity_ingest.py sitemap.txt experiences-activity zh-TW")
    else:
        lang = sys.argv[3] if len(sys.argv) > 3 else "zh-HK"
        main_process(sys.argv[1], sys.argv[2], lang)
