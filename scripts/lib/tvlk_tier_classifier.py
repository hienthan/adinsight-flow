import re

def classify_tvlk_url(slug):
    """
    Classifies Traveloka Indonesia URLs into practical DSA Bidding Tiers (1, 2, 3) 
    and assigns appropriate content_type, funnel_stage, and sub_tag.
    
    Tier 1 (High ROAS): Fast purchase intent (Tickets, Transfers, Rentals)
    Tier 2 (High AOV): High consideration intent (Tours, Packages, Camping)
    Tier 3 (Discovery): Broad POI/Destination exploration
    """
    slug_lower = slug.lower()
    
    # ---------------------------------------------------------
    # TIER 1: HIGH ROAS / FAST PURCHASE INTENT
    # ---------------------------------------------------------
    
    # 1A. Direct Admission & Tickets (Including Theme Parks & Zoos)
    RE_T1_TICKET = r'tiket|ticket|pass|masuk|karcis|voucher|admission|fast-track|skip-the-line|theme-park|amusement-park|waterpark|zoo|kebun-binatang|playground|aquarium'
    if re.search(RE_T1_TICKET, slug_lower):
        return {
            "tier": "1",
            "content_type": "activity_attraction",
            "funnel_stage": "readiness",
            "sub_tag": "ticket"
        }
        
    # 1B. Transport & Rentals (High intent in Indo)
    RE_T1_TRANSPORT = r'sewa-mobil|car-rental|rental-mobil|motor|scooter|bandara|airport|transfer|shuttle|jemputan'
    if re.search(RE_T1_TRANSPORT, slug_lower):
        return {
            "tier": "1",
            "content_type": "transport_rental",
            "funnel_stage": "readiness",
            "sub_tag": "transport"
        }
        
    # 1C. Connectivity & Essential Services
    RE_T1_CONNECTIVITY = r'sim-card|wifi|pocket-wifi|esim|roaming'
    if re.search(RE_T1_CONNECTIVITY, slug_lower):
        return {
            "tier": "1",
            "content_type": "service_essential",
            "funnel_stage": "readiness",
            "sub_tag": "connectivity"
        }
        
    # 1D. Events, Concerts & Exhibitions
    RE_T1_EVENT = r'konser|festival|pertunjukan|exhibition'
    if re.search(RE_T1_EVENT, slug_lower):
        return {
            "tier": "1",
            "content_type": "activity_attraction",
            "funnel_stage": "readiness",
            "sub_tag": "event"
        }

    # ---------------------------------------------------------
    # TIER 2: HIGH AOV / CONSIDERATION INTENT
    # ---------------------------------------------------------
    
    # 2A. Multi-day Tours & Packages
    RE_T2_TOUR = r'tour|tur|paket|package|wisata-sehari|day-trip|perjalanan|safari|cruise|ekspedisi'
    if re.search(RE_T2_TOUR, slug_lower):
        return {
            "tier": "2",
            "content_type": "activity_tour",
            "funnel_stage": "planning",
            "sub_tag": "tour"
        }
        
    # 2B. Specialized Outdoor Activities (Diving, Glamping, Hiking)
    RE_T2_OUTDOOR = r'camping|kemah|glamping|hike|hiking|mendaki|trekking|dive|diving|menyelam|snorkel|snorkeling|arung-jeram|rafting|outbound'
    if re.search(RE_T2_OUTDOOR, slug_lower):
        return {
            "tier": "2",
            "content_type": "activity_outdoor",
            "funnel_stage": "planning",
            "sub_tag": "outdoor"
        }
        
    # 2C. Classes & Workshops
    RE_T2_CLASS = r'class|kelas|workshop|cooking|memasak|lesson|belajar|yoga'
    if re.search(RE_T2_CLASS, slug_lower):
        return {
            "tier": "2",
            "content_type": "activity_workshop",
            "funnel_stage": "planning",
            "sub_tag": "class"
        }

    # 2D. Spa, Beauty & Pampering
    RE_T2_BEAUTY = r'spa|massage|pijat|salon|klinik|clinic|perawatan|hifu|meso|facial|nail|manicure|pedicure|relaksasi|reflexology'
    if re.search(RE_T2_BEAUTY, slug_lower):
        return {
            "tier": "2",
            "content_type": "service_beauty",
            # We introduce "consideration" funnel stage for treatments
            "funnel_stage": "consideration", 
            "sub_tag": "beauty_spa"
        }

    # ---------------------------------------------------------
    # TIER 3: DISCOVERY / EXPLORATION INTENT
    # ---------------------------------------------------------
    
    # 3A. POI / Landmark exploration
    RE_T3_LANDMARK = r'candi|pantai|gunung|taman|museum|kuil|temple|island|pulau|curug|air-terjun|danau|lake|goa|cave|monumen|monument'
    if re.search(RE_T3_LANDMARK, slug_lower):
        return {
            "tier": "3",
            "content_type": "poi_exploration",
            "funnel_stage": "awareness",
            "sub_tag": "landmark"
        }

    # 3B. Unknown / Others (Fallbacks for URLs without explicit action words)
    # If the URL survived the junk filter in tvlk_enrich_and_import.py, but doesn't fit above categories
    return {
        "tier": "3",
        "content_type": "others",
        "funnel_stage": "awareness",
        "sub_tag": "others"
    }

# Example Testing
if __name__ == "__main__":
    test_urls = [
        ("tiket-masuk-dufan-ancol", "1", "activity_attraction", "readiness", "ticket"),
        ("sewa-mobil-lepas-kunci-bali", "1", "transport_rental", "readiness", "transport"),
        ("paket-tour-nusa-penida-1-hari", "2", "activity_tour", "planning", "tour"),
        ("hifu-treatment-jakarta", "2", "service_beauty", "consideration", "beauty_spa"),
        ("snorkeling-nusa-lembongan", "2", "activity_outdoor", "planning", "outdoor"),
        ("candi-prambanan-yogyakarta", "3", "poi_exploration", "awareness", "landmark"),
    ]
    
    print("=== TVLK Tier & Content Classification Test ===\n")
    for slug, exp_tier, exp_ctype, exp_funnel, exp_stag in test_urls:
        res = classify_tvlk_url(slug)
        status = "✓" if (res["tier"] == exp_tier and res["content_type"] == exp_ctype) else "✗"
        print(f"{status} {slug:35}")
        print(f"   → Tier: {res['tier']} | Type: {res['content_type']} | Funnel: {res['funnel_stage']} | Tag: {res['sub_tag']}\n")
