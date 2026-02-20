# 🌍 Architecture of the Geo-Detection Engine

This document outlines the architectural logic and parsing priorities of our central `geo_engine.py`. It serves as a universal blueprint for identifying the geographic location (Country and City) of any e-commerce or travel URL slithering through our data pipelines.

**Goal:** Safely and accurately extract location data from localized URLs, avoiding "Lost in Translation" errors while ensuring high scalability across tens of thousands of records.

---

## 🏗️ The 3-Tier Geo Resolution Funnel

Our system does not rely on a single Point of Failure (like an API or a basic string check). Instead, it runs URLs through a cascading 3-tier funnel. If a URL fails one tier, it drops to the next.

### Tier 1: The Pristine Knowledge Base (JSON Dictionaries)
**Purpose:** Map brand-specific, cultural, or highly localized entities (e.g., "jr-pass", "usj", "shinkansen", "gangnam") that standard geographic libraries fail to recognize.

**Logic Priority: `Raw Slug` > `Translated Title`**
1. **Raw Slug First:** We ALWAYS check the original slug (`raw_slug`) against the JSON dictionaries first. Why? Because the slug is the "Raw Static Data" directly inputted by localized content creators. It guarantees 100% fidelity. `usj` in the slug is definitely Universal Studios Japan.
2. **The Danger of Translation:** We NEVER check the AI/Machine-translated English title (`title_en`) before the slug at this tier. A translation engine might randomly turn `shinkansen` into `bullet train` or `jr-pass` into `japan rail ticket`, completely destroying our ability to match the entity to a country.
3. **Fallback:** If the exact phrase isn't found in the Raw Slug, we *temporarily* peek at the `Translated Title` just in case the JSON KB was written exclusively in English and the translation happens to hit a match.

**Performance:** Dictionary matching (`"-" + phrase + "-" in string`) is lightning fast ($O(1)$) and supports thousands of keywords instantly.

---

### Tier 2: The Administrative Validators (Geonames & Pycountry)
**Purpose:** If a URL contains standard geographic names (provinces, cities, countries) rather than brand names, we use standard NLP parsing and offline libraries (`geonamescache`, `pycountry`) to resolve them.

**Logic Priority: `Slug & Title Dual-Wielding`**
1. **Slug First:** We parse the original slug word-by-word to see if it matches known cities like `bali` or `tokyo`.
2. **Translated Title as the Savior:** Many languages use localized names for foreign countries (e.g., in Indonesian, "Sweden" is "Swedia", "Croatia" is "Kroasia"). Standard GIS libraries only understand international English names. Therefore, if the Slug fails to yield a city/country, we **immediately parse the `Translated Title`**. The AI engine will have translated `Swedia` to `Sweden`, allowing `pycountry` to successfully catch it!

---

### Tier 3: The Audit Layer (Unknowns)
**Purpose:** What happens if both Tier 1 and Tier 2 fail?
1. **Do Not Delete:** We assign `Country="Unknown"`, but we **DO NOT** mark the record as `is_active=False` (unless it's informational junk). 
2. **The Human-in-the-loop (HITL):** We intentionally store these Unknown records in the database. Product Managers or Data Engineers can open the frontend UI, filter by "Unknown Country", and review the list.
3. **The Feedback Loop:** If an Engineer spots a recurring unknown phrase (e.g., `klia-ekspres` keeping popping up for Malaysia), they simply add it to `global_tourism_kb.json` (Tier 1). The system instantly becomes smarter for the next run.

---

## 🛠️ Implementation Rules for New Platforms
Whenever writing a new script for a new platform (e.g., Expedia, Agoda, Tiqets), follow this universal law:

```python
# Rule 1: Always extract the raw, unadulterated slug from the URL.
raw_slug = extract_slug(url)

# Rule 2: Derive the English translation for fallback mechanisms.
title_en = translate_cache.get(raw_slug)

# Rule 3: Pass BOTH to the engine. The Engine knows the priority.
country, city = geo_engine.detect_geo(slug=raw_slug, title_en=title_en)
```

By adhering to this guide, the Geo Engine remains completely decoupled from any specific platform's language quirks while expanding its Knowledge Base universally.
