# Trip zh-HK Processing Notes

Spec nay ghi lai cac rule quan trong khi xu ly Trip zh-HK.

Muc tieu:

- giu context classifier/import hien tai
- de zh-TW sau nay co the tai su dung logic
- tranh lap lai cac sai lam ve slug zh, geo detection, va Trip-specific exclusions

## 1. Core Context

Trip khong co sitemap inventory ro rang nhu cac platform khac.

Nguon URL hien tai den tu Semrush, gom cac pattern:

- `blog`
- `guide/destination`
- `guide/info`
- `travel-guide/destination`

Voi Trip, classifier khong chi phan loai URL.

No con phai review duoc:

- demand scale
- cookie-window relevance
- destination fit cho market

## 2. Title Strategy

`title` phai la EN title.

Title goc zh-HK khong can show tren GUI.

Current logic:

1. decode slug/path
2. extract `source_text`
3. dich sang EN bang translation layer
4. generate human title theo topic + geo neu co
5. fallback sang translated text hoac pretty text

Vi du:

- `泰國入境卡` -> `Thailand Arrival Card`
- `台灣插頭` -> `Taiwan Power Plug`
- `網上申請入台證網簽` -> `Taiwan Entry Permit Online Application`

## 3. Translation Layer Rules

Translation layer hien tai:

- file: `scripts/trip/lib/translation.py`
- uu tien cache
- co live translation khi can
- default la offline-safe

Rule quan trong:

- khong duoc coi translation la giai phap duy nhat cho geo
- translation chi la mot input cho geo detection va title generation

Translation cache dang la exact-text cache.

Dieu nay co nghia:

- zh-TW sau nay se reuse duoc neu text giong het zh-HK
- neu wording khac nhe, cache se khong tu merge

## 4. Geo Detection Order

Thu tu detect geo dung hien tai:

1. Trip hardcoded geo aliases
2. `scripts/trip/lib/trip_geo_kb.json`
3. shared geo engine cua repo
4. title-derived and slug-derived fallback

Haystack dung cho Trip phai gom:

- raw zh source text
- normalized zh text
- translated EN text
- normalized EN text
- raw slug tail
- slug tail strip noise
- path normalized

Neu bo qua mot trong cac nguon nay, unknown geo tang rat nhanh.

## 5. Geo Noise Stripping Rules

Can strip cac phrase khong phai geo truoc khi detect:

- `travel guide`
- `weather`
- `temperature`
- `power plug`
- `arrival card`
- `entry permit`
- `visa`
- `district`
- `region`
- `island`
- `旅遊攻略`
- `攻略`
- `天氣`
- `氣溫`
- `插頭`
- `入境卡`
- `入台證`

Logic nay dac biet quan trong cho:

- `travel-guide/destination`
- `guide/destination`
- `guide/info`

## 6. Topic and Intent Notes

Voi Trip, `commercial traffic` la signal boost, khong phai hard gate.

Nhung topic sau co the rat worth feed du traffic mang tinh informational:

- `entry_document`
- `visa`
- `plug_voltage`
- `airport_transport`
- `city_transport`
- `itinerary`

Vi ly do 7-day cookie, `readiness_hint` la field phai tin cay.

## 7. Active / Exclusion Notes

Can exclude hoac downrank manh:

- promo / coupon
- campaign / news
- customer service
- local HK leisure
- Macau / Shenzhen / Zhuhai short-haul cases
- non-content transactional URLs

Rule nay khong phai vi page xau.

No phuc vu dung use case Google Ads cua Trip.

## 8. Local Short-Haul Risk

Local short-haul entities can theo doi rieng trong classifier.

Vi du:

- `hong_kong`
- `macau`
- `shenzhen`
- `zhuhai`
- cac district noi dia HK

Neu page roi vao nhom nay:

- `trip_mode_risk = high`
- `market_fit = low`
- thuong `is_active = false`

## 9. zh-HK Specific Observations

Nhung false negative thuong gap:

- Chinese city/province names chua co alias
- local malls / landmarks / districts
- weather pages co geo ro nhung chua nam trong KB
- ASCII destination slug ma shared geo engine khong bat duoc

Nhung false positive thuong gap:

- local HK outing pages
- generic utility pages khong co geo nhung van active
- broad blog pages co volume nhung xa booking

## 10. zh-TW Reuse Notes

Khi xu ly zh-TW, nen reuse:

- translation cache
- Trip geo KB
- shared geo engine
- topic rules
- Semrush interpretation logic
- local short-haul exclusion logic

Nhung can luu y:

- Trip khong co canonical ID de dedupe nhu Klook
- zh-HK va zh-TW nen duoc luu thanh records rieng theo `url`
- khong nen merge records da ngon ngu chi dua vao slug text

Ly do:

- wording zh-TW co the khac zh-HK
- classifier result co the khac do market fit
- Semrush metrics theo market co the khac

## 11. zh-TW Preparation Checklist

Truoc khi ingest zh-TW:

1. review translation cache hit rate
2. add zh-TW wording variants vao `trip_geo_kb.json`
3. kiem tra local terminology khac voi zh-HK
4. rerun sample review cho 4 pattern chinh
5. review bucket:
   - `active_unknown_geo`
   - `active_weather`
   - `active_high_transactional`

## 12. Current Limitation Notes

Tinh den classifier `trip_v2`:

- geo coverage van chua du cho long-tail destination
- `travel-guide/destination` la pattern unknown-geo lon nhat
- `guide/info` van con nhieu utility / weather rows can review
- `blog` van noisy

Vi vay, GUI Trip phai co saved views cho review thay vi chi coi nhu export tool.
