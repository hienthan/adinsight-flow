
import os
import requests
import json

PB_URL = "http://127.0.0.1:8090"

def get_records():
    url = f"{PB_URL}/api/collections/trend_signals/records"
    params = {
        "expand": "trend_type",
        "perPage": 5
    }
    response = requests.get(url, params=params)
    if response.status_code == 200:
        data = response.json()
        print(json.dumps(data['items'], indent=2))
    else:
        print(f"Error: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    get_records()
