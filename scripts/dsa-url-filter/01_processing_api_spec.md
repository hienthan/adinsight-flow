# DSA URL Filter Processing and API Spec

## Purpose

Tai lieu nay chot logic xu ly tam thoi cho feature `DSA URL Filter`.

Feature nay thuoc nhom:

- upload CSV
- temporary server processing
- reuse URL geo detection logic co san
- khong insert PocketBase
- khong luu lich su batch o phase 1

## Scope

Server nhan CSV, parse tung row, detect country cho URL, enrich dataset, tra ve session tam thoi de UI filter theo country va export.

Trung tam bai toan:

- `include countries`
- `exclude countries`

Khong lay `source market` lam logic chinh trong phase nay.

## Suggested Files Under This Folder

- `process_upload.py`
  - parse CSV + enrich rows
- `export_session.py`
  - export filtered rows
- `session_store.py`
  - temp session helpers
- `README.md`
  - run instructions

Phase hien tai chi chot spec; implementation file names co the theo list tren.

## Processing Pipeline

1. upload CSV
2. validate file type and row count
3. parse CSV header
4. map supported columns
5. normalize values
6. normalize URL
7. detect country/city using existing logic
8. enrich each row with metadata
9. aggregate summary
10. save session data to temp storage
11. return `session_id`, summary, first page of rows, filter options

## Input CSV Contract

### Required column

- `URL`

### Supported optional columns

- `Headline`
- `Clicks`
- `Impressions`
- `Cost`
- `CTR`

### Tolerant parsing rules

Need support values nhu:

- `2.111` -> `2111`
- `7.633` -> `7633`
- `411.407,36` -> `411407.36`
- `59.44%` -> `59.44`

Neu parser gap gia tri khong parse duoc:

- giu raw value
- set normalized numeric field = `null`
- add warning vao row

## Row Output Model

Moi row sau khi enrich:

```json
{
  "row_id": 1,
  "url_original": "https://www.klook.com/th/blog/top-destination-bangkok-thailand/",
  "url_normalized": "https://www.klook.com/th/blog/top-destination-bangkok-thailand/",
  "headline": "20 dia diem du lich Bangkok khong the bo lo - Klook Blog",
  "clicks_raw": "2.111",
  "clicks": 2111,
  "impressions_raw": "7.633",
  "impressions": 7633,
  "cost_raw": "411.407,36",
  "cost": 411407.36,
  "ctr_raw": "59.44%",
  "ctr": 59.44,
  "page_country": "Thailand",
  "page_city": "Bangkok",
  "classification": "matched",
  "confidence": "high",
  "matched_by": "geo_engine",
  "reason": "Detected Thailand from slug tokens",
  "include": true,
  "warnings": []
}
```

## Country Detection Logic

## Core Rule

Khong dua vao CSV metrics de detect country.

Detect theo URL:

1. normalize URL
2. extract path and slug
3. apply platform heuristics
4. call existing geo detection logic
5. map result thanh:
   - `page_country`
   - `page_city`
   - `confidence`
   - `matched_by`
   - `reason`

## Reuse Existing Logic

Prefer reuse cac logic co san trong repo, dac biet:

- geo resolution flow documented in [`docs/architecture_geo_engine_logic.md`](/Users/hienthan/Developments/GoogleAds/crawler-demo/docs/architecture_geo_engine_logic.md)
- URL parsing / slug extraction rules da co theo platform

Khuyen nghi implementation:

- tach 1 adapter cho DSA URL Filter
- adapter goi den existing geo engine thay vi viet detection moi

## Classification

Phase 1 chi can 2 nhom:

- `matched`
- `unknown`

Trong do:

- `matched` = detect duoc country
- `unknown` = khong detect duoc country

Domestic/outbound khong la axis chinh trong feature nay.

## Include Default Rule

Sau khi enrich:

- `matched` -> `include = true`
- `unknown` -> `include = true`

Ly do:

- include/exclude that su duoc quyet dinh bang toolbar filters
- khi user chi `exclude Thailand` thi `Unknown` van phai duoc giu lai

Rule nay duoc lock:

- `default_include_unknown = true`

## Filter Semantics

Filters duoc tinh tren server khi UI fetch rows, hoac tren client neu dataset nho. Khuyen nghi:

- phase 1: server-side filter for consistency and easier export

### Supported filters

- `search_term`
- `include_countries`
- `exclude_countries`
- `include_status`
- `classification`
- `confidence`
- `exclude_term`

### Include countries rule

- empty -> no restriction
- non-empty -> keep rows with `page_country` in selected list

### Exclude countries rule

- remove rows with `page_country` in selected list

### Overlap rule

Neu 1 country nam trong ca include va exclude:

- exclude wins

### Unknown rule

- unknown duoc bieu dien bang string `Unknown`
- `Unknown` xuat hien trong country option list neu session co unknown rows
- `Unknown` khong bi loai mac dinh neu user exclude mot country cu the

### Include status rule

- `All` -> bo qua include flag
- `Included` -> chi lay rows `include = true`
- `Excluded` -> chi lay rows `include = false`

