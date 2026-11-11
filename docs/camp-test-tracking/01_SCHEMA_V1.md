# Camp Test Tracking Schema V1.2

Muc tieu cua schema nay:

- giu `campaign_test_tracks` la collection trung tam
- nang collection nay tu `testing knowledge` thanh `coverage-aware testing knowledge`
- support dung bai toan `platform -> source_market -> destination -> pattern/topic -> state/result`
- support ca lane `market_only` khi test brand/platform awareness ma khong co destination market
- giu thiet ke gon, khong bien thanh experiment suite qua som
- giup AI coder sau nay co the dung PocketBase API de tao hoac migrate schema ma khong phai suy luan lai

Schema v1.1 van khuyen nghi dung **2 collections**:

1. `campaign_test_tracks`
2. `campaign_test_updates`

Khac biet quan trong so voi v1:

- khong dung field mo ho `country`
- khong dung field mo ho `topic`
- thay vao do dung:
  - `source_market`
  - `destination_country`
  - `destination_city`
  - `pattern_topic`
  - `category`
- them `track_key` de chong duplicate va lam key deterministic cho lane

## 0. Existing Collections Review

Sau khi review schema PocketBase hien co, day la nhung collections lien quan:

- `campaign_platforms`
- `campaigns`
- `campaign_reminders`
- `campaign_changes`
- `general_notes`
- `campaign_routes`

### 0.1 Collections nen reuse bang relation

#### `campaign_platforms`

Nen reuse.

Ly do:

- da la source of truth cho platform tracking
- da co `display_name`, `color`, `sticky_note`
- feature nay phai gan chat voi platform hien huu

=> `campaign_test_tracks.platform` nen la relation den `campaign_platforms`

#### `campaigns`

Nen reuse.

Ly do:

- moi lane co the lien ket nhieu campaigns
- campaign van la asset operational goc

=> `campaign_test_tracks.linked_campaigns` nen la relation many den `campaigns`

### 0.2 Collections khong nen reuse lam record testing/coverage chinh

#### `campaign_reminders`

Khong nen reuse.

Ly do:

- day la operational follow-up layer
- khong phu hop de luu `source_market + destination + pattern_topic + result`

#### `campaign_changes`

Khong nen reuse.

Ly do:

- day la audit/change log cho 1 campaign cu the
- khong phu hop de dai dien cho 1 lane coverage/test

#### `general_notes`

Khong nen reuse.

Ly do:

- la notebook chung
- khong co relation chuan de support filtering va workflow

### 0.3 `campaign_routes` nen duoc xu ly nhu the nao

`campaign_routes` van co gia tri, nhung chi nen giu o vai tro:

- route coverage support tool
- route ownership / mapping view
- visual matrix / graph cho `source_market -> destination`

Khong nen bien `campaign_routes` thanh source of truth cho:

- pattern/topic
- test result
- failed learnings
- do_not_retest

Neu nhung het semantics testing vao `campaign_routes`, abstraction cua "route" se bi meo va so record se no nhanh.

### 0.4 Design conclusion

Huong toi uu nhat cho v1.1:

- **giu `campaign_routes` la layer phu tro**
- **nang `campaign_test_tracks` thanh layer trung tam**
- **reuse relation toi `campaign_platforms` va `campaigns`**
- **khong overload `campaign_reminders`, `campaign_changes`, `general_notes`**

## 1. Design Principles

1. Day la feature `coverage + testing knowledge`, khong phai chi la `campaign reminder`.

2. Don vi track chinh khong phai 1 campaign, ma la:
   - `platform`
   - `source_market`
   - `destination_country`
   - `destination_city` optional
   - `pattern_topic`
   - `category` optional

3. Moi lane can co `track_key` deterministic de:
   - tranh duplicate
   - de migrate/import an toan
   - de AI coder sau nay co the upsert dung lane

4. `status` va `result` phai tach rieng:
   - `status` = tinh trang hien tai cua lane
   - `result` = ket qua/learning tong hop gan nhat

