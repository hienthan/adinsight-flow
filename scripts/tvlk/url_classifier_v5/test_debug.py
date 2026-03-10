import json
from main import get_classifier

c = get_classifier()
res = c.process_url("https://traveloka.com/id-id/explore/activities/klinik-kecantikan-di-jakarta-ta/571017")
print(json.dumps(res, indent=2))
