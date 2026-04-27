# Viator Outbound Schema V1

Muc tieu cua schema nay:

- toi gian de AI coder de implement va maintain
- bam sat triet ly engine hien co cua TVLK/Klook
- uu tien field phuc vu classify URL va export DSA
- tranh overengineering trong giai doan dau

Schema nay ap dung cho Viator outbound pages da duoc tach theo country source file truoc.

## 1. Design Principles

1. `country` khong can classifier suy doan nua.
   Gia tri nay phai den tu source file hoac metadata cua batch import.

2. `city` la geo key chinh cho outbound.
   DSA grouping nen uu tien `city` truoc, khong phai `country`.

3. `intent_primary` va `content_type` phai la 2 truong khac nhau.
   - `intent_primary` = user need / grouping axis cho DSA
   - `content_type` = loai page / inventory type / offer type

4. `dsa_campaign` phai deterministic.
   Cung 1 URL phai luon sinh ra cung 1 campaign key.

5. Khong dua logic domestic US vao schema v1 nay.
   US domestic se co spec rieng sau.

## 2. Core Fields

Day la bo field can co cho ban v1.

| field | type | required | notes |
|---|---|---:|---|
| `url` | text | yes | full URL |
| `title` | text | yes | title tu sitemap page |
| `country` | text | yes | lay tu source batch, khong classifier |
| `city` | text | no | city chinh extract tu URL |
| `page_type` | text | yes | `product`, `ticket`, `ttd` |
| `intent_primary` | text | yes | bucket chinh de chia campaign |
| `content_type` | text | yes | loai noi dung/offer chi tiet hon |
| `is_private` | bool | yes | true neu URL/title la private-only offer |
| `dsa_campaign` | text | yes | campaign grouping key |
| `dsa_adgroup` | text | yes | ad group grouping key |

## 3. Optional Fields

Chi them nhung field nay neu can cho debug/export. Khong bat buoc trong v1.

| field | type | required | notes |
|---|---|---:|---|
| `classification_confidence` | number | no | 0.0 -> 1.0 |
| `rule_hits` | text/json | no | danh sach rule match de debug |
| `notes` | text | no | ghi chu manual |

Neu chua thuc su can debug UI thi co the bo ca 3 field nay.

## 4. Field Definitions

### `url`

- full Viator URL
- la identity field quan trong nhat
- phai unique trong tap du lieu sau khi merge

### `title`

- lay tu HTML sitemap page
- dung cho content classification va fallback city detection

### `country`

- khong detect tu classifier
- assign truoc khi classify
- vi du:
  - `france`
  - `italy`
  - `spain`
  - `united_kingdom`
  - `japan`

Nen normalize ve lowercase snake_case hoac lowercase slug style va giu mot chuan duy nhat.

### `city`

- la destination city chinh
- uu tien extract tu URL segment
- neu khong co thi moi fallback sang title
- neu van khong co thi de rong

Khong nen ep detect bang moi gia de tranh noise.

### `page_type`

Gia tri hop le trong v1:

- `product`
- `ticket`
- `ttd`

Trong do:

- `product` = URL product tours/activities
- `ticket` = attraction ticket / ticket hub page
- `ttd` = things to do destination hub

### `intent_primary`

Day la grouping axis chinh cho DSA campaign.

Gia tri de xuat trong v1:

- `things_to_do`
- `ticket`
- `day_trip`
- `multi_day`
- `transport`
- `cruise`
- `food`
- `show`
- `private_tour`

Neu khong match rule dac biet:

- `product` -> default `things_to_do`
- `ticket` -> default `ticket`
- `ttd` -> default `things_to_do`

### `content_type`

Field nay chi tiet hon `intent_primary`.

Gia tri de xuat trong v1:

- `tour`
- `ticket`
- `attraction`
- `activity`
- `day_trip`
- `multi_day`
- `transfer`
- `cruise`
- `food_tour`
- `show`
- `private_tour`
- `destination_hub`

