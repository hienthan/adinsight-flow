Rất tốt. Đây là bước quan trọng nhất để tránh bug khi AI code:
ENGINE OUTPUT → DB FIELD MAPPING

Mục tiêu:

engine chạy → output signals
↓
signals map đúng field PocketBase
↓
GUI filter chuẩn
↓
export CSV chuẩn

Tôi sẽ viết theo format senior dev implementation spec để AI coder không thể ghi sai field.

⸻

1. Engine Pipeline (Reminder)

Engine xử lý URL theo thứ tự:

URL
↓
slug parsing
↓
slug tokenization
↓
geo entity detection
↓
intent detection
↓
pattern detection
↓
content classification
↓
campaign grouping
↓
insert record


⸻

2. URL Parsing → Field Mapping

Input URL:

https://www.traveloka.com/id-id/explore/destination/itinerary-bali-3-hari-2-malam

Engine extract:

Engine Output	DB Field
platform	Traveloka
full url	url
slug	slug

Example record:

"url": "https://www.traveloka.com/id-id/explore/destination/itinerary-bali-3-hari-2-malam",
"slug": "itinerary-bali-3-hari-2-malam"

-> Logic phần này như cũ, k có thay đổi

⸻

3. Slug Translation → Field Mapping

Slug translator outputs:

Logic phần này như cũ, k có thay đổi:
vẫn dịch từ slug ra title_en
slug_en hiện tại ko dùng


⸻

4. Tokenizer → Field Mapping

Tokenizer outputs tokens.

Engine Output	DB Field
tokens	slug_tokens

Example:

"slug_tokens": [
"itinerary",
"bali",
"3",
"hari",
"2",
"malam"
]


⸻

5. Geo Detection → Field Mapping

GeoEngine returns:

entity
geo_type
province
city
sub_city
display_name
entity_count
geo_score

Mapping:

Engine Output	DB Field
entity	geo_entity
entity type	geo_type
province	province
city	city
sub city	sub_city
display name	display_name
entity count	entity_count
geo score	geo_score
country	country

Example:

"geo_entity": "bali",
"geo_type": "core_area",
"province": "bali",
"city": "",
"sub_city": "",
"display_name": "Bali",
"entity_count": 1,
"geo_score": 9,
"country": "indonesia"


⸻

6. Infrastructure Detection → Field Mapping

GeoEngine also returns infrastructure signals.

Mapping:

Engine Output	DB Field
infra type	infra_type
distance bias	travel_distance_bias

Example:

"infra_type": "airport",
"travel_distance_bias": "long"


⸻

7. Pattern Detection → Field Mapping

Pattern engine returns:

pattern list

Mapping:

Engine Output	DB Field
patterns detected	detected_patterns
patterns (string)	intent_patterns

Example:

"detected_patterns": [
"itinerary",
"3-hari-2-malam"
],
"intent_patterns": "itinerary,3-hari-2-malam"


⸻

8. Keyword Detection → Field Mapping

Keyword engine returns matched keywords.

Mapping:

Engine Output	DB Field
keyword list	detected_keywords

Example:

"detected_keywords": [
"itinerary"
]


⸻

9. Intent Detection → Field Mapping

Intent engine outputs:

intent
intent_score

Mapping:

Engine Output	DB Field
intent	intent_primary
score	intent_score

Example:

"intent_primary": "planning",
"intent_score": 12


⸻

10. Content Classification → Field Mapping

logic cũ đang làm tốt phần này, hãy dùng lại

Content classifier returns:

content_type
sub_tag

Mapping:

Engine Output	DB Field
content type	content_type
suffix/tag	sub_tag


⸻

11. Campaign Generator → Field Mapping

field: dsa_campaign sẽ có notes quan trọng ở cuối file

⸻

12. Canonical Detection → Field Mapping

dùng logic cũ với canonical_id


⸻

Field	
country: logic cũ để detect country
is_active: logic cũ đang làm tốt với exclude_keywords.json


⸻

14. Final Insert Record Example

Full record:

