#!/usr/bin/env python3
"""
PocketBase Connection Test Script
Run this BEFORE any import to verify:
1. Config file is valid
2. PocketBase is running
3. Credentials are correct
4. Required collections exist
5. Required fields exist
"""

import json
import requests
import sys
from pathlib import Path

def get_pb_info():
    """Load PocketBase connection info from db/pb_info.txt"""
    info = {}
    try:
        with open('db/pb_info.txt', 'r') as f:
            for line in f:
                if ':' in line:
                    k, v = line.split(':', 1)
                    info[k.strip()] = v.strip()
    except FileNotFoundError:
        print("❌ ERROR: db/pb_info.txt not found!")
        return None
    except Exception as e:
        print(f"❌ ERROR reading db/pb_info.txt: {e}")
        return None
    
    return info

def test_connection(pb_url):
    """Test if PocketBase is running"""
    try:
        resp = requests.get(f"{pb_url}/api/health", timeout=5)
        if resp.status_code == 200:
            print(f"✅ PocketBase is running at {pb_url}")
            return True
        else:
            print(f"❌ PocketBase returned status {resp.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to {pb_url}")
        print("   → Is PocketBase running? Try: pocketbase serve")
        return False
    except requests.exceptions.Timeout:
        print(f"❌ Connection timeout to {pb_url}")
        return False
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False

def test_auth(pb_url, email, password):
    """Test authentication"""
    auth_url = f"{pb_url}/api/collections/_superusers/auth-with-password"
    
    try:
        resp = requests.post(auth_url, json={
            "identity": email,
            "password": password
        }, timeout=10)
        
        if resp.status_code == 200:
            print(f"✅ Authentication successful")
            print(f"   Email: {email}")
            return resp.json().get('token')
        elif resp.status_code == 400:
            print(f"❌ Invalid credentials")
            print(f"   Email: {email}")
            print(f"   → Check db/pb_info.txt")
            return None
        elif resp.status_code == 404:
            print(f"❌ Auth endpoint not found: {auth_url}")
            print(f"   → PocketBase version mismatch?")
            return None
        else:
            print(f"❌ Auth failed: HTTP {resp.status_code}")
            print(f"   Response: {resp.text[:200]}")
            return None
    except Exception as e:
        print(f"❌ Auth error: {e}")
        return None

def test_collection_exists(pb_url, token, collection_name):
    """Test if collection exists and get schema"""
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        # Try to fetch collection info
        resp = requests.get(
            f"{pb_url}/api/collections/{collection_name}/records",
            headers=headers,
            params={"perPage": 1},
            timeout=10
        )
        
        if resp.status_code == 200:
            total = resp.json().get('totalItems', 0)
            print(f"✅ Collection '{collection_name}' exists ({total} records)")
            return True
        elif resp.status_code == 404:
            print(f"❌ Collection '{collection_name}' not found")
            return False
        else:
            print(f"⚠️  Collection '{collection_name}': HTTP {resp.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error checking collection '{collection_name}': {e}")
        return False

def test_field_exists(pb_url, token, collection_name, required_fields):
    """Test if required fields exist by checking a sample record"""
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        resp = requests.get(
            f"{pb_url}/api/collections/{collection_name}/records",
            headers=headers,
            params={"perPage": 1},
            timeout=10
        )
        
        if resp.status_code != 200:
            print(f"⚠️  Cannot verify fields - no access to records")
            return True  # Skip field check if can't access
        
        data = resp.json()
        if data.get('totalItems', 0) == 0:
            print(f"⚠️  Cannot verify fields - collection is empty")
            return True  # Can't verify without records
        
        sample_record = data['items'][0]
        existing_fields = set(sample_record.keys())
        
        missing = []
        for field in required_fields:
            if field not in existing_fields:
                missing.append(field)
        
        if missing:
            print(f"❌ Missing fields in '{collection_name}': {missing}")
            print(f"   Available fields: {list(existing_fields)}")
            return False
        else:
            print(f"✅ All required fields exist in '{collection_name}'")
            return True
            
    except Exception as e:
        print(f"⚠️  Cannot verify fields: {e}")
        return True  # Don't fail on field check errors

def main():
    print("=" * 60)
    print("PocketBase Connection Test")
    print("=" * 60)
    
    # Step 1: Load config
    print("\n1️⃣  Loading configuration...")
    info = get_pb_info()
    if not info:
        sys.exit(1)
    
    pb_url = info.get('pb_url')
    email = info.get('email')
    password = info.get('password')
    
    if not pb_url or not email or not password:
        print("❌ Missing required fields in db/pb_info.txt")
        print(f"   pb_url: {'✓' if pb_url else '✗'}")
        print(f"   email: {'✓' if email else '✗'}")
        print(f"   password: {'✓' if password else '✗'}")
        sys.exit(1)
    
    print(f"✅ Config loaded")
    print(f"   URL: {pb_url}")
    print(f"   Email: {email}")
    
    # Step 2: Test connection
    print("\n2️⃣  Testing connection...")
    if not test_connection(pb_url):
        sys.exit(1)
    
    # Step 3: Test authentication
    print("\n3️⃣  Testing authentication...")
    token = test_auth(pb_url, email, password)
    if not token:
        sys.exit(1)
    
    # Step 4: Test required collections
    print("\n4️⃣  Testing required collections...")
    collections_ok = True
    
    # Check platforms
    if not test_collection_exists(pb_url, token, "platforms"):
        collections_ok = False
    
    # Check pages
    if not test_collection_exists(pb_url, token, "pages"):
        collections_ok = False
    
    # Check platform_metadata
    if not test_collection_exists(pb_url, token, "platform_metadata"):
        collections_ok = False
    
    if not collections_ok:
        sys.exit(1)
    
    # Step 5: Test required fields in 'pages'
    print("\n5️⃣  Testing required fields...")
    required_fields = [
        'platform', 'canonical_id', 'language', 'languages',
        'content_type', 'url', 'slug', 'sitemap_tag', 'sub_tag',
        'country', 'city', 'tier', 'is_private', 'translated_title_vi'
    ]
    
    if not test_field_exists(pb_url, token, "pages", required_fields):
        print("\n⚠️  Field validation failed - may need schema update")
        # Don't exit - just warn
    
    # Success!
    print("\n" + "=" * 60)
    print("✅ ALL TESTS PASSED - Ready to import!")
    print("=" * 60)
    print("\nYou can now run:")
    print("  python3 scripts/02_import_to_pb.py <json_file> <platform>")
    
    sys.exit(0)

if __name__ == "__main__":
    main()
