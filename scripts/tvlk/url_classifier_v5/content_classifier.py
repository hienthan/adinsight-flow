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
            for content_type, cat_data in data["categories"].items():
                sub_tags = cat_data.get("sub_tags", {})
                for sub_tag, keywords in sub_tags.items():
                    for kw in keywords:
                        kw_space = kw.replace("-", " ")
                        # Storing (pattern, content_type, sub_tag)
                        self.sorted_patterns.append((kw_space, content_type, sub_tag))
                        if kw != kw_space:
                            self.sorted_patterns.append((kw, content_type, sub_tag))
                        
        # Sort descending by length of the target string pattern (longest match)
        self.sorted_patterns = sorted(self.sorted_patterns, key=lambda x: len(x[0]), reverse=True)

    def classify(self, slug_norm: str) -> Tuple[str, str]:
        """
        Scans the normalized slug against taxonomy keywords.
        Returns a tuple: (content_type, sub_tag)
        """
        for variant, category, sub_tag in self.sorted_patterns:
            if not variant:
                continue
                
            escaped_var = re.escape(variant)
            pattern_regex = re.compile(r'\b' + escaped_var + r'\b')
            
            if pattern_regex.search(slug_norm):
                # Return the English Sub-Tag mapped from the taxonomy
                return category, sub_tag

        # If no match found, fallback to defaults
        return "poi_landmark", "unknown"
