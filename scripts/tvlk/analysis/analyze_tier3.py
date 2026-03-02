import requests
import re
from collections import Counter
import json
from scripts.tvlk.tvlk_enrich_and_import import get_pb_info, authenticate, COLLECTION_NAME

def analyze_tier_3():
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

    print(f"Total Tier 3 'others' records: {len(all_records)}")
    
    words = []
    bigrams = []
    
    # Common English stop words
    stop_words = set(["the", "in", "to", "for", "and", "of", "a", "is", "with", "at", "from", "by", "on", "how", "what", "best", "it", "that", "you", "are", "this", "city"])
    
    for r in all_records:
        title = r.get('title_en', '').lower()
        slug = r.get('slug', '').lower().replace('-', ' ')
        
        # Merge them
        text = f"{title} {slug}"
        # Extract words
        tokens = re.findall(r'\b[a-z]{3,}\b', text)
        filtered_tokens = [w for w in tokens if w not in stop_words]
        
        words.extend(filtered_tokens)
        
        # Bigrams
        for i in range(len(filtered_tokens)-1):
            bigrams.append(f"{filtered_tokens[i]} {filtered_tokens[i+1]}")
            
    word_counts = Counter(words)
    bigram_counts = Counter(bigrams)
    
    print("\nTop 30 Words:")
    for w, c in word_counts.most_common(30):
        print(f"{w}: {c}")
        
    print("\nTop 30 Bigrams:")
    for b, c in bigram_counts.most_common(30):
        print(f"{b}: {c}")

if __name__ == "__main__":
    analyze_tier_3()
