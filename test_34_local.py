#!/usr/bin/env python3
"""
Local trace test for the 34 remaining global_nlp Indonesia URLs.
Tests V5 engine only (no DB writes).
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "scripts", "tvlk", "url_classifier_v5"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from engine import ClassifierEngine
base_dir = os.path.dirname(os.path.abspath(__file__))

engine = ClassifierEngine(
    stopwords_path=os.path.join(base_dir, "scripts", "tvlk", "geo_kb", "geo_stopwords.json"),
    exclude_keywords_path=os.path.join(base_dir, "scripts", "lib", "exclude_keywords.json"),
    geo_kb_dir=os.path.join(base_dir, "scripts", "tvlk", "geo_kb"),
    intent_keywords_path=os.path.join(base_dir, "scripts", "tvlk", "intent-detection", "intent_keywords.json"),
    intent_patterns_path=os.path.join(base_dir, "scripts", "tvlk", "intent-detection", "travel_pattern_signals.json"),
    content_taxonomy_path=os.path.join(base_dir, "scripts", "tvlk", "intent-detection", "content_taxonomy.json")
)

urls = open("/tmp/remaining34.txt").read().strip().split("\n")

print(f"Testing {len(urls)} URLs\n")

# Group by category
categories = {
    "curug": [],
    "dieng": [],
    "tanjung": [],
    "pulau-seribu": [],
    "gunung-kidul": [],
    "other": [],
}

for url in urls:
    slug = url.split("/explore/activities/")[1].split("-ta/")[0] if "/explore/activities/" in url else url
    
    res = engine.process_url(url)
    geo_type = res.get('geo_type', '')
    entity = res.get('geo_entity', '')
    province = res.get('province', '')
    city = res.get('city', '')
    tokens = res.get('slug_tokens', [])
    country = res.get('country', '')
    
    # Categorize
    if "curug" in url:
        cat = "curug"
    elif "dieng" in url:
        cat = "dieng"
    elif "tanjung" in url:
        cat = "tanjung"
    elif "pulau-seribu" in url or "jaksel" in url:
        cat = "pulau-seribu"
    elif "gunung-kidul" in url:
        cat = "gunung-kidul"
    else:
        cat = "other"
    
    categories[cat].append({
        "url": url.split("activities/")[1][:60],
        "type": geo_type,
        "entity": entity,
        "city": city,
        "province": province,
        "country": country,
        "tokens": tokens,
    })

for cat, items in categories.items():
    if not items:
        continue
    print(f"\n{'='*60}")
    print(f"  CATEGORY: {cat.upper()} ({len(items)} URLs)")
    print(f"{'='*60}")
    for item in items:
        if item['type'] == 'legacy':
            status = "❌ LEGACY"
        elif not item['province']:
            status = "⚠️  NO-PROVINCE"
        else:
            status = "✅ OK"
        print(f"  {status} type={item['type']} entity={item['entity']} province={item['province']}")
        print(f"    URL: {item['url']}")
        if item['type'] in ('legacy', '') or not item['province']:
            print(f"    Tokens: {item['tokens']}")
