import requests
from scripts.tvlk.tvlk_enrich_and_import import get_pb_info, authenticate, COLLECTION_NAME

def main():
    info = get_pb_info()
    pb_url = info['pb_url']
    token = authenticate(pb_url, info['email'], info['password'])
    headers = {"Authorization": f"Bearer {token}"}
    
    url = f"{pb_url}/api/collections/{COLLECTION_NAME}/records?filter=(title_en~'trav')&perPage=10"
    resp = requests.get(url, headers=headers).json()
    items = resp.get('items', [])
    for item in items:
        print(f"{item['title_en']}")
        
    url2 = f"{pb_url}/api/collections/{COLLECTION_NAME}/records?filter=(title_en~'trave')&perPage=10"
    resp2 = requests.get(url2, headers=headers).json()
    items2 = resp2.get('items', [])
    for item in items2:
        print(f"{item['title_en']}")

main()
