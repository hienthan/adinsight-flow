# Trip Transport Pattern Spec V1

Spec nay chot logic rieng cho pattern:

- `guide/transport`

Muc tieu:

- review va score cac transport LP cua Trip cho affiliate Google Ads
- giam rui ro feed nham cac URL transport noi dia / utility / in-trip qua TOFU
- giu du inventory co volume cao de review voi ChatGPT truoc khi chay DSA / RSA

Spec nay la layer bo sung sau classifier core.

No khong thay the:

- geo detection
- title translation
- topic/content classification

No dung de danh gia:

- transport URL nay co thuc su worth test cho Trip cookie 7 days hay khong

## 0. Boundary Rules

Layer nay phai co boundary rat ro:

- chi apply cho `pattern = guide/transport`
- khong duoc anh huong logic classifier/scorer cua:
  - `blog`
  - `guide/destination`
  - `guide/info`
  - `travel-guide/destination`
- cac field transport chi co nghia khi row la transport row
- voi non-transport rows, cac field transport nen de:
  - empty string
  - `unknown`
  - hoac `[]`

Khong duoc dung field transport de lam drift logic chung cua Trip inventory.

## 1. Business Context

Trip cookie chi 7 ngay.

Vi vay, `guide/transport` co 2 mat:

- co nhieu LP co volume cao, rat co gia tri
- cung co rat nhieu LP noi dia / utility / ops, affiliate value thap

Neu chi dua vao:

- `traffic`
- `keyword_count`
- `geo`
- `content_type`

thi van chua du.

Can mot layer rieng de tach:

- transport co kha nang gan booking / gan arrival / gan chuyen di
- transport mang tinh noi dia / in-trip / utility

## 2. Core Principle

Khong phai moi transport page deu tot cho Trip.

Transport pages worth test nhat thuong la:

- airport transfer
- airport to city
- intercity route den destination lon
- station / airport pages gan top outbound geos
- route pages support y dinh di chuyen truoc hoac ngay dau den noi

Transport pages rui ro nhat thuong la:

- metro map
- timetable
- parking
- local commute
- terminal ops
- route utility thuần noi dia

## 3. Input Signals

Layer transport phai danh gia tren cac input sau:

- `url`
- `pattern`
- `source_text`
- `translated_source_text`
- `title`
- `country`
- `city`
- `geo_entity`
- `geo_category`
- `topic_type`
- `content_type`
- `sub_tag`
- `traffic`
- `keyword_count`
- `traffic_change`
- `semrush_metrics`

Signals quan trong nhat:

- slug decoded
- title EN generate tu slug decoded
- geo detect
- semrush info / commercial / navigational / transactional mix

## 3.1 Market / Domain Notes

Transport rows co the den tu:

- `tw.trip.com`
- `hk.trip.com`

Hai domain nay khong nen bi coi la cung mot intent boi canh.

Recommended interpretation:

- `tw.trip.com`
  - co the la TW market content inventory
  - nhieu URL se nghieng ve domestic utility / local transport

- `hk.trip.com`
  - co the la HK user dang tim ve transport cua destination
  - nhung cung co the la HK user dang o destination va search in-trip utility

Vi vay:

- domain chi la mot signal context
- khong duoc dung domain lam hard truth
- phai ket hop voi:
  - slug decoded
  - translated title
  - geo detect
  - transport scope
  - transport trip stage

## 4. New Transport-Specific Fields

De xu ly transport tot hon, nen them cac field derived sau cho `trip_pages`.

### `transport_scope`

Loai transport page o muc nghiep vu.

Recommended values:

- `airport_transfer`
- `airport_general`
- `airport_to_city`
- `intercity_route`
- `cross_border_route`
- `city_transit`
- `metro_map`
- `timetable`
- `station_guide`
- `parking`
- `ferry_route`
- `rail_pass`
- `unknown`

### `transport_trip_stage`

Page nay gan voi giai doan nao cua journey.

Recommended values:

- `pre_trip`
- `arrival_immediate`
- `in_trip`
- `local_utility`
- `unknown`

### `transport_affiliate_fit`

Muc phu hop affiliate cua transport page.

Recommended values:

- `high`
- `medium`
- `low`

### `transport_geo_scope`

Cho biet page la transport o level nao.

Recommended values:

- `top_outbound_geo`
- `destination_city`
- `domestic_tw`
- `local_city`
- `cross_border_short_haul`
- `unknown`

