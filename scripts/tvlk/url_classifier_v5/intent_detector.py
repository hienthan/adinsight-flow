import re
from typing import Dict, Any, List, Tuple
from utils import load_json

INTENT_PRIORITY = [
    "transport",
    "planning",
    "things_to_do",
    "destination",
    "information"
]

INTENT_BASE_SCORE = {
    "things_to_do": 9,
    "destination": 8,
    "planning": 8,
    "transport": 7,
    "information": 6
}

MAX_PATTERN_BOOST = {
    "planning": 6,
    "things_to_do": 5,
    "transport": 3
}

class IntentDetector:
    def __init__(self, keywords_path: str, patterns_path: str):
        self.keywords_db = load_json(keywords_path)
        
        patterns_data = load_json(patterns_path)
        self.patterns_db = patterns_data.get("patterns", {})

        # Pre-sort patterns by length descending for longest-match-first span deduplication
        self.sorted_patterns = []
        for p_name, p_data in self.patterns_db.items():
            variants = [p_name] + p_data.get("aliases", [])
            for variant in variants:
                variant_space = variant.replace("-", " ")
                self.sorted_patterns.append((variant_space, p_name, p_data))
                if variant != variant_space:
                    self.sorted_patterns.append((variant, p_name, p_data))
                    
        # Sort descending by length of the variant string
        self.sorted_patterns = sorted(self.sorted_patterns, key=lambda x: len(x[0]), reverse=True)

    def detect_keywords(self, tokens: List[str]) -> Tuple[Dict[str, bool], List[str]]:
        keyword_hits = {}
        detected_keywords = []

        for token in tokens:
            for intent, keywords in self.keywords_db.items():
                if token in keywords:
                    detected_keywords.append(token)
                    keyword_hits[intent] = True

        return keyword_hits, detected_keywords

    def detect_patterns(self, slug_norm: str) -> Tuple[List[str], Dict[str, int]]:
        working_slug = slug_norm
        detected_patterns = []
        matched_bases = set()
        boost_by_intent = {}

        for variant, base_name, data in self.sorted_patterns:
            if not variant:
                continue
                
            escaped_var = re.escape(variant)
            pattern_regex = re.compile(r'\b' + escaped_var + r'\b')
            
            if pattern_regex.search(working_slug):
                if base_name in matched_bases:
                    # duplicate guard
                    pass
                else:
                    matched_bases.add(base_name)
                    detected_patterns.append(base_name)

                    intent = data.get("intent")
                    weight = data.get("weight", 0)

                    if intent:
                        boost_by_intent[intent] = boost_by_intent.get(intent, 0) + weight

                # Span deduplication
                working_slug = pattern_regex.sub(' ', working_slug)

        # Apply maximum limits
        for intent in boost_by_intent:
            cap = MAX_PATTERN_BOOST.get(intent, 5) # Default cap 5 if not specified
            boost_by_intent[intent] = min(boost_by_intent[intent], cap)

        return detected_patterns, boost_by_intent

    def select_intent(self, scores: Dict[str, int]) -> str:
        if not scores:
            return "destination"
            
        max_score = max(scores.values())
        candidates = [intent for intent, score in scores.items() if score == max_score]

        if len(candidates) == 1:
            return candidates[0]

        # Tie-breaker priority
        for intent in INTENT_PRIORITY:
            if intent in candidates:
                return intent
                
        return candidates[0]

    def process(self, slug_norm: str, tokens: List[str]) -> Dict[str, Any]:
        keyword_hits, detected_keywords = self.detect_keywords(tokens)
        detected_patterns, pattern_boost = self.detect_patterns(slug_norm)

        scores = {}

        # 1. Activate bases
        for intent in keyword_hits:
            scores[intent] = INTENT_BASE_SCORE.get(intent, 0)

        # 2. Add pattern boosts
        for intent, boost in pattern_boost.items():
            if intent not in scores:
                scores[intent] = INTENT_BASE_SCORE.get(intent, 0)
            scores[intent] += boost

        if not scores:
            return {
                "intent_primary": "destination",
                "intent_score": INTENT_BASE_SCORE["destination"],
                "detected_patterns": [],
                "detected_keywords": []
            }

        intent = self.select_intent(scores)
        
        return {
            "intent_primary": intent,
            "intent_score": scores[intent],
            "detected_patterns": detected_patterns,
            "detected_keywords": detected_keywords
        }
