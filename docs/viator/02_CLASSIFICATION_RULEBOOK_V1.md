# Viator Outbound Classification Rulebook V1

Muc tieu cua rulebook nay:

- tao mot classifier engine de doc `url + title + source metadata`
- sinh ra bo field nho, phuc vu DSA outbound
- deterministic, de maintain, de mo rong
- bam sat style engine hien co cua TVLK/Klook

Rulebook nay chi danh cho Viator outbound.
Khong dung cho US domestic.

## 1. Inputs

Moi row dau vao co toi thieu:

- `url`
- `title`
- `country`

Trong do:

- `country` da duoc gan truoc tu file import
- classifier khong duoc tu detect country nua

## 2. Outputs

Classifier phai sinh ra:

- `city`
- `page_type`
- `intent_primary`
- `content_type`
- `is_private`
- `dsa_campaign`
- `dsa_adgroup`

## 3. Pipeline

Thu tu xu ly bat buoc:

1. normalize inputs
2. detect `page_type`
3. extract `city`
4. classify `intent_primary`
5. classify `content_type`
6. detect `is_private`
7. generate `dsa_campaign`
8. generate `dsa_adgroup`

Khong duoc generate campaign truoc khi chot `intent_primary` va `city`.

## 4. Normalization Rules

Truoc khi classify:

- trim whitespace
- decode URL-safe text neu can
- lower-case cho string dung de match rule
- khong thay doi `title` goc de xuat export

Nen tao 3 bien support:

- `url_lc`
- `title_lc`
- `path_segments`

## 5. Page Type Detection

Rule nay la deterministic va nen chay truoc tien.

### Rule set

Neu URL match pattern:

- `/tours/` -> `page_type = product`
- `-attractions/` -> `page_type = ticket`
- path ngan kieu `https://www.viator.com/Albania/d4471` -> `page_type = ttd`

Fallback theo title:

- title bat dau bang `Tickets & tours in ` -> `ticket`
- title bat dau bang `Things to do in ` -> `ttd`

Neu khong match:

- default `page_type = product`

## 6. City Extraction

`city` la geo key chinh cua outbound.
Engine phai uu tien URL truoc, title sau.

### Priority 1: extract tu URL

#### Product pages

Pattern:

`/tours/{city_segment}/...`

Vi du:

- `/tours/Paris/...` -> `paris`
- `/tours/San-Antonio/...` -> `san_antonio`
- `/tours/Kyoto/...` -> `kyoto`

#### Ticket pages

Pattern:

`/{city_segment}-attractions/{attraction_slug}/...`

Vi du:

- `/Paris-attractions/Eiffel-Tower/...` -> `paris`
- `/Rome-attractions/Colosseum/...` -> `rome`

#### TTD pages

Pattern:

`https://www.viator.com/{destination_slug}/d...`

TTD page co the la city page hoac country page.
Khong duoc doan bua.

Rule:

- neu title la `Things to do in {country}` va {country} trung voi `country` row -> de `city = ""`
- nguoc lai, coi destination trong title la `city`

Vi du:

- `Things to do in Albania` + `country=albania` -> `city=""`
- `Things to do in Tirana` + `country=albania` -> `city=tirana`

### Priority 2: fallback tu title

Chi dung khi URL khong extract duoc.

Rules:

- `... from {city}` -> lay `{city}`
- `... in {city}` -> lay `{city}` neu title pattern ro
- `Private ... in {city}` -> lay `{city}`

Neu co nhieu city trong title:

- uu tien city o URL
- neu khong co city o URL, uu tien city xuat hien sau cac pattern:
  - `from {city}`
  - `in {city}`

Neu van mo ho:

- de rong

## 7. Intent Classification

Intent phai nho gon, phuc vu grouping campaign.

### Allowed values

- `things_to_do`
- `ticket`
- `day_trip`
- `multi_day`
- `transport`
- `cruise`
- `food`
- `show`
- `private_tour`