### `transport_risk_flags`

Danh sach risk flags de review/export.

Recommended values:

- `domestic_tw`
- `local_commute`
- `map_only`
- `timetable_only`
- `parking_only`
- `airport_ops_only`
- `in_trip_utility`
- `high_navigation_bias`
- `weak_commercial_signal`
- `unknown_geo`

Nen luu dang:

- JSON array

neu PB/GUI khong muon show array o table chinh, co the flatten o export.

Recommended storage convention:

- non-transport rows:
  - `transport_scope = ""`
  - `transport_trip_stage = ""`
  - `transport_affiliate_fit = ""`
  - `transport_geo_scope = ""`
  - `transport_risk_flags = []`

## 5. Interpretation Logic

### Group A: Strong candidates

Nen uu tien cao:

- `airport_to_city`
- `airport_transfer`
- `intercity_route`
- `cross_border_route`
- `station_guide` gan top geo outbound

Signal thuong gap:

- `transport_trip_stage = pre_trip` hoac `arrival_immediate`
- `transport_affiliate_fit = high` hoac `medium`
- co `geo_entity` ro rang
- khong phai `domestic_tw`

### Group B: Review candidates

Nen giu lai de review voi ChatGPT:

- `airport_general`
- `station_guide`
- `rail_pass`
- `ferry_route`
- route pages co top geo nhung intent mix chua ro

Signal thuong gap:

- `transport_trip_stage = arrival_immediate` hoac `pre_trip`
- `transport_affiliate_fit = medium`
- traffic tot nhung chua du signal de auto-keep

### Group C: Downrank / likely exclude later

Khong nen auto throw away som trong classifier, nhung phai downrank manh:

- `metro_map`
- `timetable`
- `parking`
- `city_transit`
- `local_utility`

Signal thuong gap:

- `transport_trip_stage = in_trip` hoac `local_utility`
- `transport_affiliate_fit = low`
- `transport_geo_scope = domestic_tw` hoac `local_city`
- semrush navigational/info ratio rat cao, commercial rat thap

## 6. Real-Life Examples

### `機捷時刻表`

Likely meaning:

- airport MRT timetable

Expected interpretation:

- `transport_scope = timetable`
- `transport_trip_stage = local_utility`
- `transport_affiliate_fit = low`
- `transport_geo_scope = domestic_tw`
- flags:
  - `timetable_only`
  - `in_trip_utility`
  - `domestic_tw`

Volume cao, nhung affiliate fit thap.

### `台北捷運圖`

Likely meaning:

- Taipei MRT map

Expected interpretation:

- `transport_scope = metro_map`
- `transport_trip_stage = in_trip`
- `transport_affiliate_fit = low`
- `transport_geo_scope = domestic_tw`
- flags:
  - `map_only`
  - `local_commute`
  - `domestic_tw`

### `台北去宜蘭`

Likely meaning:

- Taipei to Yilan route

Expected interpretation:

- `transport_scope = intercity_route`
- `transport_trip_stage = pre_trip` hoac `arrival_immediate`
- `transport_geo_scope = domestic_tw`
- `transport_affiliate_fit = low` hoac `medium`

Khong phai xau 100%, nhung rui ro affiliate cao vi noi dia TW.

### `台中機場攻略`

Likely meaning:

- Taichung airport guide

Expected interpretation:

- `transport_scope = airport_general`
- `transport_trip_stage = arrival_immediate`
- `transport_affiliate_fit = medium`
- `transport_geo_scope = destination_city`

Co the worth review.

## 7. Additional Scoring Rules

Layer transport scorer khong nen dung hard threshold som.

Nen uu tien logic rule-based + soft scoring.

### Positive signals

- slug/title chua:
  - `airport`
  - `airport to city`
  - `how to get from`
  - `transfer`
  - `station to`
  - `rail pass`
  - `ferry to island`

- `geo_entity` nam trong top outbound geos cua HK/TW
- `traffic` cao va `keyword_count` healthy
- `commercial traffic` co mat du chi nho
- `transactional traffic` vua phai, khong qua thap

### Negative signals

- slug/title chua:
  - `map`
  - `route map`
  - `timetable`
  - `schedule`
  - `parking`
  - `terminal parking`
  - `metro map`
  - `bus timetable`

- `transport_geo_scope = domestic_tw`
- `navigational_ratio` rat cao
- `traffic_info_top20` rat cao nhung `commercial` gan nhu bang 0
- title giong utility page hon la route planning page

