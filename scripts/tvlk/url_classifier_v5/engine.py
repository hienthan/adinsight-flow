from typing import Dict, Any
from slug_parser import SlugParser
from entity_detector import EntityDetector
from intent_detector import IntentDetector
from scoring import Scorer
from content_classifier import ContentClassifier

class ClassifierEngine:
    def __init__(self, stopwords_path: str, exclude_keywords_path: str, geo_kb_dir: str, intent_keywords_path: str, intent_patterns_path: str, content_taxonomy_path: str):
        self.parser = SlugParser(stopwords_path, exclude_keywords_path)
        self.geo_detector = EntityDetector(geo_kb_dir)
        self.intent_detector = IntentDetector(intent_keywords_path, intent_patterns_path)
        self.content_classifier = ContentClassifier(content_taxonomy_path)
        self.scorer = Scorer()

    def process_url(self, url: str) -> Dict[str, Any]:
        """
        Runs the full V5 pipeline on a single URL.
        """
        # 1-4. Parse, Normalize, Spam Check, Stopwords
        parse_result = self.parser.process(url)
        slug_norm = parse_result["slug_norm"]
        tokens = parse_result["tokens"]
        geo_tokens = parse_result["geo_tokens"] # stopwords matched out for geo
        is_active = parse_result["is_active"]

        # 5-6. Geo Entity Detection + Legacy Fallback
        geo_result = self.geo_detector.process(url, geo_tokens)
        
        # 7. Intent Detection
        intent_result = self.intent_detector.process(slug_norm, tokens)
        
        # 7.5 Content Taxonomy Classification
        content_type, sub_tag = self.content_classifier.classify(slug_norm)
        
        # 8. Scoring & DSA Campaign Routing
        planning_signal = self.scorer.evaluate_planning_signal(tokens)
        final_score = self.scorer.compute_final_score(
            intent_score=intent_result["intent_score"],
            geo_score=geo_result["geo_score"],
            planning_signal=planning_signal
        )

        dsa_campaign = self.scorer.generate_dsa_campaign(
            primary_intent=intent_result["intent_primary"],
            geo_type=geo_result["geo_type"],
            province=geo_result["province"],
            city=geo_result["city"],
            geo_entity=geo_result["geo_entity"]
        )

        # 9. Schema Formulation
        return {
            "url": url,
            "slug": parse_result["slug_raw"],
            "country": geo_result["country"],
            "province": geo_result["province"],
            "city": geo_result["city"],
            "geo_entity": geo_result["geo_entity"],
            "geo_type": geo_result["geo_type"],
            "infra_type": geo_result.get("infra_type", ""),
            "geo_score": geo_result["geo_score"],
            "entity_count": geo_result["entity_count"],
            "intent_primary": intent_result["intent_primary"],
            "intent_score": intent_result["intent_score"],
            "content_type": content_type,
            "sub_tag": sub_tag,
            "planning_signal": planning_signal,
            "final_score": round(final_score, 2),
            "dsa_campaign": dsa_campaign,
            "is_active": is_active,
            
            # Debug Arrays
            "slug_tokens": tokens,
            "geo_entities_raw": geo_result.get("entities_raw", []),
            "detected_patterns": intent_result["detected_patterns"],
            "detected_keywords": intent_result["detected_keywords"]
        }
