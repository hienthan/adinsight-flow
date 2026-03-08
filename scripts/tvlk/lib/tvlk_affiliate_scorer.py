import re

def evaluate_url(full_url: str, slug: str, geo_data: dict) -> dict:
    """
    Evaluates a Traveloka URL based on the 14-Day Cookie Pipeline Strategy.
    Returns: intent_score, cookie_score, cpc_risk_score, affiliate_score, affiliate_tier, dsa_campaign, time_sensitive
    """
    slug_lower = slug.lower()
    url_lower = full_url.lower()

    # 1. Absolute Exclusion Checks (System Pages & Search Results)
    system_patterns = ['/login', '/register', '/account', '/profile', '/mybooking', '/payment', '/checkout', '/order']
    invalid_params = ['?q=', '?filter=', '?sort=', '?page=', '?adults=', '?children=']
    
    # If the URL strategy explicitly avoids standard BOFU flight/hotel searches:
    direct_product_patterns = ['/flight/', '/hotel/', '/search/flight', '/search/hotel']
    
    is_excluded = False
    for p in system_patterns + invalid_params + direct_product_patterns:
        if p in url_lower:
            is_excluded = True
            break
            
    # Time Sensitivity Check
    time_sensitive = ""
    seasonal_keywords = ['2026', 'lebaran', 'natal', 'tahun-baru', 'valentine', 'ramadan']
    for kw in seasonal_keywords:
        if kw in slug_lower:
            time_sensitive = kw
            break

    # 2. Pattern Matching via Smart Regex (Scaled 1-10)
    keyword_intent = 6.0
    keyword_cookie = 6.0
    keyword_cpc_risk = 5.0
    
    # Tier a4 Keywords (High Intent, High Risk BOFU)
    if re.search(r'\b(promo|diskon|booking|murah|best-deal|flash-sale)\b', slug_lower):
        keyword_intent = 10.0
        keyword_cookie = 10.0
        keyword_cpc_risk = 10.0
            
    # Tier a1 Keywords (Planning Specific - Priority)
    elif re.search(r'\b(activity|tour|package|open-trip|rafting|diving|camping|kelas|spa|massage|cooking-class)\b', slug_lower) or '/activity/' in url_lower:
        keyword_intent = 9.0
        keyword_cookie = 9.0
        keyword_cpc_risk = 5.0
            
    # Tier a2 Keywords (Info + Transactional Angle)
    elif re.search(r'\b(harga|jadwal|tiket-masuk|jam-buka|biaya|tarif|rute)\b', slug_lower):
        keyword_intent = 9.0
        keyword_cookie = 10.0
        keyword_cpc_risk = 6.0
            
    # Tier a3 Keywords (Inspirational)
    elif re.search(r'\b(rekomendasi|tempat-wisata|hidden-gem|aesthetic|instagramable|list-|panduan|tips)\b', slug_lower):
        keyword_intent = 5.0
        keyword_cookie = 5.0
        keyword_cpc_risk = 3.0
            
    # 3. Geo Scoring Hybrid Logic
    geo_category = geo_data.get('category', '') if geo_data else ''
    has_geo = bool(geo_category and geo_category not in ['unknown', 'global', ''])
    
    if is_excluded:
        final_intent = 0.0
        final_cookie = 0.0
        final_cpc_risk = 10.0
        affiliate_score = 0.0
        tier = "excluded"
        dsa_campaign = "Exclude_System"
    else:
        proximity_bonus = 0.0
        common_destinations = ['bali', 'ubud', 'jakarta', 'bandung', 'surabaya', 'malang', 'yogyakarta', 'semarang', 'lombok', 'medan', 'batam']
        matches = sum(1 for dest in common_destinations if dest in slug_lower)
        if matches >= 2:
            proximity_bonus = 0.5

        if not has_geo:
            # Empty Geo Fallback
            bonus_general = 1.0 if (keyword_intent >= 9.0 or time_sensitive) else 0.0
            final_intent = keyword_intent
            final_cookie = keyword_cookie
            final_cpc_risk = keyword_cpc_risk
            
            affiliate_score = round((final_intent * 0.4) + (final_cookie * 0.4) - (final_cpc_risk * 0.2) + bonus_general + proximity_bonus, 2)
        else:
            # Hybrid Geo Math
            geo_comm_intent = 5.0
            if geo_category in ['airport', 'station', 'seaport', 'port']:
                geo_comm_intent = 10.0
            elif geo_category in ['resort_area', 'sub_city', 'beach', 'mountain']:
                geo_comm_intent = 9.0
            elif geo_category in ['shopping_district', 'shopping_hub', 'theme_park', 'landmark', 'temple']:
                geo_comm_intent = 8.0
            elif geo_category == 'province':
                geo_comm_intent = 7.0
            else:
                geo_comm_intent = 6.0
                
            geo_dom_pop = float(geo_data.get('domestic_popularity_score', 5.0))
            geo_cross_sell = float(geo_data.get('cross_sell_potential_score', 5.0))
            geo_inventory_density = float(geo_data.get('inventory_density_score', 5.0))

            final_intent = (keyword_intent * 0.6) + (geo_comm_intent * 0.4)
            final_cookie = (keyword_cookie * 0.4) + (geo_dom_pop * 0.3) + (geo_cross_sell * 0.3)
            final_cpc_risk = (keyword_cpc_risk * 0.5) + ((10.0 - geo_inventory_density) * 0.5)
            
            affiliate_score = round((final_intent * 0.4) + (final_cookie * 0.4) - (final_cpc_risk * 0.2) + proximity_bonus, 2)

        # Tier Automation
        if affiliate_score >= 6.5:
            tier = "a1"
        elif affiliate_score >= 5.5:
            tier = "a2"
        elif affiliate_score >= 3.0:
            tier = "a3"
        else:
            tier = "excluded"
            
        # DSA Campaign Routing
        if tier == "excluded":
            dsa_campaign = "TVLK_ID_Exclude_LowPerformance"
        elif not has_geo:
            dsa_campaign = "TVLK_ID_CatchAll_NoGeo"
        elif geo_category in ['airport', 'station', 'seaport', 'port']:
            dsa_campaign = "TVLK_ID_Transit_Hubs"
        elif geo_category in ['resort_area', 'beach', 'mountain']:
            dsa_campaign = "TVLK_ID_Leisure_Hotspots"
        elif geo_category in ['temple', 'theme_park', 'landmark']:
            dsa_campaign = "TVLK_ID_Cultural_Family"
        elif geo_category in ['shopping_district', 'shopping_hub']:
            dsa_campaign = "TVLK_ID_Shopping_Business"
        elif geo_category == 'province':
            dsa_campaign = "TVLK_ID_General_Provinces"
        elif time_sensitive:
            dsa_campaign = f"TVLK_ID_Event_{time_sensitive.capitalize()}"
        else:
            dsa_campaign = "TVLK_ID_General_DSA"

    return {
        "intent_score": round(final_intent if 'final_intent' in locals() else 0.0, 2),
        "cookie_score": round(final_cookie if 'final_cookie' in locals() else 0.0, 2),
        "cpc_risk_score": round(final_cpc_risk if 'final_cpc_risk' in locals() else 0.0, 2),
        "affiliate_score": affiliate_score,
        "affiliate_tier": tier,
        "dsa_campaign": dsa_campaign,
        "time_sensitive": time_sensitive
    }
