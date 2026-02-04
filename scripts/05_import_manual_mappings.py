#!/usr/bin/env python3
"""
Import Manual Geo Mappings
Imports country/city mappings from ChatGPT-processed CSV back into the system.
"""

import json
import csv
import sys

def import_manual_mappings(csv_file, json_file, output_file):
    """
    Imports manual geo mappings from CSV and applies them to the JSON data.
    
    Args:
        csv_file: Path to CSV with manual mappings (from ChatGPT)
        json_file: Path to original JSON data
        output_file: Path to save updated JSON
    """
    print(f"Loading manual mappings from {csv_file}...")
    
    # Load manual mappings
    mappings = {}
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            slug = row['slug']
            country = row['suggested_country'].strip()
            city = row['suggested_city'].strip()
            
            if country:  # Only add if country is provided
                mappings[slug] = {
                    'country': country,
                    'city': city if city else 'Unknown'
                }
    
    print(f"Loaded {len(mappings)} manual mappings")
    
    # Load JSON data
    print(f"\nLoading data from {json_file}...")
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Apply mappings
    updated_count = 0
    for item in data:
        slug = item['slug']
        if slug in mappings and item['country'] == 'Unknown':
            item['country'] = mappings[slug]['country']
            item['city'] = mappings[slug]['city']
            updated_count += 1
            print(f"✓ Updated: {slug[:50]:50} -> {item['country']}, {item['city']}")
    
    # Calculate final stats
    unknowns_before = sum(1 for d in data if d['country'] == 'Unknown')
    
    # Save updated data
    print(f"\nSaving updated data to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n=== Import Results ===")
    print(f"Manual mappings loaded: {len(mappings)}")
    print(f"URLs updated: {updated_count}")
    print(f"Remaining Unknown: {unknowns_before}")
    print(f"\n✅ Import complete!")
    print(f"   Next step: Import to database")
    print(f"   Command: python3 scripts/02_import_to_pb.py {output_file} klook")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 05_import_manual_mappings.py [csv_file]")
        print("Example: python3 05_import_manual_mappings.py data/unknown_urls_for_chatgpt.csv")
        sys.exit(1)
    
    csv_file = sys.argv[1]
    json_file = "data/klook_experiences-activity_preview.json"
    output_file = "data/klook_experiences-activity_manual_enriched.json"
    
    import_manual_mappings(csv_file, json_file, output_file)
