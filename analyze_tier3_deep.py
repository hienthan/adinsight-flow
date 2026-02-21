import requests
from collections import defaultdict
from scripts.tvlk.tvlk_enrich_and_import import get_pb_info, authenticate, COLLECTION_NAME

def analyze_specific_terms():
    info = get_pb_info()
    pb_url = info['pb_url']
    token = authenticate(pb_url, info['email'], info['password'])
    headers = {"Authorization": f"Bearer {token}"}
    
    url = f"{pb_url}/api/collections/{COLLECTION_NAME}/records"
    
    all_records = []
    page = 1
    while True:
        params = {
            "filter": "tier='3' && sub_tag='others'",
            "perPage": 500,
            "page": page
        }
        resp = requests.get(url, headers=headers, params=params).json()
        items = resp.get('items', [])
        all_records.extend(items)
        if len(items) < 500:
            break
        page += 1

    print(f"Total Tier 3 'others' records: {len(all_records)}\n")
    
    # Terms to look for based on user request and previous bigrams
    target_terms = [
        "restaurant", "restoran", "cafe", "kuliner", "makanan", "food",
        "exciting", "activities", "aktivitas", "seru",
        "disneyland", "disneysea", "universal studios", "jatim park", "trans studio", "waterbom", "dufan"
    ]
    
    matches = defaultdict(list)
    
    for r in all_records:
        title = r.get('title_en', '').lower()
        slug = r.get('slug', '').lower().replace('-', ' ')
        text = f"{title} {slug}"
        
        for term in target_terms:
            if term in text:
                matches[term].append(r.get('title_en', ''))
                
    # Print results
    for term in target_terms:
        matched_titles = matches[term]
        if matched_titles:
            print(f"--- Term: '{term}' ({len(matched_titles)} matches) ---")
            # Print a sample of 5
            for t in matched_titles[:5]:
                print(f"  - {t}")
            print()

if __name__ == "__main__":
    analyze_specific_terms()