## 8. New GUI Requirements

Trip GUI can update de support transport review tot hon.

### Main new fields worth exposing

- `transport_scope`
- `transport_trip_stage`
- `transport_affiliate_fit`
- `transport_geo_scope`

### New filters nen co

- `transport_scope`
- `transport_trip_stage`
- `transport_affiliate_fit`
- `transport_geo_scope`

### New review presets nen co

- `Transport High Fit`
- `Transport Review`
- `Domestic TW Risk`
- `Metro / Timetable / Parking`
- `Top Outbound Geo Transport`

### Table priority cho transport review

Khi review transport inventory, thu tu xem hop ly la:

1. `traffic`
2. `keyword_count`
3. `transport_affiliate_fit`
4. `transport_scope`
5. `transport_trip_stage`
6. `transport_geo_scope`
7. `geo_entity`

## 9. Export Requirements

Khi export cho ChatGPT review, transport pattern nen co them:

- `transport_scope`
- `transport_trip_stage`
- `transport_affiliate_fit`
- `transport_geo_scope`
- `transport_risk_flags`

Va neu bat `Include Semrush Review Fields`, thi giu them:

- `traffic`
- `keyword_count`
- `traffic_pct`
- `traffic_change`
- `traffic_info_top20`
- `traffic_commercial_top20`
- `traffic_navigational_top20`
- `traffic_transactional_top20`
- `positions_info_top20`
- `positions_commercial_top20`

## 10. Potential

Transport co tiem nang that.

Nhung chi co tiem nang o cac nhom:

- airport / arrival
- intercity route planning
- top geo outbound movement
- route pages co utility cao nhung van gan y dinh di chuyen truoc chuyen di

Neu lam dung, `guide/transport` co the la nhom:

- volume lon
- gan nhu cau that
- bot TOFU hon destination guide chung

## 11. Risks

Rui ro lon nhat:

1. volume cao nhung utility-only
2. transport noi dia Taiwan
3. local commute / map / timetable pages
4. title translation sai nuance
5. unknown geo lam score sai
6. semrush intent mix khong du de tu ket luan

## 12. What Our Tooling Can Reduce

Tool/logic cua minh co the giam:

- slug zh kho doc
  - bang decode + translate EN

- geo detect yeu
  - bang geo KB + translated title + slug normalized

- utility pages volume cao bi nham la high value
  - bang transport scorer fields

- review bi loang
  - bang GUI filters/presets va selected export

- AI review qua nhieu URL
  - bang export selected rows only + semrush review bundle

## 13. What Our Tooling Cannot Fully Solve

Van con nhung dieu khong the tu dong giai quyet 100%:

- mot route noi dia co the van co affiliate value trong mot so case
- airport general pages co luc rat tot, co luc chi la utility
- Semrush intent labels chi la proxy, khong phai source of truth
- translation co the dung nghia chung nhung sai nuance nghiep vu

Vi vay, transport pattern phai di theo flow:

1. classify
2. transport-specific scoring
3. GUI review
4. export selected LPs cho ChatGPT
5. moi den DSA / RSA test

## 14. Final Recommendation

Nen implement transport layer rieng.

Khong nen dung chung mot logic y het `guide/info` hay `guide/destination`.

Voi `guide/transport`, dieu can toi uu khong phai la:

- tim moi LP volume cao

ma la:

- loai bo utility transport
- uu tien transport pages gan travel decision hon
- tap trung vao top outbound geos truoc

## 15. Engineering Notes

De maintain/update/reuse tot, implementation phai follow cac nguyen tac sau:

1. Pattern-gated logic
- moi transport rule phai nam sau check `pattern == "guide/transport"`
- khong duoc chen transport exceptions vao generic topic logic neu khong can thiet

2. Helper separation
- nen tach helper transport neu rule bat dau dai:
  - scope detection
  - stage detection
  - affiliate fit
  - risk flags

3. Structured logging
- sample review scripts phai log:
  - rows reviewed
  - transport scope distribution
  - affiliate fit distribution
  - domestic_tw count
  - map/timetable/parking count

4. Sample-first rollout
- luon review sample top-traffic truoc bulk apply
- khong import full transport inventory vao PB neu chua qua sample QA

5. Reuse mindset
- zh-HK logic va transport heuristics phai duoc note ro de sau nay reuse cho:
  - zh-TW
  - markets/hosts khac
  - transport-like patterns tu Semrush
