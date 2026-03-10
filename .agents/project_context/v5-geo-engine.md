# V5 Geo-Engine Logic & Guidelines

**Goal:** Establish perfect mappings from URLs to `province` and `country` (id-id targeting: Indonesia).

## 1. Core Principles (DOs)
- **Regex Boundary Matching:** Always use `re.search(r'\b' + term + r'\b')` for geo matching. NEVER use substring `in` checks (prevents `nasi` matching inside `internasional`).
- **Safeguarded Parent Loop:** An entity's `parent` must eventually resolve to `indonesia` (defined in `part0_country.json`).
  - *Infinite Loop Rule:* You must use `seen_parents = set()` while walking up the tree to break on cyclic references.
- **English Province Keys:** All 38 Indonesian provinces in `part2_provinces.json` use **English Keys** (`west-java`, `north-sumatra`, `east-kalimantan`).
- **Alias Parent Resolution:** If resolving `parent_id` and `parent_id not in self.entities`, you MUST search `aliases` across all entities to find the true key. (e.g., if a file says `parent: "jawa-timur"`, you must correctly resolve it to `east-java`). 
- **Generic Fallback Islands:** Always maintain `java`, `sumatra`, `kalimantan`, `sulawesi`, `papua`, `maluku`, `nusa-tenggara` as type `island` and parent `indonesia` in `part2_provinces.json`. This catches lazy/generic data entries natively.

## 2. Anti-Patterns (NEVER DO THIS)
- **NEVER use Indonesian Province Keys:** Do NOT store `jawa-barat` as a key. Only store it in the `aliases` array.
- **NEVER hardcode ID fixes in Python:** If a URL maps to the wrong place, fix the JSON definition in `scripts/tvlk/geo_kb/partX*.json`. Do NOT add `if url == ...` in Python.
- **NEVER strip geographic prefixes blindly:** The stopwords list (`geo_stopwords.json`) MUST NOT strip `gunung`, `pulau`, `pantai`, or `danau`, because they are necessary for compound matching (e.g., `Gunung Kidul`).

## 3. The 4-Layer Hierarchy
`sub_area` / `landmark` -> `city` -> `province` -> `country` (Root: `indonesia`).
All data MUST successfully bridge back to `indonesia` to be considered a valid V5 parse.
