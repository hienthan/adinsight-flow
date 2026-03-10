#!/usr/bin/env python3
"""
Generate Google Ads DSA Page Feed for Traveloka (id-id)
Creates a 2-column CSV (Page URL, Custom label) optimized for DSA targeting.
"""

import json
import csv
import os
import argparse
from datetime import datetime

# Helper to clean labels for Google Ads
def clean_label(val):
    if not val: return ""
    # Google Ads labels should ideally be lowercase, no spaces, no commas
    return str(val).lower().replace(" ", "-").replace(",", "")

def generate_tvlk_dsa_feed(input_file, output_file=None):
    print("=== Generating Traveloka DSA Feed ===\n")
    
    # 1. Load Data
    print(f"1. Loading data from {input_file}...")
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: Input file not found: {input_file}")
        return
        
    print(f"   Total URLs loaded: {len(data):,}")
    
    # 2. Filter Data (Crucial for TVLK)
    print("\n2. Applying TVLK specific filters...")
    
    # Exclude inactive (junk) URLs
    before = len(data)
    filtered = [d for d in data if d.get('is_active', True) == True]
    print(f"   Excluded Inactive (Junk/Info): {before - len(filtered):,} URLs")
    
    # Exclude Tier 5 (just in case they survived the active filter)
    before = len(filtered)
    filtered = [d for d in filtered if str(d.get('tier', '3')) != '5']
    print(f"   Excluded Tier 5 (Guides): {before - len(filtered):,} URLs")
    
    # Exclude Unknown country (Optional but recommended for DSA)
    before = len(filtered)
    filtered = [d for d in filtered if d.get('country') and d.get('country').lower() != 'unknown']
    print(f"   Excluded 'Unknown' Country: {before - len(filtered):,} URLs")

    print(f"   Final valid URLs for Feed: {len(filtered):,}")
    
    # 3. Generate CSV Feed
    print("\n3. Generating 2-Column DSA feed...")
    
    if output_file is None:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        # Ensure output directory exists
        os.makedirs('data/dsa_feeds/tvlk', exist_ok=True)
        output_file = f"data/dsa_feeds/tvlk/tvlk_dsa_feed_{timestamp}.csv"
        
    # Stats tracking
    tiers_count = {}
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        
        # Mandatory Google Ads DSA Header
        writer.writerow(['Page URL', 'Custom label'])
        
        for item in filtered:
            # Construct 6-parameter custom label
            raw_labels = [
                f"geo={clean_label(item.get('country'))}",
                f"city={clean_label(item.get('city'))}" if item.get('city') else "",
                f"tier={clean_label(item.get('tier'))}",
                f"ctype={clean_label(item.get('content_type'))}" if item.get('content_type') else "",
                f"funnel={clean_label(item.get('funnel_stage'))}" if item.get('funnel_stage') else "",
                f"tag={clean_label(item.get('sub_tag'))}" if item.get('sub_tag') else "",
                "platform=traveloka"
            ]
            
            # Combine cleanly with semicolons
            custom_label = ';'.join([l for l in raw_labels if l])
            
            writer.writerow([
                item.get('url', ''),
                custom_label
            ])
            
            # Track stats
            t = str(item.get('tier', '3'))
            tiers_count[t] = tiers_count.get(t, 0) + 1
            
    print(f"   ✅ Saved dynamically formatted feed to: {output_file}")
    
    # 4. Final Report
    print("\n4. Feed Composition:")
    for tier in sorted(tiers_count.keys()):
        count = tiers_count[tier]
        print(f"   - Tier {tier}: {count:>6,} URLs ({count/len(filtered)*100:>5.1f}%)")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Generate DSA Feed for Traveloka')
    # Defaulting to a likely JSON export dump from pocketbase
    parser.add_argument('--input', default='data/tvlk_pages_export.json', help='Input JSON file')
    parser.add_argument('--output', default=None, help='Output CSV file path')
    
    args = parser.parse_args()
    generate_tvlk_dsa_feed(args.input, args.output)
