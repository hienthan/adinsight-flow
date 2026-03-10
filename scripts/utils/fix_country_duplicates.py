#!/usr/bin/env python3
"""
Fix Country Duplicates in JSON Data
Normalizes all country names to ensure consistency (e.g., "Vietnam" -> "Viet Nam").
"""

import json
import os
import sys

# Add scripts/lib to path to use GeoEngine
sys.path.append(os.path.join(os.path.dirname(__file__), 'scripts'))
from lib.geo_engine import engine as geo_engine

def fix_json_duplicates(file_path):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    print(f"Fixing duplicates in {file_path}...")
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    changes = 0
    stats = {}

    for item in data:
        old_country = item.get('country')
        if old_country:
            new_country = geo_engine.normalize_country(old_country)
            if old_country != new_country:
                item['country'] = new_country
                changes += 1
                variant = f"{old_country} -> {new_country}"
                stats[variant] = stats.get(variant, 0) + 1

    if changes > 0:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"✅ Fixed {changes} records.")
        for variant, count in stats.items():
            print(f"  - {variant}: {count}")
    else:
        print("No duplicates found to fix.")

if __name__ == "__main__":
    files = [
        'data/klook_experiences-activity_preview.json',
        'data/klook_experiences-activity_manual_enriched.json'
    ]
    for f in files:
        if os.path.exists(f):
            fix_json_duplicates(f)
