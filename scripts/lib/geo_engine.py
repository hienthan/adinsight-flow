import re
import os
import json
try:
    import geonamescache
    import pycountry
except ImportError:
    geonamescache = None
    pycountry = None

try:
    from geopy.geocoders import Nominatim
    from geopy.exc import GeocoderTimedOut, GeocoderServiceError
    GEOPY_AVAILABLE = True
except ImportError:
    GEOPY_AVAILABLE = False

# Import Smart Pattern Matcher
try:
    from smart_pattern_matcher import smart_matcher
    SMART_MATCHER_AVAILABLE = True
except ImportError:
    SMART_MATCHER_AVAILABLE = False

# Control flag: Disable geopy during ingestion (too slow for 7k+ URLs)
# Enable only for post-processing targeted enrichment
ENABLE_GEOPY_FALLBACK = False

class GeoEngine:
    def __init__(self):
        self.gnc = geonamescache.GeonamesCache() if geonamescache else None
        
        # Initialize geopy geocoder (with caching)
        self.geolocator = None
        self.geopy_cache = {}  # Cache to avoid repeated API calls
        if GEOPY_AVAILABLE:
            try:
                self.geolocator = Nominatim(user_agent="adinsight_flow_v1")
            except:
                self.geolocator = None
        
        # 1. High-Priority Travel Whitelist (Expanded from Unknown Analysis)
        self.kb = {
            "hong-kong": ("Hong Kong", "Hong Kong"),
            "macau": ("Macao", "Macao"),
            "macao": ("Macao", "Macao"),
            "las-vegas": ("United States", "Las Vegas"),
            "vegas": ("United States", "Las Vegas"),
            "jeju": ("South Korea", "Jeju"),
            "vatican": ("Italy", "Vatican City"),
            "angkor": ("Cambodia", "Siem Reap"),
            "siem-reap": ("Cambodia", "Siem Reap"),
            "phnom-penh": ("Cambodia", "Phnom Penh"),
            "oudong": ("Cambodia", "Oudong"),
            "bali": ("Indonesia", "Bali"),
            "bintan": ("Indonesia", "Bintan"),
            "lombok": ("Indonesia", "Lombok"),
            "gili": ("Indonesia", "Gili Islands"),
            "moalboal": ("Philippines", "Moalboal"),
            "boracay": ("Philippines", "Boracay"),
            "bohol": ("Philippines", "Bohol"),
            "cebu": ("Philippines", "Cebu"),
            "mactan": ("Philippines", "Mactan"),
            "palawan": ("Philippines", "Palawan"),
            "coron": ("Philippines", "Coron"),
            "el-nido": ("Philippines", "El Nido"),
            "puerto-princesa": ("Philippines", "Puerto Princesa"),
            "legazpi": ("Philippines", "Legazpi"),
            "albay": ("Philippines", "Albay"),
            "catanduanes": ("Philippines", "Catanduanes"),
            "matnog": ("Philippines", "Matnog"),
            "bicol": ("Philippines", "Bicol"),
            "sorsogon": ("Philippines", "Sorsogon"),
            "melaka": ("Malaysia", "Melaka"),
            "penang": ("Malaysia", "Penang"),
            "sabah": ("Malaysia", "Sabah"),
            "kinabalu": ("Malaysia", "Kota Kinabalu"),
            "kuala-lumpur": ("Malaysia", "Kuala Lumpur"),
            "genting": ("Malaysia", "Genting Highlands"),
            "borneo": ("Malaysia", "Borneo"),
            "chiang-mai": ("Thailand", "Chiang Mai"),
            "chiang-rai": ("Thailand", "Chiang Rai"),
            "phuket": ("Thailand", "Phuket"),
            "koh-samui": ("Thailand", "Koh Samui"),
            "krabi": ("Thailand", "Krabi"),
            "pattaya": ("Thailand", "Pattaya"),
            "ha-noi": ("Viet Nam", "Ha Noi"),
            "ho-chi-minh": ("Viet Nam", "Ho Chi Minh"),
            "saigon": ("Viet Nam", "Ho Chi Minh"),
            "sai-gon": ("Viet Nam", "Ho Chi Minh"),
            "da-nang": ("Viet Nam", "Da Nang"),
            "hoi-an": ("Viet Nam", "Hoi An"),
            "ha-long": ("Viet Nam", "Ha Long Bay"),
            "halong": ("Viet Nam", "Ha Long Bay"),
            "nha-trang": ("Viet Nam", "Nha Trang"),
            "phu-quoc": ("Viet Nam", "Phu Quoc"),
            "da-lat": ("Viet Nam", "Da Lat"),
            "dalat": ("Viet Nam", "Da Lat"),
            "sapa": ("Viet Nam", "Sa Pa"),
            "chau-doc": ("Viet Nam", "Chau Doc"),
            "quy-nhon": ("Viet Nam", "Quy Nhon"),
            "ba-na": ("Viet Nam", "Da Nang"),
            "son-tra": ("Viet Nam", "Da Nang"),
            "sontra": ("Viet Nam", "Da Nang"),
            "interlaken": ("Switzerland", "Interlaken"),
            "berner-oberland": ("Switzerland", "Berner Oberland"),
            "lucerne": ("Switzerland", "Lucerne"),
            "zermatt": ("Switzerland", "Zermatt"),
            "titlis": ("Switzerland", "Mount Titlis"),
            "jungfrau": ("Switzerland", "Jungfraujoch"),
            "tasmania": ("Australia", "Tasmania"),
            "sunshine-coast": ("Australia", "Sunshine Coast"),
            "gold-coast": ("Australia", "Gold Coast"),
            "victor-harbor": ("Australia", "Victor Harbor"),
            "victor": ("Australia", "Victor Harbor"),
            "hunter-valley": ("Australia", "Hunter Valley"),
            "blue-mountains": ("Australia", "Blue Mountains"),
            "great-ocean-road": ("Australia", "Great Ocean Road"),
            "cappadocia": ("Turkey", "Cappadocia"),
            "pamukkale": ("Turkey", "Pamukkale"),
            "fuji": ("Japan", "Mount Fuji"),
            "hakone": ("Japan", "Hakone"),
            "nikko": ("Japan", "Nikko"),
            "nara": ("Japan", "Nara"),
            "kamakura": ("Japan", "Kamakura"),
            "yokohama": ("Japan", "Yokohama"),
            "nagoya": ("Japan", "Nagoya"),
            "hiroshima": ("Japan", "Hiroshima"),
            "miyajima": ("Japan", "Miyajima"),
            "fukuoka": ("Japan", "Fukuoka"),
            "beppu": ("Japan", "Beppu"),
            "kyushu": ("Japan", "Kyushu"),
            "okinawa": ("Japan", "Okinawa"),
            "gion": ("Japan", "Kyoto"),
            "higashiyama": ("Japan", "Kyoto"),
            "gunma": ("Japan", "Gunma"),
            "nasu": ("Japan", "Nasu"),
            "kijima": ("Japan", "Oita"),
            "kogen": ("Japan", "Oita"),
            "hokkaido": ("Japan", "Hokkaido"),
            "kansai": ("Japan", "Kansai"),
            "hokuriku": ("Japan", "Hokuriku"),
            "kanto": ("Japan", "Kanto"),
            "shirakawago": ("Japan", "Shirakawago"),
            "kanazawa": ("Japan", "Kanazawa"),
            "takayama": ("Japan", "Takayama"),
            "hokkaido": ("Japan", "Hokkaido"),
            "sapporo": ("Japan", "Sapporo"),
            "otaru": ("Japan", "Otaru"),
            "furano": ("Japan", "Furano"),
            "niseko": ("Japan", "Niseko"),
            "california": ("United States", "California"),
            "florida": ("United States", "Florida"),
            "hawaii": ("United States", "Hawaii"),
            "oahu": ("United States", "Oahu"),
            "maui": ("United States", "Maui"),
            "kauai": ("United States", "Kauai"),
            "seville": ("Spain", "Seville"),
            "malaga": ("Spain", "Malaga"),
            "cordoba": ("Spain", "Cordoba"),
            "granada": ("Spain", "Granada"),
            "barcelona": ("Spain", "Barcelona"),
            "madrid": ("Spain", "Madrid"),
            "valencia": ("Spain", "Valencia"),
            "mallorca": ("Spain", "Mallorca"),
            "ibiza": ("Spain", "Ibiza"),
            "tenerife": ("Spain", "Tenerife"),
            
            # France
            "alsace": ("France", "Alsace"),
            "burgundy": ("France", "Burgundy"),
            "champagne": ("France", "Champagne"),
            "luberon": ("France", "Luberon"),
            
            # Iceland
            "vik": ("Iceland", "Vik"),
            "katla": ("Iceland", "Katla"),
            
            # South Korea
            "wolmido": ("South Korea", "Incheon"),
            
            # Taiwan Islands
            "chimei": ("Taiwan", "Chimei Island"),
            "penghu": ("Taiwan", "Penghu"),
            "penhu": ("Taiwan", "Penghu"),
            "wangan": ("Taiwan", "Wangan"),
            "jibei": ("Taiwan", "Jibei Island"),
            
            # Vietnam
            "cat-ba": ("Viet Nam", "Cat Ba"),
            "hai-phong": ("Viet Nam", "Hai Phong"),
            "my-son": ("Viet Nam", "My Son"),
            
            # New Zealand
            "akaroa": ("New Zealand", "Akaroa"),
            
            # USA
            "verde-canyon": ("United States", "Arizona"),
            "kualoa": ("United States", "Hawaii"),
            
            # Singapore
            "kusu": ("Singapore", "Kusu Island"),
            "sisters": ("Singapore", "Sisters Islands")
        }
        
        # Load external knowledge base if exists
        kb_path = os.path.join(os.path.dirname(__file__), 'geo_knowledge.json')
        if os.path.exists(kb_path):
            try:
                with open(kb_path, 'r', encoding='utf-8') as f:
                    for k, v in json.load(f).items():
                        self.kb[k.lower().replace(' ', '-')] = (v['country'], v['city'])
            except: pass

        # 2. City Inventory (Multi-word support)
        self.city_lookup = {}
        if self.gnc:
            for uid, city in self.gnc.get_cities().items():
                name = city['name'].lower()
                if name not in self.city_lookup: self.city_lookup[name] = []
                self.city_lookup[name].append(city)

        # 3. Country Names & ISO Map
        self.country_names = {}
        self.iso_map = {}
        if self.gnc:
            for iso, c in self.gnc.get_countries().items():
                self.iso_map[iso.upper()] = c['name']
                self.country_names[c['name'].lower()] = c['name']
        
        if pycountry:
            for c in pycountry.countries:
                self.country_names[c.name.lower()] = c.name

        self.country_names.update({
            "vietnam": "Viet Nam", "usa": "United States", "uk": "United Kingdom",
            "korea": "South Korea", "taiwan": "Taiwan"
        })

    def normalize_country(self, val):
        if not val or val == "Unknown": return "Unknown"
        if len(val) == 2: return self.iso_map.get(val.upper(), val)
        lval = val.lower()
        if lval in self.country_names: return self.country_names[lval]
        try:
            if pycountry:
                c = pycountry.countries.search_fuzzy(val)
                if c: return c[0].name
        except: pass
        return val.title()

    def detect_geo(self, slug):
        slug_lower = slug.lower()
        slug_clean = slug_lower.replace('-', ' ').replace('_', ' ')
        
        # 0. Smart Pattern Matching (HIGHEST PRIORITY - Cultural/Language Keywords)
        if SMART_MATCHER_AVAILABLE:
            result = smart_matcher.detect(slug)
            if result:
                country, city = result
                return self.normalize_country(country), city
        
        # 1. Broad Phrase Search (KB Whitelist)
        # Check for any KB or Whitelist key as a substring
        for key, (co, ci) in self.kb.items():
            if key in slug_lower or key.replace('-', ' ') in slug_clean:
                return self.normalize_country(co), ci

        # 2. Dynamic Phrase Scanning (Cities)
        words = re.split(r'[-_\s]', slug_lower)
        found_cities = []
        # Try checking all 1-to-3 word combinations
        for n in range(min(3, len(words)), 0, -1):
            for i in range(len(words) - n + 1):
                phrase = " ".join(words[i:i+n])
                if len(phrase) < 3: continue
                if phrase in self.city_lookup:
                    found_cities.extend(self.city_lookup[phrase])
        
        if found_cities:
            top = sorted(found_cities, key=lambda x: x.get('population', 0), reverse=True)[0]
            return self.normalize_country(top['countrycode']), top['name']

        # 3. Country Keyword Scan
        for word in words:
            if len(word) < 3: continue
            if word in self.country_names:
                return self.normalize_country(word), "Unknown"

        # 4. Geopy Fallback (Smart Geocoding) - DISABLED during ingestion
        if ENABLE_GEOPY_FALLBACK and self.geolocator:
            # Check cache first
            if slug_lower in self.geopy_cache:
                return self.geopy_cache[slug_lower]
            
            # Try to geocode the cleaned slug
            try:
                # Extract meaningful words (filter out common tour/activity words)
                stop_words = {'tour', 'ticket', 'pass', 'experience', 'day', 'trip', 'private', 'group', 'admission'}
                meaningful_words = [w for w in words if w not in stop_words and len(w) >= 4]
                
                if meaningful_words:
                    # Try with first 3 meaningful words
                    query = ' '.join(meaningful_words[:3])
                    location = self.geolocator.geocode(query, timeout=3, language='en')
                    
                    if location and location.address:
                        # Extract country from address
                        address_parts = location.address.split(', ')
                        country = address_parts[-1] if address_parts else None
                        
                        if country:
                            normalized_country = self.normalize_country(country)
                            # Extract city if available
                            city = address_parts[0] if len(address_parts) > 1 else "Unknown"
                            
                            result = (normalized_country, city)
                            self.geopy_cache[slug_lower] = result
                            return result
            except (GeocoderTimedOut, GeocoderServiceError, Exception):
                pass  # Silently fail and return Unknown

        return "Unknown", "Unknown"

engine = GeoEngine()