5. `campaign_test_tracks` phai dung duoc cho ca:
   - lane dang testing
   - lane da live on dinh
   - lane failed can nho lai

6. V1.1 uu tien:
   - ro abstraction
   - de filter
   - de group trong GUI
   - de sau nay build coverage overview

## 2. Collection A: `campaign_test_tracks`

Day la collection chinh.
Moi record dai dien cho **mot lane coverage/test**.

Mental model:

- `Klook | TW -> JP | esim`
- `Klook | HK -> KR | arrival_card`
- `Viator | US -> Japan | private_tour`

### 2.1 Core Fields

| field | type | required | notes |
|---|---|---:|---|
| `track_key` | text | yes | unique key deterministic cho lane |
| `title` | text | yes | label de nguoi dung doc nhanh |
| `platform` | relation -> `campaign_platforms` | yes | 1 platform |
| `lane_scope` | select | yes | `destination` hoac `market_only` |
| `source_market` | text | yes | ma market nhu `TW`, `HK`, `US` |
| `destination_country` | text | no | required khi `lane_scope = destination` |
| `destination_city` | text | no | lowercase snake_case neu can granularity sau hon |
| `pattern_topic` | text | yes | vd `esim`, `arrival_card`, `private_tour`, `ticket` |
| `category` | text | no | nhom rong hon, vd `utility`, `tour`, `ticket`, `transport` |
| `test_type` | select | yes | loai testing/workstream |
| `status` | select | yes | trang thai hien tai cua lane |
| `result` | select | no | learning tong hop gan nhat |
| `priority` | select | no | muc do can theo doi |
| `cookie_test_state` | select | no | dung rieng cho cookie-related tracking |
| `summary_note` | editor | no | tong ket ngan, current state |
| `failure_note` | editor | no | ly do fail neu co |
| `next_action` | text | no | action tiep theo |
| `do_not_retest` | bool | no | danh dau de tranh lap lai test fail |
| `linked_campaigns` | relation -> `campaigns` | no | nhieu campaigns lien quan |
| `main_tags` | json/text array | no | tags nhe cho filter/search |
| `started_at` | date | no | ngay bat dau lane |
| `last_reviewed_at` | date | no | ngay review gan nhat |
| `last_state_changed_at` | date | no | ngay doi status/result gan nhat |
| `owner` | text | no | nguoi phu trach neu can |
| `metadata` | json | no | du phong mo rong nhe |

### 2.1.1 `lane_scope`

Gia tri hop le:

- `destination`
- `market_only`

Quy tac:

- `destination` = lane co `destination_country`
- `market_only` = lane test brand/platform/topic trong 1 source market ma khong target destination nao

Khong dung gia tri gia nhu `global`, `brand`, `unknown_country` de fake destination.

### 2.2 Field Naming Rules

#### `source_market`

- dung uppercase short code
- vi du:
  - `TW`
  - `HK`
  - `SG`
  - `TH`
  - `US`

Khong dung lowercase snake_case cho field nay vi no la market code, khong phai destination geo slug.

#### `destination_country`

- dung lowercase snake_case
- vi du:
  - `japan`
  - `south_korea`
  - `united_kingdom`

#### `destination_city`

- optional
- neu co, dung lowercase snake_case
- vi du:
  - `tokyo`
  - `osaka`
  - `paris`

#### `pattern_topic`

- dung lowercase snake_case
- vi du:
  - `esim`
  - `arrival_card`
  - `private_tour`
  - `things_to_do`

#### `category`

- optional
- dung lowercase snake_case
- vi du:
  - `utility`
  - `ticket`
  - `tour`
  - `transport`

### 2.3 `track_key` Convention

`track_key` phai duoc build deterministic.

Recommended format:

```text
{platform_id}|{source_market}|{destination_country}|{destination_city_or_all}|{pattern_topic}
```

Vi du:

```text
klook_pb_id|TW|japan|all|esim
trip_pb_id|HK|south_korea|all|arrival_card
viator_pb_id|US|japan|tokyo|private_tour
```

Neu `destination_city` khong co thi dung `all`.

