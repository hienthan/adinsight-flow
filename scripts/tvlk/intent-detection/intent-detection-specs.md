Tốt — đây là FINAL INTENT DETECTION SPECS sau khi đã thêm 2 file quan trọng:

intent_keywords.json
travel_pattern_signals.json

Spec này được viết để AI coder có thể dùng trực tiếp, không cần đọc lại toàn bộ thảo luận trước.

Tôi sẽ trình bày theo senior dev specification format.

⸻

INTENT DETECTION ENGINE — FINAL SPECS

1. Purpose

Intent detection dùng để:

group URLs
create DSA feed labels
structure campaigns

Không dùng để:

predict conversion
predict traffic
predict profit

Google Ads sẽ làm phần đó.

⸻

2. Intent Layers

System sử dụng 5 intent categories.

transport
planning
things_to_do
destination
information


⸻

3. Intent Priority

Nếu nhiều intent match cùng lúc, chọn theo thứ tự:

transport
planning
things_to_do
destination
information

Ví dụ:

Slug

jadwal-kereta-bandara-yia

Match:

transport
information

Result:

transport


⸻

4. Intent Detection Sources

Intent detection dùng 2 datasets:

intent_keywords.json
travel_pattern_signals.json


⸻

5. intent_keywords.json

Purpose:

detect intent via keyword dictionary

Example structure:

{
"transport":[...],
"planning":[...],
"things_to_do":[...],
"destination":[...],
"information":[...]
}

Detection rule:

scan slug tokens
if token matches keyword
assign intent


⸻

6. travel_pattern_signals.json

Purpose:

detect travel planning patterns

Example patterns:

3-hari-2-malam
2d1n
one-day-trip
weekend-trip
itinerary

These patterns usually signal:

planning intent
things_to_do intent


⸻

7. Pattern Structure

{
"patterns":{
"pattern":{
"intent":"",
"weight":0,
"aliases":[]
}
}
}

Example:

"3-hari-2-malam":{
"intent":"planning",
"weight":4,
"aliases":["3d2n"]
}


⸻

8. Slug Processing

Intent detection uses normalized slug tokens.

Pipeline:

slug
↓
normalize lowercase
↓
replace hyphen with space
↓
tokenize

Example:

itinerary-bali-3-hari-2-malam

Tokens:

itinerary
bali
3
hari
2
malam


⸻

9. Keyword Matching

Algorithm:

for token in slug_tokens:
    check intent_keywords

Count matches.

Example:

Slug:

tempat-wisata-bandung

Match:

things_to_do


⸻

10. Pattern Matching

Before keyword detection:

scan slug for travel patterns

Example:

Slug:

bali-3-hari-2-malam

Pattern detected:

3-hari-2-malam

Intent boost:

planning +4 weight


⸻

11. Intent Score Calculation

Base intent score:

things_to_do = 9
destination = 8
planning = 8
transport = 7
information = 6

Pattern signals modify score:

intent_score += pattern_weight


⸻

12. Intent Selection

Steps:

detect pattern signals
↓
detect keyword matches
↓
apply priority rule
↓
assign final intent


⸻

13. Edge Case Handling

If no intent detected:

Fallback:

destination

Reason:

Most travel URLs are destination-oriented.

⸻

14. Example

Slug:

itinerary-bali-3-hari-2-malam

Detection:

Pattern:

3-hari-2-malam → planning +4

Keyword:

itinerary → planning

Result:

intent = planning
intent_score = 12


⸻

15. Another Example

Slug:

tempat-wisata-bandung

Keyword:

tempat-wisata → things_to_do

Result:

intent = things_to_do
intent_score = 9


⸻

16. Another Example

Slug:

jadwal-kereta-bandara-yia

Keyword:

jadwal
kereta
bandara

Result:

intent = transport
intent_score = 7


⸻

17. Performance Requirement

Intent detection must be:

O(n tokens)
dictionary lookup

Avoid:

NLP
ML
LLM

Slug text is short.

⸻

18. Expected Accuracy

With both datasets:

intent_keywords.json
travel_pattern_signals.json

Expected accuracy:

85–92%

for travel URL classification.

⸻

19. Output Fields

Intent module must return:

{
"intent":"",
"intent_score":0,
"intent_label":""
}

Example:

{
"intent":"things_to_do",
"intent_score":9,
"intent_label":"intent_things_to_do"
}


⸻

20. Integration with Engine

Intent detection runs after:

slug parsing
geo entity detection

Pipeline:

URL
↓
slug parse
↓
geo detection
↓
intent detection
↓
scoring


⸻

FINAL SUMMARY

Intent detection uses:

intent_keywords.json
+
travel_pattern_signals.json

Logic:

pattern detection
↓
keyword detection
↓
priority rule
↓
intent assignment


⸻
