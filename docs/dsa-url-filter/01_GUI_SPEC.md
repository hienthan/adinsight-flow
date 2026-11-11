# DSA URL Filter GUI Spec

## Purpose

`DSA URL Filter` la mot workspace moi de upload CSV chua search-driven URLs, enrich country bang logic co san, filter include/exclude theo country, review ket qua, va export CSV moi de toi uu DSA.

Feature nay la `temporary server processing`:

- khong insert PocketBase
- khong luu batch history o phase 1
- khong can source market/domestic-first workflow
- user ra quyet dinh chinh bang `Include Countries` va `Exclude Countries`

## Primary User Goal

User upload CSV nhu:

- `URL`
- `Headline`
- `Clicks`
- `Impressions`
- `Cost`
- `CTR`

Sau do tool:

1. parse va normalize file
2. detect `page_country` cho tung URL
3. cho phep loc bang 2 multi-select:
   - `Include Countries`
   - `Exclude Countries`
4. preview ket qua giu/loci
5. export CSV da filter

## Design Principles

- Giong pattern filter toolbar dang co o AdInsight, dac biet phan logical exclusion trong [`frontend/src/pages/AdInsight/InsightFilterBar.tsx`](/Users/hienthan/Developments/GoogleAds/crawler-demo/frontend/src/pages/AdInsight/InsightFilterBar.tsx)
- Reuse `MultiSelectDropdown` behavior tu [`frontend/src/components/common/MultiSelectDropdown.tsx`](/Users/hienthan/Developments/GoogleAds/crawler-demo/frontend/src/components/common/MultiSelectDropdown.tsx)
- Giao dien uu tien quyet dinh nhanh tren URL data that
- Khong lam thanh data management page
- De mo rong sau nay thanh session history, manual override, saved segment

## Route

Locked route:

- `/dsa-filter/url`

Forward-looking route group:

- `/dsa-filter/search-terms`
- cac feature processing khac se di cung namespace `dsa-filter/*`

## Page Structure

Page gom 5 zones:

1. Hero / Title
2. Upload + processing config
3. Summary cards
4. Filter toolbar
5. Results table + export bar

## 1. Hero / Title

### Header text

- Title: `DSA URL Filter`
- Subtitle: `Upload search-driven URLs, detect country, filter by include/exclude country, and export a cleaner DSA feed.`

### Hero badges

- `Temporary Session`
- `No PocketBase Insert`
- `Country Filter Workspace`

## 2. Upload Panel

### Purpose

Cho user upload CSV va kick off processing.

### Components

- File uploader
- CSV template note
- Optional platform dropdown
- Process button
- Replace file button sau khi da co session

### Fields

#### File

- label: `CSV File`
- accepts: `.csv`
- required: yes

#### Platform

- label: `Platform`
- type: single select
- default:
  - `Klook`
- reason:
  - de processor biet dung URL normalization rules nao

### Helper text

- Required column:
  - `URL`
- Supported optional columns:
  - `Headline`
  - `Clicks`
  - `Impressions`
  - `Cost`
  - `CTR`

### Actions

- primary button: `Process File`
- secondary button: `Download Template`

### UX states

- idle
- uploading
- processing
- processed
- error

### Processing feedback

Hien progress steps:

1. Uploading file
2. Parsing rows
3. Detecting countries
4. Building preview

## 3. Summary Cards

Sau khi process xong, show summary strip.

### Required cards

- `Total Rows`
- `Matched Countries`
- `Unknown`
- `Included Rows`
- `Excluded Rows`

### Recommended cards

- `Included Clicks`
- `Excluded Clicks`
- `Included Cost`
- `Excluded Cost`

### Top chips

- Top detected countries
- File name
- Processed at timestamp

## 4. Filter Toolbar

## Core Principle

Toolbar phai giong mental model cua AdInsight:

- filter chinh o hang dau
- exclusion filters o vung tach rieng
- multi-select country dropdown co search

Khac biet o feature nay:

- country la trung tam cua bai toan
- khong can source market/domestic logic trong UI phase 1

### Main Filters Row

Required filters:

- Search text
  - search trong `URL` va `Headline`
- Include Countries
  - multi-select
  - placeholder: `All Countries`
- Include Status
  - options:
    - `All`
    - `Included`
    - `Excluded`
- Classification
  - options:
    - `All`
    - `Matched`
    - `Unknown`

Recommended filters:

- Confidence
  - `All / High / Medium / Low`
- Has Clicks
  - toggle
- Has Cost
  - toggle

### Exclusion Row

Dung pattern exclusion section tu AdInsight.

Required exclusion filters:

- Exclude Countries
  - multi-select
  - placeholder: `No Exclusions`

Recommended exclusion filters:

- Exclude text
  - search term cho `URL` va `Headline`

### Country Filter Logic

#### Include Countries

- neu rong -> khong gioi han theo country
- neu co gia tri -> chi giu rows co `page_country` nam trong tap do

#### Exclude Countries

- neu co gia tri -> loai tat ca rows co `page_country` nam trong tap do

#### Conflict rule

Neu 1 country vua nam trong include vua nam trong exclude:

