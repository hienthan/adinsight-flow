# Trip Frontend GUI Spec V1

Spec nay chot mental model GUI cho `trip_pages`.

Muc tieu:

- reuse AdInsight workspace hien co
- review duoc inventory Trip theo logic classifier
- giu duoc Semrush value signals quan trong
- support 2 use case khac nhau:
  - review / cleanup classifier
  - export data cho ChatGPT va page feed workflow

Collection:

- `trip_pages`

## 1. Core Decision

Khong tao workspace moi.

Trip phai duoc add nhu mot platform moi trong:

- route `/adinsight/:platform`
- config `frontend/src/config/platforms.tsx`
- data hook `usePlatformAnalytics`
- filter bar `InsightFilterBar`
- table `InsightDataTable`
- export modal `InsightExportModal`

Ly do:

- Viator, Traveloka, Klook da dung chung mental model nay
- de maintain
- khong duplicate infra
- sau nay co the compare platform inventory trong cung 1 UI

## 2. Trip Mental Model

Trip khac cac platform con lai o 3 diem:

1. inventory den tu Semrush, khong phai sitemap/crawl
2. page value can duoc xem cung classifier taxonomy
3. 7-day cookie lam cho `readiness_hint` va Semrush intent signals quan trong hon binh thuong

Voi Trip, user khong review URL theo `campaign` truoc.

Thu tu review dung la:

1. `pattern`
2. `traffic` / `keyword_count`
3. `geo`
4. `content_type`
5. `readiness_hint`
6. `market_fit`
7. `is_active`

Nghia la Trip GUI phai giup tra loi nhanh:

- LP nao co volume cao nhat?
- LP nao classifier da bat sai geo?
- LP nao la high-readiness informational va dang worth feed?
- LP nao la broad destination content co the giu lai nhung de uu tien sau?

## 3. Platform Config

Them 1 config moi trong:

- `frontend/src/config/platforms.tsx`

De xuat:

- `id = "trip"`
- `name = "Trip.com"`
- `collection = "trip_pages"`
- `titleKey = "title"`
- `defaultSitemapTags = []`
- `metadataMode = "collection_distinct"`
- `activeFilterKey = "is_active"`

Trip khong can `sitemap_tag`.

## 4. Required Columns

Trip khong nen copy nguyen table cua Viator hay Traveloka.

### V1 Main Table

De xuat columns:

1. `title`
2. `pattern`
3. `traffic`
4. `keyword_count`
5. `traffic_change`
6. `geo_entity`
7. `location`
8. `content_type`
9. `readiness_hint`
10. `market_fit`

Giai thich:

- `title`
  - field user nhin nhieu nhat
  - click de mo LP goc

- `pattern`
  - rat quan trong cho Trip
  - giup review logic theo nguon Semrush:
    - `blog`
    - `guide/destination`
    - `guide/info`
    - `travel-guide/destination`

- `traffic`
  - signal kinh doanh quan trong nhat
  - phai show trong table, khong chi an trong export

- `keyword_count`
  - giup phan biet broad LP vs niche LP

- `traffic_change`
  - de user nhin LP dang len hay dang xuong

- `geo_entity`
  - field review classifier quan trong nhat

- `location`
  - dung `country + city`
  - co ich cho scan nhanh

- `content_type`
  - page taxonomy chinh

- `readiness_hint`
  - bat buoc phai show vi Trip co 7-day cookie

- `market_fit`
  - giup review destination fit cho HK/TW outbound

### V1 Optional Columns

Co the them sau khi GUI on dinh:

- `intent_primary`
- `topic_type`
- `sub_tag`
- `language`
- `country`
- `city`
- `traffic_pct`

### Khong nen show o main table v1

- `semrush_metrics`
- `metadata`
- `notes`

Nhung van phai co trong detail/export flow.

## 5. Required Filters

Trip can bo filter rieng, khong copy nguyen Viator/Klook.

### Bat buoc co trong v1

- `searchTerm`
  - label: `Search Title`
  - type: `text`

- `searchUrl`
  - label: `Search URL`
  - type: `text`

- `pattern`
  - label: `Pattern`
  - type: `select`
  - multiple: `true`
  - options:
    - `blog`
    - `guide/destination`
    - `guide/info`
    - `travel-guide/destination`

- `country`
  - label: `Country`
  - type: `datalist`
  - phai support `Unknown`

- `content_type`
  - label: `Content`
  - type: `select`
  - multiple: `true`

- `readiness_hint`
  - label: `Readiness`
  - type: `select`
  - multiple: `true`
  - options:
    - `high`
    - `medium_high`
    - `medium`
    - `low`

