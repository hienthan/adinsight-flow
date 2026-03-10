Dưới đây là Geo Hierarchy Spec (FINAL) để AI/engine xử lý geo_kb đúng cấp địa lý và không bị nhầm parent level.
Spec này không thay đổi dataset hiện tại, chỉ chuẩn hóa cách engine hiểu parent.

⸻

GEO HIERARCHY SPEC (FINAL)

1. Purpose

parent trong geo_kb luôn là:

direct geographic parent

Engine phải resolve chain để tìm ra:

city
province
country


⸻

2. Geo Levels

Engine sử dụng 5 cấp địa lý chuẩn:

1 country
2 province / island region
3 city / regency
4 sub_area / district
5 poi / landmark / transport hub


⸻

3. Geo Entity Types Mapping

type	level
country	1
province	2
region	2
island	2
core_area	3
city	3
regency	3
sub_area	4
district	4
landmark	5
tourist_spot	5
transport_hub	5
transport_system	5


⸻

4. Parent Rule

parent = direct geographic parent

Examples:

Province

{
 "bali": {
   "type": "province",
   "parent": "indonesia"
 }
}


⸻

City

{
 "denpasar": {
   "type": "city",
   "parent": "bali"
 }
}


⸻

Landmark

{
 "tanah-lot": {
   "type": "landmark",
   "parent": "bali"
 }
}


⸻

Transport Hub

{
 "benoa-port": {
   "type": "transport_hub",
   "parent": "bali"
 }
}


⸻

5. Parent Chain Resolution

Engine phải có ability:

resolve full geo chain

Example:

tanah-lot
→ parent bali
→ parent indonesia

Result:

country = indonesia
province = bali
city = null


⸻

Example:

soekarno-hatta-airport
→ parent jakarta
→ parent indonesia

Result:

city = jakarta
country = indonesia


⸻

6. Engine Geo Resolution Logic

Pseudo logic:

entity
↓
lookup geo_kb
↓
parent
↓
repeat until country


⸻

7. Geo Fields Output

Engine should populate:

country
province
city
geo_entity
geo_type

Example:

Slug:

snorkeling-gili-trawangan

Output:

geo_entity = gili-trawangan
geo_type = landmark
province = west-nusa-tenggara
country = indonesia


⸻

8. Missing Level Handling

Nếu entity không có level trung gian.

Example:

tanah-lot → bali → indonesia

Engine phải:

province = bali
city = null

Không tự tạo city.

⸻

9. Geo Score Usage

geo_score luôn lấy từ entity detect được.

Example:

tanah-lot geo_score = 9

Không dùng score của parent.

⸻

10. Geo Detection Priority

Nếu slug match nhiều entity:

prefer most specific level

Priority:

poi / landmark
transport hub
city
province
country

Example:

Slug:

tanah-lot-bali

Detected:

tanah-lot
bali

Chosen entity:

tanah-lot


⸻

11. Geo Alias Matching

Matching order:

canonical slug
aliases
normalized token

Example:

soetta → soekarno-hatta-airport


⸻

12. Edge Case Handling

Nếu slug chứa:

multiple geo entities

Engine chọn:

highest geo_score

Example:

bandung-jakarta-train

Prefer:

transport hub entity


⸻

13. Geo Dataset Integrity Rule

Dataset phải đảm bảo:

every entity except country has parent

Example:

VALID

bali → indonesia
denpasar → bali
tanah-lot → bali

INVALID

tanah-lot → indonesia

(skips province level)

⸻

14. Engine Determinism Rule

Geo detection phải:

deterministic
order-independent

Same slug must always return same geo.

⸻

15. Final Guarantee

Spec này đảm bảo engine:

resolve geo hierarchy correctly
populate province/city properly
avoid parent-level confusion
support mixed parent levels


⸻
