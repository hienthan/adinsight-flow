# Trip Cookie 7 Days Classifier Specs

## Goal

This spec defines the classification logic for Trip content URLs sourced from Semrush.

Primary objective:
- identify landing pages that can seed Trip cookies inside a 7-day attribution window
- prioritize pages where the user is still early enough to be influenced, but close enough to travel for the cookie to matter

Secondary objective:
- avoid broad low-value traffic
- avoid strong post-booking topics
- avoid local/day-trip traffic with weak hotel/flight upside
- keep classifier output stable even if campaign structure changes later

This spec is intentionally split into 2 layers:
- classifier truth
- scoring/export logic

The classifier must not make campaign-structure decisions directly.

## Key Principle

For Trip, the main question is not:

- is this page TOFU or MOFU?

The main questions are:

- is the user likely to travel soon enough for a 7-day cookie to matter?
- is there still meaningful remaining commission potential?
- is this topic too late in the journey because the user has likely already booked?
- is this traffic broad and cheap, or near-trip and valuable?

## Data Source Assumptions

Trip URLs are sourced from Semrush, not from sitemap discovery.

Current high-value source patterns:
- `blog`
- `guide/destination`
- `travel-guide/destination`
- `guide/info`

The classifier should treat `pattern` as a first-class signal.

## Required Inputs

### URL and Page Inputs

- `url`
- `pattern`
- `language`
- `title_source_text`

Notes:
- `title_source_text` is the best available readable source before EN title generation. In practice this may come from slug-derived text or source title text.
- final stored `title` should be EN title for GUI use, but classification can use raw source text before EN normalization.

### Semrush Value Inputs

These are worth keeping because they help prioritize which LPs are worth exploiting:

- `Traffic`
- `Traffic (%)`
- `Number of Keywords`
- `Traffic Change`

### Semrush Intent Inputs

These should be kept as supporting signals, not as hard truth:

- `Traffic with informational intents in top 20`
- `Traffic with commercial intents in top 20`
- `Traffic with navigational intents in top 20`
- `Traffic with transactional intents in top 20`
- `Positions with informational intents in top 20`
- `Positions with commercial intents in top 20`

`navigational` and `transactional` position fields can be retained in `semrush_metrics` if available, but they are not core classifier inputs.

## Storage-Level Fields

These are the fields that matter for Trip inventory and later review.

### Core Identity

- `url`
- `title`
- `language`
- `pattern`

### Semrush Value Signals

- `traffic`
- `traffic_pct`
- `keyword_count`
- `traffic_change`
- `semrush_metrics`

### Geo and Taxonomy

- `country`
- `city`
- `geo_entity`
- `geo_category`
- `topic_type`
- `intent_primary`
- `content_type`
- `sub_tag`

### Lightweight Operational Fields

- `is_active`
- `metadata`

## Boundary Between Classifier and Scoring

### Classifier Truth

The classifier is responsible for:

- geo detection
- topic classification
- intent classification
- content taxonomy
- readiness interpretation
- market-fit interpretation
- post-booking risk interpretation

The classifier should output stable semantic fields, not campaign-specific instructions.

### Scoring / Export Logic

The scorer can use:

- Semrush traffic/value signals
- ratio features
- market rules
- downstream ads constraints

The scorer may later produce:

- priority score
- custom labels
- export groupings

These should not be part of the classifier's core truth.

## Classifier Output Fields

These are the recommended semantic outputs.

### Geo

- `country`
  - normalized country if detectable
  - `Unknown` only if the page is truly broad or geo could not be resolved

- `city`
  - normalized city if detectable
  - `Unknown` allowed

- `geo_entity`
  - the most relevant travel entity for ad-copy and grouping
  - examples: `taiwan`, `tokyo`, `narita-airport`, `south-korea`, `victoria-harbour`

- `geo_category`
  - controlled taxonomy:
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

### Topic

- `topic_type`
  - the strongest business interpretation of the page topic

Recommended initial values:
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

### Intent and Content Taxonomy

- `intent_primary`
  - main user-need axis for grouping

Recommended initial values:
- `travel_readiness`
- `planning`
- `destination_research`
- `transport`
- `travel_requirements`
- `general_info`

- `content_type`
  - broad page-content bucket

Recommended initial values:
- `requirements`
- `transport_info`
- `planning_guide`
- `destination_guide`
- `utility_info`
- `weather_info`
- `airline_ops_info`
- `generic_info`

