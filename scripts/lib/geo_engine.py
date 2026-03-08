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
        
        # 2. Dynamic Phrase Scanning (Knowledge Bases)
        # Load all JSON files in the same directory that look like geo KBs
        lib_dir = os.path.dirname(__file__)
        for filename in os.listdir(lib_dir):
            if filename.endswith('.json') and ('geo' in filename or 'kb' in filename):
                kb_path = os.path.join(lib_dir, filename)
                try:
                    with open(kb_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        for k, v in data.items():
                            # Support both flat and nested structures
                            if isinstance(v, dict) and 'country' in v and 'city' in v:
                                self.kb[k.lower().replace(' ', '-')] = (v['country'], v['city'])
                            elif isinstance(v, (list, tuple)) and len(v) >= 2:
                                self.kb[k.lower().replace(' ', '-')] = (v[0], v[1])
                except Exception as e:
                    print(f"⚠️ Warning: Failed to load KB {filename}: {e}")

        # 2A. Structured KB for Affiliate Strategy
        self.structured_kb = {}
        try:
            structured_kb_path = os.path.join(lib_dir, '..', 'tvlk', 'lib', 'indo_geo_master.json')
            if os.path.exists(structured_kb_path):
                with open(structured_kb_path, 'r', encoding='utf-8') as f:
                    self.structured_kb = json.load(f)
        except Exception as e:
            print(f"⚠️ Warning: Failed to load structured KB: {e}")

        # 2B. City Inventory (Multi-word support)
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

        # 4. Stop Words to avoid false positives (e.g., 'anak' in North Korea)
        self.geo_stop_words = {
            "anak", "dan", "untuk", "dari", "yang", "dengan", "pada", "ke", 
            "itu", "ini", "bisa", "buat", "paling", "seru", "favorit",
            "wisata", "tur", "tiket", "masuk", "liburan", "murah", "promo", "jalan", 
            "harga", "pesan", "beli", "jual", "paket", "hari", "malam", "terbaik", 
            "terbaru", "populer", "lokasi", "tempat", "info", "lengkap", "panduan", 
            "cara", "menuju", "tips", "rekomendasi", "daftar", "sewa", "rental", 
            "mobil", "motor", "kamar", "hotel", "penginapan", "villa", "resort", 
            "penerbangan", "pesawat", "bandara", "stasiun", "terminal", "pelabuhan", 
            "kapal", "ferry", "jadwal", "rute", "peta", "objek", "destinasi",
            "taman", "pantai", "gunung", "danau", "pulau", "candi", "museum", "kampung"
        }

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

    def detect_geo(self, slug, title_en=""):
        slug_lower = slug.lower()
        slug_clean = slug_lower.replace('-', ' ').replace('_', ' ')
        title_lower = title_en.lower() if title_en else ""
        
        # 0. Smart Pattern Matching (HIGHEST PRIORITY - Cultural/Language Keywords)
        if SMART_MATCHER_AVAILABLE:
            result = smart_matcher.detect(slug)
            if not result and title_en:
                result = smart_matcher.detect(title_en)
            if result:
                country, city = result
                return self.normalize_country(country), city
        
        # 1. Broad Phrase Search (KB Whitelist)
        # Check for any KB or Whitelist key as a complete phrase in slug OR title
        slug_hyphens = slug_clean.replace(' ', '-')
        padded_slug = f"-{slug_hyphens}-"
        padded_title = f"-{title_lower.replace(' ', '-')}-"
        
        for key, (co, ci) in self.kb.items():
            if '*' in key:
                # Handle wildcard patterns like "jr-*-pass" -> "-jr-.*-pass-"
                regex_pattern = f"-{key.replace('*', '.*')}-"
                if re.search(regex_pattern, padded_slug) or re.search(regex_pattern, padded_title):
                    return self.normalize_country(co), ci
            else:
                padded_key = f"-{key}-"
                # First check original slug, then check English translated title
                if padded_key in padded_slug or padded_key in padded_title:
                    return self.normalize_country(co), ci

        # 2. Dynamic Phrase Scanning (Cities) - using original slug first
        words = re.split(r'[-_\s]', slug_lower)
        found_cities = []
        # Try checking all 1-to-3 word combinations
        for n in range(min(3, len(words)), 0, -1):
            for i in range(len(words) - n + 1):
                phrase = " ".join(words[i:i+n])
                if len(phrase) < 3: continue
                if phrase in self.geo_stop_words: continue # Skip common words
                if phrase in self.city_lookup:
                    found_cities.extend(self.city_lookup[phrase])
        
        if found_cities:
            top = sorted(found_cities, key=lambda x: x.get('population', 0), reverse=True)[0]
            return self.normalize_country(top['countrycode']), top['name']

        # 2B. Dynamic Phrase Scanning (Cities) - using English title if slug failed
        if title_lower:
            words_title = re.split(r'[-\s]', title_lower)
            for n in range(min(3, len(words_title)), 0, -1):
                for i in range(len(words_title) - n + 1):
                    phrase = " ".join(words_title[i:i+n])
                    if len(phrase) < 3: continue
                    if phrase in self.geo_stop_words: continue
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

        # 3B. Country Keyword Scan - using English title
        if title_lower:
            for word in words_title:
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

    def detect_geo_structured(self, slug, title_en=""):
        slug_lower = slug.lower()
        slug_clean = slug_lower.replace('-', ' ').replace('_', ' ')
        slug_hyphens = slug_clean.replace(' ', '-')
        padded_slug = f"-{slug_hyphens}-"
        
        # 1. Check Structured KB first (Highest Priority for DSA)
        # We sort keys by length descending to match longest phrases first (e.g. "nusa-penida" before "nusa")
        sorted_keys = sorted(self.structured_kb.keys(), key=len, reverse=True)
        for key in sorted_keys:
            padded_key = f"-{key}-"
            if padded_key in padded_slug:
                data = self.structured_kb[key]
                return {
                    "country": (data.get("country") or "Unknown").title(),
                    "city": (data.get("city") or "Unknown").title(),
                    "sub_city": (data.get("sub_city") or "").title(),
                    "province": (data.get("province") or "").title(),
                    "geo_category": data.get("category", ""),
                    "display_name": data.get("display_name", "")
                }
                
        # 2. Fallback to classic detection
        country, city = self.detect_geo(slug, title_en)
        return {
            "country": country,
            "city": city,
            "sub_city": "",
            "province": "",
            "geo_category": "city" if city != "Unknown" else "", # Default generic category if city found
            "display_name": ""
        }

engine = GeoEngine()
