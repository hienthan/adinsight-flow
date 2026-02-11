
import requests
import json

PB_URL = "http://127.0.0.1:8090"
EMAIL = "hien.thanquang@gmail.com"
PASSWORD = "12345678x@X"

def authenticate():
    resp = requests.post(f"{PB_URL}/api/collections/_superusers/auth-with-password", json={
        "identity": EMAIL, "password": PASSWORD
    })
    return resp.json()['token']

def update_collection():
    token = authenticate()
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get current collection
    resp = requests.get(f"{PB_URL}/api/collections/trend_signals", headers=headers)
    collection = resp.json()
    
    # Modify fields
    for field in collection['fields']:
        if field['name'] == 'product_types':
            field['maxSelect'] = 10
            # Fix typo if present
            if 'entry_prestrip' in field['values']:
                field['values'] = [v if v != 'entry_prestrip' else 'entry_pretrip' for v in field['values']]
        if field['name'] == 'source_markets':
            field['maxSelect'] = 10
            
    # Update
    resp = requests.patch(f"{PB_URL}/api/collections/trend_signals", headers=headers, json={
        "fields": collection['fields']
    })
    if resp.status_code == 200:
        print("✅ Collection updated successfully.")
    else:
        print(f"❌ Failed to update collection: {resp.status_code}")
        print(resp.text)

if __name__ == "__main__":
    update_collection()
