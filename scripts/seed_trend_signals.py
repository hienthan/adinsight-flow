import json
import re
import requests
import sys
from pathlib import Path

def get_pb_info():
    info = {}
    try:
        with open('db/pb_info.txt', 'r') as f:
            for line in f:
                if ':' in line:
                    k, v = line.split(':', 1)
                    info[k.strip()] = v.strip()
        return info
    except Exception as e:
        print(f"Error reading config: {e}")
        return None

def authenticate(pb_url, email, password):
    try:
        resp = requests.post(f"{pb_url}/api/collections/_superusers/auth-with-password", json={
            "identity": email, "password": password
        })
        if resp.status_code != 200:
            print(f"Auth failed: {resp.text}")
            return None
        return resp.json()['token']
    except Exception as e:
        print(f"Auth error: {e}")
        return None

def upsert_record(pb_url, headers, collection, data, key_field='key'):
    """
    Upsert a record: Find by key_field, then Update or Create.
    Returns the Record ID.
    """
    # 1. Check if exists
    filter_expr = f'{key_field}="{data[key_field]}"'
    try:
        r = requests.get(
            f"{pb_url}/api/collections/{collection}/records",
            headers=headers,
            params={'filter': filter_expr, 'perPage': 1}
        )
        existing = r.json().get('items', [])
        
        if existing:
            # UPDATE
            rec_id = existing[0]['id']
            # print(f"  Existing {collection} '{data[key_field]}' found ({rec_id}). Updating...")
            r_update = requests.patch(
                f"{pb_url}/api/collections/{collection}/records/{rec_id}",
                headers=headers,
                json=data
            )
            if r_update.status_code == 200:
                print(f"  ✅ Updated {collection}: {data[key_field]}")
                return rec_id
            else:
                print(f"  ❌ Failed to update {collection} {data[key_field]}: {r_update.text}")
                return None
        else:
            # CREATE
            # print(f"  Creating new {collection} '{data[key_field]}'...")
            r_create = requests.post(
                f"{pb_url}/api/collections/{collection}/records",
                headers=headers,
                json=data
            )
            if r_create.status_code == 200:
                print(f"  ✅ Created {collection}: {data[key_field]}")
                return r_create.json()['id']
            else:
                print(f"  ❌ Failed to create {collection} {data[key_field]}: {r_create.text}")
                return None
                
    except Exception as e:
        print(f"  ❌ Error upserting {collection} {data[key_field]}: {e}")
        return None

def parse_seed_file(filepath):
    """
    Parses the markdown file containing multiple JSON blocks.
    Returns:
      trend_types (list): The list of trend type objects.
      trend_signals (list): The concatenated list of ALL signal objects found in various blocks.
    """
    try:
        content = Path(filepath).read_text(encoding='utf-8')
    except Exception as e:
        print(f"❌ Error reading file {filepath}: {e}")
        return [], []

    # Logic:
    # The file has sections like "A) trend_types.seed.json" followed by JSON content.
    # We will look for valid JSON arrays [] in the text.
    # We assume the First array is trend_types (or if it looks like types), 
    # and subsequent arrays are trend_signals.
    
    json_blocks = []
    
    # Regex to find JSON arrays. 
    # Note: Regex for nested JSON is hard, so we'll look for [ ... ] blocks 
    # and trust that the file format is somewhat clean (indentation helps).
    # A safer way is to find the start '[' and track brackets balance.
    
    def extract_json_arrays(text):
        arrays = []
        stack = []
        start_index = -1
        
        for i, char in enumerate(text):
            if char == '[':
                if not stack:
                    start_index = i
                stack.append(char)
            elif char == ']':
                if stack:
                    stack.pop()
                    if not stack:
                        # Found a complete top-level array
                        json_str = text[start_index:i+1]
                        try:
                            data = json.loads(json_str)
                            if isinstance(data, list):
                                arrays.append(data)
                        except json.JSONDecodeError:
                            # Not valid JSON, skip
                            pass
        return arrays

    arrays = extract_json_arrays(content)
    print(f"Found {len(arrays)} JSON arrays in file.")
    
    trend_types = []
    trend_signals = []
    
    for arr in arrays:
        if not arr: continue
        
        # Heuristic to identify Type vs Signal
        first_item = arr[0]
        if not isinstance(first_item, dict):
             print(f"  -> ⚠️ Skipping block with non-dict items (e.g. list of strings). First item: {first_item}")
             continue

        if 'category' in first_item and 'default_priority' in first_item:
            print(f"  -> Found trend_types block ({len(arr)} items)")
            trend_types.extend(arr)
        elif 'trend_type' in first_item and 'destinations' in first_item:
            print(f"  -> Found trend_signals block ({len(arr)} items)")
            trend_signals.extend(arr)
        else:
            print(f"  -> ⚠️ Unknown block type, skipping ({len(arr)} items). Keys: {list(first_item.keys())}")

    return trend_types, trend_signals

def fetch_existing_types(pb_url, headers):
    """Fetch all existing trend types and return a mapping of key -> id."""
    mapping = {}
    try:
        r = requests.get(f"{pb_url}/api/collections/trend_types/records", headers=headers, params={'perPage': 200})
        if r.status_code == 200:
            for item in r.json().get('items', []):
                mapping[item['key']] = item['id']
        return mapping
    except Exception as e:
        print(f"⚠️ Error fetching existing types: {e}")
        return {}

def main():
    print("DEBUG: Script started")
    import os
    print(f"DEBUG: CWD = {os.getcwd()}")
    
    info = get_pb_info()
    print(f"DEBUG: Info = {info}")
    
    if not info: 
        print("DEBUG: Info is empty/None")
        return

    pb_url = info.get('pb_url')
    print(f"DEBUG: pb_url = {pb_url}")
    print(f"Connecting to {pb_url}...")

    token = authenticate(pb_url, info.get('email'), info.get('password'))
    if not token: 
        print("❌ Authentication failed. Check db/pb_info.txt")
        return
    
    print("DEBUG: Authenticated")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Cache for Trend Type IDs - Pre-populate from DB
    type_key_to_id = fetch_existing_types(pb_url, headers)
    print(f"DEBUG: Pre-loaded {len(type_key_to_id)} trend types from DB.")

    # Parse File
    seed_file = sys.argv[1] if len(sys.argv) > 1 else 'db/trend-signal-seeds/japan-seed.md'
    print(f"\nParsing {seed_file}...")
    trend_types, trend_signals = parse_seed_file(seed_file)
    
    if not trend_types and not trend_signals:
        print("❌ No data found to seed.")
        return

    # 1. Seed Trend Types
    print("\n--- Seeding Trend Types ---")
    for item in trend_types:
        rec_id = upsert_record(pb_url, headers, 'trend_types', item)
        if rec_id:
            type_key_to_id[item['key']] = rec_id

    for item in trend_signals:
        # Relations: 'trend_type' key -> ID
        type_key = item.get('trend_type')
        if isinstance(type_key, str) and type_key in type_key_to_id:
            item['trend_type'] = type_key_to_id[type_key]
        elif isinstance(type_key, str):
             print(f"⚠️ Warning: Trend Type '{type_key}' not found in cache.")

        # Fields defaults/validation
        if 'status' not in item:
            item['status'] = 'active'
        if 'mode' not in item:
            item['mode'] = 'recurring'

        # Ensure numeric fields
        if 'pre_alert_days' in item and item['pre_alert_days']:
             item['pre_alert_days'] = int(item['pre_alert_days'])

        upsert_record(pb_url, headers, 'trend_signals', item)

    print("\n✅ Seeding Complete.")

if __name__ == '__main__':
    main()