- `exclude` thang

UI can show warning badge:

- `Exclude overrides Include for overlapping countries`

#### Unknown behavior

- `Unknown` phai la 1 option rieng trong country dropdown neu co data unknown
- user co the include/exclude `Unknown` nhu 1 country option dac biet

### Quick Actions

Can co 1 cum nut thao tac nhanh:

- `Include All Matched`
- `Exclude Unknown`
- `Reset Filters`
- `Clear Country Filters`

Neu muon them 1 shortcut rat hop use case:

- `Outbound-style preset`
  - chi la shortcut set:
    - include = all matched countries tru cac country user muon loai
  - nhung preset nay la optional, khong dua vao MVP bat buoc

## 5. Results Table

### Purpose

Cho user review tung row da enrich va quyet dinh export.

### Required columns

- Include
  - checkbox per row
- Country
- Confidence
- URL
- Headline
- Clicks
- Impressions
- Cost
- CTR
- Reason

### Optional columns

- Normalized URL
- Matched By
- City

### Table behaviors

- sortable columns:
  - Country
  - Clicks
  - Impressions
  - Cost
  - CTR
  - Confidence
- sticky header
- row hover state
- virtualized rendering neu row lon

### Row color/badge system

- matched country: neutral/teal badge
- unknown: amber badge
- manually excluded row: muted state

### Row detail panel

Click row -> mo side drawer hoac inline expansion.

Show:

- original URL
- normalized URL
- detected country
- city neu co
- confidence
- matched by
- reason
- raw metrics
- include/exclude state

## Include / Exclude Semantics

Feature nay can co 2 lop include/exclude:

### Layer 1: Filter-level include/exclude

Sinh ra tu toolbar:

- `Include Countries`
- `Exclude Countries`

### Layer 2: Row-level include override

User co the tick bo tung row trong bang.

Final export rule:

- row chi duoc export khi:
  - pass toolbar filters
  - va `include = true`

Rules can chot:

- `Unknown` khong bi loai mac dinh
- neu user chi set `Exclude Countries = Thailand` thi `Unknown` van duoc giu lai va se di vao export neu row `include = true`
- row-level checkbox la lop quyet dinh cuoi cung de loai URL rac

## Export Bar

Nam sticky o cuoi page hoac tren table.

### Primary actions

- `Export Included Rows`

### Export behavior

Export phai reuse cung logic/mental model dang co o AdInsight:

- mo `Export Modal`
- user chon cac field se dua vao custom label
- user co the them custom suffix
- output format cuoi cung la:
  - `Page URL`
  - `Custom Label`

Feature nay khong can build export format rieng trong phase 1.

### Export source

Chi export:

- rows dang pass current filters
- va co `include = true`

### Export field suggestions

Field options trong modal nen uu tien:

- `Country`
- `City`
- `Classification`
- `Confidence`
- `Headline`

Neu co them field khac trong current session thi co the expose sau.

## Empty / Error States

### Empty before upload

- minh hoa nhe + text:
  - `Upload a CSV to start filtering URLs by country.`

### Empty after filters

- text:
  - `No rows match the current include/exclude country filters.`
- action:
  - `Reset Filters`

### Processing error

- show card do ro rang
- display:
  - row count parsed
  - first error message

## CSV Template Expectations

Input example:

```tsv
URL	Headline	Clicks	Impressions	Cost	CTR
https://www.klook.com/th/blog/top-destination-bangkok-thailand/	20 dia diem du lich Bangkok...	2.111	7.633	411.407,36	59.44%
https://www.klook.com/th/blog/trip-to-phuket/	Diem danh 10 dia diem...	628	2.373	127.131,40	59.52%
```

UI phai note ro:

- parser support locale number normalization
- parser co the convert:
  - `2.111` -> `2111`
  - `411.407,36` -> `411407.36`
  - `59.44%` -> `59.44`

## State Model

### Page-level state

- `sessionId`
- `fileName`
- `platform`
- `isProcessing`
- `summary`
- `rows`
- `countryOptions`
- `filters`
- `exportState`

### Filters state

- `searchTerm`
- `includeCountries`
- `excludeCountries`
- `classification`
- `confidence`
- `onlyIncluded`
- `excludeTerm`

## Session Persistence

Phase 1 target architecture:

- temporary session processing
- khong insert PocketBase
- khong luu lich su batch

Current implementation co the linh hoat trong workspace mien van giu UX va data model nay.

## Future-safe Extensions

GUI nay can de san cho:

- saved sessions
- compare 2 uploads
- manual country override
- saved filter presets
- export to page feed format
- per-platform URL parsing modes
- attach notes cho session

## MVP Checklist

- page moi cho DSA URL Filter
- route `/dsa-filter/url`
- upload CSV
- process on server
- detect country
- summary cards
- include country multi-select
- exclude country multi-select
- unknown option support
- row-level include checkbox
- results table
- export bang modal/label logic giong AdInsight

## Explicit Non-goals For Phase 1

- insert PocketBase
- batch history
- collaboration
- manual override persistence
- saved segment
- campaign analytics
- domestic/source-market-first workflow
