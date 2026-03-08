PROMPT: Build Intent Detection Module v5 (Classifier Subsystem)

You are a senior backend engineer integrating an intent detection micro-logic for a Travel DSA Page Feed classifier.

The classifier runs quickly on short slugs (3-8 tokens). You will use standard dictionary mapping instead of heavy ML/NLP.

⸻

1. Input
The function accepts a slug (string). E.g: `itinerary-bali-3-hari-2-malam`
It runs against two loaded dictionaries: `intent_keywords.json` and `travel_pattern_signals.json`.

⸻

2. Core Rule: Anti-Pattern-Stacking & Regex Span Deduplication (CRITICAL)
To prevent massive score inflation from nested patterns (e.g. `itinerary-bali-3-hari-2-malam` matching `3-hari-2-malam`, `3-hari`, and `2-hari` separately), you must implement Span Deduplication.

- Sort patterns descending by length.
- When traversing the patterns and one matches, you must remove it from the string so shorter interior overlaps cannot match.
- BUG WARNING: Do not strictly use `string.replace(variant, " ")`. It will corrupt unrelated tokens (like `hari` cutting out letters from `matahari`).
- YOU MUST USE REGEX word boundaries:
  `re.sub(r'\b' + re.escape(variant) + r'\b', ' ', working_slug)`

⸻

3. Pattern Limits (Boost Caps)
To further guard against runaway scores, apply a maximum cap to the pattern boost per intent category. Total pattern score addition per intent cannot exceed:
- planning: max 6
- things_to_do: max 5
- transport: max 3

⸻

4. Intent Calculation Pipeline
1. Normalize Slug: lowercase, replace hyphens/underscores/slashes with spaces.
2. Tokenize into array.
3. Keyword Matching: `for token in array`, if token exists in `intent_keywords[category]`. Keyword hits do NOT increase scores, they merely "Activate" the base score for that intent.
   Base Scores: `{ things_to_do: 9, destination: 8, planning: 8, transport: 7, information: 6 }`
4. Pattern Detection: Use Regex Word Boundary replacement to find patterns and add up weighted scores. Cap the combined additions.
5. Finalize Score: Add Base Score (if activated) + Limited Pattern Boost.
6. Max Score Wins: The intent with the mathematically highest score is the final `intent_primary`.
7. Tie-Breaker: If scores perfectly tie, favor via absolute Priority: `transport` > `planning` > `things_to_do` > `destination` > `information`.

⸻

5. Output
Return a dictionary: `{ "intent_primary": str, "intent_score": int, "detected_patterns": list, "detected_keywords": list }`.
Fallback: If no intent logic matches, assign fallback `intent_primary = "destination"` with score 8.

Write the complete code. Guarantee robust Regex span deduplication and exact mapping. Do not provide pseudocode.
