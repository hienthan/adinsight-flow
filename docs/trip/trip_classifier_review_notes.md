# Trip Classifier Review Notes

## Scope

These notes summarize both:

- first-pass classifier validation on small representative samples
- the later full-batch `trip_v2` review across all Trip Semrush source files

Source files:

- `trip.com-organic.PagesV2-hk-guideInfo-328.csv`
- `trip.com-organic.PagesV2-hk-guide-dest-606.csv`
- `trip.com-organic.PagesV2-hk-blog-6595.csv`
- `trip.com-organic.PagesV2-hk-travelGuide-dest-8859.csv`

The goal is to document what works, what still needs refinement, and what risks remain after the initial full import into PocketBase.

## What Looks Good

- pre-trip requirement pages are being classified correctly:
  - arrival card
  - entry permit
  - visa
  - power plug
  - baggage rules

- obvious junk pages are being excluded:
  - promo / coupon
  - campaign / news
  - customer-service / utility junk
  - non-content transactional URLs

- local short-haul geo detection improved significantly for:
  - Hong Kong local districts
  - Macau
  - Zhuhai
  - Shenzhen

- semrush signal hints are being attached in metadata without polluting core taxonomy.

## Current Sample Snapshot

From the latest 20-row review per pattern:

- `guide/info`
  - `active_rows = 14/20`
  - `active_unknown_geo = 7`
  - `active_weather = 6`

- `guide/destination`
  - `active_rows = 13/20`
  - `active_unknown_geo = 1`
  - local HK / Macau / Shenzhen / Zhuhai detection is much better controlled now

- `blog`
  - `active_rows = 8/20`
  - `active_unknown_geo = 7`
  - promo/news/local junk filtering is better, but generic blog pages still need more review

- `travel-guide/destination`
  - `active_rows = 18/20`
  - `active_unknown_geo = 3`
  - `active_high_transactional = 4`

Interpretation:
- `guide/destination` is the healthiest pattern right now
- `guide/info` still needs geo and utility-topic refinement
- `blog` still has weak/noisy active inventory
- `travel-guide/destination` still needs stronger destination geo coverage and more policy around high transactional-ratio rows

## Full-Batch Snapshot (`trip_v2`)

Latest full review output from `tmp/trip-review-full/aggregate_summary.json`:

- `rows_reviewed = 16,388`
- `active_rows = 15,796`
- `active_unknown_geo = 6,072`
- `active_weather = 368`
- `active_high_transactional = 907`
- `excluded_rows = 592`

Per file:

- `blog`
  - `rows_reviewed = 6,595`
  - `active_rows = 6,130`
  - `active_unknown_geo = 1,875`
  - `excluded_rows = 465`

- `guide/destination`
  - `rows_reviewed = 606`
  - `active_rows = 539`
  - `active_unknown_geo = 372`
  - `excluded_rows = 67`

- `guide/info`
  - `rows_reviewed = 328`
  - `active_rows = 298`
  - `active_unknown_geo = 220`
  - `excluded_rows = 30`

- `travel-guide/destination`
  - `rows_reviewed = 8,859`
  - `active_rows = 8,829`
  - `active_unknown_geo = 3,605`
  - `active_high_transactional = 687`
  - `excluded_rows = 30`

Interpretation:

- the classifier is stable enough to seed the GUI and support iterative review
- `travel-guide/destination` remains the biggest geo-coverage gap
- `guide/destination` and `guide/info` still need more alias coverage for zh destination and weather pages
- `blog` contains a lot of active generic content, so GUI filters will matter

Important:

- the full-batch snapshot above was produced before the 2026-04-27 relaxation of `local_daytrip` / `local_short_haul` activity rules
- do not treat `excluded_rows = 592` as the future baseline after the new rule lands

## Current Weak Spots

### 1. EN title generation is not true translation yet

Current title generation is improved by a new translation layer, but still not complete.

This works well for:
- `Thailand Arrival Card`
- `Taiwan Power Plug`
- `Taiwan Entry Permit Online Application`

It is weaker for:
- unknown Chinese place names
- generic info pages
- pages where geo is still unresolved

Implication:
- decoding slug is necessary
- translation to EN is useful and now supported through a cache-backed Trip translator
- but translation alone is not enough for accurate geo classification

Update on 2026-04-27:

- a real bug was confirmed in the translation cache flow
- CJK fallback output was previously being cached and reused as if it were valid EN translation
- `scripts/trip/lib/translation.py` was patched so unusable CJK fallback is no longer treated as success
- full live reclassification is still required before trusting GUI titles

### 2. Geo alias coverage for zh pages is still incomplete

Remaining misses come mostly from:
- Chinese city names not yet in alias map
- local landmarks / malls / districts
- region-level pages

Examples seen in sample review:
- `首爾天氣`
- `雲南氣溫`
- `世界之窗攻略`

### 3. ASCII travel-guide geo fallback is still incomplete

`travel-guide/destination` is much better for country hubs already in alias map, but many ASCII destinations still resolve to `unknown`.

Examples from full review:
- `jabl`
- `siberia`
- `sichuan`
- `anhui`
- `urumqi`
- `shaanxi`
- `yunnan`
- `nova-scotia`
- `jiuhua-mountain`
- `conghua-district`
- `pu-er`
- `guangxi`

Implication:
- a stronger ASCII geo resolver is still needed
- likely next step is a dedicated destination lexicon or structured geo KB for Trip

### 4. Some active unknown-geo pages are probably acceptable, others are not

There are still active pages with `geo_entity = unknown`.

This is acceptable temporarily for:
- generic utility topics
- some non-geo informational pages

This is not acceptable for:
- obvious destination pages
- weather pages with clear place names
- itinerary pages with obvious destinations

### 5. Weather remains intentionally active in some cases

Current logic does not hard-exclude weather.

This matches the spec, but it means:
- weather pages should be treated carefully later in scoring/export
- some may stay in inventory even if they should not be prioritized

## Recommended Next Fixes After Initial Import

1. Add a stronger Trip geo KB for:
- major Asia destinations
- Japan cities/areas
- China provinces/cities relevant to HK outbound
- common HK-local districts and attractions for exclusion

2. Keep the zh -> EN translation layer strict for GUI titles.
- This should follow the Klook pattern:
- decode slug
- translate to EN
- use translated text as one geo/topic input
- do not accept untranslated CJK fallback as a final GUI title

3. Add a second-pass review script that outputs:
- active unknown-geo rows
- active weather rows
- active local-risk rows
- active high transactional-ratio rows

4. Add GUI review flows or saved filters for:
- `is_active = true AND geo_entity = "unknown"`
- `content_type = "weather_info"`
- `pattern = "blog" AND is_active = true`
- high transactional-ratio rows from `semrush_metrics`

## Practical Conclusion

The classifier is now good enough to power a first Trip GUI inventory.

It is not final-quality taxonomy yet. The biggest remaining improvement area is geo coverage, especially for destination-heavy patterns and long-tail region/city slugs.

Latest decision update:

- local/daytrip/short-haul URLs should no longer be hard-excluded just because they are nearby
- since Trip has Semrush value signals and geo detection, these rows should stay active and be prioritized later by:
  - `market_fit`
  - `trip_mode_risk`
  - `readiness_hint`
  - `traffic`
  - `keyword_count`
