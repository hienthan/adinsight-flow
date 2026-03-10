import re
import json
import os
from intent_classifier_v4 import extract_intent_from_slug

class AntigravityEngineV4:
    def __init__(self, master_geo_path: str):
        if not os.path.exists(master_geo_path):
            raise FileNotFoundError(f"Master Geo file not found at {master_geo_path}")
            
        with open(master_geo_path, 'r', encoding='utf-8') as f:
            self.geo_db = json.load(f)
            
        self.infra_keys = []
        self.geo_keys = []
        
        for key, data in self.geo_db.items():
            if not isinstance(data, dict):
                continue
                
            if data.get('infra_type'):
                self.infra_keys.append(key)
            else:
                self.geo_keys.append(key)
                
        # LKM (Longest Key Match): Sort by length of key descending
        self.infra_keys.sort(key=len, reverse=True)
        self.geo_keys.sort(key=len, reverse=True)
        
    def sanitize_slug(self, raw_slug: str) -> str:
        """
        Cleans the URL by removing redundant platform suffixes, SEO noises, and numbers.
        """
        clean = re.sub(r'-(trp|guide|simak|terbaru|gt|simak)$', '', raw_slug, flags=re.IGNORECASE)
        clean = re.sub(r'-\d+$', '', clean)
        
        # Remove SEO noise words
        noise_words = ['terbaru', 'lengkap', 'update', 'terbaik', 'hits', 'viral', 'populer', 'murah-meriah', '2024', '2025', '2026']
        for noise in noise_words:
            # Using regex word boundary
            clean = re.sub(r'\b' + noise + r'\b', '', clean, flags=re.IGNORECASE)
            
        # Clean up multiple hyphens
        clean = re.sub(r'-+', '-', clean).strip('-')
        return clean.lower()

    def find_all_matches(self, clean_slug: str, keys: list) -> list:
        """
        Finds all LKM matches in the slug by token matching.
        """
        slug_tokens = clean_slug.split('-')
        matches = []
        
        for key in keys:
            key_tokens = key.split('-')
            key_len = len(key_tokens)
            
            # Check for sublist match
            found = False
            for i in range(len(slug_tokens) - key_len + 1):
                if slug_tokens[i:i+key_len] == key_tokens:
                    found = True
                    break
            
            if found:
                matches.append(key)
                
        # Resolve Key Overlaps (LKM Rule: keep longest overlapping keys only)
        # Assuming `keys` are already sorted by length descending
        final_matches = []
        for match in matches:
            # Check if this match is entirely subsumed by a LONGER match we already picked
            is_subsumed = False
            for kept_match in final_matches:
                # If the tokens are entirely inside the kept match, it's subsumed.
                # E.g. bali in kuta-bali
                km_tokens = kept_match.split('-')
                m_tokens = match.split('-')
                
                # simple index check since we only keep full token sublists
                # if match text is inside kept match text AND it was a valid token match
                if match in kept_match:
                    is_subsumed = True
                    break
            
            if not is_subsumed:
                final_matches.append(match)
                
        return final_matches
        
    def resolve_double_geo(self, clean_slug: str, matches: list) -> str:
        """
        Double Geo Collision Rule: Picks the right entity when multiple exist.
        """
        if not matches: return None
        if len(matches) == 1: return matches[0]
            
        positions = [(clean_slug.find(m), m) for m in matches]
        positions.sort()
        
        winner = positions[-1][1] # Default to last location
        
        # Directional override
        directional_words = ['ke', 'to', 'dari', 'menuju']
        for i in range(len(positions) - 1):
            pos1, m1 = positions[i]
            pos2, m2 = positions[i+1]
            middle_text = clean_slug[pos1+len(m1):pos2].strip('-')
            middle_tokens = middle_text.split('-')
            
            has_direction = False
            for dw in directional_words:
                if dw in middle_tokens:
                    has_direction = True
                    break
            if has_direction:
                winner = m2
                break
                
        return winner
        
    def calculate_final_score(self, metadata: dict, url_intent_multiplier: float) -> float:
        """
        The Unified Math Engine for V4.
        """
        # Url Intent completely overrides Geo Master intent
        intent = url_intent_multiplier if url_intent_multiplier else metadata.get('intent_multiplier', 1.0)
        
        inventory = metadata.get('inventory_density', 5)
        popularity = metadata.get('domestic_popularity', 5)
        cross_sell = metadata.get('cross_sell_potential', 5)
        cpc_risk = metadata.get('geo_competition_score', 5)
        dist_bias = metadata.get('travel_distance_bias', 'regional')
        
        utility = (popularity + cross_sell) / 2
        
        if metadata.get('infra_type'):
            w1, w2, w3 = 0.6, 0.1, 0.3
        else:
            w1, w2, w3 = 0.3, 0.5, 0.2
            
        base_score = (intent * w1 * 10) + (inventory * w2) + (utility * w3)
        penalty = cpc_risk * 0.1
        
        if dist_bias == 'long': mul = 1.5
        elif dist_bias == 'commuter': mul = 0.3
        else: mul = 1.0
        
        final_score = (base_score * mul) - penalty
        return round(final_score, 2)
        
    def classify_tier(self, score: float) -> str:
        if score >= 12.0: return "a0"
        if score >= 9.0: return "a1"
        if score >= 5.0: return "a2"
        return "a3"
        
    def generate_dsa_campaign_name(self, tier: str, intent: str, cluster: str) -> str:
        """
        Generates dynamic campaign names strictly without TVLK/ID prefix.
        Format: {Tier}_{Intent}_{Cluster}
        """
        c = cluster.title() if cluster else "Broad"
        t_upper = tier.upper()
        i_title = intent.title() if intent else "Explore"
        
        return f"{t_upper}_{i_title}_{c}"

    def process_url(self, raw_slug: str, url_pattern: str = "") -> dict:
        clean_slug = self.sanitize_slug(raw_slug)
        
        # 1. Regex Intent Extraction
        url_intent, intent_mul, intent_risk = extract_intent_from_slug(clean_slug)
        
        # 2. Infra Match (Waterfall P1)
        matches = self.find_all_matches(clean_slug, self.infra_keys)
        metadata = None
        matched_key = None
        
        if matches:
            matched_key = self.resolve_double_geo(clean_slug, matches)
            metadata = self.geo_db[matched_key]
        else:
            # 3. Geo Match (Waterfall P2)
            matches = self.find_all_matches(clean_slug, self.geo_keys)
            if matches:
                matched_key = self.resolve_double_geo(clean_slug, matches)
                metadata = self.geo_db[matched_key]
                
        # 4. Filter penalty words regardless of match
        is_commuter = bool(re.search(r'\b(krl|mrt|lrt|jaklingko|transjakarta)\b', clean_slug))
        
        if not metadata:
            metadata = {
                "intent_type": "explore",
                "intent_multiplier": 1.0,
                "domestic_popularity": 3,
                "inventory_density": 3,
                "cross_sell_potential": 3,
                "geo_competition_score": 1,
                "cluster": None
            }
            
        if is_commuter:
            metadata['travel_distance_bias'] = 'commuter'

        # Score & Tier Calculation
        score = self.calculate_final_score(metadata, intent_mul)
        tier = self.classify_tier(score)
        
        final_intent = url_intent if url_intent else metadata.get('intent_type', 'explore')
        
        cluster = metadata.get('cluster')
        camp_name = self.generate_dsa_campaign_name(tier, final_intent, cluster)
        
        return {
            "status": "success",
            "matched_key": matched_key,
            "clean_slug": clean_slug,
            "tier": tier,
            "affiliate_score": score,
            "dsa_campaign": camp_name,
            "final_intent": final_intent,
            "intent_match_risk": intent_risk if intent_risk else 0.5,
            "metadata": metadata
        }
