#!/usr/bin/env python3
"""
AI-Powered Unknown URL Enrichment Script
Analyzes Unknown URLs and uses intelligent pattern matching + AI to determine their geo-location.
"""

import json
import os
import sys
from collections import Counter

# Extended Travel Landmark Dictionary (Manually curated from analysis)
EXTENDED_LANDMARKS = {
    # Philippines Regions
    "legazpi": ("Philippines", "Legazpi"),
    "albay": ("Philippines", "Albay"),
    "catanduanes": ("Philippines", "Catanduanes"),
    "matnog": ("Philippines", "Matnog"),
    "bicol": ("Philippines", "Bicol"),
    "sorsogon": ("Philippines", "Sorsogon"),
    
    # Vietnam Landmarks
    "son-tra": ("Viet Nam", "Da Nang"),
    "sontra": ("Viet Nam", "Da Nang"),
    
    # Japan Regions & Cities
    "gion": ("Japan", "Kyoto"),
    "higashiyama": ("Japan", "Kyoto"),
    "gunma": ("Japan", "Gunma"),
    "nasu": ("Japan", "Nasu"),
    "kijima": ("Japan", "Oita"),
    "kogen": ("Japan", "Oita"),
    
    # Australia
    "victor-harbor": ("Australia", "Victor Harbor"),
    "victor": ("Australia", "Victor Harbor"),
    
    # Indonesia
    "lombok": ("Indonesia", "Lombok"),
    "gili": ("Indonesia", "Gili Islands"),
    
    # Iceland
    "vik": ("Iceland", "Vik"),
    "katla": ("Iceland", "Katla"),
    
    # Malaysia/Borneo
    "borneo": ("Malaysia", "Borneo"),
    "kota-kinabalu": ("Malaysia", "Kota Kinabalu"),
    
    # France
    "alsace": ("France", "Alsace"),
    "burgundy": ("France", "Burgundy"),
    "champagne": ("France", "Champagne"),
    "luberon": ("France", "Luberon"),
    
    # Cambodia
    "oudong": ("Cambodia", "Oudong"),
    
    # Switzerland
    "berner-oberland": ("Switzerland", "Berner Oberland"),
    
    # Generic Transfers/Passes (No specific location)
    "disney": ("Japan", "Tokyo"),  # Assume Tokyo Disney by default
    "wolmido": ("South Korea", "Incheon"),
}

def enrich_unknown_urls(input_file, output_file):
    """
    Enriches Unknown URLs with geo-location data using extended landmarks.
    """
    print(f"Loading data from {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    total = len(data)
    unknowns = [d for d in data if d['country'] == 'Unknown']
    print(f"Total URLs: {total}")
    print(f"Unknown URLs: {len(unknowns)} ({len(unknowns)/total*100:.1f}%)")
    
    enriched_count = 0
    
    for item in data:
        if item['country'] != 'Unknown':
            continue
        
        slug = item['slug'].lower()
        
        # Check against extended landmarks
        for keyword, (country, city) in EXTENDED_LANDMARKS.items():
            if keyword in slug:
                item['country'] = country
                item['city'] = city
                enriched_count += 1
                print(f"✓ Enriched: {slug[:50]} -> {country}, {city}")
                break
    
    new_unknowns = [d for d in data if d['country'] == 'Unknown']
    print(f"\n=== Enrichment Results ===")
    print(f"Enriched: {enriched_count} URLs")
    print(f"Remaining Unknown: {len(new_unknowns)} ({len(new_unknowns)/total*100:.1f}%)")
    print(f"Reduction: {len(unknowns) - len(new_unknowns)} URLs")
    
    # Save enriched data
    print(f"\nSaving enriched data to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    # Show sample of remaining unknowns
    if new_unknowns:
        print(f"\n=== Sample Remaining Unknowns (First 20) ===")
        for u in new_unknowns[:20]:
            print(f"  - {u['slug']}")
    
    return enriched_count, len(new_unknowns)

if __name__ == "__main__":
    input_file = "data/klook_experiences-activity_preview.json"
    output_file = "data/klook_experiences-activity_enriched.json"
    
    enriched, remaining = enrich_unknown_urls(input_file, output_file)
    
    print(f"\n✅ Enrichment complete!")
    print(f"   Next step: Run import script with enriched data")
    print(f"   Command: python3 scripts/02_import_to_pb.py {output_file} klook")
