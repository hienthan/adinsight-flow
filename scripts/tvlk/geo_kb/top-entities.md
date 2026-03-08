Tốt — ta sẽ chốt taxonomy mapping hoàn chỉnh cho Top 50 entities theo schema đã thống nhất:

type
geo_score

Type dùng đúng enum đã chốt:

core_area
landmark
transport_hub
transport_system


⸻

CORE AREAS (Score 10)

Các travel regions / cities lớn.

bali → core_area
jakarta → core_area
yogyakarta → core_area
bandung → core_area
lombok → core_area
surabaya → core_area
medan → core_area
batam → core_area
labuan-bajo → core_area
raja-ampat → core_area


⸻

MAJOR DESTINATIONS (Score 9)

Các tourist places nổi tiếng.

ubud → landmark
canggu → landmark
seminyak → landmark
kuta → landmark
sanur → landmark
nusa-dua → landmark
nusa-penida → landmark
gili-trawangan → landmark
bromo → landmark
borobudur → landmark
prambanan → landmark
komodo → landmark
tanjung-benoa → landmark
uluwatu → landmark
tanah-lot → landmark


⸻

TOURISM HUB CITIES (Score 9)

Các city có tourism demand lớn.

denpasar → core_area
malang → core_area
solo → core_area
banyuwangi → core_area
makassar → core_area
balikpapan → core_area
manado → core_area
padang → core_area

Lưu ý:

solo → requires_context = true


⸻

AIRPORTS (Score 8)

soekarno-hatta → transport_hub
halim → transport_hub
ngurah-rai → transport_hub
yia → transport_hub
juanda → transport_hub
kualanamu → transport_hub
komodo-airport → transport_hub
lombok-airport → transport_hub


⸻

TRAIN STATIONS (Score 8)

manggarai → transport_hub
gambir → transport_hub
pasar-senen → transport_hub
yogyakarta-station → transport_hub
solo-balapan → transport_hub
bandung-station → transport_hub


⸻

FERRY PORTS (Score 8)

merak → transport_hub
bakauheni → transport_hub
ketapang → transport_hub
gilimanuk → transport_hub
padangbai → transport_hub
benoa → transport_hub
sanur-harbor → transport_hub
batam-center → transport_hub
sekupang → transport_hub


⸻

TRANSPORT SYSTEMS (Score 8)

whoosh → transport_system
krl → transport_system
mrt-jakarta → transport_system
lrt-jakarta → transport_system
kereta-bandara → transport_system


⸻

Tổng quan distribution

Type	Count
core_area	18
landmark	15
transport_hub	14
transport_system	5

Total:

~52 entities

(≈ Top 50 anchor layer)

⸻

Những entity cần flag đặc biệt

Các entity nên có:

requires_context = true

solo
padang
malang

vì dễ trùng với từ phổ biến.

⸻

Anchor layer rule

Top entities này sẽ:

không thay đổi entity key
không thay đổi geo_score

Chỉ thêm:

aliases
parent


⸻

Sau bước này

Chúng ta sẽ build geo_kb JSON files thực tế:

root_infrastructure.json
core_areas.json
landmarks.json
emerging_destinations.json
transport_tokens.json
spiritual_commercial.json

và Top 50 entities này sẽ được phân vào đúng file.

⸻

Nếu bạn muốn, tôi có thể giúp bạn build luôn file đầu tiên: root_infrastructure.json hoàn chỉnh (đã clean alias, parent, requires_context) để có thể load trực tiếp vào engine.