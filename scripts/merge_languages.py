#!/usr/bin/env python3
"""
Merge Multi-Language Data Offline
Merges zh-HK and zh-TW JSON files into single canonical dataset.

Logic:
- Group by canonical_id
- For each canonical_id, keep zh-HK data (tier, country, city, etc.)
- Merge languages array: ["zh-HK", "zh-TW"]
- Keep zh-HK URL as primary (can generate zh-TW URL on export)

Output: Single merged JSON file ready for import
"""

import json
import sys
from collections import defaultdict

def merge_language_files(zh_hk_file, zh_tw_file, output_file):
    print("=== Merging Language Files ===\n")
    
    # Load files
    print(f"Loading {zh_hk_file}...")
    with open(zh_hk_file, 'r', encoding='utf-8') as f:
        zh_hk_data = json.load(f)
    print(f"  ✅ {len(zh_hk_data):,} zh-HK records")
    
    print(f"\nLoading {zh_tw_file}...")
    with open(zh_tw_file, 'r', encoding='utf-8') as f:
        zh_tw_data = json.load(f)
    print(f"  ✅ {len(zh_tw_data):,} zh-TW records")
    
    # Group by canonical_id
    print("\n📊 Merging by canonical_id...")
    canonical_map = {}
    
    # Add zh-HK records (primary data source)
    for record in zh_hk_data:
        cid = record['canonical_id']
        canonical_map[cid] = record.copy()
        canonical_map[cid]['languages'] = ['zh-HK']
    
    print(f"  ✅ Added {len(canonical_map):,} zh-HK base records")
    
    # Merge zh-TW language availability
    zh_tw_added = 0
    zh_tw_new = 0
    
    for record in zh_tw_data:
        cid = record['canonical_id']
        
        if cid in canonical_map:
            # Canonical exists - add zh-TW to languages
            if 'zh-TW' not in canonical_map[cid]['languages']:
                canonical_map[cid]['languages'].append('zh-TW')
                zh_tw_added += 1
        else:
            # New canonical - use zh-TW data
            new_record = record.copy()
            new_record['languages'] = ['zh-TW']
            canonical_map[cid] = new_record
            zh_tw_new += 1
    
    print(f"  ✅ Merged zh-TW into {zh_tw_added:,} existing records")
    print(f"  ✅ Created {zh_tw_new:,} new records from zh-TW only")
    
    # Convert to list
    merged_data = list(canonical_map.values())
    
    # Stats
    print(f"\n📈 Merge Statistics:")
    print(f"  Total canonical records: {len(merged_data):,}")
    
    multi_lang = [r for r in merged_data if len(r.get('languages', [])) > 1]
    single_lang = [r for r in merged_data if len(r.get('languages', [])) == 1]
    
    print(f"  Multi-language: {len(multi_lang):,} ({len(multi_lang)/len(merged_data)*100:.1f}%)")
    print(f"  Single-language: {len(single_lang):,} ({len(single_lang)/len(merged_data)*100:.1f}%)")
    
    # Language breakdown
    zh_hk_only = len([r for r in merged_data if r.get('languages') == ['zh-HK']])
    zh_tw_only = len([r for r in merged_data if r.get('languages') == ['zh-TW']])
    both = len([r for r in merged_data if len(r.get('languages', [])) == 2])
    
    print(f"\n  Language breakdown:")
    print(f"    zh-HK only: {zh_hk_only:,}")
    print(f"    zh-TW only: {zh_tw_only:,}")
    print(f"    Both: {both:,}")
    
    # Save
    print(f"\n💾 Saving to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(merged_data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Done! Merged file ready for import.")
    
    # Sample
    print(f"\n📝 Sample multi-language record:")
    if multi_lang:
        sample = multi_lang[0]
        print(f"  canonical_id: {sample['canonical_id']}")
        print(f"  slug: {sample['slug']}")
        print(f"  languages: {sample['languages']}")
        print(f"  country: {sample['country']}")
        print(f"  tier: {sample['tier']}")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python3 scripts/merge_languages.py <zh-hk.json> <zh-tw.json> <output.json>")
        print("Example: python3 scripts/merge_languages.py \\")
        print("  data/klook_experiences-activity_preview.json \\")
        print("  data/klook_experiences-activity_zh-TW_preview.json \\")
        print("  data/klook_merged_all_languages.json")
    else:
        merge_language_files(sys.argv[1], sys.argv[2], sys.argv[3])
