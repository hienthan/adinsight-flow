#!/usr/bin/env python3
"""
Clear pages collection - Slower, more stable version
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

def clear_slowly():
    info = get_pb_info()
    pb_url = info.get('pb_url', 'http://127.0.0.1:8090')
    email = info.get('email')
    password = info.get('password')
    
    print("=== Clearing Pages (Slow & Steady) ===\n")
    
    # Auth
    auth_resp = requests.post(
        f"{pb_url}/api/collections/_superusers/auth-with-password",
        json={"identity": email, "password": password}
    )
    
    if auth_resp.status_code != 200:
        print(f"❌ Auth failed")
        return
    
    token = auth_resp.json()['token']
    headers = {"Authorization": f"Bearer {token}"}
    
    deleted = 0
    
    while True:
        # Get small batch
        resp = requests.get(
            f"{pb_url}/api/collections/pages/records?page=1&perPage=100",
            headers=headers
        )
        
        if resp.status_code != 200:
            print(f"Error: {resp.status_code}")
            break
        
        items = resp.json().get('items', [])
        
        if not items:
            print(f"\n✅ Done! Deleted {deleted:,} total")
            break
        
        # Delete one by one with delay
        for item in items:
            try:
                del_resp = requests.delete(
                    f"{pb_url}/api/collections/pages/records/{item['id']}",
                    headers=headers
                )
                
                if del_resp.status_code == 204:
                    deleted += 1
                    if deleted % 100 == 0:
                        print(f"  {deleted:,}...", flush=True)
                
                time.sleep(0.02)  # 20ms delay per delete
            except Exception as e:
                print(f"\nError deleting: {e}")
                time.sleep(1)  # Wait longer on error
                continue
        
        time.sleep(0.5)  # Pause between batches

if __name__ == "__main__":
    clear_slowly()
