# Multi-Language Deduplication - CRITICAL CONCEPT

> [!IMPORTANT]
> **GLOBAL PRINCIPLE:** Same landing page in different languages = ONE database record with merged `languages` array.
> **HOWEVER:** The deduplication key strategy differs by URL type.
> - **Activity:** Uses `(platform, canonical_id)`
> - **Mobility/Blog:** Uses `(platform, sitemap_tag, sub_tag, slug)` (canonical_id="0")

## Core Principle

**Same landing page in different languages = ONE record with multiple languages**

Example:
- `https://www.klook.com/zh-HK/activity/1608-tour/` (Chinese HK)
- `https://www.klook.com/zh-TW/activity/1608-tour/` (Chinese TW)

These are **THE SAME landing page**, just translated. 

**Storage:** ONE database record with `languages: ["zh-HK", "zh-TW"]`

**Benefits:**
- Reduces duplicated data (critical for millions of URLs)
- Easier analytics (track one page, not N copies)
- Cleaner exports (one row per unique page)
- Better performance (fewer DB records)

---

## Understanding URL Patterns and canonical_id

### What is canonical_id?

**canonical_id** = The numeric ID extracted from URL path that identifies the same content across languages.

### URL Pattern Analysis

**Activity URLs:**
```
https://www.klook.com/zh-HK/activity/1608-private-tour/
                                    ^^^^ 
canonical_id = "1608"
slug = "private-tour"
```

**Mobility URLs:**
```
https://www.klook.com/zh-HK/europe-rail/1027-italy/
                                        ^^^^
canonical_id = "1027"  
slug = "italy"
sub_tag = "europe-rail"
```

> [!NOTE]
> **STRATEGY DECISION:** While mobility URLs *technically* contain IDs in the path (e.g., `1027-italy`), extracting them handles complex routes poorly (e.g., `23442-fukuoka/31594-oita`).
> **We use `canonical_id="0"` + `slug=Full Path` for ALL mobility URLs for robustness.**

### When is canonical_id = "0"?

**canonical_id="0"** = "No numeric ID found in URL pattern"

This happens when:
- URL has no `{id}-{name}` pattern
- URL uses pure slug: `/blog/travel-tips/` (no numeric prefix)
- Edge case URLs that don't follow standard patterns

**Example of TRUE canonical_id="0":**
```
https://www.klook.com/blog/travel-tips-italy/
                                    ^
No numeric ID → canonical_id = "0"
slug = "travel-tips-italy"
```

## Implementation Pattern

### Step 1: Define Deduplication Key

**Deduplication Key** = Unique identifier for the same content across languages

| URL Type | Has canonical_id? | Deduplication Key |
|----------|-------------------|-------------------|
| Activity | ✅ Yes (numeric) | `(platform, canonical_id)` |
| Mobility | ❌ No (canonical_id="0") | `(platform, sitemap_tag, sub_tag, slug)` |
| Hotel | ✅ Yes (numeric) | `(platform, canonical_id)` |
| Blog | ❌ No (canonical_id="0") | `(platform, sitemap_tag, slug)` |

**Rule:** If URL has numeric canonical_id → use it. Otherwise → use slug-based composite key.

> [!CAUTION]
> Never use `canonical_id="0"` as a dedup key! Always use composite key for these URLs.

### Step 2: Search for Existing Record

```python
# Example 1: Activity URL (has canonical_id)
search_filter = f"(platform='{platform_id}' && canonical_id='{canonical_id}')"

# Example 2: Mobility URL (no canonical_id)
search_filter = f"(platform='{platform_id}' && sitemap_tag='{sitemap_tag}' && sub_tag='{sub_tag}' && slug='{slug}')"
```

### Step 3: Merge or Create

**If record EXISTS:**
```python
# Get existing languages array
existing_langs = existing_record.get('languages', [])

# Add new language if not present
new_lang = item['language']  # e.g., "zh-TW"
if new_lang not in existing_langs:
    existing_langs.append(new_lang)
    
    # UPDATE: Only update languages field
    update_payload = {"languages": existing_langs}
    session.patch(f"{pb_url}/api/collections/pages/records/{record_id}", json=update_payload)
```

