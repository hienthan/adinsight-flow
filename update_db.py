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
        
        is_junk, is_protected = is_junk_url(raw_slug, title_en)
        
        if is_junk:
            is_active = False
            taxo["tier"] = "4" if is_protected else "5" # Wait, is_junk is False if it's protected.
        
        # Let's fix the logic based on the actual is_junk_url return value
        # is_junk_url returns (is_junk, is_protected) where is_junk is ALWAYS False if is_protected is True.
        
        if is_junk:
            is_active = False
            taxo["tier"] = "5"
        elif is_protected:
            taxo["tier"] = "4"
            taxo["funnel_stage"] = "awareness"
            taxo["content_type"] = "travel_guide"
            taxo["sub_tag"] = "tips_and_tricks"
            
        # Check if needs update
        if r.get('is_active') != is_active or r.get('sub_tag') != taxo['sub_tag'] or r.get('content_type') != taxo['content_type'] or r.get('tier') != taxo['tier']:
            patch_data = {"is_active": is_active, "tier": taxo['tier'], "content_type": taxo['content_type'], "funnel_stage": taxo['funnel_stage'], "sub_tag": taxo['sub_tag']}
            requests.patch(f"{pb_url}/api/collections/{COLLECTION_NAME}/records/{r['id']}", json=patch_data, headers=headers)
            updated += 1
            if updated % 20 == 0: print(f"Updated {updated}...")

    print(f"Done. Updated {updated} records.")

main()
