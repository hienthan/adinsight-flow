#!/usr/bin/env python3
"""
Generate Google Ads DSA Page Feed
Creates CSV feed for Dynamic Search Ads campaigns with country/city labels.
"""

import json
import csv
import sys
from datetime import datetime

def generate_dsa_feed(input_file="data/klook_experiences-activity_preview.json", 
                      output_file=None,
                      exclude_tier_5=True,
                      exclude_unknown_country=False):
    """
    Generates Google Ads DSA page feed CSV.
    
    Page Feed Format:
    - Page URL: Full URL
    - Custom Label (Country): For geo-targeting
    - Custom Label (City): For granular targeting  
    - Custom Label (Tier): For bid adjustments
    - Custom Label (Category): Activity type
    
    Args:
        input_file: JSON data file
        output_file: Output CSV path (auto-generated if None)
        exclude_tier_5: Exclude Tier 5 (guides/info) from feed
        exclude_unknown_country: Exclude URLs without country
    """
    print("=== Generating Google Ads DSA Feed ===\n")
    
    # Load data
    print(f"1. Loading data from {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"   Total URLs: {len(data):,}")
    
    # Filter data
    print("\n2. Applying filters...")
    filtered = data
    
    if exclude_tier_5:
        before = len(filtered)
        filtered = [d for d in filtered if d.get('tier') != '5']
        print(f"   Excluded Tier 5: {before - len(filtered):,} URLs ({(before-len(filtered))/before*100:.1f}%)")
    
    if exclude_unknown_country:
        before = len(filtered)
        filtered = [d for d in filtered if d.get('country') and d['country'] != 'Unknown']
        print(f"   Excluded Unknown country: {before - len(filtered):,} URLs ({(before-len(filtered))/before*100:.1f}%)")
    
    print(f"   Final feed size: {len(filtered):,} URLs")
    
    # Generate feed
    print("\n3. Generating DSA feed...")
    
    if output_file is None:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_file = f"data/google_ads_dsa_feed_{timestamp}.csv"
    
    tier_names = {
        '1': 'Tier1-Tickets',
        '2': 'Tier2-Tours',
        '3': 'Tier3-Services',
        '4': 'Tier4-Packages',
        '5': 'Tier5-Guides'
    }
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        
        # Header (Google Ads DSA format)
        # Header (Google Ads DSA format)
        writer.writerow([
            'Page URL',
            'Custom label'
        ])
        
        # Write rows
        for item in filtered:
            # Create semicolon-separated labels
            labels = [
                item.get('country', 'Unknown'),
                item.get('city', ''),
                tier_names.get(item.get('tier', '3'), 'Tier3-Services'),
                'Klook'
            ]
            # Filter out empty strings and join with semicolon
            custom_label = ';'.join([l for l in labels if l])
            
            writer.writerow([
                item['url'],
                custom_label
            ])
    
    print(f"   ✅ Saved to: {output_file}")
    
    # Statistics
    print("\n4. Feed Statistics:\n")
    
    # By country
    countries = {}
    for item in filtered:
        country = item.get('country', 'Unknown')
        countries[country] = countries.get(country, 0) + 1
    
    print("   Top Countries:")
    for country, count in sorted(countries.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"   - {country:25} {count:>6,} URLs ({count/len(filtered)*100:>5.1f}%)")
    
    # By tier
    tiers = {}
    for item in filtered:
        tier = item.get('tier', '3')
        tiers[tier] = tiers.get(tier, 0) + 1
    
    print("\n   By Tier:")
    for tier in sorted(tiers.keys()):
        tier_name = tier_names.get(tier, f'Tier{tier}')
        count = tiers[tier]
        print(f"   - {tier_name:20} {count:>6,} URLs ({count/len(filtered)*100:>5.1f}%)")
    
    # Unknown country
    unknown = sum(1 for item in filtered if item.get('country') == 'Unknown')
    print(f"\n   Unknown country: {unknown:,} URLs ({unknown/len(filtered)*100:.1f}%)")
    
    print(f"\n=== DSA Feed Generation Complete ===")
    print(f"\n📋 Next Steps:")
    print(f"1. Upload {output_file} to Google Ads")
    print(f"2. Create DSA campaign with Page Feed")
    print(f"3. Use Custom Labels for:")
    print(f"   - Geo-targeting by country")
    print(f"   - Bid adjustments by tier")
    print(f"   - Exclude Unknown country (if needed)")
    
    return output_file

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate Google Ads DSA Feed')
    parser.add_argument('--input', default='data/klook_experiences-activity_preview.json', 
                       help='Input JSON file')
    parser.add_argument('--output', default=None, help='Output CSV file')
    parser.add_argument('--include-tier-5', action='store_true',
                       help='Include Tier 5 (guides) in feed')
    parser.add_argument('--include-unknown', action='store_true',
                       help='Include Unknown country URLs in feed')
    
    args = parser.parse_args()
    
    generate_dsa_feed(
        input_file=args.input,
        output_file=args.output,
        exclude_tier_5=not args.include_tier_5,
        exclude_unknown_country=not args.include_unknown
    )