- `market_fit`
  - label: `Market Fit`
  - type: `select`
  - multiple: `true`
  - options:
    - `high`
    - `medium`
    - `low`

- `language`
  - label: `Lang`
  - type: `select`
  - options:
    - `all`
    - `zh-HK`
    - `zh-TW`

- `intent_primary`
  - label: `Intent`
  - type: `select`
  - multiple: `true`

### Rat nen co trong v1.1

- `topic_type`
  - de tach:
    - `entry_document`
    - `visa`
    - `plug_voltage`
    - `baggage_rule`
    - `airport_transport`
    - `weather`
    - `destination_guide`
    - `generic_info`

- `geo_entity`
  - type: `text`
  - rat huu ich cho review unknown geo / exact geo term

- `is_active`
  - select:
    - `all`
    - `active only`
    - `inactive only`

### Saved Review Views can co

Trip rat can saved filters/view presets:

- `All Active`
- `Unknown Geo`
- `Weather`
- `High Readiness`
- `Travel Guide Destination`
- `Blog Active`
- `Low Market Fit`

## 6. Required Frontend Support Changes

GUI hien tai chua support day du cac field Trip can.

Can update:

- `frontend/src/types/adinsight.ts`
- `frontend/src/pages/AdInsight/insightUtils.ts`
- `frontend/src/pages/AdInsight/InsightDataTable.tsx`
- `frontend/src/config/platforms.tsx`

### Add vao `PageRecord`

- `pattern`
- `traffic`
- `traffic_pct`
- `keyword_count`
- `traffic_change`
- `topic_type`
- `readiness_hint`
- `remaining_commission_potential`
- `post_booking_risk`
- `trip_mode_risk`
- `market_fit`
- `language`
- `semrush_metrics`

### Add vao `buildFilterString()`

Trip can filter duoc cac field nay:

- `pattern`
- `geo_entity`
- `topic_type`
- `readiness_hint`
- `market_fit`

Neu khong add vao `basicFields`, GUI Trip se bi thieu filter thuc chien.

### Add table render rules

Can co badge render rieng cho:

- `readiness_hint`
- `market_fit`
- `pattern`

Can co numeric formatting cho:

- `traffic`
- `keyword_count`
- `traffic_change`
- `traffic_pct`

## 7. Trip Export Logic

Trip can 2 loai export.

### A. DSA/Page Feed Export

Reuse modal hien co.

Field uu tien:

- `country`
- `city`
- `geo_entity`
- `intent_primary`
- `content_type`
- `sub_tag`
- `readiness_hint`
- `pattern`
- `title`

Ghi chu:

- Trip khong can `dsa_campaign` tu classifier core
- custom label/page feed grouping se duoc tinh o step sau

### B. Review / ChatGPT Export

Trip can them 1 secondary export mode khac voi page feed export.

Mode nay phai xuat CSV day du cho ChatGPT review.

Columns de xuat:

- `url`
- `title`
- `language`
- `pattern`
- `traffic`
- `traffic_pct`
- `keyword_count`
- `traffic_change`
- `country`
- `city`
- `geo_entity`
- `geo_category`
- `topic_type`
- `intent_primary`
- `content_type`
- `sub_tag`
- `readiness_hint`
- `market_fit`
- `is_active`

Neu can them:

- `metadata`
- `semrush_metrics`

Ly do:

- Trip can context Semrush de ChatGPT chia label / review page feed tot hon
- export hien tai cua AdInsight chua du cho use case nay

## 8. Bulk Actions

Trip co the reuse selection toolbar hien co, nhung chi nen cho:

- `Set Active`
- `Set Inactive`
- `Set Country = Unknown`

Khong can `tier` cho Trip.

Neu giu toolbar chung, Trip nen tat phan update `tier`.

## 9. What Not To Prioritize In V1

Khong nen lam trong vong dau:

- dashboard chart rieng cho Trip
- inline edit `metadata`
- inline edit `semrush_metrics`
- inline export theo `dsa_campaign`
- detail drawer qua phuc tap

V1 can tap trung vao:

- inventory review
- geo cleanup
- readiness review
- Semrush-led prioritization

## 10. Practical Recommendation

Neu phai chot nhanh GUI cho Trip, bo V1 nen la:

- add `trip` vao `platforms.tsx`
- them 10 main columns
- them filter cho `pattern`, `country`, `content_type`, `readiness_hint`, `market_fit`, `language`
- them saved views:
  - `Unknown Geo`
  - `High Readiness`
  - `Weather`
  - `Blog Active`
- giu export page feed
- them 1 nut `Export Review CSV` cho ChatGPT workflow

Day la bo GUI co gia tri thuc chien nhat cho Trip.
