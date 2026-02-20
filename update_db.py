import json
import requests
from scripts.tvlk.tvlk_enrich_and_import import is_junk_url, classify_content, get_pb_info, authenticate, COLLECTION_NAME

def main():
    info = get_pb_info()
    if not info: return print("No pb_info")
    pb_url = info['pb_url']
    token = authenticate(pb_url, info['email'], info['password'])
    headers = {"Authorization": f"Bearer {token}"}
    
    # Fetch all tvlk_pages
    all_records = []
    page = 1
    while True:
        url = f"{pb_url}/api/collections/{COLLECTION_NAME}/records?perPage=500&page={page}"
        resp = requests.get(url, headers=headers).json()
        items = resp.get('items', [])
        all_records.extend(items)
        if len(items) < 500:
            break
        page += 1

    print(f"Loaded {len(all_records)} records")
    updated = 0
    
    for r in all_records:
        raw_slug = r.get('slug', '').replace(' ', '-')
        title_en = r.get('title_en', '')
        
        # New classification
        taxo = classify_content(title_en, raw_slug)
        is_active = True
        
        if is_junk_url(raw_slug, title_en):
            is_active = False
            taxo = {"tier": "5", "content_type": "informational_junk", "funnel_stage": "", "sub_tag": "junk"}
            
        # Check if needs update
        if r.get('is_active') != is_active or r.get('sub_tag') != taxo['sub_tag']:
            patch_data = {"is_active": is_active, "tier": taxo['tier'], "content_type": taxo['content_type'], "funnel_stage": taxo['funnel_stage'], "sub_tag": taxo['sub_tag']}
            requests.patch(f"{pb_url}/api/collections/{COLLECTION_NAME}/records/{r['id']}", json=patch_data, headers=headers)
            updated += 1
            if updated % 20 == 0: print(f"Updated {updated}...")

    print(f"Done. Updated {updated} records.")

main()