**If record DOES NOT exist:**
```python
# CREATE: New record with languages array
payload = {
    ...
    "language": item['language'],           # e.g., "zh-HK"
    "languages": [item['language']],        # e.g., ["zh-HK"]
    ...
}
session.post(f"{pb_url}/api/collections/pages/records", json=payload)
```

---

## Field Definitions

### `language` (Text) - DEPRECATED but kept for compatibility
- Single language code (e.g., `"zh-HK"`)
- **Usage:** Set to first discovered language
- **Note:** DO NOT use for queries - use `languages` array instead

### `languages` (JSON Array) - PRIMARY field
- Array of all language codes for this page (e.g., `["zh-HK", "zh-TW"]`)
- **Usage:** 
  - Filter: `languages ~ "zh-HK"` (contains check)
  - Display: Show all supported languages
  - Export: Know which languages available

---

## Common Pitfalls

### ❌ WRONG: Always create new records
```python
if canonical_id == "0":
    # Skip deduplication - always create
    session.post(...)  # ❌ Creates duplicates!
```

**Problem:** Each language creates a new record → duplicates!

### ✅ CORRECT: Always check for existing
```python
# Define appropriate dedup key based on URL type
if canonical_id != "0":
    search_filter = f"(platform='{pid}' && canonical_id='{cid}')"
else:
    # Use slug-based key for URLs without canonical_id
    search_filter = f"(platform='{pid}' && sitemap_tag='{tag}' && slug='{slug}')"

# Always search first
existing = search_for_record(search_filter)
if existing:
    merge_languages(existing, new_lang)  # ✅ Merge
else:
    create_new_record(item)  # ✅ Create
```

---

## Testing Multi-Language Import

### Test Scenario
1. Import zh-HK mobility URLs → Creates 681 records
2. Import zh-TW mobility URLs → Should UPDATE existing 681 records (merge languages)
3. Verify: NO new records created, all have `languages: ["zh-HK", "zh-TW"]`

### Verification Commands
```bash
# Check total records (should NOT increase after 2nd import)
curl "http://127.0.0.1:8090/api/collections/pages/records?filter=sitemap_tag='mobility'&perPage=1" | jq '.totalItems'

# Check languages array
curl "http://127.0.0.1:8090/api/collections/pages/records?filter=sitemap_tag='mobility'&perPage=3" | jq '.items[].languages'
```

### Expected Results
**After zh-HK import:**
```json
{
  "canonical_id": "0",
  "languages": ["zh-HK"],
  "slug": "1027-italy",
  "sub_tag": "europe-rail"
}
```

**After zh-TW import (SAME record updated):**
```json
{
  "canonical_id": "0",
  "languages": ["zh-HK", "zh-TW"],  // ← MERGED
  "slug": "1027-italy",
  "sub_tag": "europe-rail"
}
```

---

## Adding New URL Types - Checklist

When adding support for a new URL type (e.g., events, restaurants):

1. **Identify dedup key:**
   - [ ] Has canonical_id? → Use `(platform, canonical_id)`
   - [ ] No canonical_id? → Define slug-based key

2. **Update import script:**
   - [ ] Implement correct search filter
   - [ ] Always check for existing record
   - [ ] Merge languages if found
   - [ ] Create new if not found

3. **Test multi-language:**
   - [ ] Import language 1 (e.g., zh-HK)
   - [ ] Import language 2 (e.g., zh-TW)
   - [ ] Verify NO duplicates created
   - [ ] Verify `languages` array merged

4. **Document:**
   - [ ] Add URL pattern to this doc
   - [ ] Update deduplication logic section
   - [ ] Add to troubleshooting guide

---

## Performance Considerations

**For millions of URLs:**
- Indexing: Create DB index on dedup key fields
- Batch queries: Fetch existing records in bulk before processing
- Connection pooling: Reuse HTTP connections
- Parallel processing: Use ThreadPoolExecutor for API calls

**Trade-offs:**
- API import: Slower but safer (validation, error handling)
- SQL bulk insert: Faster but requires manual dedup logic
- **Recommendation:** API for < 100K records, SQL for > 100K
