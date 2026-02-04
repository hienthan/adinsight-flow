#!/usr/bin/env python3
"""
Delete all records from pages collection using PocketBase API
Faster version with batch deletion.
"""

import requests
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

def clear_all_pages():
    info = get_pb_info()
    pb_url = info.get('pb_url', 'http://127.0.0.1:8090')
    email = info.get('email')
    password = info.get('password')
    
    print("=== Deleting All Pages Records ===\n")
    
    # Auth
    print("Authenticating...")
    auth_resp = requests.post(
        f"{pb_url}/api/collections/_superusers/auth-with-password",
        json={"identity": email, "password": password}
    )
    
    if auth_resp.status_code != 200:
        print(f"❌ Auth failed: {auth_resp.status_code}")
        print(auth_resp.text)
        return
    
    token = auth_resp.json()['token']
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get total
    count_resp = requests.get(f"{pb_url}/api/collections/pages/records?perPage=1", headers=headers)
    total = count_resp.json().get('totalItems', 0)
    
    print(f"Found {total:,} records\n")
    
    if total == 0:
        print("Already empty!")
        return
    
    # Delete in batches
    print("Deleting...")
    deleted = 0
    batch_size = 500
    
    while True:
        # Always fetch page 1 since records shift after deletion
        resp = requests.get(
            f"{pb_url}/api/collections/pages/records?page=1&perPage={batch_size}",
            headers=headers
        )
        
        if resp.status_code != 200:
            print(f"Error fetching: {resp.status_code}")
            break
        
        items = resp.json().get('items', [])
        
        if not items:
            break
        
        # Delete batch
        for item in items:
            del_resp = requests.delete(
                f"{pb_url}/api/collections/pages/records/{item['id']}",
                headers=headers
            )
            
            if del_resp.status_code == 204:
                deleted += 1
            else:
                print(f"Failed to delete {item['id']}: {del_resp.status_code}")
            
            if deleted % 500 == 0:
                print(f"  Progress: {deleted:,}/{total:,}")
        
        time.sleep(0.1)  # Small delay to avoid overwhelming PB
    
    print(f"\n✅ Deleted {deleted:,} records")

if __name__ == "__main__":
    clear_all_pages()
