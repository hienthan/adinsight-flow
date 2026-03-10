import re
from typing import Dict, Any, List, Tuple
from utils import load_json

class ContentClassifier:
    def __init__(self, taxonomy_path: str):
        self.taxonomy_path = taxonomy_path
        self.categories: Dict[str, List[str]] = {}
        self.sorted_patterns = []
        self.load_taxonomy()

    def load_taxonomy(self):
        data = load_json(self.taxonomy_path)
        if "categories" in data:
            for cat_name, cat_data in data["categories"].items():
                keywords = cat_data.get("keywords", [])
                self.categories[cat_name] = keywords
                
                # Pre-compile patterns sorted by descending length
                for kw in keywords:
                    kw_space = kw.replace("-", " ")
                    self.sorted_patterns.append((kw_space, cat_name, kw))
                    if kw != kw_space:
                        self.sorted_patterns.append((kw, cat_name, kw))
                        
        # Sort descending by length of the target string pattern (longest match)
        self.sorted_patterns = sorted(self.sorted_patterns, key=lambda x: len(x[0]), reverse=True)

    def classify(self, slug_norm: str) -> Tuple[str, str]:
        """
        Scans the normalized slug against taxonomy keywords.
        Returns a tuple: (content_type, sub_tag)
        """
        for variant, category, original_keyword in self.sorted_patterns:
            if not variant:
                continue
                
            escaped_var = re.escape(variant)
            pattern_regex = re.compile(r'\b' + escaped_var + r'\b')
            
            if pattern_regex.search(slug_norm):
                # We return the top-level category as content_type,
                # and the exact matched keyword as sub_tag
                return category, original_keyword

        # If no match found, fallback to defaults
        return "poi_landmark", "general"
