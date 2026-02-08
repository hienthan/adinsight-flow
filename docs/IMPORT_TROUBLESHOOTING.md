# Import Troubleshooting Guide

## Common Import Issues and Solutions

### Issue 1: Schema Validation Errors

**Symptom:**
```
❌ ERROR creating record (HTTP 400): {"data":{"content_type":{"code":"validation_invalid_value","message":"Invalid value mobility."}}}
```

**Root Cause:**
- Migration file exists but Pocketbase hasn't applied it yet
- Pocketbase server must be restarted to apply new migrations

**Solution:**
1. **Verify migration exists:**
   ```bash
   grep -r "mobility" pb_migrations/*.js
   ```
   
2. **Check if migration was created recently:**
   ```bash
   ls -lt pb_migrations/ | head -5
   ```

3. **Restart Pocketbase to apply migrations:**
   - Find the running Pocketbase process
   - Kill it (Ctrl+C or terminate process)
   - Restart: `pocketbase serve`
   - Migrations will auto-apply on startup

4. **Verify migration applied:**
   ```bash
   curl -s "http://127.0.0.1:8090/api/collections/pages" | \
     python3 -c "import sys, json; data=json.load(sys.stdin); \
     field=[f for f in data.get('schema',[]) if f.get('name')=='content_type']; \
     print(json.dumps(field[0] if field else {}, indent=2))"
   ```
   
   Should show "mobility" in the values array.

---

### Issue 2: Silent Import Failures (No Records Created)

**Symptom:**
- Import script says "Created: 681" 
- But no records appear in database
- No error messages shown

**Root Cause:**
- Script doesn't check HTTP response status codes
- API returns 400/500 but exception handling catches it silently

**Solution:**
1. **Add response validation** to import script:
   ```python
   resp = session.post(f"{pb_url}/api/collections/pages/records", json=payload)
   
   # Check response status
   if resp.status_code not in [200, 201]:
       error_detail = resp.text
       print(f"❌ ERROR (HTTP {resp.status_code}): {error_detail}")
       return ("ERROR", resp.status_code)
   ```

2. **Add result counting and logging:**
   ```python
   results = list(executor.map(upsert_record, data))
   
   create_count = sum(1 for r in results if r[0] == "CREATE")
   error_count = sum(1 for r in results if r[0] == "ERROR")
   
   print(f"✅ Created: {create_count}")
   print(f"❌ Errors: {error_count}")
   ```

---

### Issue 3: Deduplication Not Working for Mobility URLs

**Symptom:**
- Multiple imports create duplicate mobility records
- Languages not being merged properly

**Root Cause:**
- All mobility URLs have `canonical_id = "0"`
- Normal deduplication logic treats them as same entity

**Solution:**
**Use Slug-based Deduplication for Mobility (`canonical_id="0"`):**

```python
if canonical_id != "0":
    # STRATEGY 1: Activity URLs (Numeric ID)
    search_filter = f"(platform='{platform_id}' && canonical_id='{canonical_id}')"
else:
    # STRATEGY 2: Mobility/Blog (Full Path Slug)
    # Use composite key to find existing record
    search_filter = f"(platform='{platform_id}' && sitemap_tag='{sitemap_tag}' && sub_tag='{sub_tag}' && slug='{slug}')"

# Common Merge Logic
existing = search_record(search_filter)
if existing:
    merge_languages(existing)
else:
    create_new(item)
```

---

## Import Verification Checklist

After running import, always verify:

1. **Check import results:**
   ```bash
   python3 scripts/02_import_to_pb.py data/klook_mobility_zh-HK_preview.json klook
   ```
   Look for: `✅ Created: X`, `❌ Errors: 0`

2. **Query database directly:**
   ```bash
   curl -s "http://127.0.0.1:8090/api/collections/pages/records?filter=sitemap_tag='mobility'&perPage=5"
   ```

3. **Check sub_tag metadata created:**
   ```bash
   curl -s "http://127.0.0.1:8090/api/collections/platform_metadata/records?filter=type='sub_tag'"
   ```

4. **Verify in GUI:**
   - Navigate to `/adinsight/klook/zh-mobility`
   - Check sub_tag filter dropdown populated
   - Verify table shows records with sub_tag column

---

## General Tips

### Before Every Import:
1. **Check Pocketbase is running:** `ps aux | grep pocketbase`
2. **Verify JSON file exists:** `ls -lh data/klook_*_preview.json`
3. **Preview first record:** `head -50 data/klook_mobility_zh-HK_preview.json`

### After Schema Changes:
1. **Always restart Pocketbase** to apply migrations
2. **Check API response** to verify schema updated
3. **Test with single record** before bulk import

### Debugging:
1. **Enable verbose logging** in import script
2. **Check response status codes** not just exceptions
3. **Print first error** with full payload for debugging
4. **Use curl to test API** directly if script fails

---

## Quick Reference Commands

```bash
# Generate mobility data
python3 scripts/06_klook_mobility_ingest.py sitemap-sample/klook/mobility-urls.txt mobility zh-HK

# Import to PocketBase
python3 scripts/02_import_to_pb.py data/klook_mobility_zh-HK_preview.json klook

# Check records
curl -s "http://127.0.0.1:8090/api/collections/pages/records?filter=content_type='mobility'&perPage=1"

# Check schema
curl -s "http://127.0.0.1:8090/api/collections/pages"

# Restart Pocketbase
# Ctrl+C in terminal, then: pocketbase serve
```
