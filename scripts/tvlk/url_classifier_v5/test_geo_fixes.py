import os
import sys

base_dir = os.path.dirname(os.path.abspath(__file__))
from engine import ClassifierEngine

def main():
    stopwords_path = os.path.join(base_dir, "..", "geo_kb", "geo_stopwords.json")
    exclude_path = os.path.join(base_dir, "..", "..", "lib", "exclude_keywords.json")
    geo_kb_dir = os.path.join(base_dir, "..", "geo_kb")
    intent_kw_path = os.path.join(base_dir, "..", "intent-detection", "intent_keywords.json")
    intent_pat_path = os.path.join(base_dir, "..", "intent-detection", "travel_pattern_signals.json")
    content_tax_path = os.path.join(base_dir, "..", "intent-detection", "content_taxonomy.json")

    engine = ClassifierEngine(
        stopwords_path=stopwords_path,
        exclude_keywords_path=exclude_path,
        geo_kb_dir=geo_kb_dir,
        intent_keywords_path=intent_kw_path,
        intent_patterns_path=intent_pat_path,
        content_taxonomy_path=content_tax_path
    )
    
    urls = [
        "https://www.traveloka.com/id-id/explore/activities/pl-tempat-spa-di-bali/158563",
        "https://www.traveloka.com/id-id/explore/activities/tempat-pijat-di-bandung-ta/531448",
        "https://www.traveloka.com/id-id/explore/activities/klinik-kecantikan-di-jakarta-ta/571017",
        "https://www.traveloka.com/id-id/explore/activities/universal-studios-singapore/123",
        "https://www.traveloka.com/id-id/explore/activities/liburan-ke-tokyo-disneyland/456"
    ]

    for url in urls:
        print(f"\n=====================================")
        print(f"Evaluating: {url}")
        res = engine.process_url(url)
        print(f"City: {res['city']}")
        print(f"Province: {res['province']}")
        print(f"Country: {res['country']}")
        print(f"Geo Type: {res['geo_type']}")
        print(f"Geo Entity: {res['geo_entity']}")

if __name__ == "__main__":
    main()
