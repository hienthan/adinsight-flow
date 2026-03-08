URL CLASSIFIER ENGINE — FINAL BLUEPRINT v5

1. Purpose

Engine dùng để phân loại URL Traveloka (hoặc travel platform) trước khi feed vào Google Ads DSA page feed.

Engine không dự đoán traffic hay profit.
Google Ads sẽ quyết định phân phối.

Engine chỉ làm:
1. parse slug
2. detect geo entities (with legacy fallback)
3. detect search intent (with regex span deduplication)
4. calculate scores
5. output labels

⸻

2. Input

Input file: urls.txt
Ví dụ: https://www.traveloka.com/id-id/explore/destination/pura-uluwatu-bali

Engine extract: pura-uluwatu-bali

⸻

3. Engine Architecture (v5)

Pipeline:

URL
 ↓
slug extraction & normalize text
 ↓
tokenize
 ↓
remove stopwords
 ↓
spam check (exclude_keywords.json)  <-- NEW IN v5
 ↓
alias normalization
 ↓
geo entity detection
 ↓
geo legacy fallback (if entity count == 0) <-- NEW IN v5
 ↓
intent detection (with keyword & pattern logic)
 ↓
scoring
 ↓
classification output

⸻

4. Slug Processing Rules

Normalize:
- lowercase
- replace "-", "_", "/" with space
Example: Tanah-Lot → tanah lot

Tokenization:
- Split by space

Stopword Removal:
- Using geo_stopwords.json (e.g., wisata, tempat, pantai)

Spam/Trash Filtering:
- Using `exclude_keywords.json`.
- Rule: Iterate over excluded lists. If a token matches any excluded keyword, set `is_active = false`.
- CRITICAL: Do NOT skip calculation or return early. Continue running all subsequent engine steps exactly as if it was `is_active = true`. We need full metadata for logs and downstream debugging even if the URL is classified as spam.

⸻

5. Geo Entity Detection

Dataset location: geo_kb/
Files: part1_root_infrastructure.json ... part6_spiritual_commercial_roots.json, geo_alias_index.json, geo_stopwords.json

Matching Rules:
1. alias match
2. token combination match
3. canonical match
* longest entity match wins. Duplicate exclusions apply.

Geo Legacy Fallback (Critical Rule):
- If `entity_count == 0` (no entities detected by standard engine):
- Call placeholder `detect_geo_legacy(url)`
- Return fields strictly mapped to schema: `geo_entity`, `province`, `city`, `country`. 
- Set `geo_type = "legacy"`.
- Use placeholders for `detect_country_legacy()` and `get_canonical_id_legacy()`. Log outputs into their schema positions.

⸻

6. Geo Scoring

Entity scores:
core_area = 10
landmark = 9
transport_hub/system = 8
emerging_destination = 7
spiritual/commercial/iconic = 6

geo_score = max(entity_scores) (if entity_count ≥ 2, geo_score += 1)

⸻

7. Intent Detection (Intent-First Logic limit: Max Boost & Overlap protection)

System uses:
- intent_keywords.json
- travel_pattern_signals.json

Categories:
transport, planning, things_to_do, destination, information

Rule:
- keyword matches only ACTIVATE a category with its base score.
- pattern matches add a score boost with caps.
- Final intent is picked by `max(intent_score)`.
- Tie-breaker priority: transport > planning > things_to_do > destination > information.
- CRITICAL: Span Deduplication must use RegExp boundary replacement (`\b`) to prevent cutting words (e.g., `hari` inside `matahari`).

⸻

8. FinalScore Formula

FinalScore = IntentScore * 0.5 + GeoScore * 0.3 + PlanningSignal * 0.2
* Planning signal = 1 if cost keywords found (harga, biaya, budget, cost, estimate).

⸻

9. DSA Campaign Format

Rule: Campaign Keys must not use landmark-level data (prevents campaign explosion).
Format: {intent}_{geo_key}

geo_key logic:
if geo_type in [landmark, tourist_spot]: geo_key = province
if geo_type in [city, resort_area]: geo_key = city
if geo_type in [transport hub]: geo_key = geo_entity
else geo_key = province

Example: things_to_do_bali, transport_soekarno_hatta_airport.
