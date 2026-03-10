"""
DSA Tier Classification for Travel Affiliate
Tier 1 = Highest conversion intent
Tier 5 = Lowest conversion intent / Informational
"""

import re

def classify_tier(slug):
    """
    Classifies URL tier based on purchase intent and conversion potential.
    
    Tier 1: Direct admission/tickets (highest intent)
    Tier 2: Tours & experiences (high intent)
    Tier 3: Services & rentals (medium intent)
    Tier 4: Combo/packages (medium-low intent)
    Tier 5: Guides/info (low/no intent)
    """
    slug_lower = slug.lower()
    
    # Tier 5: Informational content (EXCLUDE from DSA or low bid)
    RE_TIER_5 = r'guide|itinerary|best-things|how-to|tips|must-see|review|highlights|blog|article|things-to-do|places-to-visit|panduan|rekomendasi|daftar|berita|apa-saja'
    if re.search(RE_TIER_5, slug_lower):
        return "5"
    
    # Tier 4: Packages & combos
    RE_TIER_4 = r'package|combo|bundle|deal|\d+-day.*pass|unlimited|hop-on-hop-off|multi-day|paket|rombongan'
    if re.search(RE_TIER_4, slug_lower):
        return "4"
    
    # Tier 1: Direct tickets & admission
    RE_TIER_1 = r'ticket|pass|entry|admission|fast-track|skip-the-line|vip-access|entrance|tiket|kartu-akses'
    if re.search(RE_TIER_1, slug_lower):
        return "1"
    
    # Tier 2: Tours & guided experiences
    RE_TIER_2 = r'tour|cruise|safari|excursion|walking-tour|food-tour|bike-tour|boat-trip|snorkel|dive|trek|hike|wisata|tur|pengalaman'
    if re.search(RE_TIER_2, slug_lower):
        return "2"
    
    # Tier 3: Services & rentals
    RE_TIER_3 = r'spa|massage|transfer|shuttle|rental|sim-card|wifi|pocket-wifi|car-rental|bike-rental|scooter|class|workshop|lesson|cooking|yoga|pijat|sewa|layanan'
    if re.search(RE_TIER_3, slug_lower):
        return "3"
    
    # Default: Tier 3 (catch-all for unclassified activities)
    return "3"


# Example usage & testing
if __name__ == "__main__":
    test_urls = [
        ("tokyo-disneyland-ticket", "1"),
        ("eiffel-tower-skip-the-line-pass", "1"),
        ("paris-food-tour", "2"),
        ("phuket-island-hopping-tour", "2"),
        ("airport-transfer-bangkok", "3"),
        ("thai-massage-spa", "3"),
        ("pocket-wifi-rental-japan", "3"),
        ("cooking-class-hanoi", "3"),
        ("3-day-combo-pass-singapore", "4"),
        ("unlimited-attractions-pass", "4"),
        ("best-things-to-do-in-tokyo", "5"),
        ("travel-guide-thailand", "5"),
    ]
    
    print("=== Tier Classification Test ===\n")
    for slug, expected in test_urls:
        actual = classify_tier(slug)
        status = "✓" if actual == expected else "✗"
        print(f"{status} {slug:40} → Tier {actual} (expected: {expected})")
