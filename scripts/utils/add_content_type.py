#!/usr/bin/env python3
"""
Add content_type field to merged JSON data
Maps sitemap_tag to content_type for unified schema.
"""

import json
import sys

def map_sitemap_to_content_type(sitemap_tag):
    """Map sitemap_tag to content_type category."""
    sitemap_lower = sitemap_tag.lower()
    
    if 'activity' in sitemap_lower or 'experience' in sitemap_lower:
        return 'activity'
    elif 'hotel' in sitemap_lower:
        return 'hotel'
    elif 'restaurant' in sitemap_lower or 'fnb' in sitemap_lower:
        return 'restaurant'
    elif 'event' in sitemap_lower:
        return 'event'
    elif 'poi' in sitemap_lower or 'city' in sitemap_lower or 'country' in sitemap_lower:
        return 'poi'
    elif 'blog' in sitemap_lower:
        return 'blog'
    else:
        return 'other'

def add_content_type(input_file, output_file):
    print(f"Loading {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"Processing {len(data):,} records...")
    
    content_type_stats = {}
    
    for record in data:
        content_type = map_sitemap_to_content_type(record.get('sitemap_tag', ''))
        record['content_type'] = content_type
        
        # Stats
        content_type_stats[content_type] = content_type_stats.get(content_type, 0) + 1
    
    print(f"\n📊 Content Type Distribution:")
    for ctype, count in sorted(content_type_stats.items(), key=lambda x: -x[1]):
        print(f"  {ctype}: {count:,} ({count/len(data)*100:.1f}%)")
    
    print(f"\nSaving to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print("✅ Done!")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 scripts/add_content_type.py <input.json> <output.json>")
    else:
        add_content_type(sys.argv[1], sys.argv[2])
