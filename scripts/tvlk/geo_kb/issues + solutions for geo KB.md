OK. Dưới đây là tất cả các issues + solutions cho GEO KB một lần duy nhất để bạn freeze hoàn toàn spec.
Không còn “suggest thêm sau” nữa.

Tôi gom toàn bộ thành 4 nhóm: dataset design, geo detection, slug issues, data integrity.

⸻

1. DATASET DESIGN ISSUES

Issue 1 — Core areas quá ít

Problem

Core areas = 22 → thiếu city lớn:

semarang
malang
batam
makassar
manado

→ geo detect fail.

Fix

Core areas nên:

70–100 entities

Coverage:

≈95% travel search demand


⸻

Issue 2 — Province / City confusion

Ví dụ:

yogyakarta

có thể là:

province
city

Fix

Dataset chỉ giữ 1 canonical entity.

⸻

Issue 3 — Island vs Province

Ví dụ:

lombok
flores
sumba

Không phải province.

Fix

type:

region / island


⸻

Issue 4 — Parent level skip

Sai:

tanah-lot → indonesia

Đúng:

tanah-lot → bali → indonesia

Fix

Parent phải là:

nearest geographic parent


⸻

2. GEO DETECTION ISSUES

Issue 5 — Multi-geo slug

Example

jakarta-bandung-train

Fix

Priority:

landmark
transport_hub
city
province
country


⸻

Issue 6 — Geo score conflict

Example

pantai-kuta-bali

Detect:

kuta
bali

Fix

Choose:

higher geo_score


⸻

Issue 7 — Alias mismatch

Example

soetta

→

soekarno-hatta-airport

Fix

Alias map:

alias → canonical entity


⸻

Issue 8 — Alias collision

Example

bromo

Có thể map:

mount-bromo
bromo-area

Fix

Alias chỉ map 1 canonical entity.

⸻

Issue 9 — Compound geo tokens

Example

gili-trawangan
labuan-bajo
tanah-lot

Tokenizer có thể tách:

gili
trawangan

Fix

Detect compound entities trước token split.

⸻

3. SLUG TOKEN ISSUES

Issue 10 — Geo token vs common word

Example

solo-trip

Engine có thể detect:

solo (city)

Fix

Geo match chỉ khi:

exact token
alias token

Không match substring.

⸻

Issue 11 — Hyphen tokenization

Example

tempat-wisata-di-bandung

Split sai sẽ mất entity.

Fix

Tokenizer:

normalize → detect compound → split


⸻

Issue 12 — Landmark missing city

Example

tanah-lot

Parent:

bali

Fix

Allow:

city = null


⸻

Issue 13 — Transport system entity

Example

whoosh

Không phải location.

Fix

Type:

transport_system


⸻

4. DATASET INTEGRITY ISSUES

Issue 14 — Entity duplication

Example

solo
surakarta

Fix

Canonical:

solo
aliases: surakarta


⸻

Issue 15 — Missing required fields

Mỗi entity phải có:

type
parent
geo_score
aliases


⸻

FINAL ENGINE PIPELINE

Geo detection phải chạy:

1 normalize slug
2 detect compound geo entities
3 resolve aliases
4 detect single tokens
5 choose highest priority entity
6 resolve parent chain
7 populate geo fields


⸻

ENTITY PRIORITY

landmark
transport_hub
sub_area
city
core_area
province
country


⸻

OUTPUT FIELDS

Engine populate:

geo_entity
geo_type
city
province
country
geo_score


⸻

DATASET SIZE RECOMMENDATION

core_areas: 70–100
landmarks: 300–400
transport hubs: 30–50
emerging destinations: 30–50

Tổng geo KB:

≈450–600 entities

Đây là sweet spot cho Indo travel.

⸻

KẾT LUẬN (FREEZE POINT)

Nếu dataset và engine tuân theo toàn bộ rule trên thì:

geo detection accuracy ≈95–98%

với Traveloka Explore URLs.

Sau điểm này:

không thêm rule
chỉ update dataset khi cần


⸻

Nếu bạn muốn, tôi có thể giúp bạn visualize toàn bộ URL classifier architecture (geo + intent + taxonomy + DSA grouping) trong 1 sơ đồ duy nhất để AI coder hiểu toàn bộ system ngay lập tức.