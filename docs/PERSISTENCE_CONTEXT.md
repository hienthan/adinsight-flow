# Persistence & Ingestion Workflow Context

This document stores the optimized rules and decisions for the data pipeline to ensure efforts are not wasted and the system remains high-performance.

## 1. Automated Execution
- **Auto-Accept**: For this personal project, all shell commands and workflow steps should be marked as `SafeToAutoRun` and `ShouldAutoProceed`.

## 2. Idempotent Data Pipeline (Upsert Strategy)
- **Avoid Full Reset**: Do NOT run `00_sync_db.py` or wipe collections unless the schema changes significantly.
- **Upsert Logic**: The import script (`02_import_to_pb.py`) must use an **Upsert** strategy. 
    - Key: `canonical_id` + `language`.
    - Action: If the record exists, update fields (title, tier, geo, is_private). If not, create a new record.
- **Benefits**: Preserves manual edits if any, reduces database fragmentation, and is much faster for incremental updates.

## 3. High-Speed Ingestion
- **Source File**: Prioritize processing raw URL text files (e.g., `sitemap-sample/klook/activity-urls.txt`) over massive XML sitemaps to avoid unnecessary XML parsing overhead.
- **Translation**: Use high-quality Title-Cased slug reconstruction as the primary "translation" for bulk runs. Reserve AI/Library translation only for high-intent (Tier 1) samples or explicit requests.

## 4. Database Structure
- **Collections**:
    - `platforms`: Central registry for sources (e.g., Klook).
    - `pages`: Main repository for URLs and metadata.
    - `platform_metadata`: Store dynamic filter values like `countries` and `sitemap_tags`.
- **Primary Keys**: We use `canonical_id` as the source-of-truth identifier from the platform.

## 5. Performance Targets
- **Ingest (33k)**: < 5 seconds.
- **Import/Upsert (33k)**: < 3 minutes (using Thread-Pool concurrency).
- **Dashboard Load**: < 500ms (using Infinite Scrolling).

## 6. Absolute Geo-Detection Standards (CRITICAL)
- **Token Match is NOT enough**: Simple word-splitting fails on locations like "Las Vegas", "Chiang Mai", or "New York".
- **Phrase Matching (N-Grams)**: Detection MUST use a sliding window (1-3 words) or multi-word substring matching against the slug.
- **Regional Support**: "Country" detection must include major regions (Hokuriku, Kansai) and states (California, Nevada) as high-priority keys.
- **Unknown is a Bug**: Any URL with a clear location keyword resulting in "Unknown" is a critical error. The `GeoEngine` must be recursively expanded with a custom whitelist for these edge cases.

## 7. Hybrid AI-Powered Knowledge Base
- **Persistent Memory**: The `scripts/lib/geo_knowledge.json` acts as the "Trí tuệ nhân tạo" (AI knowledge) of the app. It stores mappings that standard libraries (Geonames) miss, like "Jeju", "Angkor", or "Vatican".
- **Priority**: This JSON dictionary is checked BEFORE all other logic.
- **N-Gram Support**: The detection engine uses n-grams (1-3 word combinations) from the slug to match against this dictionary, catching phrases like "Las Vegas" or "Ha Long Bay" accurately.
- **Maintenance**: If significant "Unknowns" are found, they should be enriched through an AI-assisted sweep (e.g., GPT-4o) and recorded in this file for permanent reuse across all future platforms.
