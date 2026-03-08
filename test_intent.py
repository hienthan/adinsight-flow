from scripts.tvlk.url_classifier_v5.intent_detector import IntentDetector
import os
import sys

base_dir = "scripts/tvlk"
kw_path = f"{base_dir}/intent-detection/intent_keywords.json"
pat_path = f"{base_dir}/intent-detection/travel_pattern_signals.json"

try:
    detector = IntentDetector(kw_path, pat_path)

    test_slugs = [
        "tiket kereta api murah",
        "panduan wisata bali 3 hari 2 malam",
        "harga tiket masuk dufan promo"
    ]

    for slug in test_slugs:
        print(f"Slug: {slug}")
        print(f"Patterns: {detector.detect_patterns(slug)[0]}")
        print("-" * 20)
except Exception as e:
    import traceback
    traceback.print_exc()
