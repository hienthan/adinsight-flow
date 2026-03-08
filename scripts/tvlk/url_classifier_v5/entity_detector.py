import re
from typing import Dict, Any, List, Set, Tuple
from utils import load_json

class EntityDetector:
    def __init__(self, geo_kb_dir: str):
        self.geo_kb_dir = geo_kb_dir
        self.entities: Dict[str, dict] = {}
        self.patterns: List[Tuple[str, str]] = [] # tuple of (search_pattern, canonical_key)
        self.load_kb()

    def load_kb(self):
        # Load aliases
        alias_index = load_json(f"{self.geo_kb_dir}/geo_alias_index.json")
        
        # Load all parts
        parts = [
            "part0_country.json",
            "part1_root_infrastructure.json",
            "part2_provinces.json",
            "part2_core_areas.json",
            "part3_sub_areas.json",
            "part3_landmarks.json",
            "part4_emerging_destinations.json",
            "part5_root_transport_tokens.json",
            "part6_spiritual_commercial_roots.json"
        ]
        
        for part in parts:
            try:
                data = load_json(f"{self.geo_kb_dir}/{part}")
                if "entities" in data:
                    for key, val in data["entities"].items():
                        val["canonical_id"] = key
                        self.entities[key] = val
                        
                        # Pattern 1: canonical key with space instead of hyphen
                        search_key = key.replace("-", " ")
                        self.patterns.append((search_key, key))
                        self.patterns.append((key, key))  # just in case hyphen is kept
                        
                        # Pattern 2: built-in aliases
                        for alias in val.get("aliases", []):
                            search_alias = alias.replace("-", " ")
                            self.patterns.append((search_alias, key))
                            self.patterns.append((alias, key))
                else:
                    # Some files might not have the "entities" nested wrap, but just top-level keys
                    # e.g sub_areas
                    for key, val in data.items():
                        if isinstance(val, dict) and "type" in val:
                            val["canonical_id"] = key
                            self.entities[key] = val
                            
                            search_key = key.replace("-", " ")
                            self.patterns.append((search_key, key))
                            self.patterns.append((key, key))
                            
                            for alias in val.get("aliases", []):
                                search_alias = alias.replace("-", " ")
                                self.patterns.append((search_alias, key))
                                self.patterns.append((alias, key))
            except Exception as e:
                print(f"Failed to load {part}: {e}")

        # Add pure geo_alias_index mappings
        for alias, canonical_key in alias_index.items():
            if canonical_key in self.entities:
                self.patterns.append((alias.replace("-", " "), canonical_key))
                self.patterns.append((alias, canonical_key))
                
        # Deduplicate patterns and sort by length descending (longest match wins)
        pattern_dict = {}
        for pat, key in self.patterns:
            # Prefer the first canonical key if multiple patterns map to different keys.
            if pat not in pattern_dict:
                pattern_dict[pat] = key
                
        self.patterns = sorted(pattern_dict.items(), key=lambda x: len(x[0]), reverse=True)

    def detect_geo_legacy(self, url: str) -> Dict[str, Any]:
        """Placeholder for the legacy geo detection fallback."""
        # TODO: Implement legacy logic mapping
        return {
            "geo_entity": None,
            "province": None,
            "city": None,
            "country": self.detect_country_legacy(url),
            "canonical_id": self.get_canonical_id_legacy(url),
            "geo_type": "legacy",
            "geo_score": 0,
            "entity_count": 0,
            "entities_raw": [],
            "legacy_fallback_used": True
        }

    def detect_country_legacy(self, url: str) -> str:
        """Placeholder for detecting country via legacy logic."""
        # TODO: Implement
        return "Unknown" # default fallback
        
    def get_canonical_id_legacy(self, url: str) -> str:
        """Placeholder for detecting canonical ID via legacy logic."""
        # TODO: Implement
        parts = url.strip('/').split('/')
        return parts[-1] if parts else ""

    def process(self, url: str, geo_tokens: List[str]) -> Dict[str, Any]:
        # Tokens are already normalized and stopwords removed
        geo_str = " ".join(geo_tokens)
        working_str = geo_str
        
        found_canonical_keys = set()
        detected_entities = []
        
        for pat, canonical_key in self.patterns:
            if not pat:
                continue
                
            # Regex boundary to prevent substring matches (e.g. matching 'bali' in 'balige')
            # Handle special characters in pattern if any
            escaped_pat = re.escape(pat)
            pattern_regex = re.compile(r'\b' + escaped_pat + r'\b')
            
            if pattern_regex.search(working_str):
                if canonical_key not in found_canonical_keys:
                    found_canonical_keys.add(canonical_key)
                    entity_data = self.entities[canonical_key]
                    detected_entities.append(entity_data)
                
                # Deduplicate: remove matched span
                working_str = pattern_regex.sub(' ', working_str)
                
        entity_count = len(detected_entities)
        
        if entity_count == 0:
            return self.detect_geo_legacy(url)
            
        # Tie-breaker priority as per Spec
        # "landmark" -> "transport_hub" -> "sub_area" -> "city" -> "province" -> "country"
        # Since we sort by geo_score first, the Highest Score wins.
        detected_entities = sorted(detected_entities, key=lambda x: x.get("geo_score", 0), reverse=True)
        primary = detected_entities[0]
        
        geo_score = primary.get("geo_score", 0)
        if entity_count >= 2:
            geo_score += 1

        # Parent Chain Resolution
        city = None
        province = None
        country = None
        infra_type = ""
        
        current_entity = primary
        geo_type = primary.get("type", "unknown")
        canonical_id = primary["canonical_id"]
        
        # Populate initial values
        if geo_type in ["city", "core_area", "regency", "sub_area"]:
            city = canonical_id
        elif geo_type in ["province", "region", "island"]:
            province = canonical_id
        elif geo_type == "country":
            country = canonical_id
        elif geo_type in ["transport_hub", "transport_system"]:
            infra_type = canonical_id

        # Walk up the parent chain
        while current_entity and current_entity.get("parent"):
            parent_id = current_entity["parent"]
            if parent_id not in self.entities:
                # Missing parent link in dataset, stop
                break
                
            parent_entity = self.entities[parent_id]
            p_type = parent_entity.get("type")
            
            if p_type in ["city", "core_area", "regency", "sub_area"] and not city:
                city = parent_id
            elif p_type in ["province", "region", "island"] and not province:
                province = parent_id
            elif p_type == "country" and not country:
                country = parent_id
                
            current_entity = parent_entity

        # Fallback for country if the chain doesn't reach one but the item is in Indonesian KB
        if not country:
             country = "Unknown"
        
        return {
            "geo_entity": canonical_id,
            "province": province, 
            "city": city,
            "country": country,
            "canonical_id": canonical_id,
            "geo_type": geo_type,
            "infra_type": infra_type,
            "geo_score": geo_score,
            "entity_count": entity_count,
            "entities_raw": [e["canonical_id"] for e in detected_entities]
        }
