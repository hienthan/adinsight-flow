# Camp Test Tracking Feature Spec V1.2

Muc tieu cua feature nay:

- track testing knowledge theo `platform + source_market + destination + pattern_topic`
- track nhom camp dang live, dang testing, da fail, hoac dang watch
- luu lai learnings de tranh retest fail case cu
- tao noi xem lai thuong xuyen cho cac lane quan trong
- dat nen de build page overview tong the sau nay

Feature nay khong phai de thay the:

- `CampOverview`
- `campaign reminders`
- `campaign detail`
- `Outbound Map`

No la 1 lop bo sung o dung abstraction cho:

- knowledge
- coverage state
- test result
- next action

## 1. Problem Statement

Camp-level notes khong phu hop cho bai toan nay vi:

- thong tin testing thuong lien quan nhieu campaigns
- can nho `source_market + destination + pattern_topic`, khong chi 1 camp
- co nhung lane da khong con testing nhung van dang live
- co nhung lane da fail nhung learning van phai duoc giu lai
- can xem lai thuong xuyen o muc strategic, khong chi operational

## 2. Core Product Decision

Lam 1 feature rieng ten de xuat:

- `Camp Test Tracking`
- hoac `Coverage Test Tracker`

V1.1 van giu 1 page rieng cho operational detail, nhung semantic cua record duoc nang cap:

- record khong chi la "test note"
- record la **lane coverage/test**

Mau mot lane:

- `Klook | TW -> Japan | esim`
- `Klook | HK -> South Korea | arrival_card`
- `Viator | US -> Japan | private_tour`
- `Klook | MY | esim` cho lane `market_only`

V1.2 them `lane_scope`:

- `destination`
- `market_only`

Tu v1.2 tro di, feature nay nen duoc nhin nhu 3 page cung mot domain:

- `Testing Overview Dashboard`
- `Camp Test Tracking`
- `Coverage Overview`

## 3. What This Feature Should Answer

Feature nay phai tra loi duoc nhanh:

- platform A dang live nhung lane nao
- source market nao dang test destination nao
- pattern/topic nao dang duoc scale
- pattern/topic nao da fail va khong nen retest
- cookie-related lanes dang on hay off
- lane nao chua review gan day

## 4. Primary Use Cases

### Use case 1: Track active lanes

User muon biet:

- dang co nhung lane nao tren 1 platform
- lane nao dang `testing`
- lane nao dang `live`
- lane nao `watching`

### Use case 2: Record failed lanes

User muon ghi:

- lane nao da fail
- fail vi ly do gi
- co nen retest hay khong

### Use case 3: Review learnings by market and topic

User muon loc nhanh:

- tat ca lane `TW -> Japan`
- tat ca lane `HK -> South Korea | arrival_card`
- tat ca cookie lanes dang `on`
- tat ca lane `failed + do_not_retest`

### Use case 4: Link campaigns to a lane

User muon xem:

- lane nay gom nhung campaigns nao
- camp nao dang nam trong testing/live lane do

## 5. V1.1 Scope

V1.1 nen support:

1. create / edit / archive lane record
2. link campaigns vao lane
3. add review/update notes theo timeline
4. filter theo:
   - platform
   - source_market
   - destination_country
   - destination_city
   - category
   - pattern_topic
   - status
   - result
   - test_type
   - cookie_test_state
   - do_not_retest
5. section de xem:
   - live lanes
   - testing lanes
   - failed lanes
   - cookie lanes on
   - needs review

## 6. What V1.1 Should Not Try To Do

Khong nen build ngay:

- experiment dashboard co statistical significance
- auto-read Google Ads metrics
- realtime auto-synchronization voi Google Ads
- global knowledge graph phuc tap
- nhung topic/category phai normalize thanh nhieu collections con

## 7. UI / UX Direction

### 7.1 Existing Page Role

Page hien co `/camp-tracking/testing` nen duoc giu, nhung doi mental model:

- tu "testing notes page"
- thanh "lane detail page"

Day la noi operator xem, edit, va review tung lane.

### 7.2 Main Layout

V1.1 co the giu 3 khu:

1. top filter + summary row
2. lane list
3. detail pane

### 7.3 Summary Row

Can co cac counters:

- `Live`
- `Testing`
- `Failed`
- `Cookie On`
- `Do Not Retest`
- `Needs Review`

### 7.4 Main Filters

Can co:

- `platform`
- `source_market`
- `destination_country`
- `destination_city`
- `category`
- `pattern_topic`
- `status`
- `result`
- `test_type`
- `cookie_test_state`
- `search`
- `do_not_retest`

### 7.5 List View

Moi row/card lane nen show:

- title
- platform
- source_market
- destination
- pattern_topic
- category
- status
- result
- cookie_test_state
- linked campaigns count
- last_reviewed_at
- next_action
- badges:
  - `Live`
  - `Testing`
  - `Failed`
  - `Cookie On`
  - `Do Not Retest`

### 7.6 Detail View

Khi open lane, can co:

- summary note
- failure note
- next action
- linked campaigns
- update timeline
- history snapshot de thay lane da thay doi ra sao

## 8. Integration With Existing Features

### `CampOverview`

Khong nen embed full feature vao `CampOverview`.

Chi can integration nhe:

- camp nao thuoc lane thi show badge `Testing` hoac `Live Lane`
- co link mo sang lane record

### `PlatformCampaigns`

Nen co:

- quick filter `Has test lane`
- quick action `Open Coverage/Test Tracker`

### `Outbound Map`

`Outbound Map` van co gia tri, nhung chi o vai tro:

- support visualize `source_market -> destination`
- route ownership
- route gap support

Khong nen la source of truth chinh cho:

- pattern/topic
- result
- failed learnings

## 9. Data Model Mental Model

Hay nghi nhu sau:

- `campaign` = asset operational
- `campaign reminder` = operational follow-up
- `campaign_route` = route/network view
- `campaign_test_track` = coverage + testing knowledge

Neu khong tach 4 lop nay, UI sau nay se roi vao tinh trang 1 feature lam qua nhieu viec.

## 10. Recommended Workflow

### Khi mo mot lane moi

1. tao `campaign_test_track`
2. nhap:
   - platform
   - source_market
   - destination_country
   - destination_city neu can
   - pattern_topic
   - category neu can
   - test_type
   - status
3. link campaigns lien quan
4. ghi `summary_note`

### Khi lane dang duoc test

1. cap nhat `status = testing`
2. cap nhat `cookie_test_state` neu lien quan
3. ghi `campaign_test_update`

### Khi lane da on dinh

1. cap nhat `status = live`
2. cap nhat `result = positive` hoac `mixed`
3. cap nhat `last_reviewed_at`

### Khi lane fail

1. cap nhat `status = failed`
2. cap nhat `result = negative`
3. ghi `failure_note`
4. neu can, bat `do_not_retest = true`

## 11. Why `country` and `topic` Are No Longer Enough

Neu chi co:

- `country`
- `topic`

thi se mo ho cac truong hop:

- `TW -> Japan | esim`
- `HK -> Japan | esim`

Ca hai deu la `japan + esim`, nhung thuc te la 2 lane khac nhau.

Do do phai nang schema len:

- `source_market`
- `destination_country`
- `destination_city`
- `pattern_topic`

## 12. Forward Compatibility

Khi can build overview page tong the, feature nay phai co kha nang lam source of truth.

V1.1 duoc thiet ke de sau nay:

- group lane theo platform
- group lane theo `source_market -> destination_country`
- group lane theo `pattern_topic`
- compare status/result across lanes

ma khong can re-model toan bo collection.
