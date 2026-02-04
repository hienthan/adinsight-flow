#!/usr/bin/env python3
"""
Update content_type field for existing records
Quick fix to populate missing content_type field without re-importing.
"""

import requests
import json
import time

def get_pb_info():
    info = {}
    try:
        with open('db/pb_info.txt', 'r') as f:
            for line in f:
                if ':' in line:
                    k, v = line.split(':', 1)
                    info[k.strip()] = v.strip()
    except:
        pass
    return info

def update_content_types():
    info = get_pb_info()
    pb_url = info.get('pb_url', 'http://127.0.0.1:8090')
    
    # Auth
    auth_resp = requests.post(
        f"{pb_url}/api/collections/_superusers/auth-with-password",
        json={"identity": info['email'], "password": info['password']}
    )
    
    token = auth_resp.json()['token']
    headers = {"Authorization": f"Bearer {token}"}
    
    print("=== Updating content_type field ===\n")
    
    updated = 0
    page = 1
    
    while True:
        resp = requests.get(
            f"{pb_url}/api/collections/pages/records?page={page}&perPage=500",
            headers=headers
        )
        
        if resp.status_code != 200:
            break
        
        data = resp.json()
        items = data.get('items', [])
        
        if not items:
            break
        
        for item in items:
            # Skip if already has content_type
            if item.get('content_type'):
                continue
            
            # Default to 'activity' based on sitemap_tag
            content_type = 'activity'
            
            # Update
            update_resp = requests.patch(
                f"{pb_url}/api/collections/pages/records/{item['id']}",
                headers=headers,
                json={'content_type': content_type}
            )
            
            if update_resp.status_code == 200:
                updated += 1
                if updated % 500 == 0:
                    print(f"  Updated {updated:,}...")
        
        if page >= data.get('totalPages', 1):
            break
        page += 1
        
        time.sleep(0.1)
    
    print(f"\n✅ Updated {updated:,} records with content_type='activity'")

if __name__ == "__main__":
    update_content_types()
