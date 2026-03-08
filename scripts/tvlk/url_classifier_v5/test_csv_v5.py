import json
import os
import csv
from engine import ClassifierEngine

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    stopwords_path = os.path.join(base_dir, "geo_kb", "geo_stopwords.json")
    exclude_path = os.path.join(base_dir, "..", "lib", "exclude_keywords.json")
    geo_kb_dir = os.path.join(base_dir, "geo_kb")
    intent_kw_path = os.path.join(base_dir, "intent-detection", "intent_keywords.json")
    intent_pat_path = os.path.join(base_dir, "intent-detection", "travel_pattern_signals.json")
    content_tax_path = os.path.join(base_dir, "intent-detection", "content_taxonomy.json")

    engine = ClassifierEngine(
        stopwords_path=stopwords_path,
        exclude_keywords_path=exclude_path,
        geo_kb_dir=geo_kb_dir,
        intent_keywords_path=intent_kw_path,
        intent_patterns_path=intent_pat_path,
        content_taxonomy_path=content_tax_path
    )

    csv_path = os.path.join(base_dir, "..", "..", "dsa-csv", "tvlk", "test-activities-1003.csv")
    
    urls = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        for i, row in enumerate(reader):
            if i >= 15: # Test first 15
                break
            if row:
                urls.append(row[0])


    for url in urls:
        print(f"\n=====================================")
        print(f"Evaluating: {url}")
        res = engine.process_url(url)
        print(f"Intent: {res['intent_primary']} [{res['intent_score']}] | Geo: {res['geo_entity']} ({res['geo_type']}) [{res['geo_score']}]")
        print(f"DSA Campaign: {res['dsa_campaign']} | Active: {res['is_active']} | Planning Signal: {res['planning_signal']}")
        print(f"Patterns: {res['detected_patterns']} | Keywords: {res['detected_keywords']}")
        print(f"Taxonomy: Content-Type = {res['content_type']}, Sub-Tag = {res['sub_tag']}")
        print(f"Final Score: {res['final_score']}")

if __name__ == "__main__":
    main()
