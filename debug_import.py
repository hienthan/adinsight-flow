import sys
import os
from pprint import pprint

# Setup paths
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("Starting debug script...")

try:
    from scripts.tvlk.tvlk_enrich_and_import_v5 import process_url
    print("Successfully imported process_url")
except Exception as e:
    print(f"Import error: {e}")
    sys.exit(1)

url = "https://www.traveloka.com/id-id/explore/activities/klinik-kecantikan-di-jakarta-ta/571017"
print(f"Testing URL: {url}")

try:
    result = process_url(url, "tvlk")
    print("Result:")
    pprint(result)
except Exception as e:
    print(f"Error during process_url: {e}")