### Rules by priority

Rule nao match truoc thi dung rule do.

1. `ticket`
   Dieu kien:
   - `page_type = ticket`

2. `multi_day`
   Dieu kien title match:
   - `2-day`
   - `3-day`
   - `4-day`
   - `multi-day`
   - `overnight`
   - `2 days`
   - `3 days`

3. `day_trip`
   Dieu kien title match:
   - `day trip`
   - `full-day`
   - `full day`
   - `shared tour from`
   - `excursion`

4. `transport`
   Dieu kien title hoac URL match:
   - `transfer`
   - `airport transfer`
   - `private transfer`
   - `shuttle`

5. `cruise`
   Dieu kien title hoac URL match:
   - `cruise`
   - `river cruise`
   - `sunset cruise`
   - `catamaran`
   - `sailing`
   - `boat tour`

6. `food`
   Dieu kien title match:
   - `food tour`
   - `street food`
   - `wine tour`
   - `tasting`
   - `cooking class`

7. `show`
   Dieu kien title match:
   - `show`
   - `cabaret`
   - `flamenco`
   - `performance`
   - `concert`

8. `private_tour`
   Dieu kien title match:
   - `private tour`
   - `private experience`
   - `private guide`

9. default
   - `product` -> `things_to_do`
   - `ttd` -> `things_to_do`

## 8. Content Type Classification

`content_type` chi tiet hon `intent_primary`.

### Allowed values

- `tour`
- `ticket`
- `activity`
- `attraction`
- `day_trip`
- `multi_day`
- `transfer`
- `cruise`
- `food_tour`
- `show`
- `private_tour`
- `destination_hub`

### Rules

1. `page_type = ticket`
   - `content_type = ticket`

2. `page_type = ttd`
   - `content_type = destination_hub`

3. `intent_primary = day_trip`
   - `content_type = day_trip`

4. `intent_primary = multi_day`
   - `content_type = multi_day`

5. `intent_primary = transport`
   - `content_type = transfer`

6. `intent_primary = cruise`
   - `content_type = cruise`

7. `intent_primary = food`
   - `content_type = food_tour`

8. `intent_primary = show`
   - `content_type = show`

9. `intent_primary = private_tour`
   - `content_type = private_tour`

10. default cho product
   - `content_type = tour`

Neu sau nay can them `activity` hay `attraction`, chi them khi co rule ro rang. Khong nen doan tu do.

## 9. Private Detection

`is_private` la field bo sung, khong duoc suy dien qua tay.

### Nguyen tac

- chi set `true` khi title/url co explicit private signal
- uu tien precision hon recall
- mac dinh `false` neu title/url mo ho

### Strong positive patterns

- `private tour`
- `private day trip`
- `private excursion`
- `private guide`
- `private guided`
- `private transfer`
- `private experience`
- `privately guided`
- `vip private`

### Negative / ambiguous patterns

Neu title/url co cac pattern sau, khong duoc auto-set `true`:

- `small-group or private`
- `shared or private`
- `private option`
- `private option available`
- `upgrade to private`
- `private room`
- `private table`

### Rule order

1. neu match negative / ambiguous pattern -> `is_private = false`
2. neu match strong positive pattern -> `is_private = true`
3. default -> `is_private = false`

## 10. Campaign Generation

`dsa_campaign` la key group chinh.

Format:

`{intent_primary}_{geo_key}`

### Geo key rule

- neu `city` co gia tri -> `geo_key = city`
- neu `city` rong -> `geo_key = country`

### Examples

- `ticket_paris`
- `things_to_do_rome`
- `day_trip_london`
- `things_to_do_albania`

### Constraints

- phai deterministic
- khong tao campaign theo landmark
- khong dung attraction name lam geo key
- uu tien city-level grouping de tranh campaign explosion

## 11. Ad Group Generation

V1 rat don gian:

`dsa_adgroup = {content_type}`

Vi du:

