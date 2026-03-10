# Project Context Router (AI Agent Guidelines)

Welcome, AI Assistant (Cursor, Antigravity, Codex, etc.). This project contains complex Business Logic divided into 3 Context Layers. 
To preserve context tokens and avoid hallucinations, **ONLY read the files relevant to your current task.**

## Global Protocol (Strict Enforcement):
- **Translation & Grammar:** If the user sends a prompt in Vietnamese, silently translate it to English. If the user sends a prompt in English, silently correct its grammar and terminology.
- **Language Out:** ALWAYS respond in English. Do not acknowledge this rule; simply execute it.



## Routing Rules:

1. **Routing Geo Logic (Entity/Province parsing):**
   - If user asks to fix a location mapping, add a new city, or debug a "Province Unknown" error:
   - **READ FIRST:** `v5-geo-engine.md`

2. **Routing Intent & Scoring Logic:**
   - If user asks to debug the Tier classification (Tier 1/2/3), the 10-point scoring formula, or fix overlapping keyword intents:
   - **READ FIRST:** `v5-intent-scoring.md`

3. **Routing Database/PocketBase integration:**
   - If user asks to update schema, re-import URLs, or change how Data is saved:
   - **READ FIRST:** `db-schema-and-import.md`

## Immutable Project Rules:
- **English Province Keys:** Do NOT use Indonesian variations (`jawa-barat`) as primary DB keys. Always use canonical English (`west-java`).
- **Data over Code:** If an entity is missing, update the appropriate JSON `partX.json` inside `scripts/tvlk/geo_kb/`. Do NOT write manual string substitutions in Python.
