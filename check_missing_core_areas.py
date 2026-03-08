import json
import os

base_dir = "scripts/tvlk"

try:
    with open(f"{base_dir}/lib/indo_geo_master.json", "r") as f:
        master_geo = json.load(f)
        
    with open(f"{base_dir}/geo_kb/part2_core_areas.json", "r") as f:
        core_areas = json.load(f)

    # Extract all unique cities and provinces from Master
    master_regions = set()
    for key, data in master_geo.items():
        if isinstance(data, dict):
            if data.get("category") in ["province", "city", "sub_city"]:
                master_regions.add(key.lower())

    # Extract existing core areas
    existing_core_areas = set(core_areas.keys())
    for key, data in core_areas.items():
        if isinstance(data, dict):
             for alias in data.get("aliases", []):
                 existing_core_areas.add(alias.lower())

    # Find missing
    missing = master_regions - existing_core_areas

    # Filter out very obscure ones by trying to match with domestic popularity if available
    missing_with_pop = []
    for m in missing:
        data = master_geo.get(m, {})
        pop = data.get("domestic_popularity", 0)
        missing_with_pop.append((m, pop))

    missing_with_pop.sort(key=lambda x: x[1], reverse=True)

    print(f"Found {len(missing_with_pop)} potential core areas in Master not in part2_core_areas.json.")
    print("Top 30 missing regions by popularity:")
    for m, pop in missing_with_pop[:30]:
        category = master_geo.get(m, {}).get("category", "unknown")
        print(f"- {m} (Type: {category}, Popularity: {pop})")

except Exception as e:
    import traceback
    traceback.print_exc()