Nguyen tac:

- `intent_primary` dung de group campaign
- `content_type` dung de group adgroup/filter sau nay

### `is_private`

- field boolean, chi dung de biet page co phai private-only offer hay khong
- khong thay the `intent_primary`
- khong thay the `content_type`

Nguyen tac detect v1:

- chi set `true` khi title/url co signal private rat ro rang
- khong set `true` voi phrase mo ho kiem `private option`, `small-group or private`, `shared or private`
- mac dinh `false` neu khong du tin hieu

Vi du `true`:

- `Private Tour of Vatican Museums`
- `Private Transfer from CDG to Paris`
- `VIP Private Guided Tour`

Vi du `false`:

- `Small-Group or Private Versailles Tour`
- `Private Option Available`
- `Upgrade to Private Experience`

### `dsa_campaign`

Format v1:

`{intent_primary}_{geo_key}`

Trong do:

- `geo_key = city` neu city co gia tri
- fallback `geo_key = country` neu city rong

Vi du:

- `ticket_paris`
- `things_to_do_rome`
- `day_trip_london`
- `things_to_do_japan`

### `dsa_adgroup`

Format v1:

`{content_type}`

Vi du:

- `ticket`
- `day_trip`
- `food_tour`
- `destination_hub`

Ban v1 co chu y tranh lam adgroup qua sau.

## 5. Recommended Normalization Rules

Tat ca text field dung cho grouping nen:

- lowercase
- replace space bang `_` hoac `-`
- khong dau phay
- khong ky tu dac biet khong can thiet

Khuyen nghi cho schema v1:

- field business values: dung `snake_case`
- display text de nguyen trong `title`

Vi du:

- `United Kingdom` -> `united_kingdom`
- `Vatican City` -> `vatican_city`
- `food tour` -> `food_tour`

## 6. Minimal Record Example

### Product example

```json
{
  "url": "https://www.viator.com/tours/Paris/Normandy-D-Day-Battlefields-and-Beaches-Day-Trip/d479-2050NP",
  "title": "Normandy D-Day Beaches and American Cemetery Day Trip from Paris",
  "country": "france",
  "city": "paris",
  "page_type": "product",
  "intent_primary": "day_trip",
  "content_type": "day_trip",
  "is_private": false,
  "dsa_campaign": "day_trip_paris",
  "dsa_adgroup": "day_trip"
}
```

### Ticket example

```json
{
  "url": "https://www.viator.com/Paris-attractions/Eiffel-Tower/d479-a89",
  "title": "Tickets & tours in Eiffel Tower",
  "country": "france",
  "city": "paris",
  "page_type": "ticket",
  "intent_primary": "ticket",
  "content_type": "ticket",
  "dsa_campaign": "ticket_paris",
  "dsa_adgroup": "ticket"
}
```

### Things to do example

```json
{
  "url": "https://www.viator.com/Albania/d4471",
  "title": "Things to do in Albania",
  "country": "albania",
  "city": "",
  "page_type": "ttd",
  "intent_primary": "things_to_do",
  "content_type": "destination_hub",
  "dsa_campaign": "things_to_do_albania",
  "dsa_adgroup": "destination_hub"
}
```

## 7. What We Intentionally Exclude in V1

De tranh lap lai loi overengineering, v1 khong dua vao:

- province / state
- sub_city
- funnel_stage
- tier scoring phuc tap trong classifier
- theme cluster qua chi tiet
- landmark metadata rieng
- duration phan tich nang
- domestic US logic

Nhung field nay co the them o v2 neu thuc su can cho bidding hoac scale.

## 8. Final Recommendation

Neu AI coder build feature classify/export cho Viator outbound, mac dinh phai coi bo field chinh la:

- `country`
- `city`
- `page_type`
- `intent_primary`
- `content_type`
- `dsa_campaign`
- `dsa_adgroup`

Tat ca field khac deu la optional.
