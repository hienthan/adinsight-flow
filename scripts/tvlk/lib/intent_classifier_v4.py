import re

def extract_intent_from_slug(clean_slug: str):
    """
    Extracts intent and risk multiplier directly from the URL.
    This overrides the default intent in the Geo JSON according to V4 Specs.
    Returns: (intent_name, intent_multiplier, match_risk) or (None, None, None)
    """
    
    # Transit (A0): 1.4 - 1.5, Risk 1.0
    if re.search(r'\b(jadwal|rute|stasiun|bandara|terminal|kereta|bus|transport)\b', clean_slug):
        return "transit", 1.4, 1.0
        
    # Logistics (A1): 1.3 - 1.4, Risk 1.0 
    if re.search(r'\b(cara\ske|akses\ske|menuju|transportasi\ske|dari\ske|jarak|naik\sapa)\b', clean_slug):
        return "logistics", 1.3, 1.0
        
    # Explore (A2): 1.0 - 1.2, Risk 0.7
    if re.search(r'\b(wisata|destinasi|tempat\swisata|rekomendasi|spot|hidden\sgem|nongkrong|healing|staycation|liburan|jalan\sjalan|hangout)\b', clean_slug):
        return "explore", 1.1, 0.7
        
    # Planning & Info (A3): 0.8 - 1.0, Risk 0.5
    if re.search(r'\b(itinerary|panduan|tips|guide|sejarah|fakta)\b', clean_slug):
        return "planning", 1.0, 0.5
        
    return None, None, None
