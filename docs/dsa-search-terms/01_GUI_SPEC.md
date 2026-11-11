# DSA Search Terms GUI Spec

## Purpose

`DSA Search Terms` la mot workspace local-only de upload CSV search terms, group theo landing page URL, va tao term sets ready for copy de support Google Ads RSA.

Feature nay follow tinh than cua `DSA URL Filter`:

- khong insert PocketBase
- khong can backend processing
- khong luu batch history o phase 1
- user thao tac va copy output truc tiep trong GUI

## Primary User Goal

User upload CSV theo template:

- `Search Term`
- `Translated Term`
- `Impressions`
- `Clicks`
- `Cost`
- `CTR (%)`
- `URL`
- `Headline`

Sau do tool:

1. parse file ngay tren client
2. normalize URL
3. group search terms theo LP URL
4. dedup va rank terms trong tung group
5. cho phep loc, review, va copy term list san sang cho RSA

## Design Principles

- Reuse visual language cua [`frontend/src/pages/DSAFilter/UrlFilterPage.tsx`](/Users/hienthan/Developments/GoogleAds/crawler-demo/frontend/src/pages/DSAFilter/UrlFilterPage.tsx)
- Giu toolbar va cards theo mental model cua namespace `dsa-filter/*`
- Giao dien uu tien `review -> copy`
- Khong bien thanh data management page
- Khong can manual persistence o phase 1

## Route

- `/dsa-filter/search-terms`

Route nay song song voi:

- `/dsa-filter/url`

## Page Structure

Page gom 5 zones:

1. Hero / Title
2. Upload panel + processing options
3. Summary cards
4. Filter toolbar
5. Grouped URL results + copy section

## 1. Hero / Title

### Header text

- Title: `Search Terms Mapper`
- Subtitle: `Upload search terms, group them by landing page URL, and copy high-signal term sets for RSA workflows.`

### Hero badges

- `Local Processing`
- `No PocketBase Insert`
- `/dsa-filter/search-terms`

## 2. Upload Panel

### Purpose

Cho user import CSV va build workspace local.

### Components

- File uploader
- Template note
- Optional platform dropdown
- Toggle options cho processing
- Download template button
- Reset workspace button

### Fields

#### File

- label: `CSV File`
- accepts: `.csv`
- required: yes

#### Platform

- label: `Platform`
- default:
  - `Klook`
- optional future:
  - `Traveloka`

### Helper text

- Required columns:
  - `Search Term`
  - `URL`
- Supported columns:
  - `Translated Term`
  - `Impressions`
  - `Clicks`
  - `Cost`
  - `CTR (%)`
  - `Headline`

### Actions

- primary button: `Upload CSV`
- secondary button: `Template`
- tertiary button: `Reset`

### UX states

- idle
- parsing
- processed
- error

## 3. Summary Cards

Sau khi parse xong, show summary strip.

### Required cards

- `Terms`
- `URLs`
- `Ready URLs`
- `Invalid Rows`

### Recommended helpers

- total clicks
- total cost
- active copy mode
- imported file name

## 4. Filter Toolbar

## Core Principle

Toolbar giong pattern hien co:

- row 1 cho include / refinement
- row 2 cho exclusion / output mode / utility actions

### Main Filters Row

Required filters:

- Search text
  - search tren `URL`, `Headline`, `Search Term`, `Translated Term`
- URL contains
- Min clicks
- Min impressions
- Sort by
  - `Clicks`
  - `Cost`
  - `Terms count`
  - `URL`

### Secondary Controls Row

Required controls:

- Copy mode
  - `Translated first`
  - `Original only`
  - `Translated only`
- Top N terms
- Toggles:
  - `Dedup exact terms`
  - `Only URLs with selected terms`
  - `Only URLs with 2+ terms`
- Exclusion text
  - remove term neu match search / translated text

## 5. Results Section

### Layout

Ket qua la danh sach card theo URL.

Moi URL card show:

- normalized URL
- headline
- total terms
- selected terms
- total clicks / impressions / cost
- top term preview

### Actions per card

- `Copy Top N`
- `Copy Selected`
- `Copy All`
- `Expand Terms`
- `Select All`
- `Clear`

### Expanded terms table

Moi row hien:

- checkbox
- term display text
- original term
- translated term
- clicks
- impressions
- cost
- source row count

### Empty states

- truoc khi import: `Upload a CSV to map search terms by landing page URL.`
- khi filter khong con ket qua: `No URL groups match the current filters.`

## Copy UX

Copy la output chinh cua feature.

### Copy formats phase 1

- `Top N`: lay top terms theo ranking hien tai
- `Selected`: lay cac term dang duoc tick
- `All`: lay toan bo terms da qua filter trong URL group

### Clipboard format

Mac dinh:

- one term per line

Vi du:

```text
Yufuin no Mori
Tau Yufuin no Mori
ve tau Yufuin no Mori
lich trinh Yufuin no Mori
```

## Phase 1 Non-goals

- semantic clustering
- session persistence
- backend processing
- manual edit va save override
- export JSON / PB sync
