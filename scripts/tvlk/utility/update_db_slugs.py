import json
import requests
import time
from scripts.tvlk.tvlk_enrich_and_import import (
    is_junk_url, classify_content, get_pb_info, authenticate, COLLECTION_NAME,
    translate_to_en, TRANSLATION_CACHE, CACHE_FILE, cache_lock
)
from urllib.parse import unquote

def main():
    info = get_pb_info()
    if not info: return print("No pb_info")
    pb_url = info['pb_url']
    token = authenticate(pb_url, info['email'], info['password'])
    headers = {"Authorization": f"Bearer {token}"}
    
    # Fetch all tvlk_pages
    all_records = []
    page = 1
    print("Fetching records...")
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
        slug = unquote(raw_slug)
        old_title_en = r.get('title_en', '')
        
        # Check for useless suffix
        slug_for_translation = slug
        if '-' in raw_slug:
            potential_suffix = raw_slug.split('-')[-1]
            if len(potential_suffix) <= 5 and not potential_suffix.isdigit():
                suffix = f"-{potential_suffix}"
                if suffix.lower() in ['-ta', '-trp', '-acc']:
                    slug_for_translation = slug[:-len(suffix)]
        
        # If the slug was modified, we need to re-translate
        if slug_for_translation != slug:
            new_title_en = translate_to_en(slug_for_translation.replace('-', ' '))
            
            # Reclassify
            taxo = classify_content(new_title_en, raw_slug)
            is_active = True
            is_junk, is_protected = is_junk_url(raw_slug, new_title_en)
            
            if is_junk:
                is_active = False
                taxo["tier"] = "5"
            elif is_protected:
                taxo["tier"] = "4"
                taxo["funnel_stage"] = "awareness"
                taxo["content_type"] = "travel_guide"
                taxo["sub_tag"] = "tips_and_tricks"
                
            # Always patch since title_en changed
            patch_data = {
                "title_en": new_title_en,
                "is_active": is_active, 
                "tier": taxo['tier'], 
                "content_type": taxo['content_type'], 
                "funnel_stage": taxo['funnel_stage'], 
                "sub_tag": taxo['sub_tag']
            }
            requests.patch(f"{pb_url}/api/collections/{COLLECTION_NAME}/records/{r['id']}", json=patch_data, headers=headers)
            updated += 1
            if updated % 50 == 0: 
                print(f"Updated {updated} affected records...")

    print(f"Done. Updated {updated} records.")
    
    # Save cache
    try:
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(TRANSLATION_CACHE, f, indent=2, ensure_ascii=False)
        print(f"Saved cache with new translations.")
    except Exception as e:
        pass

main()
