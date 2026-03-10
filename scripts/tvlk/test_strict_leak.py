import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scripts.tvlk.url_classifier_v5.main import get_classifier
from scripts.tvlk.tvlk_enrich_and_import_v5 import translate_to_en
from scripts.lib.geo_engine import GeoEngine
from urllib.parse import urlparse, unquote

v5_engine = get_classifier()
global_geo_engine = GeoEngine()

def debug_process_url(url: str):
    print(f"\n{'='*50}")
    print(f"TESTING URL: {url}")
    
    path = urlparse(url).path.rstrip('/')
    parts = path.split('/')
    if len(parts) < 2: return None
    
    id_part = parts[-1]
    raw_slug = parts[-2] if id_part.isdigit() else id_part
    canonical_id = id_part if id_part.isdigit() else ""
    slug = unquote(raw_slug)
    
    suffix = ""
    slug_for_translation = slug
    if '-' in raw_slug:
        potential_suffix = raw_slug.split('-')[-1]
        if len(potential_suffix) <= 5 and not potential_suffix.isdigit():
            suffix = f"-{potential_suffix}"
            if suffix.lower() in ['-ta', '-trp', '-acc']:
                slug_for_translation = slug[:-len(suffix)]

    title_en = translate_to_en(slug_for_translation.replace('-', ' '))
    print(f"SLUG: {slug}")
    print(f"EN TITLE: {title_en}")
    
    # V5 Engine Execution
    v5_res = v5_engine.process_url(url)
    
    final_city = v5_res.get("city")
    final_province = v5_res.get("province")
    final_country = v5_res.get("country")
    final_entity = v5_res.get("geo_entity")
    geo_type = v5_res.get("geo_type")
    
    print("\n[V5 DETECTED]")
    print(f"Entity:   {final_entity}")
    print(f"Type:     {geo_type}")
    print(f"City:     {final_city}")
    print(f"Province: {final_province}")
    print(f"Country:  {final_country}")
    
    # Emulate the problematic condition BEFORE my fix (which caused the leak originally)
    # The original was: if not final_entity or geo_type == "legacy":
    # Let's see if this original condition was the culprit, or if my NEW condition is also failing.
    
    print("\n[GLOBAL NLP CONDITION CHECK]")
    triggered_nlp = False
    
    if not final_entity or geo_type == "legacy":
         print("--> Original trigger: YES (Entity None OR Type is legacy)")
         triggered_nlp = True
    else:
         print("--> Original trigger: NO")
         
    if not final_entity or (final_entity == "Unknown" and final_country == "Unknown"):
         print("--> New trigger: YES (Entity None OR Entity+Country Unknown)")
         triggered_nlp = True
    else:
         print("--> New trigger: NO")
         
    if triggered_nlp:
        global_geo_data = global_geo_engine.detect_geo_structured(slug, title_en)
        print("\n[V4 GLOBAL FALLBACK RESULT]")
        print(f"Country:  {global_geo_data.get('country')}")
        print(f"City:     {global_geo_data.get('city')}")
        print(f"Province: {global_geo_data.get('province')}")
    else:
        print("\n[STAYED IN V5]")

if __name__ == "__main__":
    test_urls = [
        "https://www.traveloka.com/id-id/explore/activities/klinik-kecantikan-di-jakarta-ta/571017",
        "https://www.traveloka.com/id-id/explore/activities/pl-tempat-spa-di-bali/158563",
        "https://www.traveloka.com/id-id/explore/activities/tempat-pijat-di-bandung-ta/531448"
    ]
    for u in test_urls:
         debug_process_url(u)
