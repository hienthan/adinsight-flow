# DSA Search Terms Processing Logic

## Goal

Bien CSV search term rows thanh grouped URL workspaces co output ready for copy.

## Input Shape

Expected columns:

- `Search Term`
- `Translated Term`
- `Impressions`
- `Clicks`
- `Cost`
- `CTR (%)`
- `URL`
- `Headline`

## Processing Pipeline

1. read CSV file tren client
2. normalize headers
3. parse rows va bo row rong
4. validate row bat buoc
5. normalize URL
6. parse metrics
7. group rows theo normalized URL
8. build deduped term entries trong tung URL group
9. apply filters
10. render copy-ready output

## Header Normalization

Header compare theo lowercase + trim.

Supported aliases phase 1:

- `search term`
- `translated term`
- `impressions`
- `clicks`
- `cost`
- `ctr (%)`
- `ctr`
- `url`
- `headline`

## Required Row Validation

Row invalid neu:

- thieu `Search Term`
- thieu `URL`
- URL khong parse duoc thanh absolute URL

Invalid rows:

- khong dua vao grouping
- van duoc count trong summary
- co message error tong hop tren page

## URL Normalization

Normalize URL theo cac rule:

- trim whitespace
- parse bang `new URL`
- lowercase protocol + host
- remove query string
- remove hash
- bo trailing slash neu path khong phai root

Output dung `origin + pathname`.

### Platform hook

Phase 1 cho phep truyen `platform` de mo rong sau:

- locale path normalization
- host alias normalization
- canonicalization rule rieng

## Metric Parsing

Rules:

- strip commas
- parse float
- invalid metric -> `0`

Fields:

- `Impressions`
- `Clicks`
- `Cost`
- `CTR (%)`

## Grouping

Key grouping:

- `urlNormalized`

Moi group luu:

- normalized URL
- original URL dau tien
- preferred headline
- all source rows
- total clicks
- total impressions
- total cost
- average CTR

## Preferred Headline

Phase 1 rule:

- lay headline non-empty cua row co clicks cao nhat
- neu tat ca rong, fallback ve normalized URL

## Term Display Logic

Moi row sinh ra:

- `originalTerm`
- `translatedTerm`
- `displayTerm`

`displayTerm` phu thuoc `copy mode`:

- `translated-first`: `Translated Term` neu co, fallback `Search Term`
- `original-only`: luon dung `Search Term`
- `translated-only`: chi lay `Translated Term`, neu rong thi row khong sinh display term

## Term Deduplication

Neu `Dedup exact terms` bat:

- normalize term bang trim + collapse whitespace + lowercase
- gop cac rows co cung normalized display term trong cung 1 URL

Sau khi merge:

- cong don clicks / impressions / cost
- average CTR theo trung binh co trong so impressions
- gom source row count
- retain original va translated examples

Neu toggle tat:

- moi source row giu thanh 1 term item rieng

## Ranking

Default ranking phase 1:

1. clicks desc
2. impressions desc
3. cost desc
4. alphabetical asc

Supported group sort:

- total clicks
- total cost
- term count
- URL alphabet

## Filters

### Text search

Match tren:

- normalized URL
- headline
- original term
- translated term
- display term

### Exclude text

Loai term neu match:

- original term
- translated term
- display term

### Min thresholds

- min clicks ap tren term item
- min impressions ap tren term item

### URL-level visibility filters

- only groups con selected term
- only groups co tu 2 term tro len

## Selection Model

Moi URL group co selection rieng.

Default:

- tat ca term items duoc selected

User co the:

- tick / untick tung term
- select all trong group
- clear selection trong group

## Copy Output

Copy types:

- `Top N`
- `Selected`
- `All`

Clipboard text format:

- join bang newline
- bo item rong
- preserve current rendered order

## Summary Metrics

Page summary can tinh:

- total valid terms
- unique URLs
- ready URLs
- invalid rows
- total clicks
- total cost

`Ready URLs` la URL groups con it nhat 1 selected term sau khi ap filter.

## Non-goals Phase 1

- fuzzy dedup
- semantic grouping
- auto keyword cleaning theo intent
- saved view presets
- persistent sessions
