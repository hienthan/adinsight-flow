#!/usr/bin/env python3
import requests
import json
import os

def get_pb_info():
    info = {}
    try:
        with open('db/pb_info.txt', 'r') as f:
            for line in f:
                if ':' in line:
                    k, v = line.split(':', 1)
                    info[k.strip()] = v.strip()
    except Exception:
        return None
    return info

def authenticate(pb_url, email, password):
    auth_url = f"{pb_url}/api/collections/_superusers/auth-with-password"
    try:
        resp = requests.post(auth_url, json={"identity": email, "password": password}, timeout=10)
        if resp.status_code == 200:
            return resp.json().get('token')
    except Exception as e:
        print(f"Auth error: {e}")
    return None

def main():
    print("=== Deleting all records in tvlk_pages ===")
    info = get_pb_info()
    if not info:
        print("❌ Error: No pb_info.txt found")
        return
        
    pb_url = info['pb_url']
    token = authenticate(pb_url, info['email'], info['password'])
    if not token:
        print("❌ Auth failed")
        return

    headers = {"Authorization": f"Bearer {token}"}
    collection = "tvlk_pages"
    
    deleted = 0
    while True:
        # Fetch up to 500 records at a time
        resp = requests.get(f"{pb_url}/api/collections/{collection}/records?perPage=500", headers=headers)
        if resp.status_code != 200:
            print(f"❌ Failed to fetch records: {resp.text}")
            break
            
        data = resp.json()
        items = data.get('items', [])
        
        if not items:
            break
            
        for item in items:
            del_resp = requests.delete(f"{pb_url}/api/collections/{collection}/records/{item['id']}", headers=headers)
            if del_resp.status_code == 204:
                deleted += 1
                if deleted % 100 == 0:
                    print(f"Deleted {deleted} records...")
            else:
                print(f"❌ Failed to delete {item['id']}: {del_resp.text}")
                
    print(f"✅ Successfully deleted {deleted} records from {collection}.")

if __name__ == "__main__":
    main()