## Summary Model

Server can tra summary:

```json
{
  "total_rows": 1200,
  "matched_rows": 1084,
  "unknown_rows": 116,
  "included_rows": 1084,
  "excluded_rows": 116,
  "included_clicks": 5321,
  "excluded_clicks": 441,
  "included_cost": 812345.44,
  "excluded_cost": 63542.21,
  "top_countries": [
    { "country": "Thailand", "count": 412 },
    { "country": "Japan", "count": 233 }
  ]
}
```

`included_rows` va `excluded_rows` nen duoc tinh lai theo current filter state.

## Temporary Session Model

Moi upload tao 1 session tam thoi:

```json
{
  "session_id": "dur_20260322_abcd1234",
  "platform": "klook",
  "file_name": "th-dsa-urls.csv",
  "created_at": "2026-03-22T10:25:00Z",
  "expires_at": "2026-03-22T11:25:00Z",
  "row_count": 1200,
  "country_options": ["Japan", "South Korea", "Thailand", "Unknown"]
}
```

## Storage Strategy

Khuyen nghi luu o temp files:

- root: `/tmp/dsa-url-filter/`
- 1 session = 1 folder

Session contents:

- `rows.json`
- `summary.json`
- `meta.json`
- exported csv files neu can

## TTL

- default: 60 minutes

Cleanup:

- xoa session het han khi:
  - process moi bat dau
  - export xong co the giu lai den het TTL
  - hoac co cleanup command rieng

## Suggested API Shape

Neu project co backend layer rieng, goi y cac endpoint:

### `POST /api/dsa-url-filter/sessions`

Upload va process file.

Request:

- multipart form-data
  - `file`
  - `platform`

Response:

```json
{
  "session_id": "dur_20260322_abcd1234",
  "summary": {},
  "country_options": [],
  "rows": [],
  "warnings": []
}
```

### `GET /api/dsa-filter/url/sessions/:id`

Lay session data va rows voi filters.

Query params:

- `search_term`
- `include_countries`
- `exclude_countries`
- `include_status`
- `classification`
- `confidence`
- `exclude_term`
- `page`
- `per_page`
- `sort`

### `POST /api/dsa-filter/url/sessions/:id/rows/include`

Required endpoint vi phase 1 da chot co row-level include/exclude checkbox.

Body:

```json
{
  "row_ids": [1, 4, 8],
  "include": false
}
```

### `GET /api/dsa-filter/url/sessions/:id/export`

Export CSV theo filter state hien tai va logic modal giong AdInsight.

Query params:

- `search_term`
- `include_countries`
- `exclude_countries`
- `include_status`
- `classification`
- `confidence`
- `exclude_term`
- `fields`
- `custom_label`
- `file_name`

## Export Rules

Export phai reuse logic dang co o AdInsight:

- output columns:
  - `Page URL`
  - `Custom Label`
- dynamic labels build tu field list user chon trong modal
- custom suffix neu co se append vao cuoi label

Suggested field mappings:

- `page_country` -> `geo=`
- `page_city` -> `city=`
- `classification` -> `class=`
- `confidence` -> `confidence=`
- `headline` -> human-readable text label, sanitized giong title export o AdInsight

## Sorting and Paging

Rows can lon, nen support:

- server pagination
- server sorting

Supported sort keys:

- `page_country`
- `clicks`
- `impressions`
- `cost`
- `ctr`
- `confidence`

## Error Handling

### File-level errors

- missing file
- unsupported extension
- missing `URL` column
- empty CSV
- row limit exceeded

### Row-level warnings

- invalid URL
- number parse failed
- country unknown

Row-level warning khong duoc lam fail ca session, tru khi file parse hong hoan toan.

## Security and Limits

- max file size: khuyen nghi 10MB phase 1
- max rows: khuyen nghi 20k phase 1
- reject executable files
- sanitize filename

## Suggested CLI / Internal Script Interface

Neu script duoc goi noi bo thay vi direct web handler:

```bash
python3 scripts/dsa-url-filter/process_upload.py \
  --input /tmp/upload.csv \
  --platform klook \
  --session-id dur_20260322_abcd1234
```

Export:

```bash
python3 scripts/dsa-url-filter/export_session.py \
  --session-id dur_20260322_abcd1234 \
  --include-countries "Japan|South Korea" \
  --exclude-countries "Thailand" \
  --fields "page_country|classification|headline" \
  --custom-label "url-filter"
```

## Phase 1 Decisions Locked By This Spec

- no PocketBase insert
- no batch history
- no source market driven UX
- include/exclude country la trung tam
- route group la `dsa-filter/*`
- reuse existing geo detection logic
- temporary session storage
- server-side processing
- row-level include toggle bat buoc
- export logic giong AdInsight modal

## Decisions Already Verified

- route: `/dsa-filter/url`
- future namespace: `/dsa-filter/search-terms`
- file limit target: `10MB / 20k rows`
- unknown default include: `true`
- row-level include toggle: `yes`
