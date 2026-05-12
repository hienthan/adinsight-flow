# Camp Test Tracking PocketBase Schema API Spec V1.2

Muc tieu cua file nay:

- mo ta schema o muc gan-nhu-api-ready
- de sau nay co the dung PocketBase API / script de tao hoac migrate collection
- giam rui ro mapping sai giua feature spec va schema that

File nay khong paste raw API payload day du, nhung du chi tiet de generate payload mot cach deterministic.

Ghi chu quan trong:

- file nay supersede v1 cu
- neu da tao schema v1, can co migration nhe truoc khi dong bo code/UI

## 1. Existing Collections To Link

Schema moi se lien ket toi:

- `campaign_platforms`
- `campaigns`

Khong lien ket truc tiep voi:

- `campaign_reminders`
- `campaign_changes`
- `general_notes`

`campaign_routes` chi nen duoc doc nhu collection phu tro, khong phai target relation bat buoc.

## 2. Collection A: `campaign_test_tracks`

### 2.1 Collection Metadata

- `name`: `campaign_test_tracks`
- `type`: `base`
- `listRule`: `""`
- `viewRule`: `""`
- `createRule`: `""`
- `updateRule`: `""`
- `deleteRule`: `""`

### 2.2 Fields

#### `track_key`

- type: `text`
- required: `true`
- min: `1`
- max: `0`
- pattern: `^[A-Za-z0-9_\\-|]+$`
- presentable: `false`

Ghi chu:

- phai co unique index
- phuc vu upsert deterministic

#### `title`

- type: `text`
- required: `true`
- min: `1`
- max: `0`
- presentable: `true`

#### `platform`

- type: `relation`
- required: `true`
- collection: `campaign_platforms`
- maxSelect: `1`
- minSelect: `1`
- cascadeDelete: `false`

#### `lane_scope`

- type: `select`
- required: `true`
- maxSelect: `1`
- values:
  - `destination`
  - `market_only`

#### `source_market`

- type: `text`
- required: `true`
- min: `2`
- max: `12`
- pattern: `^[A-Z0-9_\\-]+$`

Ghi chu:

- giu la text thay vi select de tranh schema churn khi mo rong market codes
- input UX van nen la dropdown canonical

#### `destination_country`

- type: `text`
- required: `false`
- min: `0`
- max: `0`
- pattern: `^[a-z0-9_\\-]*$`

Ghi chu:

- required o layer app khi `lane_scope = destination`
- de rong khi `lane_scope = market_only`

#### `destination_city`

- type: `text`
- required: `false`
- min: `0`
- max: `0`
- pattern: `^[a-z0-9_\\-]*$`

#### `pattern_topic`

- type: `text`
- required: `true`
- min: `1`
- max: `0`
- pattern: `^[a-z0-9_\\-]+$`

#### `category`

- type: `text`
- required: `false`
- min: `0`
- max: `0`
- pattern: `^[a-z0-9_\\-]*$`

Ghi chu:

- giu la text de tranh phai migrate schema moi khi category taxonomy doi
- input UX nen la dropdown/free-combobox co suggestion

#### `test_type`

- type: `select`
- required: `true`
- maxSelect: `1`
- values:
  - `cookie`
  - `country_launch`
  - `topic_validation`
  - `landing_page`
  - `campaign_structure`
  - `creative_angle`
  - `bidding`
  - `scaling`
  - `other`

#### `status`

- type: `select`
- required: `true`
- maxSelect: `1`
- values:
  - `planned`
  - `testing`
  - `live`
  - `watching`
  - `failed`
  - `paused`
  - `archived`

#### `result`

- type: `select`
- required: `false`
- maxSelect: `1`
- values:
  - `positive`
  - `neutral`
  - `negative`
  - `mixed`

#### `priority`

- type: `select`
- required: `false`
- maxSelect: `1`
- values:
  - `normal`
  - `medium`
  - `high`
  - `critical`

#### `cookie_test_state`

- type: `select`
- required: `false`
- maxSelect: `1`
- values:
  - `not_applicable`
  - `on`
  - `off`
  - `mixed`

#### `summary_note`

- type: `editor`
- required: `false`
- convertURLs: `false`

#### `failure_note`

- type: `editor`
- required: `false`
- convertURLs: `false`

#### `next_action`

- type: `text`
- required: `false`

#### `do_not_retest`

- type: `bool`
- required: `false`

#### `linked_campaigns`

- type: `relation`
- required: `false`
- collection: `campaigns`
- maxSelect: `999`
- minSelect: `0`
- cascadeDelete: `false`

Ghi chu:

- khong nen cascade delete
- neu campaign bi xoa, knowledge cua lane van phai con

#### `main_tags`

- type: `json`
- required: `false`

Khuyen nghi data shape:

```json
["tw", "japan", "esim", "utility", "cookie"]
```

#### `started_at`

- type: `date`
- required: `false`

#### `last_reviewed_at`

- type: `date`
- required: `false`

#### `last_state_changed_at`

- type: `date`
- required: `false`

#### `owner`

- type: `text`
- required: `false`

#### `metadata`

- type: `json`
- required: `false`

### 2.3 Recommended Indexes