- `ticket`
- `tour`
- `day_trip`
- `food_tour`
- `destination_hub`

Khong nen generate adgroup qua chi tiet trong v1.

## 12. Edge Case Rules

### Case 1: title co nhieu city

Vi du:

`Transfer From Palermo to Catania with a Stop in Agrigento`

Rule:

- city grouping van uu tien city extract tu URL
- trong vi du tren, URL dang o `/tours/Palermo/...`
- `city = palermo`

Ly do:

- campaign phai stable
- URL origin city tren Viator thuong la destination anchor de user search

### Case 2: ticket page co attraction name rat manh

Vi du:

`Tickets & tours in Eiffel Tower`

Rule:

- khong dung `eiffel_tower` lam `dsa_campaign`
- van dung `ticket_paris`

Attraction chi co the dung sau nay cho ad copy hay labels mo rong, khong dung trong v1 grouping key.

### Case 3: TTD page cap country

Vi du:

`Things to do in Albania`

Rule:

- `city = ""`
- `dsa_campaign = things_to_do_albania`

### Case 4: title mo ho

Neu khong detect duoc city chac chan:

- giu `city = ""`
- fallback campaign theo country

Khong duoc hallucinate city.

## 13. Recommended Pseudocode

```python
def classify_viator_row(url, title, country):
    page_type = detect_page_type(url, title)
    city = extract_city(url, title, country, page_type)
    intent_primary = detect_intent(url, title, page_type)
    content_type = detect_content_type(page_type, intent_primary, url, title)
    is_private = detect_is_private(url, title)

    geo_key = city if city else country
    dsa_campaign = f"{intent_primary}_{geo_key}"
    dsa_adgroup = content_type

    return {
        "url": url,
        "title": title,
        "country": country,
        "city": city,
        "page_type": page_type,
        "intent_primary": intent_primary,
        "content_type": content_type,
        "is_private": is_private,
        "dsa_campaign": dsa_campaign,
        "dsa_adgroup": dsa_adgroup,
    }
```

## 14. Record Examples

### Product

```json
{
  "url": "https://www.viator.com/tours/Paris/Normandy-D-Day-Battlefields-and-Beaches-Day-Trip/d479-2050NP",
  "title": "Normandy D-Day Beaches and American Cemetery Day Trip from Paris",
  "country": "france",
  "city": "paris",
  "page_type": "product",
  "intent_primary": "day_trip",
  "content_type": "day_trip",
  "dsa_campaign": "day_trip_paris",
  "dsa_adgroup": "day_trip"
}
```

### Ticket

```json
{
  "url": "https://www.viator.com/Paris-attractions/Louvre-Museum/d479-a73",
  "title": "Tickets & tours in Louvre Museum",
  "country": "france",
  "city": "paris",
  "page_type": "ticket",
  "intent_primary": "ticket",
  "content_type": "ticket",
  "dsa_campaign": "ticket_paris",
  "dsa_adgroup": "ticket"
}
```

### TTD

```json
{
  "url": "https://www.viator.com/Tirana/d23957",
  "title": "Things to do in Tirana",
  "country": "albania",
  "city": "tirana",
  "page_type": "ttd",
  "intent_primary": "things_to_do",
  "content_type": "destination_hub",
  "dsa_campaign": "things_to_do_tirana",
  "dsa_adgroup": "destination_hub"
}
```

## 14. Best Practices for Future Expansion

Neu mo rong classifier sau nay, chi them field/rule khi co ly do ro rang:

1. no cai thien campaign structure hoac export quality
2. no deterministic
3. no khong lam engine kho debug hon

Thu tu uu tien mo rong:

1. bo sung city extraction accuracy
2. bo sung intent rules
3. bo sung export labels
4. domestic US spec rieng

Khong nen:

- dua AI free-form classification vao core rule v1
- tao qua nhieu taxonomy field
- group campaign theo landmark
- tron outbound va domestic vao cung 1 bo rule
