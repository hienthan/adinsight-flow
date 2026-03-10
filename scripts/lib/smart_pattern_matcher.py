#!/usr/bin/env python3
"""
Smart Pattern Matching for Geo-Detection
Handles cultural keywords, partial city names, and language patterns.
"""

import re
from typing import Tuple, Optional

class SmartPatternMatcher:
    def __init__(self):
        # Cultural & Language Keywords
        self.cultural_keywords = {
            # Food & Culture
            "kimchi": ("South Korea", "Seoul"),
            "sushi": ("Japan", "Tokyo"),
            "ramen": ("Japan", "Tokyo"),
            "tempura": ("Japan", "Tokyo"),
            "sake": ("Japan", "Tokyo"),
            "pho": ("Viet Nam", "Ha Noi"),
            "banh-mi": ("Viet Nam", "Ho Chi Minh"),
            "dim-sum": ("Hong Kong", "Hong Kong"),
            "peking": ("China", "Beijing"),
            "shanghai": ("China", "Shanghai"),
            "cantonese": ("China", "Guangzhou"),
            "szechuan": ("China", "Chengdu"),
            "sichuan": ("China", "Chengdu"),
            "thai": ("Thailand", "Bangkok"),
            "pad-thai": ("Thailand", "Bangkok"),
            "tom-yum": ("Thailand", "Bangkok"),
            "nasi": ("Indonesia", "Jakarta"),
            "satay": ("Indonesia", "Jakarta"),
            "rendang": ("Indonesia", "Jakarta"),
            "laksa": ("Malaysia", "Kuala Lumpur"),
            "roti": ("Malaysia", "Kuala Lumpur"),
            
            # Language/Ethnicity
            "mandarin": ("China", "Beijing"),
            "cantonese": ("Hong Kong", "Hong Kong"),
            "vietnamese": ("Viet Nam", "Ha Noi"),
            "korean": ("South Korea", "Seoul"),
            "japanese": ("Japan", "Tokyo"),
            "thai": ("Thailand", "Bangkok"),
            
            # Architecture/Landmarks
            "pagoda": ("Viet Nam", "Ha Noi"),
            "temple": ("Thailand", "Bangkok"),
            "shrine": ("Japan", "Kyoto"),
            "mosque": ("Malaysia", "Kuala Lumpur"),
            "wat": ("Thailand", "Bangkok"),
            "chedi": ("Thailand", "Bangkok"),
        }
        
        # Country-Only Keywords (when no specific city can be determined)
        self.country_keywords = {
            "swiss": ("Switzerland", "Unknown"),
            "switzerland": ("Switzerland", "Unknown"),
            "austria": ("Austria", "Unknown"),
            "austrian": ("Austria", "Unknown"),
            "german": ("Germany", "Unknown"),
            "germany": ("Germany", "Unknown"),
            "french": ("France", "Unknown"),
            "france": ("France", "Unknown"),
            "italian": ("Italy", "Unknown"),
            "italy": ("Italy", "Unknown"),
            "spanish": ("Spain", "Unknown"),
            "spain": ("Spain", "Unknown"),
            "dutch": ("Netherlands", "Unknown"),
            "netherlands": ("Netherlands", "Unknown"),
            "british": ("United Kingdom", "Unknown"),
            "english": ("United Kingdom", "Unknown"),
            "scottish": ("United Kingdom", "Unknown"),
            "american": ("United States", "Unknown"),
            "usa": ("United States", "Unknown"),
            "canadian": ("Canada", "Unknown"),
            "canada": ("Canada", "Unknown"),
            "australian": ("Australia", "Unknown"),
            "aussie": ("Australia", "Unknown"),
            "kiwi": ("New Zealand", "Unknown"),
            "indian": ("India", "Unknown"),
            "india": ("India", "Unknown"),
        }
        
        # Partial City Name Patterns (prefix matching)
        self.city_prefixes = {
            # Japan
            "tokyo": ("Japan", "Tokyo"),
            "osaka": ("Japan", "Osaka"),
            "kyoto": ("Japan", "Kyoto"),
            "yokohama": ("Japan", "Yokohama"),
            "nagoya": ("Japan", "Nagoya"),
            "sapporo": ("Japan", "Sapporo"),
            "fukuoka": ("Japan", "Fukuoka"),
            "kobe": ("Japan", "Kobe"),
            "kawasaki": ("Japan", "Kawasaki"),
            
            # China
            "beijing": ("China", "Beijing"),
            "shanghai": ("China", "Shanghai"),
            "guangzhou": ("China", "Guangzhou"),
            "shenzhen": ("China", "Shenzhen"),
            "chengdu": ("China", "Chengdu"),
            "hangzhou": ("China", "Hangzhou"),
            "wuhan": ("China", "Wuhan"),
            "xian": ("China", "Xi'an"),
            "huizhou": ("China", "Huizhou"),
            "hui-zhou": ("China", "Huizhou"),
            "suzhou": ("China", "Suzhou"),
            "nanjing": ("China", "Nanjing"),
            
            # Taiwan
            "taipei": ("Taiwan", "Taipei"),
            "taichung": ("Taiwan", "Taichung"),
            "kaohsiung": ("Taiwan", "Kaohsiung"),
            "tainan": ("Taiwan", "Tainan"),
            
            # Vietnam
            "hanoi": ("Viet Nam", "Ha Noi"),
            "saigon": ("Viet Nam", "Ho Chi Minh"),
            "hue": ("Viet Nam", "Hue"),
            "danang": ("Viet Nam", "Da Nang"),
            "nhatrang": ("Viet Nam", "Nha Trang"),
            "dalat": ("Viet Nam", "Da Lat"),
            "halong": ("Viet Nam", "Ha Long"),
            "hoian": ("Viet Nam", "Hoi An"),
            "cantho": ("Viet Nam", "Can Tho"),
            "vungtau": ("Viet Nam", "Vung Tau"),
            "phuquoc": ("Viet Nam", "Phu Quoc"),
            "tay-ninh": ("Viet Nam", "Tay Ninh"),
            "phu-quy": ("Viet Nam", "Phu Quy"),
            "binh-duong": ("Viet Nam", "Binh Duong"),
            "dong-nai": ("Viet Nam", "Dong Nai"),
            "long-an": ("Viet Nam", "Long An"),
            "tien-giang": ("Viet Nam", "Tien Giang"),
            "ben-tre": ("Viet Nam", "Ben Tre"),
            "vinh-long": ("Viet Nam", "Vinh Long"),
            "tra-vinh": ("Viet Nam", "Tra Vinh"),
            "soc-trang": ("Viet Nam", "Soc Trang"),
            "bac-lieu": ("Viet Nam", "Bac Lieu"),
            "ca-mau": ("Viet Nam", "Ca Mau"),
            "kien-giang": ("Viet Nam", "Kien Giang"),
            "an-giang": ("Viet Nam", "An Giang"),
            
            # Korea
            "seoul": ("South Korea", "Seoul"),
            "busan": ("South Korea", "Busan"),
            "incheon": ("South Korea", "Incheon"),
            "daegu": ("South Korea", "Daegu"),
            "daejeon": ("South Korea", "Daejeon"),
            "gwangju": ("South Korea", "Gwangju"),
            
            # Thailand
            "bangkok": ("Thailand", "Bangkok"),
            "pattaya": ("Thailand", "Pattaya"),
            "phuket": ("Thailand", "Phuket"),
            "chiangmai": ("Thailand", "Chiang Mai"),
            "chiangrai": ("Thailand", "Chiang Rai"),
            "krabi": ("Thailand", "Krabi"),
            "ayutthaya": ("Thailand", "Ayutthaya"),
            
            # Malaysia
            "kualalumpur": ("Malaysia", "Kuala Lumpur"),
            "penang": ("Malaysia", "Penang"),
            "malacca": ("Malaysia", "Malacca"),
            "johor": ("Malaysia", "Johor Bahru"),
            "ipoh": ("Malaysia", "Ipoh"),
            
            # Singapore
            "singapore": ("Singapore", "Singapore"),
            "sentosa": ("Singapore", "Sentosa"),
            
            # Indonesia
            "jakarta": ("Indonesia", "Jakarta"),
            "bali": ("Indonesia", "Bali"),
            "surabaya": ("Indonesia", "Surabaya"),
            "bandung": ("Indonesia", "Bandung"),
            "yogyakarta": ("Indonesia", "Yogyakarta"),
            
            # Philippines
            "manila": ("Philippines", "Manila"),
            "cebu": ("Philippines", "Cebu"),
            "davao": ("Philippines", "Davao"),
            "boracay": ("Philippines", "Boracay"),
            "palawan": ("Philippines", "Palawan"),
        }
        
        # Vietnamese diacritics pattern (common Vietnamese province/city patterns)
        self.vietnamese_patterns = [
            r'\b(tay|phu|binh|dong|long|tien|ben|vinh|tra|soc|bac|ca|kien|an)-',
            r'-(ninh|quy|duong|nai|giang|tre|long|vinh|trang|lieu|mau)\b'
        ]
    
    def detect(self, slug: str) -> Optional[Tuple[str, str]]:
        """
        Detects country and city using smart pattern matching.
        Returns (country, city) or None if not found.
        """
        slug_lower = slug.lower()
        slug_clean = slug_lower.replace('-', '').replace('_', '')
        
        # 1. Cultural Keywords (exact match)
        for keyword, (country, city) in self.cultural_keywords.items():
            if re.search(r'\b' + re.escape(keyword) + r'\b', slug_lower):
                return (country, city)
        
        # 2. City Prefix Matching (starts with or contains)
        for prefix, (country, city) in self.city_prefixes.items():
            # Check if slug contains the city name
            if re.search(r'\b' + re.escape(prefix) + r'\b', slug_lower) or re.search(r'\b' + re.escape(prefix.replace('-', '')) + r'\b', slug_clean):
                return (country, city)
        
        # 3. Country Keywords (for country-level detection)
        for keyword, (country, city) in self.country_keywords.items():
            if re.search(r'\b' + re.escape(keyword) + r'\b', slug_lower):
                return (country, city)
        
        # 4. Vietnamese Pattern Detection
        for pattern in self.vietnamese_patterns:
            if re.search(pattern, slug_lower):
                # If matches Vietnamese pattern, likely Vietnam
                # Try to extract city name
                words = slug_lower.split('-')
                if len(words) >= 2:
                    city_name = ' '.join(words[:2]).title()
                    return ("Viet Nam", city_name)
        
        return None

# Create global instance
smart_matcher = SmartPatternMatcher()

if __name__ == "__main__":
    # Test cases
    test_cases = [
        "tokyocity-disneyland",
        "swiss-travel-pass",
        "taipei-101-ticket",
        "tay-ninh-cao-dai-temple",
        "phu-quy-island-tour",
        "hui-zhou-ancient-town",
        "hue-imperial-city",
        "kimchi-making-class",
        "sushi-workshop-tokyo",
        "pho-cooking-class",
        "dim-sum-experience",
        "thai-massage-spa",
        "osaka-castle-tour",
        "beijing-forbidden-city",
        "hanoi-old-quarter",
    ]
    
    print("=== Smart Pattern Matching Test ===\n")
    for slug in test_cases:
        result = smart_matcher.detect(slug)
        if result:
            print(f"✓ {slug:40} -> {result[0]}, {result[1]}")
        else:
            print(f"✗ {slug:40} -> Not detected")
