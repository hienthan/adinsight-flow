# Traveloka Indonesia (id-id) DSA Strategy v4.0 (Antigravity Engine)

Documenting the key strategies, technical decisions, and architecture for the Google Ads Dynamic Search Ads (DSA) campaign focused on Traveloka's Indonesia affiliate market.

## 1. Core Philosophy: Cookie Seeding at Scale

The ultimate goal of the Antigravity Engine is **Cookie Seeding on a massive scale** with the lowest possible CPC (800 - 1,200 IDR). We target TOFU/MOFU traffic (exploration, transit planning, logistics) and strictly avoid BOFU keywords (direct bookings, hotel, promo) due to extreme competition from major OTAs.

## 2. URL Processing & Parsing (The V4 Engine)

**Problem:** URLs contain redundant SEO keywords (`terbaru`, `lengkap`), numeric IDs, and overlapping location names (e.g., `kuta-bali` vs `bali`), which previously caused false clustering.

**Solution: The Clean & Lean Approach**
*   **Sanitization Layer:** Automatically lowercase strings, replace hyphens with spaces (or token arrays), and strip noise suffixes (`-trp`, `-guide`, `-simak`, `-terbaru`, `-gt`, and trailing numbers) before parsing.
*   **Regex Word Boundaries & Tokenization:** Instead of padding slugs with hyphens (which misses end-of-string keys), we split slugs into token sets or use `\b(key)\b` regex to precisely isolate geo terms.
*   **Scan All & LKM Resolution:** The engine scans the slug against ALL keys from the Geo dictionary (sorted by length). Instead of early-exit upon the first match, it collects **all matching entities**. Overlapping shorter keys (e.g., `bali` vs `kuta-bali`) are discarded, leaving a pool of primary keys.
*   **Double Geo Collision Rule:** If multiple distinct locations remain (e.g., `jakarta-to-bandung`), it defaults to the *last* location, EXCEPT for Logistics intents (containing `dari`, `to`, `ke`), where it picks the location immediately following the directional word.
*   **Hybrid Global Execution:** For international locations not covered by the `indo_geo_master.json` (e.g., Tokyo, Paris), the system still utilizes the generic NLP `geo_engine.py`. The V4 Master Geo explicitly overrides the global NLP engine ONLY when local Indo data is present.

## 3. Waterfall Matching, Root-Signals & Intent Authority

V4 introduces a prioritized waterfall matching approach rather than pure geographical parsing:

1.  **URL Regex Intent (Absolute Authority):** Intent extracted from the URL structure itself (`cara-ke` = logistics, `jadwal` = transit) ALWAYS overrides the default `intent_type` assigned to a location in the master JSON. Behavior beats static data.
2.  **Root-Signals (Infrastructure & Hubs - Parts 5 & 6):** High-value intent signals like `whoosh`, `ka-bandara`, `kapal-ferry`, or behavioral signals (`ziarah`, `oleh-oleh`, `factory-outlet`) take absolute priority over standard geo-names.
3.  **Geo-Names (Locations - Parts 1-4):** Matches exact administrative locations (Provinces down to Sub-cities) using the Scan-All LKM rule.
4.  **Commuter Traps (Penalty):** Terms like `krl`, `mrt`, `lrt`, `jaklingko`. Instead of outright exclusion, these are penalized via a `commuter` distance multiplier.

## 4. Unified Schema & Master Geo Data

The `indo_geo_master.json` structure defines 15 core fields for precise DSA routing:

*   **Categories:** `province`, `city`, `sub_city`, `airport`, `landmark`, `commuter_transit`, etc.
*   **Administrative Hierarchy:** Strict mapping of `province` -> `city` -> `sub_city` to prevent misclassification.
*   **Cluster Mapping:** Aggregating data into 5 core budget clusters: `bali`, `jakarta`, `jogja`, `bandung`, `lombok`.
*   **Scoring Weights:** `domestic_popularity`, `cross_sell_potential`, `inventory_density`, `geo_competition`.
*   **Infra Modifiers:** `infra_type` and `travel_distance_bias` (`long`, `regional`, `commuter`).

## 5. The Dual Scoring Engine (Math Engine)

URLs are scored via two distinct formulas depending on their match type:

### A. Infrastructure & Hubs (Traffic Root-Signals)
Focused on intent and cross-sell potential since transport hubs have few native hotel/tour products.
*   **Formula:** `Score = [(Intent * 0.6) + (CrossSell * 0.4)] * Multiplier(Dist)`
*   **Multiplier:** Long-haul (1.5), Regional (1.1), Commuter (0.3). Commuter traps receive a severe penalty.

### B. Geo Destinations (Locations & Landmarks)
Focused on product density and destination stickiness.
*   **Formula:** `Score = [(Domestic * 0.3) + (Inventory * 0.4) + (CrossSell * 0.3)] * Intent_Multiplier`
*   *(Intent Multiplier typically ranges from 1.0 to 1.5 based on transit/logistics density).*

*(Note: An additional `Intent_Match_Risk` can be factored in at the Page Feed level to flag broad queries).*

## 6. Tiering & DSA Bidding Strategy

Based on the final Affiliate Score, URLs are automatically tiered for Google Ads Custom Labels:

*   **Tier A0 (Score >= 12) - Priority High Bid:** Major transport hubs (Airports, Whoosh) and premium destinations (Bali core). Strategy: Max Clicks / Manual CPC (Highest, 800 - 1,200+ IDR).
*   **Tier A1 (Score 9 - 11.9) - Growth Mid Bid:** High-value secondary cities, specialized landmarks, and logistics. Strategy: Max Clicks (Medium).
*   **Tier A2 (Score 5 - 8.9) - Explore Low Bid:** General exploration, remote islands (e.g., Sumba, Raja Ampat), and informative content. Strategy: Max Clicks (Low).
*   **Tier A3 (Score < 5) - Cookie Farm / Bottom Bid:** Subsidized commuter transport (KRL, MRT) and generic noise. Strategy: Ultra-low CPC to harvest accidental clicks at scale.

## 7. DSA Campaign Naming Convention

Campaign names are dynamically generated using the formula: `[Tier]_[Intent]_[Cluster]`. 
This allows for quick, overarching visibility into the URL's purpose directly from the Custom Label.
*   **Examples:** `A0_Transit_Java`, `A1_Logistics_Bali`, `A2_Explore_Broad`

## 8. Expected Implementation File Structure

*   `scripts/tvlk/lib/indo_geo_master.json`: The single source of truth for location/infra metadata.
*   `scripts/tvlk/lib/url_processor.py`: The `AntigravityEngine` implementation (Sanitize -> Waterfall Match -> Score -> Tier).
*   `(Legacy)` `scripts/tvlk/lib/tvlk_tier_classifier.py`: Replaced entirely by the V4 Math Engine.
