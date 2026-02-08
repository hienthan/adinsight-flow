# 04_DEDUPLICATION_LOGIC - Multilingual Handling

## The Problem
Platforms like Klook provide the same activity in multiple languages:
- `.../zh-HK/activity/12345-slug/`
- `.../zh-TW/activity/12345-slug/`
- `.../en-US/activity/12345-slug/`
This leads to 3x data volume and redundant analysis.

## The Solution: Canonical ID
Every activity in Klook (and most platforms) has a unique numeric ID in the slug.
**Logic**:
1.  **Extract `canonical_id`**: Use regex (e.g., `/activity/(\d+)-/`) to get the ID.
2.  **Unique Constraint**: The combination of `(platform, canonical_id, language)` must be unique in the `pages` collection.
3.  **Cross-Language Sharing**: 
    - Tiering and Category analysis is done ONCE per `canonical_id`.
    - When a new language version of the same ID is found, it copies the `tier` and `category_hint` from the existing record.
    - Only `translated_title_vi` and `url` remain unique per language record.
4.  **IMPORTANT - canonical_id = "0" Exclusion**:
    - Mobility URLs (transport services) have `canonical_id = "0"` since they don't have numeric IDs in URLs
    - The import script **excludes** `canonical_id = "0"` records from deduplication logic
    - This prevents incorrect merging of distinct mobility URLs
    - See `docs/05_MOBILITY_URLS_LOGIC.md` for details

## Performance at Scale (Millions of Records)

### 1. SQLite's Strength
PocketBase is built on SQLite, which is capable of handling **billions** of rows. For 1-5 million records, performance will stay high as long as we use **B-Tree Indexes** correctly.
- **Index strategy**: We already have `(canonical_id, language)` indexed. Searching by `country` or `city` will also be indexed.
- **Search optimization**: For GUI searches like `-ticket`, we rely on SQLite's efficient string matching.

### 2. Preventing "Database Bloat"
To keep the `pages` collection fast:
- **Vertical Partitioning**: We store heavy raw data (if ever needed) in a separate collection, keeping the `pages` table "lean" for fast filtering.
- **Metadata Cache**: The `platform_metadata` collection acts as a "View" or "Summary". The GUI never asks "What are all the countries in 1 million pages?". Instead, it asks "What are the 50 countries in platform_metadata?". This makes the UI feel instantaneous.

### 3. Scaling across Categories
Whether it's `/blogs`, `/hotels`, or `/activity`, the schema is flexible. The `sitemap_tag` and `category_hint` fields allow us to keep everything in one collection while maintaining separate "logical" buckets.
- If one category grows to 10M+ records and slows down others, we can easily split them into separate collections (e.g., `pages_hotels`, `pages_activities`) without changing the app logic significantly.
