import sys
sys.path.append('scripts/tvlk/lib')
import json
from tvlk_affiliate_scorer import evaluate_url

with open('scripts/tvlk/lib/indo_geo_master.json') as f:
    geo_db = json.load(f)

test_cases = [
    ("https://tvlk/promo-hotel-soekarno-hatta", "promo-hotel-soekarno-hatta", geo_db.get("soekarno-hatta")),
    ("https://tvlk/wisata-makam-sunan-ampel-tour", "wisata-makam-sunan-ampel-tour", geo_db.get("makam-sunan-ampel")),
    ("https://tvlk/hotel-papua-pegunungan", "hotel-papua-pegunungan", geo_db.get("papua-pegunungan")),
    ("https://tvlk/explore-bali-ubud-tour", "explore-bali-ubud-tour", geo_db.get("bali")),
    ("https://tvlk/promo-akhir-tahun-2026", "promo-akhir-tahun-2026", None),
]

for url, slug, geo in test_cases:
    print(f"\n--- Testing Slug: {slug} ---")
    if geo:
        print(f"Geo: {geo.get('display_name')} (Category: {geo.get('category')})")
        print(f"  Pop: {geo.get('domestic_popularity_score')}, Cross: {geo.get('cross_sell_potential_score')}, Inv: {geo.get('inventory_density_score')}")
    else:
        print("Geo: None")
    
    score = evaluate_url(url, slug, geo)
    print(f"Result Tier: {score['affiliate_tier']}")
    print(f"Campaign:    {score['dsa_campaign']}")
    print(f"Points:      Intent={score['intent_score']}, Cookie={score['cookie_score']}, Risk={score['cpc_risk_score']} => Final={score['affiliate_score']}")
    print("-" * 40)
