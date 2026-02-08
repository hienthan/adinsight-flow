# 05_MOBILITY_URLS_LOGIC - Transportation URLs with Sub-tags

## Overview
Mobility URLs represent transportation services (rail, bus, ferry) and have a different pattern from activity URLs.

## URL Pattern
```
https://www.klook.com/zh-HK/{transport-type}/{route-info}/
```

**Examples**:
- `https://www.klook.com/zh-HK/europe-rail/1027-italy/`
- `https://www.klook.com/zh-HK/japan-rail/shinkansen/28-tokyo/29-osaka/`
- `https://www.klook.com/zh-HK/taiwan-high-speed-rail/taipei-station/zuoying-station/`

## Key Differences from Activity URLs

### 1. Canonical ID
- **Activity URLs**: Have numeric canonical IDs extracted from URL (e.g., `12345` from `/activity/12345-slug/`)
- **Mobility URLs**: Set `canonical_id = "0"` (no unique numeric ID in URL pattern)

### 2. Sub-tag Field
- **Purpose**: Categorize by transport type
- **Extraction**: The `{transport-type}` segment after language code
- **Examples**: `europe-rail`, `japan-rail`, `taiwan-high-speed-rail`, `korea-bus`, `hong-kong-high-speed-rail`
- **Display**: Formatted with spaces (e.g., "Europe Rail", "Japan Rail")

### 3. Tier Classification
Mobility URLs use transport-type-based tier classification:
- **Tier 1**: Rail/train services (`rail`, `train`, `shinkansen`, `high-speed`) - Highest booking intent
- **Tier 2**: Bus/ferry services (`bus`, `ferry`, `boat`) - Medium intent
- **Tier 3**: Other transport types - Catch-all

### 4. Location Detection
Uses the same `geo_engine.detect_geo()` logic as activity URLs:
- Tries to extract from route information
- Falls back to analyzing sub_tag (e.g., "japan-rail" → Japan)
- Uses Knowledge Base and city lookup

## Deduplication Logic Update

### CRITICAL: canonical_id = "0" Exclusion
To prevent potential bugs, the import script (`02_import_to_pb.py`) **excludes** records with `canonical_id = "0"` from the deduplication logic.

**Reason**: 
- Activity URLs with real canonical IDs use deduplication to merge zh-HK and zh-TW language versions
- Mobility URLs all have `canonical_id = "0"`, so they should **NOT** be deduplicated
- Each mobility URL is unique and should create a separate record

**Implementation**:
```python
if canonical_id != "0":
    # Normal deduplication logic for activity URLs
    # Search for existing record and merge languages
else:
    # Skip deduplication - always create new record
```

## GUI Integration

### Sidebar Navigation
- **Section**: DSA Analytics
- **Label**: "Klook Mobility"
- **Route**: `/adinsight/klook/zh-mobility`

### Filter Bar
New filter: **Sub-tag** dropdown
- Populated from `platform_metadata` collection (type = 'sub_tag')
- Filters records by transport type
- Works alongside existing filters (Country, Tier, Privacy, Language)

### Data Table
New column: **Sub-tag**
- Width: 150px
- Style: Purple badge (`rgba(139, 92, 246, 0.1)` background)
- Display: Capitalized with spaces (e.g., "Europe Rail")
- Empty state: "-" for activity URLs without sub_tag

### Export CSV
Sub-tag information is preserved in the database but not currently included in DSA export CSV (which focuses on URL and labels).

## Processing Script

**File**: `scripts/06_klook_mobility_ingest.py`

**Usage**:
```bash
python3 scripts/06_klook_mobility_ingest.py \
    sitemap-sample/klook/mobility-urls.txt \
    mobility \
    zh-HK
```

**Output**: `data/klook_mobility_zh-HK_preview.json`

## Platform Metadata
The import script automatically creates metadata entries:
- **Type**: `sub_tag`
- **Values**: All unique sub_tag values (e.g., "europe-rail", "japan-rail", etc.)

This enables the GUI to populate the sub_tag filter dropdown dynamically.

## Translation Logic
Uses the same `translate_slug()` function as activity URLs:
- Remove numeric prefix (if any)
- Replace hyphens with spaces
- Apply title case transformation

**Example**: `tokyo-osaka-shinkansen` → "Tokyo Osaka Shinkansen"
