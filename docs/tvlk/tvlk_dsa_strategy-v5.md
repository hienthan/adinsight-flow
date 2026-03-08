# Traveloka Indonesia (id-id) DSA Strategy v5.0 (Intent-First Engine)

This document outlines the absolutely finalized v5.0 strategy and architecture for Google Ads Dynamic Search Ads (DSA) campaigns, focusing on the Indonesian affiliate market. Version 5 represents a major paradigm shift from a **Tier-First/Geo-First** approach to an **Intent-First** approach, backed by a fortified Hybrid Geo Pipeline.

---

## 1. Core Philosophy: Intent-First DSA Targeting
While the ultimate goal remains massive cookie seeding, V5 prioritizes the user's explicit intent (Logistics, Exploration, Wellness, etc.) to structure campaigns. Previously, a location dictated the campaign structure. Now, **Behavior + Location** dictate the structure, enabling highly specific ad copy and bidding based on user journey phases.

---

## 2. The Integrated Pipeline (Hybrid V4 + V5 Architecture)
The V5 implementation (`tvlk_enrich_and_import_v5.py`) perfectly marries the robustness of the V4 infrastructure with the precision of the new V5 Intent processing engine.

### A. Infrastructure & Integration Layer (V4 Heritage)
*   **Translation Caching:** Google Translate API generates `title_en` for SEO and semantic search value. Caching (`id_en_cache.json`) via Threading Locks drastically improves API performance on 3k+ URL lists.
*   **PocketBase Upsert Threading:** ThreadPoolExecutor guarantees rapid data ingestion by sending `POST` or `PATCH` requests depending on URL existence natively.
*   **PocketBase JSON Safe-Typing:** Arrays (`slug_tokens`, `intent_patterns`, `detected_keywords`) are gracefully serialized into strictly valid JSON arrays ensuring the Admin GUI displays them without error.
*   **Global Geo NLP Fallback (The V4 Safety Net):** If the V5 engine fails to detect an Indonesian geo-entity, the URL gracefully falls down into `geo_engine.py` (V4). This legacy engine utilizes `geonamescache` and `indo_geo_kb.json` to intelligently parse globally recognized entities (e.g., mapping `tokyo -> Japan`, `universal-studios-singapore -> Singapore`). 

### B. Analytical Core (The V5 Processing Engine)
*   **Smart Slug Parsing:** Extracts valid tokens, automatically sanitizes numeric trailing IDs (e.g., `/pl-tempat-spa-di-bali/158563` -> `tempat-spa-di-bali`), suffixes (`-ta`, `-trp`), and intelligently strips stopwords.
*   **Native 3-Layer Junk URL Rescue:** Completely integrated inside `slug_parser.py`, ensuring maximum spam protection without sacrificing valuable content:
    1.  **Fatal Exclude (Layer 0):** Absolute kill for critical spam categories (`gaming_topup`, `utility_and_bills`, `local_cinema`, `local_commuter_transport`). Example: `top-up-mobile-legends` is killed instantly. Rescue is strictly strictly impossible.
    2.  **Normal Exclude (Layer 1):** Standard noise (e.g., `drakor`, `anime`) flags the URL as `is_active = False`.
    3.  **Safe Allowlist Rescue (Layer 2):** Scans the URL against `safe_travel_keywords.json`. If a flagged URL contains a golden phrase (e.g., `tips-transportasi`), it is heroically resurrected to `is_active = True`.
*   **Anti-Pattern Stacking (Span Deduplication):** Intent keywords strictly avoid "stacking" score inflation. `3-hari-2-malam` captures the exact span, preventing `3-hari` and `2-hari` from falsely compounding the `planning_signal`.
*   **Modular Content Taxonomy:** `content_taxonomy.json` maps activity keywords (e.g., `spa`, `festival`) directly to `content_type` AND `sub_tag` without python logic, ensuring immense scalability.

---

## 3. Strict Geo Hierarchy & Parent Resolution (V5)
The V5 Geography system resolves massive data collisions via a recursive Parent Mapping loop:

1.  **Longest Match Geo Resolution:** Solves the Double Geo Collision Rule natively. Specific landmarks with regex boundaries (`\b(taman-nasional)\b`) overpower generic terms (`taman`).
2.  **Dynamic Parent Ladder (`sub_area` -> `city` -> `province` -> `country`):** 
    *   Sub-areas (like *Seminyak*) gracefully trace their parent definitions upwards until they resolve fully.
    *   **The Root Node Rule:** The hierarchy requires `part0_country.json` providing the `indonesia` node, allowing any nested city to trace its way back to country origins.
3.  **Master Province Auto-Mapping:** `map_city_parents.py` creates a reverse-index from `indo_geo_master.json`. It guarantees that all Cities are strictly mapped to one of the 38 precise Provinces defined in `part2_provinces.json` (e.g., *Bandung* strictly points to *Jawa Barat*, not just *Indonesia*), solving the "Province Unknown" trap permanently.
4.  **Targeted Infrastructure Extraction:** Intelligently tags the `infra_type` exclusively when natively matching `transport_hub` or `transport_system` (e.g., `bandung-station`).

---

## 4. Intent Authority & Dual Math Scoring
### Authority Hierarchy
1.  **Intent Detected (Absolute Authority):** `transport`, `planning`, `things_to_do`, `information`.
2.  **Taxonomy Matched (Secondary Clue):** Used to deduce `sub_tag` and macro `content_type`.
3.  **Geo Entity Default (Fallback Baseline):** If intent cannot be mapped, it gracefully falls back to `destination` (Score: 8).

### Dual Math Scoring
Scores calculate true affiliate value:
*   `Final Score = geo_score * intent_score + planning_signal`.
*   URLs with `planning_signal` (e.g. "Itinerary 3 days") get a flat bonus (+2 to +4), guaranteeing entry into high DSA bid brackets.

---

## 5. DSA Campaign Matrix (Dynamic Grouping)
Campaign names perfectly segment ad groups without exploding campaign limits: `{Primary_Intent}_{Geo_Key}`
*   `Primary_Intent`: The computed Intent Type.
*   `Geo_Key`: Dynamically selected:
    *   If Landmark -> Uses Province.
    *   If City -> Uses City.
    *   If Commuter/Transport Hub -> Uses the specific Geo Entity.

**Examples:**
*   `transport_jakarta-station` (High Value - TOFU)
*   `planning_bali` (Medium Value - MOFU)
*   `destination_lombok` (Generic Coverage)
*   `explore_jawa-barat` (Using auto-mapped precise province logic)
