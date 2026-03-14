Rất tốt. Bây giờ chúng ta làm đúng bước của một senior system design:

1️⃣ Chốt DATA MODEL (schema)
2️⃣ Sau đó mới bàn engine mapping → field nào ghi dữ liệu gì

Tôi sẽ thiết kế schema chuẩn cho PocketBase theo logic engine mới, đảm bảo:

✔ đúng specs classifier
✔ dễ filter GUI
✔ dễ export CSV
✔ không legacy logic
✔ không overengineering

Tôi sẽ ghi theo format:

tvlk_pages pocketbase collection:

field | pocketbase type | notes


⸻

1. Core Identity Fields

field	type	specs
platform	relation → platforms	mặc định traveloka
url	url	full URL
slug	text	slug gốc
slug_en	text	slug dịch EN
title_en	text	title readable
canonical_id	text	id của canonical URL


⸻

2. Geo Detection Fields

Engine geo detection sẽ ghi vào nhóm này.

field	type	specs
country	text	ví dụ: indonesia
province	text	bali, west_java
city	text	bandung
sub_city	text	ubud
geo_entity	text	canonical entity detect
geo_type	text	core_area, landmark, airport
display_name	text	human readable


⸻

3. Geo Engine Signals

Các field giúp debug engine.

field	type	specs
entity_count	number (int)	số entity detect
geo_score	number (float)	geo_score từ entity
final_score	number (float)	(intent_score * 0.5) + (geo_score * 0.3) + (planning_signal * 0.2)
tier	text/select	1, 2, 3, 4


⸻

4. Intent Detection Fields

Output của intent engine.

field	type	specs
intent_primary	text	transport / planning / things_to_do
intent_score	number (float)	score sau pattern boost
intent_patterns	text	comma list pattern detect


⸻

5. Infrastructure Signals

Cho transport intent.

field	type	specs
infra_type	text	airport, railway, ferry_port
travel_distance_bias	text	long / regional / commuter


⸻

6. Content Classification

Dùng để phân loại content page.

field	type	specs
content_type	text	guide / itinerary / attraction
sub_tag	text	suffix classification


⸻

7. Campaign Grouping Fields

Dùng để group DSA feeds.

field	type	specs
dsa_campaign	text	campaign grouping


⸻

8. Engine Debug Fields (rất nên có)

Các field giúp bạn debug classifier cực nhanh.

field	type	specs
slug_tokens	json	token list
detected_patterns	json	pattern list
detected_keywords	json	keyword match


⸻

9. System Fields

field	type	specs
is_active	bool	default true
last_http_status	number	latest confirmed HTTP status from manual 404 checker job
last_check_error	text	latest non-HTTP checker result (timeout, tls_blocked, soft_404, request_error)
last_checked_at	date	latest manual 404 checker execution timestamp
created	datetime	system
updated	datetime	system


⸻

10. Final PocketBase Schema

Toàn bộ collection:

platform (relation)

url
slug
slug_en
title_en
canonical_id

country
province
city
sub_city

geo_entity
geo_type
display_name

entity_count
geo_score

intent_primary
intent_score
intent_patterns

infra_type
travel_distance_bias

content_type
sub_tag

dsa_campaign

slug_tokens (json)
detected_patterns (json)
detected_keywords (json)

is_active
last_http_status
last_check_error
last_checked_at

created
updated


⸻

11. PocketBase Type Mapping

Để tránh lỗi khi tạo collection:

type	field
relation	platform
url	url
text	slug, city, intent, last_check_error
number	scores, last_http_status
bool	is_active
date	last_checked_at
json	debug arrays
datetime	created updated


⸻

12. Ví dụ record thực tế

Ví dụ URL:

https://www.traveloka.com/id-id/explore/destination/itinerary-bali-3-hari-2-malam

Record:

{
"slug": "itinerary-bali-3-hari-2-malam",
"province": "bali",
"geo_entity": "bali",
"geo_type": "core_area",

"entity_count": 1,
"geo_score": 9,

"intent_primary": "planning",
"intent_score": 12,
"intent_patterns": "itinerary,3-hari-2-malam",

"content_type": "itinerary",

"slug_tokens": ["itinerary","bali","3","hari","2","malam"]
}


⸻

13. GUI Filter sẽ cực mạnh

Ví dụ:

tìm LP Bali

province = bali
intent_primary = things_to_do


⸻

tìm LP transport

infra_type = airport


⸻

tìm LP itinerary

intent_primary = planning
content_type = itinerary


⸻

14. Tại sao schema này đúng với engine

Engine hiện tại chỉ làm:

slug parse
geo detect
intent detect
pattern detect

Schema phản ánh đúng 4 bước này.

Không có:

affiliate scoring
CPC scoring
tier logic


⸻

15. Senior dev verdict

Schema này:

✔ đúng specs engine
✔ tối ưu cho PocketBase
✔ GUI filter rất mạnh
✔ export CSV sạch
✔ dễ debug classifier


⸻

Bước tiếp theo (rất quan trọng)

Sau khi schema đã chuẩn, chúng ta cần chốt:

ENGINE → FIELD MAPPING

tức là:

engine output nào
ghi vào field nào

Vì nếu mapping sai thì:

classifier chạy đúng
data trong DB lại sai

Tôi có thể giúp bạn viết mapping table chuẩn (engine → pocketbase fields) để AI code không thể ghi sai field.