- `sub_tag`
  - finer taxonomy layer
  - examples:
  - `arrival_card`
  - `entry_permit`
  - `airport_to_city`
  - `metro`
  - `jr_pass`
  - `plug`
  - `power_bank`
  - `budget`
  - `itinerary_3d2n`
  - `weather_monthly`

## Readiness and Risk Interpretation

These fields should exist as semantic interpretations, not as final ads decisions.

### `readiness_hint`

Purpose:
- estimate whether the query/page is likely to matter inside a 7-day cookie window

Recommended values:
- `high`
- `medium_high`
- `medium`
- `low`

Important:
- this is not the same as transaction intent
- highly informational pages can still be `high` readiness if they solve urgent pre-trip friction

### `remaining_commission_potential`

Purpose:
- estimate whether the user may still generate hotel/flight value for Trip after landing on this topic

Recommended values:
- `high`
- `medium`
- `low`

Important:
- do not confuse travel closeness with commission potential
- a page can be close to departure but still have low remaining commission potential

### `post_booking_risk`

Purpose:
- estimate whether the user has likely already completed the main hotel/flight booking decision

Recommended values:
- `low`
- `medium`
- `high`

Examples:
- `entry_document` may be `medium`
- `baggage_rule` may be `high`
- `airline_ops` is often `high`

### `trip_mode_risk`

Purpose:
- estimate whether the traffic is closer to local leisure or day-trip behavior than hotel/flight-led travel

Recommended values:
- `low`
- `medium`
- `high`

Typical high-risk examples:
- local Hong Kong leisure
- Macau same-day traffic
- Shenzhen same-day traffic
- Zhuhai same-day traffic

### `market_fit`

Purpose:
- estimate whether the destination/topic is structurally relevant for the target market such as `zh-HK` or `zh-TW`

Recommended values:
- `high`
- `medium`
- `low`

Important:
- this should not be hardcoded as a fragile destination allowlist
- use it as a market heuristic, not a permanent truth table

## Pattern Interpretation Rules

Pattern is a strong signal, but must not determine the final label by itself.

### `guide/destination`

Default tendency:
- stronger than broad destination hubs
- often useful for planning or destination research

Typical default:
- `topic_type = destination_guide` unless stronger keywords override
- `readiness_hint = medium` by default

### `travel-guide/destination`

Default tendency:
- broader destination exploration
- more TOFU risk than focused article pages

Typical default:
- `topic_type = destination_guide`
- `readiness_hint = medium` or `low` unless clear planning/travel-readiness signals exist

### `guide/info`

Default tendency:
- highest variance pattern
- can contain hidden gold or low-value generic info

Typical rule:
- never exclude this pattern broadly
- classify by topic

### `blog`

Default tendency:
- broadest pattern
- more likely to contain generic inspiration, seasonal, or soft planning content

Typical rule:
- lower default confidence
- rely more heavily on topic keywords and geo clarity

## Topic Interpretation Rules

These are practical guidance rules, not rigid score cards.

### `entry_document` / `visa`

Examples:
- arrival card
- entry permit
- visa
- immigration form

Expected interpretation:
- `readiness_hint = high`
- `remaining_commission_potential = medium`
- `post_booking_risk = medium`

Reasoning:
- strong near-trip urgency
- very useful for 7-day cookie
- but not automatically high remaining hotel/flight upside

### `plug_voltage`

Examples:
- plug
- socket
- voltage
- adapter

Expected interpretation:
- `readiness_hint = high`
- `remaining_commission_potential = low` or `medium`
- `post_booking_risk = medium`

Reasoning:
- close to departure
- strong urgency signal
- weaker direct evidence of unbooked travel inventory

### `baggage_rule`

Examples:
- luggage
- carry-on
- checked baggage
- power bank on plane

Expected interpretation:
- `readiness_hint = high`
- `remaining_commission_potential = low` or `medium`
- `post_booking_risk = high`

Reasoning:
- urgent and near departure
- often too late for hotel/flight capture

### `airport_transport`

Examples:
- airport to city
- airport express
- airport transport

Expected interpretation:
- `readiness_hint = high`
- `remaining_commission_potential = medium`
- `post_booking_risk = medium`

Reasoning:
- strong trip certainty
- still not safe to assume hotel/flight decision is unmade

### `city_transport`

Examples:
- metro
- train
- JR pass
- bus

Expected interpretation:
- `readiness_hint = medium_high`
- `remaining_commission_potential = medium`
- `post_booking_risk = medium`

### `itinerary`

Examples:
- itinerary
- 3 days 2 nights
- free-and-easy plan
- travel guide with day counts

Expected interpretation:
- `readiness_hint = medium_high`
- `remaining_commission_potential = high`
- `post_booking_risk = low` or `medium`