- `CREATE UNIQUE INDEX idx_ctt_track_key ON campaign_test_tracks (track_key)`
- `CREATE INDEX idx_ctt_platform ON campaign_test_tracks (platform)`
- `CREATE INDEX idx_ctt_source_market ON campaign_test_tracks (source_market)`
- `CREATE INDEX idx_ctt_destination_country ON campaign_test_tracks (destination_country)`
- `CREATE INDEX idx_ctt_destination_city ON campaign_test_tracks (destination_city)`
- `CREATE INDEX idx_ctt_pattern_topic ON campaign_test_tracks (pattern_topic)`
- `CREATE INDEX idx_ctt_category ON campaign_test_tracks (category)`
- `CREATE INDEX idx_ctt_status ON campaign_test_tracks (status)`
- `CREATE INDEX idx_ctt_result ON campaign_test_tracks (result)`
- `CREATE INDEX idx_ctt_test_type ON campaign_test_tracks (test_type)`
- `CREATE INDEX idx_ctt_cookie_state ON campaign_test_tracks (cookie_test_state)`
- `CREATE INDEX idx_ctt_last_reviewed ON campaign_test_tracks (last_reviewed_at)`
- `CREATE INDEX idx_ctt_do_not_retest ON campaign_test_tracks (do_not_retest)`
- `CREATE INDEX idx_ctt_platform_market_dest ON campaign_test_tracks (platform, source_market, destination_country)`
- `CREATE INDEX idx_ctt_platform_market_dest_topic ON campaign_test_tracks (platform, source_market, destination_country, pattern_topic)`

Ghi chu:

- khong index qua nhieu field text dai nhu `title`, `summary_note`
- `track_key` la index quan trong nhat cho sync/import

## 3. Collection B: `campaign_test_updates`

### 3.1 Collection Metadata

- `name`: `campaign_test_updates`
- `type`: `base`
- `listRule`: `""`
- `viewRule`: `""`
- `createRule`: `""`
- `updateRule`: `""`
- `deleteRule`: `""`

### 3.2 Fields

#### `test_track`

- type: `relation`
- required: `true`
- collection: `campaign_test_tracks`
- maxSelect: `1`
- minSelect: `1`
- cascadeDelete: `true`

#### `update_type`

- type: `select`
- required: `true`
- maxSelect: `1`
- values:
  - `launch_note`
  - `performance_review`
  - `hypothesis_update`
  - `failure_note`
  - `winner_note`
  - `pause_note`
  - `retest_note`
  - `general_note`

#### `status_snapshot`

- type: `select`
- required: `false`
- maxSelect: `1`
- values:
  - `planned`
  - `testing`
  - `live`
  - `watching`
  - `failed`
  - `paused`
  - `archived`

#### `result_snapshot`

- type: `select`
- required: `false`
- maxSelect: `1`
- values:
  - `positive`
  - `neutral`
  - `negative`
  - `mixed`

#### `source_market_snapshot`

- type: `text`
- required: `false`
- min: `0`
- max: `12`

#### `destination_country_snapshot`

- type: `text`
- required: `false`

#### `destination_city_snapshot`

- type: `text`
- required: `false`

#### `pattern_topic_snapshot`

- type: `text`
- required: `false`

#### `category_snapshot`

- type: `text`
- required: `false`

#### `note`

- type: `editor`
- required: `true`
- convertURLs: `false`

#### `linked_campaigns_snapshot`

- type: `json`
- required: `false`

Khuyen nghi data shape:

```json
[
  { "id": "campaign_id_1", "name": "Campaign A" },
  { "id": "campaign_id_2", "name": "Campaign B" }
]
```

#### `important_flag`

- type: `bool`
- required: `false`

#### `created_by`

- type: `text`
- required: `false`

#### `metadata`

- type: `json`
- required: `false`

### 3.3 Recommended Indexes

- `CREATE INDEX idx_ctu_test_track ON campaign_test_updates (test_track)`
- `CREATE INDEX idx_ctu_update_type ON campaign_test_updates (update_type)`
- `CREATE INDEX idx_ctu_important_flag ON campaign_test_updates (important_flag)`

## 4. PocketBase-Specific Notes

Theo best practice cua PocketBase:

- relation fields phai reuse collection that su ton tai, khong store manual ID strings
- fields hay duoc filter phai co index
- voi grouping/overview phuc tap sau nay, co the them `view collection` read-only neu runtime aggregation tro nen nang

V1.1 chua can `view collection` bat buoc.

## 5. Migration Notes From V1

Neu schema v1 da duoc tao, migration toi thieu can:

1. add `track_key`
2. add `source_market`
3. rename `country` -> `destination_country`
4. add `destination_city`
5. rename `topic` -> `pattern_topic`
6. add `category`
7. rename `last_result_changed_at` -> `last_state_changed_at`
8. cap nhat `status` select values:
   - `stable_winner` -> `live`

Ghi chu:

- neu PocketBase khong support safe rename theo cach mong muon, uu tien add field moi + migrate data + remove field cu sau
- khong nen giu song song `country` va `destination_country`
- khong nen giu song song `topic` va `pattern_topic`

## 6. Creation / Migration Order

Neu tao moi:

1. create/update `campaign_test_tracks`
2. create/update indexes cho `campaign_test_tracks`
3. create/update `campaign_test_updates`
4. create/update indexes cho `campaign_test_updates`

Neu migrate tu v1:

1. add new fields
2. migrate data
3. update indexes
4. update code/UI
5. chi xoa field cu khi da verify data va code da clean
