import requests
import sys

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

def main():
    info = get_pb_info()
    if not info: return

    pb_url = info.get('pb_url')
    email = info.get('email')
    password = info.get('password')

    # Auth
    try:
        resp = requests.post(f"{pb_url}/api/collections/_superusers/auth-with-password", json={
            "identity": email, "password": password
        })
        if resp.status_code != 200:
            print(f"Auth failed: {resp.text}")
            return
        token = resp.json()['token']
    except Exception as e:
        print(f"Auth error: {e}")
        return

    headers = {"Authorization": f"Bearer {token}"}
    
    collections = ['trend_types', 'trend_signals']
    all_exist = True
    
    print(f"Checking collections on {pb_url}...")
    
    for col in collections:
        try:
            # Get collection details (admins only, but we have superuser auth)
            r = requests.get(f"{pb_url}/api/collections/{col}", headers=headers)
            if r.status_code == 200:
                data = r.json()
                print(f"✅ Collection '{col}' exists.")
                # PB v0.23+ uses 'fields'
                fields = data.get('fields', data.get('schema', []))
                print(f"   Fields: {[f['name'] for f in fields]}")
                
                # Check options for select fields
                for f in fields:
                    if f['type'] == 'select':
                        print(f"   -> Field '{f['name']}' options: {f.get('options', {}).get('values')}")
                
                if col == 'trend_types' or col == 'trend_signals':
                    import json
                    print(f"DEBUG FULL JSON ({col}): {json.dumps(data, indent=2)}")
                    # pass
            elif r.status_code == 404:
                print(f"❌ Collection '{col}' NOT found.")
                all_exist = False
            else:
                print(f"⚠️ Error checking '{col}': {r.status_code} {r.text}")
                all_exist = False
        except Exception as e:
            print(f"Error checking '{col}': {e}")
            all_exist = False

    if all_exist:
        print("\nAll collections exist. Review fields above ^")
    else:
        print("\nSome collections are missing.")

if __name__ == '__main__':
    main()
