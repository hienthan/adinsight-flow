Dưới đây là FULL PROMPT CHUẨN (production-grade) để bạn đưa cho AI coder (GPT, Gemini, Claude, v.v.) implement Intent Detection module cho URL Classifier Engine.

Tôi viết theo cách senior dev prompt engineering:
	•	rõ context
	•	rõ datasets
	•	rõ rules
	•	rõ expected output
	•	tránh AI tự suy diễn

Prompt này đã đóng băng specs → AI chỉ việc code.

⸻

FULL PROMPT — INTENT DETECTION ENGINE

SYSTEM CONTEXT

You are a senior backend engineer building a URL classifier engine for travel pages.

The engine processes Traveloka-style travel URLs and classifies them into intent categories used for Google Ads DSA page feeds.

The classifier must be:

deterministic
rule-based
fast
no ML
no NLP

Slug text is short (usually 3-8 tokens), therefore dictionary matching is sufficient and preferred.

The goal is high precision intent grouping, not predicting conversions.

⸻

INPUT

The function receives a URL slug.

Example:

itinerary-bali-3-hari-2-malam
tempat-wisata-bandung
jadwal-kereta-bandara-yia

The engine must use two datasets:

intent_keywords.json
travel_pattern_signals.json

These datasets are loaded once and reused.

⸻

DATASET 1 — intent_keywords.json

Structure:

{
  "transport": [...],
  "planning": [...],
  "things_to_do": [...],
  "destination": [...],
  "information": [...]
}

These are dictionary keywords used to detect intent.

Detection method:

token match

Example:

token = "jadwal"
→ transport


⸻

DATASET 2 — travel_pattern_signals.json

Structure:

{
 "patterns": {
   "pattern_name": {
     "intent": "",
     "weight": number,
     "aliases": []
   }
 }
}

Patterns detect travel itinerary signals.

Example:

3-hari-2-malam
2d1n
one-day-trip
weekend-trip
itinerary

These patterns usually signal:

planning intent

Pattern detection should scan the full slug string, not tokens.

⸻

INTENT CATEGORIES

The engine supports 5 intents:

transport
planning
things_to_do
destination
information


⸻

INTENT PRIORITY

If multiple intents are detected, apply priority:

transport
planning
things_to_do
destination
information

Example:

Slug:

jadwal-kereta-bandara-yia

Matches:

transport
information

Final intent:

transport


⸻

BASE INTENT SCORES

things_to_do = 9
destination = 8
planning = 8
transport = 7
information = 6


⸻

PATTERN WEIGHT

Patterns increase the score of the associated intent.

Example:

Pattern:

3-hari-2-malam

Definition:

intent = planning
weight = 4

If detected:

planning score += 4


⸻

SLUG NORMALIZATION

Before detection, normalize the slug.

Rules:

convert to lowercase
replace "-" with space
replace "_" with space
replace "/" with space
remove duplicate spaces

Example:

itinerary-bali-3-hari-2-malam

becomes:

itinerary bali 3 hari 2 malam

Tokenization:

split by space

Result:

["itinerary","bali","3","hari","2","malam"]


⸻

KEYWORD DETECTION

For each token:

check if token exists in intent_keywords

If match:

increment intent match count


⸻

PATTERN DETECTION

Before keyword scoring:

scan slug string

Check:

pattern_name
pattern aliases

If found:

boost intent score


⸻

INTENT SCORE COMPUTATION

Steps:

1 detect pattern signals
2 detect keyword matches
3 initialize scores using base intent scores
4 apply pattern weight boosts
5 select final intent using priority rule


⸻

FALLBACK RULE

If no intent detected:

Return:

destination

Reason:

Most travel URLs are destination-oriented.

⸻

OUTPUT FORMAT

Return an object:

{
 "intent": "",
 "intent_score": number,
 "intent_label": ""
}

Example:

{
 "intent": "planning",
 "intent_score": 12,
 "intent_label": "intent_planning"
}


⸻

EXAMPLES

Example 1

Slug:

itinerary-bali-3-hari-2-malam

Detection:

pattern: 3-hari-2-malam → planning +4
keyword: itinerary → planning

Output:

intent = planning
intent_score = 12


⸻

Example 2

Slug:

tempat-wisata-bandung

Detection:

keyword: tempat-wisata → things_to_do

Output:

intent = things_to_do
intent_score = 9


⸻

Example 3

Slug:

jadwal-kereta-bandara-yia

Detection:

jadwal
kereta
bandara

Output:

intent = transport
intent_score = 7


⸻

PERFORMANCE REQUIREMENTS

The implementation must be:

O(n tokens)
dictionary lookup

Avoid:

ML
NLP
AI classification

Slug text is short and rule-based detection is preferred.

⸻

FUNCTION SIGNATURE

Example function:

detect_intent(slug, keyword_db, pattern_db)

Return:

intent
intent_score
intent_label


⸻

IMPLEMENTATION NOTES

Important requirements:

datasets must be cached in memory
pattern detection runs before keyword scoring
deduplicate pattern matches
priority rule must override raw scores


⸻

FINAL GOAL

Implement a fast deterministic intent classifier that:

detects travel intent from URL slug
uses dictionary + travel pattern signals
supports DSA page feed generation

Expected accuracy for travel slugs:

85–92%


⸻

END OF PROMPT

⸻

💡 Senior dev note cho bạn (quan trọng):

Prompt này đã:

lock specs
lock datasets
lock rules

→ AI coder không có khoảng trống để sáng tạo sai.

⸻