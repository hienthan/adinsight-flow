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
    except:
        pass
    return info

def sync_pb():
    info = get_pb_info()
    pb_url = info.get('pb_url', 'http://127.0.0.1:8090')
    email = info.get('email')
    password = info.get('password')

    # Auth
    auth_url = f"{pb_url}/api/collections/_superusers/auth-with-password"
    resp = requests.post(auth_url, json={"identity": email, "password": password})
    if resp.status_code != 200:
        print("Auth failed. Check db/pb_info.txt")
        return
    token = resp.json()['token']
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Define Collections based on schema.md
    collections = [
        {
            "name": "platforms",
            "type": "base",
            "schema": [
                {"name": "key", "type": "text", "required": True},
                {"name": "name", "type": "text"},
                {"name": "base_url", "type": "url"},
                {"name": "default_language", "type": "text"}
            ]
        },
        {
            "name": "pages",
            "type": "base",
            "schema": [
                {"name": "platform", "type": "relation", "options": {"collectionId": "platforms", "maxSelect": 1}},
                {"name": "canonical_id", "type": "text"},
                {"name": "language", "type": "text"},
                {"name": "url", "type": "url"},
                {"name": "slug", "type": "text"},
                {"name": "sitemap_tag", "type": "text"},
                {"name": "country", "type": "text"},
                {"name": "city", "type": "text"},
                {"name": "category_hint", "type": "text"},
                {"name": "is_private", "type": "bool"},
                {"name": "tier", "type": "select", "options": {"values": ["1", "2", "3", "4", "5"]}},
                {"name": "translated_title_vi", "type": "text"},
                {"name": "include_for_dsa", "type": "bool"},
                {"name": "exclude_for_dsa", "type": "bool"},
                {"name": "sitemap_priority", "type": "number"},
                {"name": "sitemap_lastmod", "type": "date"}
            ]
        },
        {
            "name": "platform_metadata",
            "type": "base",
            "fields": [
                {"name": "created", "type": "date", "required": False},
                {"name": "updated", "type": "date", "required": False},
                {"name": "platform", "type": "relation", "options": {"collectionId": "platforms", "maxSelect": 1}},
                {"name": "type", "type": "select", "options": {"values": ["country", "city", "category", "sitemap_tag"]}},
                {"name": "value", "type": "text"},
                {"name": "count", "type": "number"}
            ]
        },
        {
            "name": "url_patterns",
            "type": "base",
            "fields": [
                {"name": "created", "type": "date", "required": False},
                {"name": "updated", "type": "date", "required": False},
                {"name": "platform_id", "type": "relation", "options": {"collectionId": "platforms", "maxSelect": 1}},
                {"name": "pattern", "type": "text"},
                {"name": "category", "type": "select", "options": {"values": ["hotel", "activity", "flight", "other"]}},
                {"name": "default_tier", "type": "number"},
                {"name": "status", "type": "select", "options": {"values": ["active", "disabled"]}}
            ]
        },
        {
            "name": "exports",
            "type": "base",
            "fields": [
                {"name": "created", "type": "date", "required": False},
                {"name": "updated", "type": "date", "required": False},
                {"name": "name", "type": "text"},
                {"name": "platform", "type": "relation", "options": {"collectionId": "platforms", "maxSelect": 1}},
                {"name": "country", "type": "text"},
                {"name": "city", "type": "text"},
                {"name": "tier", "type": "number"},
                {"name": "result_text", "type": "text"},
                {"name": "total_count", "type": "number"}
            ]
        }
    ]

    # Reverse order for deletion to respect relations
    print("Resetting collections...")
    all_colls_resp = requests.get(f"{pb_url}/api/collections?perPage=500", headers=headers)
    if all_colls_resp.status_code == 200:
        all_colls = all_colls_resp.json().get('items', [])
        target_names = ["platforms", "pages", "platform_metadata", "url_patterns", "exports", "test_coll"]
        # Filter and delete in reverse order
        for name in reversed(target_names):
            match = next((c for c in all_colls if c['name'] == name), None)
            if match:
                requests.delete(f"{pb_url}/api/collections/{match['id']}", headers=headers)
                print(f"Deleted collection: {name}")

    # 1. Create Platforms first
    plat_def = {
        "name": "platforms",
        "type": "base",
        "fields": [
            {"name": "key", "type": "text", "required": True},
            {"name": "name", "type": "text"},
            {"name": "base_url", "type": "url"},
            {"name": "default_language", "type": "text"}
        ]
    }
    resp = requests.post(f"{pb_url}/api/collections", headers=headers, json=plat_def)
    if resp.status_code != 200:
        print(f"Failed to create platforms: {resp.text}")
        return
    platform_id = resp.json()['id']
    print(f"Created platforms (ID: {platform_id})")

    # 2. Define other collections using the real platform_id
    collections = [
        {
            "name": "pages",
            "type": "base",
            "fields": [
                {"name": "platform", "type": "relation", "collectionId": platform_id, "maxSelect": 1},
                {"name": "canonical_id", "type": "text"},
                {"name": "language", "type": "text"},
                {"name": "url", "type": "url"},
                {"name": "slug", "type": "text"},
                {"name": "sitemap_tag", "type": "text"},
                {"name": "country", "type": "text"},
                {"name": "city", "type": "text"},
                {"name": "category_hint", "type": "text"},
                {"name": "is_private", "type": "bool"},
                {"name": "tier", "type": "select", "values": ["1", "2", "3", "4", "5"], "maxSelect": 1},
                {"name": "translated_title_vi", "type": "text"},
                {"name": "include_for_dsa", "type": "bool"},
                {"name": "exclude_for_dsa", "type": "bool"},
                {"name": "sitemap_priority", "type": "number"},
                {"name": "sitemap_lastmod", "type": "date"}
            ]
        },
        {
            "name": "platform_metadata",
            "type": "base",
            "fields": [
                {"name": "platform", "type": "relation", "collectionId": platform_id, "maxSelect": 1},
                {"name": "type", "type": "select", "values": ["country", "city", "category", "sitemap_tag"], "maxSelect": 1},
                {"name": "value", "type": "text"},
                {"name": "count", "type": "number"}
            ]
        },
        {
            "name": "url_patterns",
            "type": "base",
            "fields": [
                {"name": "platform_id", "type": "relation", "collectionId": platform_id, "maxSelect": 1},
                {"name": "pattern", "type": "text"},
                {"name": "category", "type": "select", "values": ["hotel", "activity", "flight", "other"], "maxSelect": 1},
                {"name": "default_tier", "type": "number"},
                {"name": "status", "type": "select", "values": ["active", "disabled"], "maxSelect": 1}
            ]
        },
        {
            "name": "exports",
            "type": "base",
            "fields": [
                {"name": "name", "type": "text"},
                {"name": "platform", "type": "relation", "collectionId": platform_id, "maxSelect": 1},
                {"name": "country", "type": "text"},
                {"name": "city", "type": "text"},
                {"name": "tier", "type": "number"},
                {"name": "result_text", "type": "text"},
                {"name": "total_count", "type": "number"}
            ]
        }
    ]

    for coll_def in collections:
        resp = requests.post(f"{pb_url}/api/collections", headers=headers, json=coll_def)
        if resp.status_code == 200:
            print(f"Created collection: {coll_def['name']}")
        else:
            print(f"Failed to create {coll_def['name']}: {resp.text}")

    # Add indexes
    print("Setting up unique indexes...")
    pages_resp = requests.get(f"{pb_url}/api/collections/pages", headers=headers)
    if pages_resp.status_code == 200:
        pages_coll = pages_resp.json()
        pages_coll['indexes'] = ["CREATE UNIQUE INDEX idx_page_unique ON pages (canonical_id, language)"]
        requests.patch(f"{pb_url}/api/collections/{pages_coll['id']}", headers=headers, json=pages_coll)
        print("Updated pages index.")

if __name__ == "__main__":
    sync_pb()