{
"url": "https://www.traveloka.com/id-id/explore/destination/itinerary-bali-3-hari-2-malam",
"slug": "itinerary-bali-3-hari-2-malam",

"slug_en": "itinerary bali 3 days 2 nights",
"title_en": "Bali 3 Days 2 Nights Itinerary",

"country": "indonesia",
"province": "bali",

"geo_entity": "bali",
"geo_type": "core_area",
"display_name": "Bali",

"entity_count": 1,
"geo_score": 9,

"intent_primary": "planning",
"intent_score": 12,

"intent_patterns": "itinerary,3-hari-2-malam",

"content_type": "itinerary",

"slug_tokens": [
"itinerary",
"bali",
"3",
"hari",
"2",
"malam"
],

"is_active": true
}


⸻

15. Implementation Rule (Critical)

When inserting record:

DO NOT overwrite fields
if engine output is null

Example:

infra_type = null

Do not insert empty string.

⸻

16. Insert Strategy

Engine must:

insert new record
or
update existing canonical_id


⸻

17. Senior Dev Verdict

Mapping này đảm bảo:

engine signals
↓
DB schema
↓
GUI filter
↓
CSV export

không bị sai.

⸻

dsa_campaign: notes quan trọng

Tôi sẽ làm đúng 2 phần bạn cần:

1️⃣ Rule tránh “1 province → 50 campaigns”
2️⃣ Summary ngắn gọn cho AI hiểu field dsa_campaign

⸻

1. Rule quan trọng: tránh campaign explosion

Vấn đề thường gặp trong automation:

Ví dụ Bali có rất nhiều entity:

ubud
canggu
seminyak
tanah-lot
uluwatu
kuta
nusa-penida
nusa-dua
sanur

Nếu engine tạo campaign theo mọi entity detect được:

things_to_do_ubud
things_to_do_canggu
things_to_do_tanah-lot
things_to_do_uluwatu
things_to_do_kuta
...

DSA sẽ bị:

campaign explosion
learning bị phân tán
traffic rất yếu


⸻

Rule chuẩn (senior DSA rule)

Campaign key không được dùng landmark level.

Chỉ dùng:

province
city
transport hub


⸻

Rule cụ thể

if geo_type in ["landmark","tourist_spot","beach","temple"]:
    geo_key = province

elif geo_type in ["city","resort_area"]:
    geo_key = city

elif geo_type in ["airport","station","transport_hub"]:
    geo_key = geo_entity

else:
    geo_key = province


⸻

Ví dụ đúng

Slug

tanah-lot-temple-bali

Detect

geo_entity = tanah-lot
geo_type = landmark
province = bali

Campaign:

things_to_do_bali

KHÔNG phải:

things_to_do_tanah-lot


⸻

Ví dụ transport

Slug

jadwal-kereta-bandara-yia

Detect

infra_type = airport
geo_entity = yia_airport

Campaign:

transport_yia_airport

Transport nên giữ entity level.

⸻

2. Summary ngắn gọn cho AI (dùng trong prompt)

Bạn có thể đưa đoạn này cho AI coder.

⸻

dsa_campaign field specification

dsa_campaign is the campaign grouping key used for DSA page feeds.

Format:
{intent}_{geo_key}

intent = primary detected intent
geo_key = geographic grouping key

geo_key rule

if geo_type = landmark or tourist_spot
    geo_key = province

if geo_type = city or resort_area
    geo_key = city

if geo_type = transport hub (airport, station, ferry_port)
    geo_key = geo_entity

examples

planning_bali
things_to_do_bandung
transport_yia_airport
transport_soekarno_hatta_airport

constraint

do not create campaigns for landmarks
avoid campaign explosion
prefer province-level grouping for attractions


⸻

3. Rule cực quan trọng cho engine

AI coder cần hiểu:

dsa_campaign must be deterministic
same URL must always generate same campaign key


⸻

4. Final design result

DSA structure sẽ tự nhiên giống:

planning_bali
planning_bandung
things_to_do_bali
things_to_do_jakarta
transport_soekarno_hatta_airport
transport_yia_airport

Đây là structure rất chuẩn cho travel DSA.

⸻

💡 Senior insight cuối cùng (rất giá trị):

Nếu engine làm đúng rule này thì 90% page feeds sẽ tự gom về khoảng 20–40 campaign.

Đây chính là quy mô tối ưu cho learning của Google Ads.

⸻

Nếu bạn muốn, tôi có thể viết luôn generate_dsa_campaign() pseudo-code (~15 dòng) để AI coder không thể implement sai rule này.