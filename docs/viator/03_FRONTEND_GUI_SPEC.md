# Viator Frontend GUI Spec V1

Muc tieu cua spec nay:

- mo ta cach add `viator` vao AdInsight workspace hien co
- chot columns, filters, export logic, va mental model cho GUI
- dam bao AI coder o context khac van de hieu, de maintain, de mo rong
- tranh build mot page moi neu AdInsight da co san pattern phu hop

Spec nay danh cho dataset trong collection:

- `viator_pages`

Va bam sat schema:

- `url`
- `title`
- `country`
- `city`
- `page_type`
- `intent_primary`
- `content_type`
- `is_private`
- `dsa_campaign`
- `dsa_adgroup`
- `classification_confidence`
- `rule_hits`
- `notes`

## 1. Core Decision

Khong tao mot workspace moi.

Viator phai duoc add nhu mot platform moi trong AdInsight hien co, reuse:

- route `/adinsight/:platform`
- toolbar/filter pattern
- table pattern
- export modal
- query/filter logic

Ly do:

- mental model da quen thuoc
- de maintain
- khong duplicate UI infra
- sau nay co the so sanh Viator voi TVLK/Klook theo cung mot framework

## 2. Platform Config

Can them 1 config moi trong:

- `frontend/src/config/platforms.tsx`

De xuat:

- `id = "viator"`
- `name = "Viator"`
- `collection = "viator_pages"`
- `titleKey = "title"`
- `defaultSitemapTags = ["products"]`

Ghi chu:

- Viator hien tai khong can `sitemap_tag` nhu Klook/TVLK
- nhung vi AdInsight page dang ky vong co `defaultSitemapTags`, co the de 1 value placeholder
- khong nen co filter `sitemap_tag` cho Viator trong v1

## 3. Viator Mental Model

Voi Viator, filter trung tam khong phai `country` don le.

Mental model dung la:

1. `country`
2. `page_type`
3. `city`
4. `intent_primary`
5. `content_type`
6. `is_private`

Ly do:

- cung 1 country co the co rat nhieu `product`, `ticket`, `ttd`
- neu user chi filter `country = france`, GUI se show tat ca LP cua France
- viec phan biet de review/export phai dua vao `page_type`

Vi du:

- `country = france` + `page_type = product`
- `country = france` + `page_type = ticket`
- `country = france` + `page_type = ttd`

Day la use case cuc ky quan trong va phai duoc support ro rang trong GUI.

## 4. Required Filters

Viator v1 can co cac filter sau:

### `searchTerm`

- label: `Search Title`
- type: `text`
- search tren field `title`

### `excludeTerm`

- label: `Exclude Title`
- type: `text`
- search exclusion tren field `title`

### `country`

- label: `Country`
- type: `datalist`
- phai support `Unknown`

Ghi chu:

- `Unknown` la 1 gia tri quan trong cho review
- khong duoc an `Unknown` trong dropdown

### `page_type`

- label: `Page Type`
- type: `select`
- multiple: `true`

Options:

- `All`
- `product`
- `ticket`
- `ttd`

Day la filter hang 1, khong phai filter phu.

### `city`

- label: `City`
- type: `text` hoac `datalist`

De xuat v1:

- dung `text`

Ly do:

- city cua Viator rat da dang
- co nhieu destination/region/island/place chua canonical hoa hoan toan
- dropdown city full list o v1 se noisy va kho maintain

### `intent_primary`

- label: `Intent`
- type: `select`
- multiple: `true`

Options:

- `All`
- `things_to_do`
- `ticket`
- `day_trip`
- `multi_day`
- `transport`
- `cruise`
- `food`
- `show`
- `private_tour`

### `content_type`

- label: `Content Type`
- type: `select`
- multiple: `true`

Options:

- `All`
- `tour`
- `ticket`
- `destination_hub`
- `day_trip`
- `multi_day`
- `transfer`
- `cruise`
- `food_tour`
- `show`
- `private_tour`

### `is_private`

- label: `Private`
- type: `select`

Options:

- `All`
- `Private Only`
- `Non-Private`

Rule:

- `Private Only` -> `is_private = true`
- `Non-Private` -> `is_private = false`

Ghi chu:

- day la filter rat huu ich cho Viator vi inventory private rat nhieu
- GUI khong duoc suy dien private; chi doc field classifier da ghi

### `dsa_campaign`

- label: `Campaign`
- type: `text` hoac `select`

De xuat v1:

- dung `text contains`

Ly do:

- campaign key cua Viator co the rat nhieu gia tri
- khong nen hardcode option list trong config

### `classification_confidence`

- label: `Confidence`
- type: `select`

Options:

- `All`
- `high`
- `medium`
- `low`

Rule de map:

- `high` = `>= 0.85`
- `medium` = `>= 0.70 && < 0.85`
- `low` = `< 0.70`

Neu AdInsight filter engine chua support numeric-range select trong v1:

- co the tam hoan field nay khoi toolbar
- nhung van show trong table

## 5. Filters We Should Not Add in V1

Khong them cac filter sau trong ban dau:

- `source_file`
- `sitemap_tag`
- `language`
- `province`
- `sub_tag`
- `funnel_stage`
- `tier`

Ly do:

- khong lien quan schema Viator
- gay nhieu noise
- lam AI coder de copy sai config tu Klook/TVLK

## 6. Required Columns

Viator table can hien cac cot sau:

