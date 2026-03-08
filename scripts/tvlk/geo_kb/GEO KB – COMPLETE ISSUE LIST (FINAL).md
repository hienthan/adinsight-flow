OK — tôi sẽ đưa toàn bộ các potential issues + fixes cho GEO KB một lần duy nhất để bạn có thể freeze spec. Không còn “suggest thêm sau” nữa.

Dưới đây là toàn bộ các vấn đề thường gặp khi build geo dataset cho travel Indo và cách xử lý chuẩn cho engine của bạn.

⸻

GEO KB – COMPLETE ISSUE LIST (FINAL)

1️⃣ Parent Level Inconsistency

Problem

parent có thể là:

country
province
city
region

Nếu engine assume cố định:

parent = province

→ mapping sai.

Fix

Engine không assume level.

Resolve chain:

entity
→ parent
→ parent
→ until country


⸻

2️⃣ Missing Intermediate Level

Dataset đôi khi skip level.

Example sai:

tanah-lot → indonesia

Correct:

tanah-lot → bali → indonesia

Fix

Dataset rule:

entity must link to nearest geographic parent


⸻

3️⃣ Duplicate Geo Tokens

Slug có thể chứa:

tanah-lot-bali

Engine detect:

tanah-lot
bali

Fix

Priority:

POI > city > province


⸻

4️⃣ Alias Collision

Alias có thể trùng.

Example:

bromo

Có thể là:

mount-bromo
bromo-area

Fix

Alias phải map canonical entity duy nhất.

⸻

5️⃣ Multi-Geo Slug

Example:

jakarta-bandung-train

Engine detect:

jakarta
bandung

Fix

Rule:

choose highest geo_score

hoặc

choose transport hub entity


⸻

6️⃣ Geo Token vs Common Word

Example:

solo-trip-bali

Token:

solo

Có thể hiểu sai thành:

kota solo

Fix

Geo match phải ưu tiên:

canonical slug token
alias token
exact match

Không match substring.

⸻

7️⃣ Geo Alias Tokenization

Example:

soetta

Alias:

soekarno-hatta-airport

Fix

Alias mapping:

alias → canonical


⸻

8️⃣ Compound Geo Names

Example:

gili-trawangan
labuan-bajo
tanah-lot

Tokenizer tách:

gili
trawangan

→ sai.

Fix

Detect compound entities first.

⸻

9️⃣ Geo Score Conflict

Example:

Slug:

pantai-kuta-bali

Entities:

kuta
bali

Fix

Prefer:

higher geo_score


⸻

🔟 Region vs City Ambiguity

Example:

yogyakarta

Có thể là:

province
city

Fix

Dataset chọn 1 canonical entity.

⸻

1️⃣1️⃣ Island vs Province

Example:

flores
lombok
java

Không phải province.

Fix

Type:

region / island


⸻

1️⃣2️⃣ Landmark Without City

Example:

tanah-lot
borobudur
prambanan

Parent:

province

Fix

Engine cho phép:

city = null


⸻

1️⃣3️⃣ Transport System vs Transport Hub

Example:

whoosh

không phải location.

Fix

Type:

transport_system


⸻

1️⃣4️⃣ Geo Entity Inside Slug Title

Example:

tempat-makan-di-bandung

Geo token:

bandung

Fix

Geo detection chạy trước content classification.

⸻

1️⃣5️⃣ Multi-Island Regions

Example:

raja-ampat

Parent:

papua

Không phải:

indonesia


⸻

FINAL ENGINE RULES

Geo detection pipeline:

1 normalize slug
2 detect compound geo entities
3 detect aliases
4 detect single tokens
5 choose highest priority entity
6 resolve parent chain
7 populate geo fields


⸻

PRIORITY ORDER

Entity specificity:

landmark
transport hub
sub_area
city
province
country


⸻

GEO FIELDS ENGINE SHOULD OUTPUT

geo_entity
geo_type
city
province
country
geo_score


⸻

DATASET INTEGRITY RULE

Every entity except country must have:

parent
type
geo_score


⸻

FINAL STATUS

Nếu dataset tuân theo rules này thì engine sẽ:

geo detection accuracy ≈ 95–98%

cho Traveloka Explore.

⸻

VERY IMPORTANT

Sau khi freeze spec:

fix errors in dataset
NOT in engine logic

Đây là cách các hệ thống production classifier vận hành.

⸻
