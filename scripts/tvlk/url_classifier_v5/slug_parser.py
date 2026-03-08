import re
import os
from typing import Dict, Any, List
from utils import load_json

class SlugParser:
    def __init__(self, stopwords_path: str, exclude_keywords_path: str):
        stop_data = load_json(stopwords_path)
        self.stopwords = set(stop_data.get("stopwords", []))
        
        exclude_data = load_json(exclude_keywords_path)
        
        # Define Fatal Categories vs Normal Exclude (No Rescue Allowed for Fatal)
        fatal_categories = {"local_commuter_transport", "utility_and_bills", "gaming_topup", "local_cinema"}
        self.fatal_set = set()
        self.exclude_set = set()
        
        for category, keywords in exclude_data.items():
            if category in fatal_categories:
                for kw in keywords:
                    self.fatal_set.add(kw.lower())
            else:
                for kw in keywords:
                    self.exclude_set.add(kw.lower())

        # Load Safe Allowlist Keywords
        safe_path = os.path.join(os.path.dirname(exclude_keywords_path), "safe_travel_keywords.json")
        self.safe_keywords = []
        if os.path.exists(safe_path):
            try:
                safe_data = load_json(safe_path)
                for cat, words in safe_data.items():
                    self.safe_keywords.extend([w.lower().replace('-', ' ') for w in words])
            except Exception as e:
                print(f"Warning: Failed to load safe_travel_keywords.json - {e}")

    def extract_slug(self, url: str) -> str:
        """Extracts the slug from a standard Traveloka URL."""
        url = url.strip()
        if not url:
            return ""
        if url.endswith('/'):
             url = url[:-1]
        parts = url.split('/')
        
        if not parts:
            return ""
            
        last_part = parts[-1]
        # Ignore trailing pure numeric IDs
        if last_part.isdigit() and len(parts) > 1:
            return parts[-2]
        return last_part

    def process(self, url: str) -> Dict[str, Any]:
        """
        Runs the V5 pipeline steps:
        1. Extract Slug
        2. Normalize & Tokenize
        3. 3-Layer Spam/Trash Checking
        4. Stopwords Removal (for Geo)
        """
        slug_raw = self.extract_slug(url)
        
        # 1. Normalize (keep hyphenated words intact for accurate phrase matching)
        slug_norm = slug_raw.lower()
        slug_norm_spaced = slug_norm.replace('-', ' ').replace('_', ' ')
        
        # Add padding spaces to cleanly match whole words without regex
        padded_slug = f" {slug_norm_spaced} "
        
        # 3. 3-Layer Spam Rescue Logic
        is_active = True
        is_fatal = False
        
        # Layer 1: Fatal Exclude
        for kw in self.fatal_set:
            if f" {kw.replace('-', ' ')} " in padded_slug:
                is_active = False
                is_fatal = True
                break
                
        # Layer 2: Normal Exclude
        if is_active:
            for kw in self.exclude_set:
                if f" {kw.replace('-', ' ')} " in padded_slug:
                    is_active = False
                    break
                    
        # Layer 3: Safe Allowlist Rescue (Only if not fatal)
        if not is_active and not is_fatal:
            for safe_kw in self.safe_keywords:
                if safe_kw.replace('-', ' ') in slug_norm_spaced:
                    is_active = True
                    break
                
        # 4. Stopwords Removal (for Geo detection downstream)
        slug_norm_for_geo = re.sub(r'[-_//]', ' ', slug_norm)
        tokens = ' '.join(slug_norm_for_geo.split()).split(' ')
        geo_tokens = [t for t in tokens if t not in self.stopwords]
        
        return {
            "slug_raw": slug_raw,
            "slug_norm": slug_norm,
            "tokens": tokens,
            "geo_tokens": geo_tokens,
            "is_active": is_active,
            "is_fatal": is_fatal
        }
