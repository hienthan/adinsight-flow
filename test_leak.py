import sys
import os

# Ensure the root crawler-demo directory is the absolute first path Python checks
root_dir = os.path.dirname(os.path.abspath(__file__))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from scripts.tvlk.url_classifier_v5.main import get_classifier
import urllib.request
import json
import urllib.parse
import traceback

classifier = get_classifier()

query = urllib.parse.urlencode({'filter': 'geo_type="global_nlp" && country="Indonesia"', 'perPage': 20})
url = f'http://127.0.0.1:8090/api/collections/tvlk_pages/records?{query}'

try:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        items = data.get('items', [])
        
        print(f'Testing {len(items)} failed URLs through V5 natively...\n')
        
        for item in items:
            slug = item.get('slug')
            print(f'URL: {slug}')
            
            fake_url = f'https://traveloka.com/id-id/explore/activities/{slug}'
            res = classifier.process(fake_url)
            
            geo_e = res.get('geo_entity')
            geo_t = res.get('geo_type')
            city = res.get('city', 'None')
            prov = res.get('province', 'None')
            
            print(f'  V5 Geo Entity: {geo_e}')
            print(f'  V5 Geo Type: {geo_t}')
            print(f'  V5 City: {city}')
            print(f'  V5 Province: {prov}')
            print('-' * 40)
            
except Exception as e:
    traceback.print_exc()
    print(f'Error: {e}')
