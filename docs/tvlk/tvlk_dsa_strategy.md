# Traveloka Indonesia (id-id) DSA Strategy & Technical Implementation

Documenting the key strategies, technical decisions, and file paths for the Google Ads Dynamic Search Ads (DSA) campaign focused on Traveloka's Indonesia market.

## 1. Geo & Intent Detection Optimization

**Problem:** Standard geolocation libraries (like `geopy` or `geonamescache`) often fail to detect local Indonesian terms or translated names (e.g., "jepang" -> "Japan", "korsel" -> "South Korea") and niche local Points of Interest (POIs) (e.g., "Dufan", "Ancol", "TMII").

**Solution:**
*   **Hybrid Detection Approach:** The `geo_engine.py` prioritizes checking against a custom Knowledge Base (KB) JSON file before falling back to standard libraries or geocoding.
*   **Custom Indonesian KB:** Created `scripts/lib/indo_geo_kb.json`. This file maps localized country names and specific Indonesian cities/islands/landmarks to their standard English equivalents and correct geographical locations (e.g., mapping "borobudur" to City: "Magelang", Country: "Indonesia").
*   **Expanded Stop Words:** Added roughly 60 Indonesian travel-related stop words (e.g., `wisata`, `tiket`, `harga`, `promo`) to `geo_engine.py` to prevent false positive geo-matches when parsing slugs.

## 2. Filtering Informational & Junk SEO Pages

**Problem:** Traveloka generates massive amounts of informational content (lifestyle, greetings, tutorials, finance) to capture cheap top-of-funnel SEO traffic. Serving DSA ads on these pages drains budget with zero return on ad spend (ROAS).

**Solution:**
*   **Comprehensive Blacklist:** Created `scripts/lib/exclude_keywords.json` containing highly specific, non-transactional keywords grouped by category (Greetings, Entertainment, Health, Academic, B2B, Outdated Events).
*   **Strategic Keyword Selection:**
    *   *Used specific unigrams:* `skripsi`, `chord`, `cpns` (Safe, 100% non-travel).
    *   *Used bigrams/trigrams for ambiguous contexts:* Instead of banning "korea" (which would kill "visa korea" or "tour korea"), we ban `drama-korea` and `drakor`. Instead of "jadwal", we ban `jadwal-sholat`.
    *   *Addressed Platform Nuances:* Blocked B2B registration pages (`mitra`, `korporat`) and outdated event years (`2019`-`2024`) to avoid "Sold out" landing pages.
*   **Implementation:** The script `tvlk_enrich_and_import.py` checks slugs against this blacklist using exact word boundary matching (preventing "sim" from matching "simbah"). Matched URLs are flagged with `is_active: false` and classified as `informational_junk`.

## 3. DSA Tier & Taxonomy Classification

**Problem:** A generic 5-tier classification logic based solely on activity type does not align with actual user purchase intent or Google Ads bidding strategies.

**Solution:**
*   **Traveloka-Specific Classifier:** Created `scripts/lib/tvlk_tier_classifier.py` to map Indonesian URL patterns to practical bidding tiers and automatic taxonomy (`content_type`, `funnel_stage`, `sub_tag`).
*   **The 3-Tier Bidding Strategy:**
    1.  **Tier 1 (High ROAS / Fast Purchase):** Tickets, passes, car rentals, airport transfers, essential services. *Focus: Maximize Clicks / Low tCPA.*
    2.  **Tier 2 (High AOV / Consideration):** Multi-day tours, packages, glamping, cruises. *Focus: Maximize Conversion Value.*
    3.  **Tier 3 (Discovery / Exploration):** General POIs, temples, landmarks without explicit booking verbs. *Focus: Low bid DSA to capture branch traffic.*
*   **Funnel Stage Validation:** Validated that the 3 PocketBase `funnel_stage` options (`readiness`, `planning`, `awareness`) are optimal for organizing ad groups and structuring remarketing campaigns in Google Ads. They should remain as Selection (Enum) types to ensure data integrity for custom label generation.

## 4. DSA Page Feed Export Best Practices

**Crucial Formatting Rules for Google Ads CSVs:**
*   **Columns:** Exactly two columns: `Page URL` and `Custom label`.
*   **Multi-label Formatting:** Multiple labels must be combined in the `Custom label` column separated strictly by semicolons (`;`) without spaces (e.g., `tier=1;funnel=readiness;city=bali`).
*   **Case Sensitivity:** All custom labels should be converted to lowercase (`.lower()`) during export to prevent duplication errors in Google Ads (e.g., `City=Bali` vs `city=bali`).
*   **Data Integrity:** Ensure no commas (`,`) are present within the custom label strings, as they will break the CSV structure. Filtering out `is_active=False` records during export is crucial to keep the feed clean.

## 5. Translation Memory Caching (Speed & API Optimization)

**Problem:** Hitting the Google Translate API for every single URL (e.g., 3,000+ times) causes severe bottlenecks (taking 5+ minutes) and risks an IP ban (`429 Too Many Requests`).

**Solution:**
*   **ID-EN Local Cache:** Implemented a thread-safe memory dictionary (`scripts/tvlk/lib/id_en_cache.json`).
*   **Seeding:** The cache is pre-seeded with 55+ common Indonesian travel phrases (e.g., `"tiket masuk"`, `"sewa mobil"`, `"paket tour"`).
*   **Auto-Learning:** When the script encounters an unknown word, it calls the Google Translate API once, saves the result to memory, and dumps the expanded dictionary back to disk at the end of the batch. This drops subsequent import times from minutes to literal seconds and completely eliminates API limits.

## 6. Codebase Architecture Setup

To prevent "Spaghetti Code" as more platforms are added, the processing scripts have been modularized:

```text
scripts/
├── lib/                     # Global shared utilities
│   └── geo_engine.py      
├── tvlk/                    # TRAVELOKA SPECIFIC
│   ├── tvlk_enrich_and_import.py    # Main pipeline
│   ├── generate_dsa_feed.py         # Dedicated 6-param DSA CSV Generator
│   └── lib/                         # TVLK specific rules
│       ├── indo_geo_kb.json         
│       ├── exclude_keywords.json    
│       ├── id_en_cache.json         
│       └── tvlk_tier_classifier.py  
├── klook/                   # KLOOK SPECIFIC
│   ├── generate_dsa_feed.py         # Generic/Klook feed generator
│   └── ...
└── utils/                   # One-off admin tools
    └── 00_sync_db.py
```
This guarantees that modifications to the complex Traveloka funnel do not inadvertently break the generic Klook reports.
