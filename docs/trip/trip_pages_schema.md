# Trip Pages Schema

This document defines the PocketBase collection contract for `trip_pages`.

The goal of this schema is:
- keep Trip URL inventory lean
- support Trip-specific classifier outputs
- preserve the most useful Semrush value signals
- reduce importer errors by keeping field types simple and stable

This schema is intentionally not responsible for:
- Google Ads custom labels
- campaign budget buckets
- final page-feed grouping logic

Those belong to later scoring/export steps.

## Collection Name

- `trip_pages`

## Design Principles

- use `url`, `number`, `bool`, and `json` only where strict typing adds clear value
- keep most taxonomy fields as `text` so the classifier can evolve without constant PocketBase schema churn
- store extra Semrush detail in `semrush_metrics`
- store future scorer/debug data in `metadata`

## Fields

| Field | Type | Required | Meaning |
|---|---|---:|---|
| `url` | `url` | yes | canonical Trip landing page URL |
| `title` | `text` | yes | English title used in GUI and exports |
| `language` | `text` | yes | market language such as `zh-HK` or `zh-TW` |
| `pattern` | `text` | yes | Trip URL pattern such as `blog`, `guide/destination`, `travel-guide/destination`, `guide/info` |
| `traffic` | `number` | no | Semrush traffic estimate |
| `traffic_pct` | `number` | no | Semrush traffic percentage within source export |
| `keyword_count` | `number` | no | Semrush number of ranking keywords |
| `traffic_change` | `number` | no | Semrush traffic delta |
| `semrush_metrics` | `json` | no | extra Semrush metrics not worth promoting to top-level columns |
| `country` | `text` | no | normalized destination country or `Unknown` |
| `city` | `text` | no | normalized destination city or `Unknown` |
| `geo_entity` | `text` | no | most useful travel entity for grouping and ad-copy |
| `geo_category` | `text` | no | geo type such as `country`, `city`, `airport`, `landmark`, `region`, `non_geo` |
| `topic_type` | `text` | no | Trip topic interpretation such as `entry_document`, `itinerary`, `airport_transport` |
| `intent_primary` | `text` | no | main user-need axis such as `travel_readiness`, `planning`, `destination_research`, `transport` |
| `content_type` | `text` | no | broad content bucket such as `requirements`, `planning_guide`, `destination_guide`, `utility_info` |
| `sub_tag` | `text` | no | finer classifier label such as `arrival_card`, `plug`, `budget`, `airport_to_city` |
| `readiness_hint` | `text` | no | semantic fit for a 7-day cookie window such as `high`, `medium_high`, `medium`, `low` |
| `remaining_commission_potential` | `text` | no | estimate of remaining hotel/flight capture potential |
| `post_booking_risk` | `text` | no | risk that the user has likely already booked |
| `trip_mode_risk` | `text` | no | risk that the traffic behaves like local/day-trip demand rather than hotel/flight-led travel |
| `market_fit` | `text` | no | heuristic fit for target market such as HK or TW |
| `is_active` | `bool` | no | operational flag for whether the URL should stay active in inventory |
| `metadata` | `json` | no | flexible space for scorer/debug/export-side data |
| `notes` | `text` | no | manual notes |

## Why These Fields Exist

### Required Core

- `url`
- `title`
- `language`
- `pattern`

These four fields are the minimum needed to:
- identify the record
- display it in GUI
- segment by market
- use pattern-aware classifier logic

### Top-Level Semrush Fields

The top-level Semrush fields are intentionally limited to:
- `traffic`
- `traffic_pct`
- `keyword_count`
- `traffic_change`

These are the most useful business-value signals for deciding which LPs deserve attention.

### `semrush_metrics`

Use `semrush_metrics` for extra source data such as:
- `traffic_info_top20`
- `traffic_commercial_top20`
- `traffic_navigational_top20`
- `traffic_transactional_top20`
- `positions_info_top20`
- `positions_commercial_top20`
- any future Semrush source columns that do not need first-class indexing

This keeps the schema lean while preserving auditability.

### Geo Fields

`country`, `city`, `geo_entity`, and `geo_category` are the main geo fields for Trip.

`province` is intentionally omitted because:
- it is not essential for Trip outbound/international guide logic
- it is more useful in domestic-market systems such as some Indonesia workflows

### Classifier Fields

The core classifier outputs are:
- `topic_type`
- `intent_primary`
- `content_type`
- `sub_tag`
- `readiness_hint`
- `remaining_commission_potential`
- `post_booking_risk`
- `trip_mode_risk`
- `market_fit`

These fields are semantic and reviewable.
They are intentionally separate from any future Google Ads export labels.

## Recommended Value Conventions

These are recommended vocabularies, not PocketBase-enforced enums.

### `geo_category`

Recommended values:
- `country`
- `city`
- `landmark`
- `airport`
- `station`
- `district`
- `region`
- `island`
- `mixed`
- `non_geo`

### `topic_type`

Recommended values:
- `entry_document`
- `visa`
- `airport_transport`
- `city_transport`
- `itinerary`
- `destination_guide`
- `cost_budget`
- `plug_voltage`
- `baggage_rule`
- `weather`
- `airline_ops`
- `generic_info`
- `local_daytrip`

### `intent_primary`

Recommended values:
- `travel_readiness`
- `planning`
- `destination_research`
- `transport`
- `travel_requirements`
- `general_info`

### `content_type`

Recommended values:
- `requirements`
- `transport_info`
- `planning_guide`
- `destination_guide`
- `utility_info`
- `weather_info`
- `airline_ops_info`
- `generic_info`

### `readiness_hint`

Recommended values:
- `high`
- `medium_high`
- `medium`
- `low`

### `remaining_commission_potential`

Recommended values:
- `high`
- `medium`
- `low`

### `post_booking_risk`

Recommended values:
- `low`
- `medium`
- `high`

### `trip_mode_risk`

Recommended values:
- `low`
- `medium`
- `high`

### `market_fit`

Recommended values:
- `high`
- `medium`
- `low`

## Indexes

Recommended indexes for `trip_pages`:

- unique index on `url`
- index on `language`, `pattern`
- index on `country`, `city`, `geo_category`
- index on `intent_primary`, `content_type`, `sub_tag`
- index on `topic_type`, `readiness_hint`, `is_active`

These indexes match the most likely GUI and review workflows without over-indexing.

## Importer Guidance

To reduce PocketBase import failures:

- always send `url` as a valid URL
- always send `title` as a plain string
- send `keyword_count` as integer-like numeric data
- send `traffic`, `traffic_pct`, and `traffic_change` as numbers
- send `is_active` as boolean
- send `semrush_metrics` and `metadata` as valid JSON objects
- for unknown geo values, prefer string `Unknown` instead of empty strings when the classifier explicitly failed to detect

## Non-Goals

The following should not be top-level fields in `trip_pages` right now:

- Google Ads custom labels
- DSA campaign labels
- final action such as `run`, `hold`, `exclude`
- batch-import metadata that is only useful during one import round

Those can be derived later from classifier outputs and Semrush value signals.