Khong nen dua `status` hoac `result` vao `track_key`.

## 3. Recommended Select Values

### 3.1 `test_type`

- `cookie`
- `country_launch`
- `topic_validation`
- `landing_page`
- `campaign_structure`
- `creative_angle`
- `bidding`
- `scaling`
- `other`

### 3.2 `status`

- `planned`
- `testing`
- `live`
- `watching`
- `failed`
- `paused`
- `archived`

Giai thich:

- `live` tot hon `stable_winner` vi no ro nghia operational hon
- ket qua tot/xau nen nam o `result`, khong nen tron vao `status`

### 3.3 `result`

- `positive`
- `neutral`
- `negative`
- `mixed`

### 3.4 `priority`

- `normal`
- `medium`
- `high`
- `critical`

### 3.5 `cookie_test_state`

- `not_applicable`
- `on`
- `off`
- `mixed`

## 4. Collection B: `campaign_test_updates`

Day la collection log / timeline.

Moi record la 1 review note / 1 update note cho 1 lane.

### 4.1 Core Fields

| field | type | required | notes |
|---|---|---:|---|
| `test_track` | relation -> `campaign_test_tracks` | yes | parent record |
| `update_type` | select | yes | loai update |
| `status_snapshot` | select | no | snapshot status tai luc update |
| `result_snapshot` | select | no | snapshot result tai luc update |
| `source_market_snapshot` | text | no | de debug/history |
| `destination_country_snapshot` | text | no | de debug/history |
| `destination_city_snapshot` | text | no | de debug/history |
| `pattern_topic_snapshot` | text | no | de debug/history |
| `category_snapshot` | text | no | de debug/history |
| `note` | editor | yes | noi dung update |
| `linked_campaigns_snapshot` | json | no | optional snapshot ids/names |
| `important_flag` | bool | no | highlight updates quan trong |
| `created_by` | text | no | optional |
| `metadata` | json | no | du phong mo rong |

### 4.2 Recommended Select Values

#### `update_type`

- `launch_note`
- `performance_review`
- `hypothesis_update`
- `failure_note`
- `winner_note`
- `pause_note`
- `retest_note`
- `general_note`

## 5. Why 2 Collections Instead Of 1

Neu chi co 1 collection:

- lich su notes bi day vao 1 field text dai
- kho biet lane da duoc review bao nhieu lan
- kho show timeline UI sau nay

Neu dung 2 collections:

- lane chinh van gon
- lich su update clean hon
- de mo rong thanh activity timeline
- van chua bi over-engineer

## 6. Recommended Normalization Rules

### `title`

- title la human-readable label
- cho phep format dep de nguoi dung scan nhanh

Vi du:

- `Klook TW -> Japan | eSIM`
- `Trip HK -> South Korea | Arrival Card`
- `Viator US -> Tokyo, Japan | Private Tour`

### `main_tags`

`main_tags` nen la danh sach ngan, phuc vu search/filter:

```json
["tw", "japan", "esim", "utility", "cookie"]
```

Khong nen coi `main_tags` la source of truth chinh.

## 7. How This Schema Relates To `campaign_routes`

`campaign_routes` va `campaign_test_tracks` khong trung vai tro:

- `campaign_routes` = route/network view
- `campaign_test_tracks` = coverage + testing knowledge view

Sau nay GUI overview co the:

- doc `campaign_test_tracks` lam source chinh
- neu can, enrich them bang `campaign_routes` de hien route exists / missing

Nhung khong nen reverse lai.

## 8. Migration Notes From V1

Neu dang co schema v1 cu, day la thay doi quan trong:

- `country` -> doi thanh `destination_country`
- `topic` -> doi thanh `pattern_topic`
- them `source_market`
- them `destination_city`
- them `category`
- them `track_key`
- `last_result_changed_at` -> chuan hoa thanh `last_state_changed_at`
- `status` values nen chuyen `stable_winner` -> `live`

Khong nen giu dong thoi ca `country` va `destination_country`, vi se tao ambiguity lau dai.
