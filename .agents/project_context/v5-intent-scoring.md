# V5 Intent & Tiering Scoring Formula

**Goal:** Process raw Affiliate Travel Data into structured, ROAS-optimized Google DSA Campaigns.

## 1. Core Principles (DOs)

- **The 10-Point Hybrid Metric:**
  `Final_Score = (Intent_Score * 0.5) + (Geo_Score * 0.3) + (Planning_Signal * 2.0)`
  - Maximum Score: `~9.70`.
- **Absolute Span Deduplication:** When extracting intents, ALWAYS use span overlaps to avoid inflation. NEVER allow `3-hari` and `3-hari-2-malam` to stack points twice. Stacking falsifies the `planning_signal`.
- **Taxonomy Driven:** Extract `macro_intent` from the JSON Mapping (`content_taxonomy.json`), NOT python regex logic.
- **V4 Fallback Protection:** Only fall back to Legacy Global NLP mapping (`indo_geo_kb.json`) IF and ONLY IF the V5 entity is empty (`""` or `"Unknown"`) AND the country is empty (`""` or `"Unknown"`).

## 2. Dynamic Tier Allocation (DO NOT ALTER THE THRESHOLDS)
All URLs map to 3 strict Affiliate ROAS Tiers.
- **Tier 1 (Golden Keywords):** `final_score >= 8.0` (Highly specific location with transactional signals).
- **Tier 2 (Core Discovery):** `6.5 <= final_score < 8.0` (Standard informative travel articles).
- **Tier 3 (Generic / Foreign):** `final_score < 6.5` (Broad national content or international tourism).

## 3. Dynamic Ads Matrix (DSA Campaigns)
`{Primary_Intent}_{Geo_Key}`
- Use the lowest-level Geo element dynamically found (Landmark/City takes precedence over Province, Province takes precedence over Country).
- *Example:* `transport_jakarta-station` or `planning_bali`.
