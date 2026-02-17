# Traveloka URL Processing - Process Notes

## Context
- **Objective**: Process Traveloka (TVLK) URLs for Google Ads affiliate marketing.
- **Workflow**: Sitemap -> Extraction -> Suffix Analysis -> Enrichment -> DB Import.
- **Input Patterns**: `https://www.traveloka.com/id-id/explore/...`

## Logic & Rules
- **Suffix Significance**:
    - `-ta`: Travel Attraction / Activity (71.7%)
    - `-trp`: Trip / Tour / Transport (2.6%)
    - `-acc`: Accommodation (0.9%)
- **Translation Strategy**:
    - Prioritize `slug` translation to `title_en` if slug is informative.
    - Avoid `fetch_page_title` unless necessary (save tokens and avoid blocks).
- **Suffix Analysis**: Frequency analysis on 3325 URLs from `exp-activities.txt`.
- **Tier Classification**: 
    - Phân cấp Tier (1-5) dựa trên mức độ quan trọng và khả năng chuyển đổi. 
    - Hỗ trợ đa ngôn ngữ (English + Indonesian) trực tiếp trong script để tối ưu hiệu suất. Chi tiết bảng tra cứu tại [tvlk_taxonomy.md](file:///Users/hienthan/Developments/GoogleAds/crawler-demo/docs/tvlk/tvlk_taxonomy.md).

## Project Status
- [x] Sitemap URL extraction logic implemented (`tvlk_extract_urls.py`).
- [x] Frequency Analysis logic implemented (`tvlk_suffix_analysis.py`).
- [x] Database schema verification and testing.
- [x] Geo-detection refinement for Indonesia and regional markets.
    - [x] Created `tvlk_geo_kb.json` with 70+ locations.
    - [x] Updated `GeoEngine` to support multiple knowledge bases.
    - [x] Refined `GeoEngine` with stop-words to avoid false positives (e.g., "Anak").
- [x] Content Type Taxonomy proposal and implementation.
- [x] Full Enrichment and Import execution (`tvlk_enrich_and_import.py`).
    - [x] 3,325 records imported successfully.

## Bugs & Fixes
- **Bugs**:
    - *None.*
- **Fixes**:
    - [x] Added `title_en` field to `tvlk_pages` collection.
