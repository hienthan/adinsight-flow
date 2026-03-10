import os
import sys

base_dir = os.path.dirname(os.path.abspath(__file__))
# Insert the v5 directory specifically so its internal parallel imports work
sys.path.insert(0, os.path.join(base_dir, "scripts", "tvlk", "url_classifier_v5"))
sys.path.insert(0, base_dir)

from engine import ClassifierEngine

def main():
    stopwords_path = os.path.join(base_dir, "scripts", "tvlk", "geo_kb", "geo_stopwords.json")
    exclude_path = os.path.join(base_dir, "scripts", "lib", "exclude_keywords.json")
    geo_kb_dir = os.path.join(base_dir, "scripts", "tvlk", "geo_kb")
    intent_kw_path = os.path.join(base_dir, "scripts", "tvlk", "intent-detection", "intent_keywords.json")
    intent_pat_path = os.path.join(base_dir, "scripts", "tvlk", "intent-detection", "travel_pattern_signals.json")
    content_tax_path = os.path.join(base_dir, "scripts", "tvlk", "intent-detection", "content_taxonomy.json")

    engine = ClassifierEngine(
        stopwords_path=stopwords_path,
        exclude_keywords_path=exclude_path,
        geo_kb_dir=geo_kb_dir,
        intent_keywords_path=intent_kw_path,
        intent_patterns_path=intent_pat_path,
        content_taxonomy_path=content_tax_path
    )
    
    urls = [
        "https://www.traveloka.com/id-id/explore/activities/kegiatan-wisata-seru-di-garuda-wisnu-kencana-ta/123",
        "https://www.traveloka.com/id-id/explore/activities/wisata-sekitar-gwk-ta/456",
        "https://www.traveloka.com/id-id/explore/activities/sanggaluri-purbalingga-ta/789"
    ]

    for url in urls:
        print(f"\n{'='*40}")
        print(f"URL: {url}")
        res = engine.process_url(url)
        print(f"[V5 RAW RESULTS]")
        print(f"Geo Entity: {res.get('geo_entity')}")
        print(f"Geo Type: {res.get('geo_type')}")
        print(f"City: {res.get('city')}")
        print(f"Country: {res.get('country')}")

if __name__ == "__main__":
    main()