1. `title`
2. `country`
3. `city`
4. `page_type`
5. `intent_primary`
6. `content_type`
7. `is_private`
8. `dsa_campaign`
9. `classification_confidence`

De xuat config columns:

- `Title`
- `Country`
- `City`
- `Page Type`
- `Intent`
- `Content Type`
- `Campaign`
- `Confidence`

## 7. Optional Secondary Columns

Chi hien khi can debug:

- `dsa_adgroup`
- `notes`
- `rule_hits`

De xuat:

- khong dua `rule_hits` vao main table v1
- neu can thi show trong detail drawer/expand row hoac hover tooltip

Ly do:

- `rule_hits` rat huu ich cho debug
- nhung qua on ao neu dua thang vao bang chinh

## 8. Sorting

Default sort cho Viator:

- `country asc`
- sau do `city asc`

Neu chi chon 1 field duoc:

- default `country`

Sort user co the doi:

- `country`
- `city`
- `page_type`
- `intent_primary`
- `content_type`
- `classification_confidence`

## 9. Active Filter Behavior

Khong dung `activeFilterKey` cho Viator.

Khac voi:

- Klook: `include_for_dsa`
- Traveloka: `is_active`

Viator v1 khong co field equivalent trong schema.

Nghia la:

- tat ca rows deu duoc show
- user review/filter tren top cua full dataset

## 10. Export Logic

Export phai reuse modal dang co o AdInsight.

### Viator export fields can ho tro

- `country`
- `city`
- `page_type`
- `intent_primary`
- `content_type`
- `is_private`
- `dsa_campaign`
- `dsa_adgroup`
- `title`

### Recommended default export labels

Cho DSA page feed, custom labels nen co:

- `geo={country}`
- `city={city}` neu city != `Unknown`
- `ptype={page_type}`
- `intent={intent_primary}`
- `ctype={content_type}`
- `campaign={dsa_campaign}` hoac bo qua neu da dung ten campaign ngoai he thong

### Important rule

Neu user filter:

- `country = france`
- `page_type = ticket`

thi export chi duoc lay tap con da filter.

Khong duoc export toan bo France rows.

## 11. Unknown Handling

GUI phai coi `Unknown` la first-class state.

### Required behavior

- `Unknown` phai xuat hien trong country filter
- `Unknown` phai xuat hien trong city filter neu dung datalist sau nay
- table rows `country = Unknown` nen co visual treatment ro rang

De xuat:

- neutral amber badge cho `Unknown`

### Why this matters

Unknown rows la backlog review quan trong de mo rong `geo_overrides`.

Neu an hoac bo qua Unknown trong GUI, classifier se khong co feedback loop.

## 12. Suggested Visual Treatment

### Main row

- `page_type` dung badge
- `intent_primary` dung badge
- `content_type` dung badge nhe
- `classification_confidence` hien theo:
  - text + subtle color

### Examples

- `product` = blue badge
- `ticket` = amber badge
- `ttd` = violet/neutral badge

Confidence:

- high = green
- medium = amber
- low = red/rose

Chi la visual suggestion. Khong duoc tao mot visual system moi lech khoi AdInsight.

## 13. Filter Logic Notes for AI Coder

Can cap nhat `buildFilterString` de support field Viator sau:

- `country`
- `city`
- `page_type`
- `intent_primary`
- `content_type`
- `dsa_campaign`

Ghi chu quan trong:

- `dsa_campaign` nen dung contains match (`~`) thay vi exact match khi search tu input text
- `country`, `page_type`, `intent_primary`, `content_type` co the dung exact match
- `searchTerm` va `excludeTerm` phai dung field `title`

## 14. Platform Metadata

Neu can dropdown country cho Viator nhanh va on dinh, co 2 huong:

1. reuse `platform_metadata`
2. query distinct values truc tiep tu `viator_pages`

Best practice:

- v1 co the query distinct values tu collection nho nay
- khi du lieu scale lon, moi can backfill `platform_metadata` cho Viator

Khong can them metadata cache ngay neu chua can.

## 15. Recommended Initial Config Shape

AI coder nen aim mot config gan nhu:

```ts
viator: {
  id: 'viator',
  name: 'Viator',
  collection: 'viator_pages',
  titleKey: 'title',
  defaultSitemapTags: ['products'],
  columns: [
    { header: 'Title', key: 'title', width: '26%' },
    { header: 'Country', key: 'country', width: '10%' },
    { header: 'City', key: 'city', width: '12%' },
    { header: 'Page Type', key: 'page_type', width: '10%' },
    { header: 'Intent', key: 'intent_primary', width: '10%' },
    { header: 'Content Type', key: 'content_type', width: '12%' },
    { header: 'Campaign', key: 'dsa_campaign', width: '14%' },
    { header: 'Confidence', key: 'classification_confidence', width: '8%' }
  ]
}
```

Note:

- day la direction spec
- coder co the dieu chinh width nho
- nhung khong duoc doi field semantics

## 16. Future Expansion

Khi Viator scale them:

1. them `domestic_us` spec rieng
2. them review drawer cho `rule_hits`
3. them bulk actions cho unknown geo review
4. them metadata cache cho dropdowns

Khong nen lam tat ca ngay tu v1.

## 17. Final Implementation Rule

Neu co xung dot giua UI convenience va classifier semantics:

- uu tien semantics cua data

Cu the:

- `page_type` la filter trung tam cua Viator
- `Unknown` phai duoc giu lai de review
- GUI khong duoc tron `ticket`, `ttd`, `product` thanh mot nhom review mo ho
