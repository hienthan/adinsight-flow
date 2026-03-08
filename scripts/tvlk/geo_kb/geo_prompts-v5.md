PROMPT: Build URL Classifier Engine v5

You are a senior backend engineer.

Your task is to build a modern, intent-driven, rule-based URL classifier engine for travel URLs. The engine processes URLs and prepares them to be uploaded into Google Ads DSA page feeds. It replaces legacy components while incorporating strict fallbacks in case of missing data.

The implementation must be clean, deterministic, modular, heavily commented, and production-ready Python. Use pure functions and type hinting. Implement robust code that does not crash on edge cases.

⸻

1. Input
The function accepts a raw string URL: (e.g., `https://www.traveloka.com/id-id/explore/destination/pura-uluwatu-bali`)
Engine mainly extracts the slug `pura-uluwatu-bali`.

⸻

2. Core Pipeline
The software pipeline MUST follow this specific execution order:

1. URL Slug Extraction & Normalization
2. Tokenization & Stopwords Removal
3. Spam/Trash Checking (exclude_keywords.json)
4. Alias Normalization
5. Geo Entity Detection (Dictionary KB)
6. Geo Legacy Fallback (If no entities found)
7. Intent Detection (Keywords + Patterns)
8. Campaign Grouping Assignment
9. Schema Formulation

⸻

3. Spam/Trash Checking (CRITICAL)
Use `exclude_keywords.json`.
- After tokenization, iterate over the dict to see if any token matches an excluded keyword exactly.
- If it does, set `is_active = False` on the final output schema.
- IMPORTANT: Set the flag but DO NOT early return. The pipeline must continue computing Geo and Intent logic completely, so logs/data are complete.

⸻

4. Geo Entity Detection & Legacy Playbook
Implement geo detection using the provided `geo_kb/` JSON files (parts 1 to 6).
Rule: Longest exact match wins. Duplicate deduplication applies. Output distinct canonical entities only.

Legacy Fallbacks:
- If standard geo detection outputs zero entities (`entity_count == 0`), you MUST invoke a fallback function: `detect_geo_legacy(url)`.
- `detect_geo_legacy` should be a clean placeholder function leaving `# TODO` notes but returning a mocked dictionary containing keys: `geo_entity`, `province`, `city`, `geo_type` (which should be set specifically to `"legacy"`).
- Add placeholders for `get_canonical_id_legacy(url)` and `detect_country_legacy(url)`. Their return values should also map strictly to the final database schema fields.

⸻

5. DSA Campaign Grouper (`dsa_campaign`)
Campaign names must NOT use landmarks (to prevent DSA budget explosion).
Logic: `{primary_intent}_{geo_key}`

Geo_Key rules:
- if geo_type in ["landmark", "tourist_spot"]: use `province`
- if geo_type in ["city", "resort_area"]: use `city`
- if geo_type in ["airport", "station", "transport_hub"]: use `geo_entity`
- else use `province`.

⸻

6. Output Schema Mapping
Final output must be a unified dictionary matching PocketBase expectations exactly.
Include boolean `is_active`, strings `country`, `province`, `city`, `geo_entity`, `intent_primary`, `infra_type`, `dsa_campaign`, and numerics `intent_score`, `geo_score`, `entity_count`.
Use arrays for debugging fields: `slug_tokens`, `detected_patterns`, `detected_keywords`.

⸻

Write the FULL, working code covering all routing files (`engine.py`, `geo.py`, `spam.py`, etc.).
Do not summarize. Provide all functions explicitly.
