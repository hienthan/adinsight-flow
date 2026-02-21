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
*   **Comprehensive Blacklist (`exclude_keywords.json`):** Contains highly specific, non-transactional keywords grouped by category (Greetings, Entertainment, Health, Academic, B2B, Outdated Events).
*   **Advanced 3-Layer Exclusion Logic:**
    *   **Layer 1: Regex Exclude List (`exclude_keywords.json`):** Regex-based word boundary matching (`\b(keyword)(?:s|'s|es)?\b`) prevents false substring matches. It checks BOTH the original `slug` and the translated `title_en`, allowing powerful English multi-word concepts (e.g., `difference-between`, `how-to-make`) to filter complex SEO content.
    *   **Layer 2: Safe Keywords Allowlist (`safe_travel_keywords.json`):** Prevents broad TOFU keywords (like `what-is`, `how-to`, `tips`, `cara`, `guide`, `recommendation`) from accidentally blocking valid travel content. An Allowlist checks for "immunity" keywords (e.g., `visa`, `airport`, `pantai`, `stadium`, `salon`, `cafe`). If matched, the Junk status is overridden.
    *   **Layer 3: Dynamic Geo Engine Override:** Integrates directly with `geo_engine.py`. If a URL is flagged as junk by Layer 1, but the geo-engine successfully detects a valid **City** (e.g., "Kyoto", "Bandung", "Sapporo"), the URL is automatically rescued. This dynamic layer saves hundreds of niche location URLs without requiring manual hardcoding in the allowlist. *(Note: Generic 'Country' matches like "Indonesia" or "Unknown" cities are explicitly ignored to prevent rescuing broad domestic junk).*
*   **Implementation:** The script `tvlk_enrich_and_import.py` runs these 3 layers of checks. Junk URLs are flagged with `is_active: false` and pushed to `Tier 5`. Their original metadata is preserved for auditing. Protected TOFU URLs (rescued by Layer 2 or 3) are pushed to `Tier 4` with `travel_guide` classification.

## 2.5. Zero-ROAS "Budget Drain" Traps

**Problem:** Traveloka app contains non-travel, high-volume search services that drain Google Ads budgets because they have **zero cross-sell potential** (no hotel or flight booking intent) and extremely low transaction values.
*   **Local Commuter Transport:** Local city trains like `KRL Solo-Jogja`, `MRT Jakarta`, `LRT`, and `Angkot`. Commuters search for schedules heavily, driving up clicks, but they take day-trips and do not book hotels. (Distinct from High-Value Intercity/Airport trains like `Whoosh` or `Kereta Api` which are kept).
*   **Utility & Bill Payments:** `Token Listrik` (Electricity), `BPJS` (Health Insurance), `Pajak Motor` (Taxes). High search volume, zero travel intent.
*   **Gaming Top-ups:** `Top-up FF`, `Diamond Mobile Legends`. Attracts cheap clicks from gamers without travel budget.
*   **Local Cinema:** `Jadwal CGV`, `Cinema XXI`. Friday night mall-goers, not tourists.

**Solution:** These keyword groups are hard-excluded in `exclude_keywords.json`. Note: Care must be taken so that names containing cities (like `mrt-jakarta`) are not accidentally rescued by Geo Engine overrides.

## 3. DSA Tier & Taxonomy Classification

**Problem:** A generic 5-tier classification logic based solely on activity type does not align with actual user purchase intent or Google Ads bidding strategies.

**Solution:**
*   **Traveloka-Specific Classifier:** Created `scripts/lib/tvlk_tier_classifier.py` to map Indonesian URL patterns to practical bidding tiers and automatic taxonomy (`content_type`, `funnel_stage`, `sub_tag`).
*   **The 4-Tier Bidding Strategy:**
    1.  **Tier 1 (High ROAS / Fast Purchase):** Tickets, passes, SIM/Wifi (`connectivity`), concerts/events (`event`), car rentals. *Focus: Maximize Clicks / Low tCPA.*
    2.  **Tier 2 (High AOV / Consideration):** Multi-day tours, packages, cruises, and Beauty/Spa services (`beauty_spa`). *Focus: Maximize Conversion Value.*
    3.  **Tier 3 (Discovery / Exploration):** General POIs, temples, natural landmarks without explicit booking verbs (`landmark`). *Focus: Low bid DSA to capture branch traffic.*
    4.  **Tier 4 (TOFU / Cookie Seeding):** Travel guides, tips, and informational content protected by the Allowlist. Structured with `content_type=travel_guide` and `sub_tag=tips_and_tricks`. *Focus: Ultra-low bid for Outbound campaigns to seed cheap cookies.*
*   **Funnel Stage Validations:** The system categorizes user intent across four funnel stages:
    *   `readiness`: Immediate purchase intent (Tier 1).
    *   `consideration`: High-value services needing research before booking, like Beauty & Spa (Tier 2).
    *   `planning`: Multi-day trips or complex activities (Tier 2).
    *   `awareness`: Non-transactional exploration and TOFU guides (Tier 3 & 4).

## 4. DSA Page Feed Export Best Practices

**Crucial Formatting Rules for Google Ads CSVs:**
*   **Columns:** Exactly two columns: `Page URL` and `Custom label`.
*   **Multi-label Formatting:** Multiple labels must be combined in the `Custom label` column separated strictly by semicolons (`;`) without spaces (e.g., `tier=1;funnel=readiness;city=bali`).
*   **Case Sensitivity:** All custom labels should be converted to lowercase (`.lower()`) during export to prevent duplication errors in Google Ads (e.g., `City=Bali` vs `city=bali`).
*   **Data Integrity:** Ensure no commas (`,`) are present within the custom label strings, as they will break the CSV structure. Filtering out `is_active=False` records during export is crucial to keep the feed clean.

## 5. Translation Memory Caching (Speed & API Optimization)

**Problem:** Hitting the Google Translate API for every single URL (e.g., 3,000+ times) causes severe bottlenecks (taking 5+ minutes) and risks an IP ban (`429 Too Many Requests`). Also, Traveloka's internal URL suffixes (`-ta` for Tourist Attraction, `-trp` for Transport, `-acc` for Accommodation) get literally translated, polluting the English results and breaking keyword matching rules.

**Solution:**
*   **Suffix Stripping:** The script intercepts useless internal suffixes (`-ta`, `-trp`, `-acc`) and completely strips them from the string *before* sending them to the translation engine. This guarantees `title_en` generates clean English sentences rather than inserting "TA" or "TRP" randomly.
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
│       ├── safe_travel_keywords.json
│       ├── id_en_cache.json         
│       └── tvlk_tier_classifier.py  
├── klook/                   # KLOOK SPECIFIC
│   ├── generate_dsa_feed.py         # Generic/Klook feed generator
│   └── ...
└── utils/                   # One-off admin tools
    └── 00_sync_db.py
```
This guarantees that modifications to the complex Traveloka funnel do not inadvertently break the generic Klook reports.
