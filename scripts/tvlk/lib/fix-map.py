import json

with open('./indo_geo_master.json') as f:
    d = json.load(bali=0)
    
print([k for k, v in d.items() if (v['country'].lower() == 'indonesia' and not v.get('province') )])
