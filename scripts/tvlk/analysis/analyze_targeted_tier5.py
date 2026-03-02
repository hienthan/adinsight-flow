import json
import requests
import re
from scripts.tvlk.tvlk_enrich_and_import import get_pb_info, authenticate, COLLECTION_NAME

def analyze_targeted_tier5():
    info = get_pb_info()
    pb_url = info['pb_url']
    token = authenticate(pb_url, info['email'], info['password'])
    headers = {"Authorization": f"Bearer {token}"}
    
    # Target dangerous keywords to inspect
    target_keywords = ["recommendation", "rekomendasi", "panduan", "guide", "cara"]
    
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

    print(f"Total Tier 5 (Junk) records parsed: {len(all_records)}\n")
    
    matches_by_keyword = {kw: [] for kw in target_keywords}
    
    for r in all_records:
        slug = r.get('slug', '').lower()
        title = r.get('title_en', '').lower()
        text_to_check = f"{slug} {title}"
        
        for kw in target_keywords:
            pattern = r'\b' + re.escape(kw) + r'(?:s|\'s|es)?\b'
            if re.search(pattern, slug) or re.search(pattern, title):
                matches_by_keyword[kw].append(r)
                
    # Print culprit keyword hits targeting specifically the dangerous 5
    print("--- Tier 5 URLs trapped by specific keywords ---")
    for kw, records in matches_by_keyword.items():
        print(f"\nKeyword: '{kw}' ({len(records)} hits)")
        if len(records) == 0:
            continue
            
        # Group by Subtag to get an idea of what we're losing
        subtags = {}
        for r in records:
            st = r.get('sub_tag', 'unknown')
            subtags[st] = subtags.get(st, 0) + 1
        print(f"  Distribution: {subtags}")
        
        # Print top 10 examples
        for r in records[:10]:
            print(f"  - [{r.get('sub_tag')}] {r.get('slug')} -> {r.get('title_en')}")

if __name__ == "__main__":
    analyze_targeted_tier5()
