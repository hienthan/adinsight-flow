Bạn nói rất đúng. Nếu cứ thêm rule dần thì specs sẽ không bao giờ đóng băng.
Vì vậy dưới đây là FINAL SPEC v4 (LOCKED) cho Intent Detection + Pattern Detection.

Spec này đã bao gồm toàn bộ các vấn đề đã phát hiện:

✔ keyword detection
✔ pattern detection
✔ longest match
✔ span deduplication
✔ duplicate guard
✔ pattern boost cap
✔ intent scoring
✔ tie-breaker priority
✔ deterministic output

Sau spec này không cần thêm rule nào nữa để engine chạy production.

⸻

INTENT DETECTION ENGINE — FINAL SPEC v4

1. Purpose

Intent detection classifies travel URLs into intent categories for DSA campaign grouping.

Classifier must be:

deterministic
rule-based
fast

No ML or NLP.

⸻

2. Intent Categories

System supports 5 intents.

transport
planning
things_to_do
destination
information


⸻

3. Intent Base Scores

things_to_do = 9
destination = 8
planning = 8
transport = 7
information = 6


⸻

4. Data Sources

Classifier uses two datasets.

Dataset 1

intent_keywords.json

Used for keyword detection.

⸻

Dataset 2

travel_pattern_signals.json

Used for travel planning pattern detection.

⸻

5. Slug Normalization

Before detection:

lowercase
replace "-" "_" "/" with space
collapse duplicate spaces

Example

itinerary-bali-3-hari-2-malam

↓

itinerary bali 3 hari 2 malam

Tokens

["itinerary","bali","3","hari","2","malam"]


⸻

6. Keyword Detection

For each token:

if token in intent_keywords[intent]
    increment match count

Keyword detection only flags possible intents, it does not determine final intent.

⸻

7. Pattern Detection (v4)

Pattern detection strengthens intent signals.

Rules:

Rule 1 — Longest Pattern First

Patterns sorted by length descending.

Example order:

3-hari-2-malam
3-hari
hari


⸻

Rule 2 — Span Deduplication

When a pattern matches:

remove matched substring from working slug

This prevents smaller patterns from matching inside the same span.

⸻

Rule 3 — Duplicate Pattern Guard

Each pattern may only apply once per slug.

⸻

Rule 4 — Pattern Boost Cap

Maximum pattern boost per intent:

planning = 6
things_to_do = 5
transport = 3

Total pattern boost cannot exceed these limits.

⸻

8. Intent Score Calculation

For each detected intent:

intent_score = base_score + pattern_boost

Keyword matches do not increase score directly; they only activate an intent candidate.

⸻

9. Intent Selection

Final intent is chosen by maximum score.

intent = max(intent_score)


⸻

10. Tie Breaker

If multiple intents share the same score:

Use priority order:

transport
planning
things_to_do
destination
information


⸻

11. Fallback Rule

If no intent detected:

intent = destination
intent_score = 8


⸻

12. Output Format

Classifier returns:

intent_primary
intent_score
detected_patterns
detected_keywords

Example:

intent_primary = planning
intent_score = 14
detected_patterns = ["itinerary","3-hari-2-malam"]
detected_keywords = ["itinerary"]


⸻

INTENT DETECTION — FINAL PSEUDO CODE v4

INTENT_PRIORITY = [
    "transport",
    "planning",
    "things_to_do",
    "destination",
    "information"
]

INTENT_BASE_SCORE = {
    "things_to_do": 9,
    "destination": 8,
    "planning": 8,
    "transport": 7,
    "information": 6
}

MAX_PATTERN_BOOST = {
    "planning": 6,
    "things_to_do": 5,
    "transport": 3
}


⸻

Slug Normalization

def normalize_slug(slug):

    slug = slug.lower()

    slug = slug.replace("-", " ")
    slug = slug.replace("_", " ")
    slug = slug.replace("/", " ")

    slug = " ".join(slug.split())

    tokens = slug.split(" ")

    return slug, tokens


⸻

Pattern Detection

def detect_patterns(slug, pattern_db):

    working_slug = slug

    detected_patterns = []
    matched_patterns = set()

    boost_by_intent = {}

    patterns_sorted = sorted(
        pattern_db["patterns"].items(),
        key=lambda x: len(x[0]),
        reverse=True
    )

    for pattern_name, pattern in patterns_sorted:

        variants = [pattern_name] + pattern["aliases"]

        for variant in variants:

            if variant in working_slug:

                if pattern_name in matched_patterns:
                    continue

                matched_patterns.add(pattern_name)

                detected_patterns.append(pattern_name)

                intent = pattern["intent"]
                weight = pattern["weight"]

                if intent not in boost_by_intent:
                    boost_by_intent[intent] = 0

                boost_by_intent[intent] += weight

                working_slug = working_slug.replace(variant, " ")

                break

    for intent in boost_by_intent:

        cap = MAX_PATTERN_BOOST.get(intent, 5)

        boost_by_intent[intent] = min(boost_by_intent[intent], cap)

    return detected_patterns, boost_by_intent


⸻

Keyword Detection

def detect_keywords(tokens, keyword_db):

    keyword_hits = {}
    detected_keywords = []

    for token in tokens:

        for intent, keywords in keyword_db.items():

            if token in keywords:

                detected_keywords.append(token)

                keyword_hits[intent] = True

    return keyword_hits, detected_keywords


⸻

Intent Selection

def select_intent(scores):

    max_score = max(scores.values())

    candidates = [
        intent for intent,score in scores.items()
        if score == max_score
    ]

    if len(candidates) == 1:
        return candidates[0]

    for intent in INTENT_PRIORITY:
        if intent in candidates:
            return intent


⸻

Main Intent Detection Function

def detect_intent(slug, keyword_db, pattern_db):

    slug_norm, tokens = normalize_slug(slug)

    keyword_hits, detected_keywords = detect_keywords(tokens, keyword_db)

    detected_patterns, pattern_boost = detect_patterns(slug_norm, pattern_db)

    scores = {}

    for intent in keyword_hits:

        scores[intent] = INTENT_BASE_SCORE[intent]

    for intent, boost in pattern_boost.items():

        if intent not in scores:
            scores[intent] = INTENT_BASE_SCORE[intent]

        scores[intent] += boost

    if not scores:

        return {
            "intent_primary": "destination",
            "intent_score": 8,
            "detected_patterns": [],
            "detected_keywords": []
        }

    intent = select_intent(scores)

    return {
        "intent_primary": intent,
        "intent_score": scores[intent],
        "detected_patterns": detected_patterns,
        "detected_keywords": detected_keywords
    }


⸻

FINAL STATUS

Spec v4 đảm bảo:

✔ intent scoring ổn định
✔ không pattern stacking
✔ deterministic
✔ production safe
✔ AI coder implement được ngay


⸻

Nếu bạn muốn, bước tiếp theo nên khóa luôn phần còn lại của engine:

Geo detection
DSA campaign key generation
Content type detection

để toàn bộ URL classifier engine có 1 FINAL SPEC duy nhất thay vì nhiều spec rời rạc.