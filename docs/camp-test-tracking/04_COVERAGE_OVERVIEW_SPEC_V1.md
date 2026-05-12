# Coverage Overview Page Spec V1.1

Muc tieu cua page nay:

- cho user cai nhin tong the nhat theo:
  - `platform`
  - `source_market`
  - `destination`
  - `pattern_topic`
  - `category`
  - `status/result`
- khong ep user phai mo tung lane de biet coverage dang o dau
- giai quyet khoang trong ma `Outbound Map` va `Camp Test Tracking` hien tai chua cover tron ven

## 1. Product Decision

Khong bo `Outbound Map`, nhung cung khong nang cap no thanh source of truth chinh.

Page moi nen:

- lay `campaign_test_tracks` lam source chinh
- tai su dung mot so y tuong UX cua `Outbound Map`
- phuc vu strategic overview, khac voi page `/camp-tracking/testing` dang phuc vu lane detail/operator workflow

Recommended route:

- `/camp-tracking/coverage`

## 2. What This Page Must Answer

Khi vao page, user phai tra loi duoc nhanh:

- tren moi platform, dang mo market nao
- market do dang danh destination nao
- pattern/topic nao dang `live`
- pattern/topic nao dang `testing`
- pattern/topic nao da `failed`
- lane nao dang `cookie on`
- lane nao chua cover hoac chua co testing knowledge

## 3. Source of Truth

### Primary source

- `campaign_test_tracks`

### Secondary/support source

- `campaign_routes`

Chi nen dung `campaign_routes` de enrich:

- route da ton tai chua
- route co campaign map chua
- route ownership

Khong nen de `campaign_routes` chi phoi status/result/topic cua page nay.

## 4. Core UX Model

Page nay nen co 3 lop:

1. top summary row
2. coverage matrix / grouped overview
3. lane list + detail drawer
4. market-only lane section rieng

## 5. Summary Row

Can co cac counters:

- `Live Lanes`
- `Testing Lanes`
- `Failed Lanes`
- `Cookie On`
- `Do Not Retest`
- `Markets Covered`
- `Destinations Covered`
- `Topics Active`

Neu muon gon hon, v1 co the bo `Topics Active`.

## 6. Main Filters

Filters can co:

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
- `do_not_retest`
- `search`

Search nen match:

- title
- source market
- destination country
- destination city
- pattern_topic
- category

## 7. Main Views

### 7.1 View A: Coverage Matrix

Day la view quan trong nhat.

Rows:

- `source_market`

Columns:

- `destination_country`

Cell:

- tong so lanes trong o do
- mix nho:
  - `live`
  - `testing`
  - `failed`
- click vao cell se filter lane list ben duoi

Neu muon dep hon, cell co the hien:

- count tong
- 3 mini dots theo status

Nhung v1 khong nen lam qua fancy.

Luu y:

- matrix chi dung cho `lane_scope = destination`
- `market_only` lanes khong duoc ep vao matrix `source_market x destination_country`
- thay vao do, can co section rieng de scan theo `platform + source_market + pattern_topic`

### 7.2 View B: Grouped Lane Table

Bang row-level de scan chi tiet.

Moi row nen show:

- platform
- source_market
- destination
- pattern_topic
- category
- status
- result
- cookie state
- do_not_retest
- linked campaigns count
- last_reviewed_at

Bang nay la noi user xem detail operational sau khi nhin matrix.

### 7.3 View C: Detail Drawer

Khi click 1 row:

- open detail drawer
- show summary note
- failure note
- next action
- linked campaigns
- update timeline
- quick link sang `/camp-tracking/testing`

## 8. Grouping Logic

### Default grouping

Nen group logic theo:

1. `platform`
2. `source_market`
3. `destination_country`
4. `pattern_topic`

### Optional secondary grouping

Neu can them:

- `category`
- `destination_city`

Nhung khong nen bat dau bang grouping qua sau.

## 9. Status Semantics

Page overview nen dung semantics sau:

- `live`: dang chay on dinh
- `testing`: dang test active
- `watching`: dang theo doi, chua ket luan
- `failed`: da co learning fail ro rang
- `paused`: tam dung
- `planned`: chua chay
- `archived`: lane cu, khong con active

## 10. Why This Is Not Just `Outbound Map`

`Outbound Map` tra loi tot:

- market nao sang destination nao
- route nao co campaign nao

Nhung no khong tra loi tot:

- topic nao dang live
- topic nao da fail
- cookie state
- do_not_retest
- ket qua testing

Do do, page overview moi khong nen la mot patch nho cua outbound map.

## 11. Why This Is Not Just the Existing Testing Page

Page `/camp-tracking/testing` phu hop cho:

- xem lane detail
- edit/update lane
- doc note/timeline

Nhung no khong phai strategic overview page tot nhat vi:

- thieu matrix tong quat
- thieu goc nhin coverage theo source -> destination

## 12. Integration With Existing Pages

### From `CampOverview`

Nen co quick link:

- `Open Coverage Overview`

### From `Outbound Map`

Nen co quick link:

- `Open Coverage Overview`

Neu co selected route:

- co the deep-link sang filter tuong ung:
  - `source_market`
  - `destination_country`

### From `Camp Test Tracking`

Nen co quick link:

- `Open in Coverage Overview`

va nguoc lai.

## 13. Query Strategy

V1 co the query:

- `campaign_test_tracks`
- `expand=platform,linked_campaigns`

Neu du lieu lon hon sau nay:

- them pagination cho lane table
- can nhac `view collection` trong PocketBase de pre-aggregate counts

Nhung chua can toi uu som.

## 14. Non-Goals

V1 khong can:

- graph/network node view moi
- performance metric overlay
- auto gap recommendation bang AI
- realtime sync voi Google Ads

Neu muon gap signal:

- co the de `Outbound Map` xu ly tiep
- hoac them sau o v2

## 15. Recommended Development Order

1. migrate schema `campaign_test_tracks` len v1.1
2. update seed/demo data
3. update page `/camp-tracking/testing` theo field moi
4. build page `/camp-tracking/coverage`
5. them quick links giua `coverage`, `testing`, `outbound-map`

## 16. Final Product Positioning

Mental model cuoi cung nen la:

- `Outbound Map` = route visualization/support
- `Camp Test Tracking` = lane detail + learning history
- `Coverage Overview` = strategic portfolio view

Ba page nay bo sung cho nhau.
Khong page nao nen co gang thay het 2 page con lai.
