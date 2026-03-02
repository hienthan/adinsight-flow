import json
import requests
import re
from scripts.tvlk.tvlk_enrich_and_import import get_pb_info, authenticate, COLLECTION_NAME

def analyze_tier5():
    info = get_pb_info()
    pb_url = info['pb_url']
    token = authenticate(pb_url, info['email'], info['password'])
    headers = {"Authorization": f"Bearer {token}"}
    
    # Load exclude keywords
    with open("scripts/lib/exclude_keywords.json", "r") as f:
        exclude_dict = json.load(f)
        
    all_excludes = []
    for category, words in exclude_dict.items():
        all_excludes.extend(words)
        
    url = f"{pb_url}/api/collections/{COLLECTION_NAME}/records"
    
    all_records = []
    page = 1
    while True:
        params = {
            "filter": "tier='5'",
            "perPage": 500,
            "page": page
        }
        resp = requests.get(url, headers=headers, params=params).json()
        items = resp.get('items', [])
        all_records.extend(items)
        if len(items) < 500:
            break
        page += 1

    print(f"Total Tier 5 (Junk) records: {len(all_records)}\n")
    
    # Analyze which keywords caused the ban
    keyword_hits = {}
    subtag_counts = {}
    
    for r in all_records:
        slug = r.get('slug', '').lower()
        title = r.get('title_en', '').lower()
        text_to_check = f"{slug} {title}"
        
        # Track original subtag
        stag = r.get('sub_tag', 'unknown')
        subtag_counts[stag] = subtag_counts.get(stag, 0) + 1
        
        found_keywords = []
        for word in all_excludes:
            # Replicating the logic from is_junk_url
            pattern = r'\b' + re.escape(word) + r's?\b'
            if re.search(pattern, slug) or re.search(pattern, title):
                found_keywords.append(word)
                
        if found_keywords:
            for kw in found_keywords:
                if kw not in keyword_hits:
                    keyword_hits[kw] = []
                keyword_hits[kw].append(r)
                
    # Print subtag breakdown
    print("--- Tier 5 SubTag Breakdown ---")
    for stag, count in sorted(subtag_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {stag}: {count}")
    print()
    
    # Print top culprit keywords
    print("--- Top 20 Exclude Keywords Triggering Tier 5 ---")
    sorted_keywords = sorted(keyword_hits.items(), key=lambda x: len(x[1]), reverse=True)
    for kw, records in sorted_keywords[:20]:
        print(f"\nKeyword: '{kw}' ({len(records)} hits)")
        # Show top 3 examples
        for r in records[:3]:
            # Try to show why it might be a false positive (e.g. if subtag wasn't others)
            flag = "[POTENTIAL FALSE POSITIVE]" if r.get('sub_tag') not in ['others', 'junk'] else ""
            print(f"  - {flag} {r.get('slug')} -> {r.get('title_en')}")

if __name__ == "__main__":
    analyze_tier5()
