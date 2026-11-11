# Trip Transport GUI Checklist

Checklist nay chot nhung update can co trong GUI de review transport inventory tot hon.

## 1. Types

Update `PageRecord` de support:

- `transport_scope?: string`
- `transport_trip_stage?: string`
- `transport_affiliate_fit?: string`
- `transport_geo_scope?: string`
- `transport_risk_flags?: string[] | string`

## 2. Table Columns

Khong can dua het field transport len main table ngay.

Recommended add-able columns:

- `transport_scope`
- `transport_affiliate_fit`
- `transport_trip_stage`
- `transport_geo_scope`

Recommended first table for transport review:

1. `title`
2. `traffic`
3. `keyword_count`
4. `transport_affiliate_fit`
5. `transport_scope`
6. `transport_trip_stage`
7. `transport_geo_scope`
8. `geo_entity`

## 3. Filters

Can them vao Trip platform config:

- `transport_scope`
- `transport_trip_stage`
- `transport_affiliate_fit`
- `transport_geo_scope`

Optional later:

- `transport_risk_flags`

## 4. Presets

Recommended presets:

- `Transport High Fit`
- `Transport Review`
- `Domestic TW Risk`
- `Metro / Timetable / Parking`
- `Airport / Intercity`
- `Top Outbound Geo Transport`

## 5. Review Export

Trip Review CSV nen support:

- transport derived fields
- selected rows only
- optional Semrush bundle

Recommended transport export fields:

- `transport_scope`
- `transport_trip_stage`
- `transport_affiliate_fit`
- `transport_geo_scope`
- `transport_risk_flags`

## 6. Sorting Defaults

Transport review mode nen uu tien sort:

1. `traffic desc`
2. `keyword_count desc`

Neu build transport preset sau nay, co the them:

- secondary visual priority cho `transport_affiliate_fit`

## 7. UX Notes

Transport review khong nen overload main GUI.

Nen:

- reuse AdInsight page
- them filter/preset/column support
- uu tien selected export cho review voi ChatGPT

Khong nen:

- lam mot workspace moi
- show raw JSON o main table
- show qua nhieu transport flags o default view
