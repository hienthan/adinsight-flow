# Trip Transport Implementation Plan

Spec nay chot implementation plan cho transport layer.

No dung de bridge tu:

- `04_TRANSPORT_PATTERN_SPEC.md`

sang:

- classifier/scorer code
- PocketBase fields
- GUI review flow

## 1. Scope

Phase nay chi target:

- `guide/transport`

Khong mo rong sang pattern khac trong cung phase.

Boundary implementation rule:

- moi code path transport phai gate bang `pattern == "guide/transport"`
- non-transport patterns khong duoc populate transport fields
- neu sau nay co pattern moi muon reuse, phai add explicit opt-in rule, khong reuse ngam

## 2. Output Goals

Sau phase nay, he thong can lam duoc:

1. classify transport URL theo scope nghiep vu
2. detect transport pages co affiliate fit cao / trung binh / thap
3. flag transport pages noi dia / utility / in-trip
4. filter & sort transport rows trong GUI
5. export selected transport rows cho ChatGPT review

## 3. Code Workstreams

### A. Classifier extension

Files likely touched:

- `scripts/trip/trip_classifier.py`
- `scripts/trip/lib/trip_geo_kb.json`
- `scripts/trip/lib/translation.py` (neu can refine)

Work:

- detect `guide/transport` pattern
- derive:
  - `transport_scope`
  - `transport_trip_stage`
  - `transport_affiliate_fit`
  - `transport_geo_scope`
  - `transport_risk_flags`

Engineering guidance:

- uu tien tach helper/module rieng neu `trip_classifier.py` bat dau qua dai
- helper names nen ro nghia:
  - `detect_transport_scope(...)`
  - `detect_transport_trip_stage(...)`
  - `detect_transport_geo_scope(...)`
  - `score_transport_affiliate_fit(...)`
  - `collect_transport_risk_flags(...)`

### B. Semrush-aware transport scorer

Files likely touched:

- `scripts/trip/trip_classifier.py`
- transport-specific helper file neu can tach rieng

Work:

- use slug decoded + translated title + geo + semrush intent mix
- soft-score transport rows
- khong hard-exclude som utility rows, tru khi la junk ro rang

### C. Review and QA scripts

Files likely touched:

- `scripts/trip/review_trip_classifier.py`
- `scripts/trip/review_trip_batch.py`

Work:

- them bucket review rieng cho transport:
  - high fit
  - domestic_tw
  - map/timetable/parking
  - airport/general
  - unknown geo transport

- add aggregate logging cho:
  - scope distribution
  - trip stage distribution
  - affiliate fit distribution
  - domain split `hk.trip` vs `tw.trip`

## 4. Proposed Rule Order

Transport layer nen evaluate theo thu tu:

1. decode slug / source text
2. translate zh -> EN
3. detect geo
4. detect transport scope
5. detect transport trip stage
6. detect transport geo scope
7. compute affiliate fit
8. attach risk flags
9. use Semrush signals de boost/downrank

Rule quan trong:

- domain (`hk.trip` / `tw.trip`) chi duoc dung nhu context signal
- domain khong duoc override slug/title/geo truth mot cach hard-coded

## 5. Semrush Heuristics

Nen dung nhe tay:

- `traffic`
- `keyword_count`
- `traffic_change`
- `traffic_info_top20`
- `traffic_commercial_top20`
- `traffic_navigational_top20`
- `traffic_transactional_top20`

Recommended:

- `commercial` va `transactional` la positive booster, khong phai hard gate
- `navigational` cao + utility slug la negative booster
- `info` rat cao khong xau, neu page la airport/intercity planning

## 6. Testing Plan

Phase 1 test:

- review 50-100 rows top traffic tu `trip-tw-transport.csv`
- chia thanh:
  - airport
  - intercity route
  - metro/map/timetable
  - parking
  - station/general

Can verify:

- title EN co doc duoc khong
- geo detect co dung khong
- transport scope co on khong
- domestic TW risk co bat dung khong
- airport/intercity pages co bi downrank oan khong
- hk.trip vs tw.trip co bi suy luan oan theo host khong

## 7. Success Criteria

Phase transport duoc xem la dat khi:

1. transport rows high-volume utility co risk flags ro rang
2. airport/intercity planning rows duoc tach khoi local utility rows
3. GUI filter duoc transport rows theo fit/risk nhanh
4. export selected rows cho ChatGPT gon va co signal du

Operational success:

5. logs/sample outputs du ro de debug ma khong can doc lai raw CSV

## 8. Non-Goals

Phase nay khong can:

- automate final DSA label cho transport
- automate final RSA asset generation
- build transport-only page moi
- giai quyet hoan hao moi nuance affiliate

## 9. Recommended Sequence

1. add fields vao `trip_pages`
2. update GUI types/config de doc fields moi
3. implement classifier/scorer transport fields
4. review sample transport CSV
5. import / review trong PB GUI
6. export selected LPs cho ChatGPT
