Dưới đây là BLUEPRINT DUY NHẤT (≈1 trang) cho URL Classifier Engine.
Mục tiêu: AI có thể code ngay, không cần đọc toàn bộ cuộc thảo luận trước.

⸻

URL CLASSIFIER ENGINE — FINAL BLUEPRINT

1. Purpose

Engine dùng để phân loại URL Traveloka (hoặc travel platform) trước khi feed vào Google Ads DSA page feed.

Engine không dự đoán traffic hay profit.
Google Ads sẽ quyết định phân phối.

Engine chỉ làm:

1. parse slug
2. detect geo entities
3. detect search intent
4. calculate scores
5. output labels


⸻

2. Input

Input file:

urls.txt

Ví dụ:

https://www.traveloka.com/id-id/explore/destination/pura-uluwatu-bali

Engine extract:

pura-uluwatu-bali


⸻

3. Engine Architecture

Pipeline:

URL
 ↓
slug extraction
 ↓
normalize text
 ↓
tokenize
 ↓
remove stopwords
 ↓
alias normalization
 ↓
geo entity detection
 ↓
intent detection
 ↓
scoring
 ↓
classification output


⸻

4. Slug Processing Rules

Normalize

lowercase
remove punctuation

Example

Tanah-Lot → tanah lot


⸻

Tokenization

Split by:

-
_
/
space

Example

kawah-putih-bandung
→ kawah putih bandung


⸻

Stopword Removal

Using:

geo_stopwords.json

Remove tokens:

wisata
tempat
pantai
jalan
guide


⸻

5. Geo Entity Detection

Dataset location:

geo_kb/

Files:

part1_root_infrastructure.json
part2_core_areas.json
part3_landmarks.json
part4_emerging_destinations.json
part5_root_transport_tokens.json
part6_spiritual_commercial_roots.json

Plus:

geo_alias_index.json
geo_stopwords.json


⸻

Entity Types

core_area
landmark
emerging_destination
transport_hub
transport_system
spiritual_root
commercial_root
iconic_root


⸻

Matching Rules

Detection order:

1. alias match
2. token combination match
3. canonical match

Use:

longest entity match wins

Example

soekarno hatta airport

→ detect

soekarno-hatta-airport


⸻

Duplicate Rule

If multiple detections:

keep unique canonical entities only


⸻

6. Geo Scoring

Entity scores:

core_area = 10
landmark = 9
transport_hub/system = 8
emerging_destination = 7
spiritual/commercial/iconic = 6

Calculation:

geo_score = max(entity_scores)

if entity_count ≥ 2
geo_score += 1


⸻

7. Intent Detection

Intent detected via keyword dictionary.

Intent groups:

destination
things_to_do
transport
planning
information
commercial

Examples

destination

bali
bandung
labuan bajo


⸻

things_to_do

things to do
tempat wisata
aktivitas


⸻

transport

kereta
bandara
pelabuhan
rute
jadwal


⸻

planning

harga
biaya
budget
cost


⸻

information

guide
tips
info


⸻

commercial

ticket
booking
hotel
tour


⸻

8. Intent Scoring

things_to_do = 9
destination = 8
planning = 8
transport = 7
information = 6
commercial = 5


⸻

9. Planning Signal Detection

Planning keywords:

harga
biaya
budget
cost
estimate

Planning signal:

1 if detected
0 otherwise


⸻

10. FinalScore Formula

FinalScore =
IntentScore * 0.5
+ GeoScore * 0.3
+ PlanningSignal * 0.2


⸻

11. Output Structure

Engine output per URL:

{
"url":"...",
"slug":"...",
"entities":["bali","uluwatu"],
"intent":"planning",
"geo_score":10,
"intent_score":8,
"final_score":8.6
}


⸻

12. Page Feed Labels

Engine should generate labels:

intent_destination
intent_things_to_do
intent_transport
intent_planning
intent_information

Geo labels:

geo_bali
geo_java
geo_sumatra
geo_sulawesi

Tier labels:

tier_high
tier_mid
tier_low


⸻

13. Dataset Size (Production)

Recommended KB scale:

core areas ≈ 50
landmarks ≈ 350
emerging destinations ≈ 80
transport hubs ≈ 35
spiritual/commercial ≈ 25

Total:

≈540 canonical entities
≈600 aliases


⸻

14. Non-Goals (Important)

Engine does NOT attempt to:

predict search demand
predict CPC
predict profit
predict Google ranking

Those are handled by Google Ads auction.

⸻

15. Implementation Goal

Engine must be:

rule-based
fast
deterministic
easy to update dataset

Recommended language:

Python / Go / Node


⸻

✅ Result

This blueprint defines:

engine architecture
dataset structure
detection rules
scoring rules

→ AI can now generate the full URL classifier code directly from this spec.

⸻

Nếu bạn muốn, tôi có thể tiếp tục giúp bạn viết prompt cực chuẩn để AI generate toàn bộ code URL Classifier (≈400–600 lines) dựa trên blueprint này — và chạy được ngay lần đầu.