Dưới đây là PROMPT CHUẨN để đưa cho AI coding (Gemini / ChatGPT / Claude).
Prompt này đã được viết theo kiểu senior dev specification prompt để AI generate code đúng ngay lần đầu, tránh việc code sai architecture.

Bạn chỉ cần copy toàn bộ prompt dưới đây và đưa cho AI coding.

⸻

PROMPT: Build URL Classifier Engine

You are a senior backend engineer.

Your task is to build a rule-based URL classifier engine for travel URLs.

The engine must follow the architecture and rules described below.

The implementation must be clean, deterministic, modular, and production-ready.

Language: Python

⸻

1. Purpose

The engine classifies travel URLs before feeding them into Google Ads DSA page feeds.

The engine must:
	1.	parse URL slug
	2.	detect geo entities
	3.	detect search intent
	4.	calculate scores
	5.	output structured classification data

The engine must NOT attempt to predict traffic, CPC, or profit.

⸻

2. Input

Input file:

urls.txt

Example line:

https://www.traveloka.com/id-id/explore/destination/pura-uluwatu-bali

The engine extracts:

pura-uluwatu-bali


⸻

3. Required Project Structure

url_classifier/

main.py
engine.py
slug_parser.py
entity_detector.py
intent_detector.py
scoring.py

geo_kb/
  part1_root_infrastructure.json
  part2_core_areas.json
  part3_landmarks.json
  part4_emerging_destinations.json
  part5_root_transport_tokens.json
  part6_spiritual_commercial_roots.json
  geo_alias_index.json
  geo_stopwords.json

data/
  urls.txt


⸻

4. Engine Pipeline

The pipeline must follow this order:

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

5. Slug Processing Rules

Normalize:
	•	lowercase
	•	remove punctuation

Example:

Tanah-Lot → tanah lot

Tokenization splits on:

-
_
/
space

Example:

kawah-putih-bandung
→ kawah putih bandung

Stopwords are removed using:

geo_stopwords.json


⸻

6. Geo Entity Detection

Geo knowledge base files are stored in:

geo_kb/

Entity datasets:

core_area
landmark
emerging_destination
transport_hub
transport_system
spiritual_root
commercial_root
iconic_root

Matching rules:
	1.	alias match
	2.	token combination match
	3.	canonical match

Rule:

longest entity match wins

Example:

soekarno hatta airport
→ soekarno-hatta-airport

Duplicate detections must be removed so that each canonical entity appears only once.

⸻

7. Geo Scoring

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

8. Intent Detection

Intent is detected using keyword dictionaries.

Intent categories:

destination
things_to_do
transport
planning
information
commercial

Examples:

destination keywords:

bali
bandung
labuan bajo

things_to_do:

things to do
tempat wisata
aktivitas

transport:

kereta
bandara
pelabuhan
rute
jadwal

planning:

harga
biaya
budget
cost

information:

guide
tips
info

commercial:

ticket
booking
hotel
tour


⸻

9. Intent Scoring

things_to_do = 9
destination = 8
planning = 8
transport = 7
information = 6
commercial = 5


⸻

10. Planning Signal

Planning keywords:

harga
biaya
budget
cost
estimate

If detected:

planning_signal = 1

Otherwise:

planning_signal = 0


⸻

11. Final Score Formula

FinalScore =
IntentScore * 0.5
+ GeoScore * 0.3
+ PlanningSignal * 0.2


⸻

12. Output Format

The engine must output structured JSON.

Example:

{
"url":"https://...",
"slug":"pura-uluwatu-bali",
"entities":["bali","pura-uluwatu"],
"intent":"planning",
"geo_score":10,
"intent_score":8,
"final_score":8.6
}


⸻

13. Page Feed Labels

The engine must generate labels for DSA.

Intent labels:

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

14. Implementation Requirements

The code must be:
	•	modular
	•	well commented
	•	readable
	•	easily extensible

Use:

classes
pure functions
type hints

The engine should be able to process thousands of URLs quickly.

⸻

15. Expected Output

The program should:
	1.	read urls.txt
	2.	classify each URL
	3.	output results to:

output/classified_urls.json


⸻

End of Prompt

⸻

Gợi ý rất quan trọng cho bạn

Khi dùng prompt này, hãy yêu cầu AI thêm:

Write the full working code.
Do not summarize.
Provide all files.

AI sẽ generate toàn bộ engine ~500–700 lines code.

⸻