Reasoning:
- often closer to decision-making while still early enough to influence hotel/flight choice

### `destination_guide`

Examples:
- attractions
- best places
- what to do
- destination guide

Expected interpretation:
- `readiness_hint = medium`
- `remaining_commission_potential = medium`
- `post_booking_risk = low`

Reasoning:
- useful demand pool
- but broader and less urgent

### `cost_budget`

Examples:
- travel cost
- budget
- expenses
- prices

Expected interpretation:
- `readiness_hint = medium_high`
- `remaining_commission_potential = high`
- `post_booking_risk = low` or `medium`

Reasoning:
- often close to trip consideration and still pre-booking

### `weather`

Examples:
- weather
- temperature
- season

Expected interpretation:
- `readiness_hint = low` or `medium`
- `remaining_commission_potential = low`
- `post_booking_risk = low`

Reasoning:
- may be useful for discovery
- usually too broad or too early for strong 7-day-cookie value

### `airline_ops`

Examples:
- online check-in
- boarding pass
- flight change

Expected interpretation:
- `readiness_hint = high`
- `remaining_commission_potential = low`
- `post_booking_risk = high`

Reasoning:
- very close to travel
- usually too late for core hotel/flight capture

### `local_daytrip`

Examples:
- same-day Macau
- Shenzhen local leisure
- local Hong Kong outing content

Expected interpretation:
- `readiness_hint = low`
- `remaining_commission_potential = low`
- `trip_mode_risk = high`

Reasoning:
- usually weak fit for hotel/flight-led Trip monetization

## How Semrush Signals Should Be Used

Semrush intent fields are useful, but they are supporting evidence only.

They should not define taxonomy directly.

### Most Valuable Semrush Fields

Top value signals:
- `Traffic`
- `Number of Keywords`
- `Traffic Change`
- `Traffic (%)`

Important supporting intent signals:
- `Traffic with informational intents in top 20`
- `Traffic with commercial intents in top 20`

### Why Informational and Commercial Traffic Both Matter

For Trip, many valuable LPs are not strongly commercial in the Semrush sense.

Examples:
- entry documents
- arrival cards
- airport transport
- plug/voltage pages

These may be mostly informational, but still very strong for 7-day-cookie seeding.

Therefore:
- high informational traffic is not bad by default
- commercial traffic should be treated as a positive booster signal
- commercial traffic should not be used as a hard gate

### Recommended Ratio Features

The scorer may derive:

- `informational_ratio = info_traffic / traffic`
- `commercial_ratio = commercial_traffic / traffic`
- `navigational_ratio = navigational_traffic / traffic`
- `transactional_ratio = transactional_traffic / traffic`

These ratios should be used softly.

Recommended interpretation:
- high informational ratio can still be excellent if the topic has deadline pressure
- moderate commercial ratio is a good positive sign
- high navigational ratio is often lower-value
- high transactional ratio may mean late-stage or expensive traffic, but is not an auto-exclude

## Exclusion Rules

Only a few exclusions should be hard.

### Hard Exclusions

- language does not match target market
- wrong Trip market domain for the intended feed
- obvious non-content or transactional utility URLs such as:
  - `/hotels/`
  - `/flights/`
  - `/searchresult`
- homepage or generic root page
- topic clearly classified as:
  - `local_daytrip`
  - `customer_service`
  - `login`
  - `refund`
  - `review`
  - `map_only`

### Soft Exclusions / Downranks

These should usually be scorer decisions, not classifier exclusions:

- weather
- generic broad destination pages
- airline ops
- high navigational traffic
- high post-booking risk topics

## What the Classifier Should Not Do

The classifier should not:

- produce final Google Ads custom labels
- decide campaign budgets
- decide page feed segmentation for every account structure
- hardcode a fragile destination allowlist as permanent truth
- use Semrush ratio thresholds as rigid pass/fail gates

## Recommended Review Questions

When reviewing classifier behavior later, use these questions:

- is the topic genuinely useful inside a 7-day cookie window?
- is the page still early enough to influence hotel/flight behavior?
- is this a local/day-trip topic disguised as travel?
- is the page broad but still strategically useful because of high-value destination demand?
- is the classifier over-relying on Semrush intent labels instead of page meaning?

## Next Layer After Classifier

Once classifier output is stable, a second-layer scorer/exporter can decide:

- priority score
- page-feed inclusion
- custom labels
- test vs core buckets
- market-specific export variants for `zh-HK` and `zh-TW`

That second layer should reference this spec, but should not redefine the classifier truth.
