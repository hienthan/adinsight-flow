import json
import os
from engine import ClassifierEngine

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    stopwords_path = os.path.join(base_dir, "geo_kb", "geo_stopwords.json")
    exclude_path = os.path.join(base_dir, "..", "lib", "exclude_keywords.json")
    geo_kb_dir = os.path.join(base_dir, "geo_kb")
    intent_kw_path = os.path.join(base_dir, "intent-detection", "intent_keywords.json")
    intent_pat_path = os.path.join(base_dir, "intent-detection", "travel_pattern_signals.json")

    engine = ClassifierEngine(
        stopwords_path=stopwords_path,
        exclude_keywords_path=exclude_path,
        geo_kb_dir=geo_kb_dir,
        intent_keywords_path=intent_kw_path,
        intent_patterns_path=intent_pat_path
    )

    test_urls = [
        "https://www.traveloka.com/id-id/explore/destination/pura-uluwatu-bali",
        "https://www.traveloka.com/id-id/explore/destination/itinerary-bali-3-hari-2-malam",
        "https://www.traveloka.com/id-id/explore/destination/tempat-wisata-bandung",
        "https://www.traveloka.com/id-id/explore/destination/jadwal-kereta-bandara-yia",
        "https://www.traveloka.com/id-id/explore/destination/paket-tour-bali-3-hari-2-malam-kereta",
        "https://www.traveloka.com/id-id/explore/destination/harga-tiket-jadwal-klasemen-liga", # Should be spam
        "https://www.traveloka.com/id-id/explore/destination/unknown-city-in-europe" # Should trigger legacy fallback
    ]

    for url in test_urls:
        print(f"\nEvaluating: {url}")
        res = engine.process_url(url)
        print(json.dumps(res, indent=2))

if __name__ == "__main__":
    main()
