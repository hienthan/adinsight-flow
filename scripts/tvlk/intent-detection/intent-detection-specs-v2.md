AI review đó rất đúng về mặt kỹ thuật, và đây là chỗ cần chỉnh lại specs một chút để tránh classifier bị sai intent.
Tôi sẽ trả lời theo đúng góc nhìn senior dev + Google Ads logic, rồi đưa rule chuẩn nên dùng.

⸻

1. Vấn đề AI nêu là đúng

Spec hiện tại của bạn:

select_intent() → priority override

tức là:

transport > planning > things_to_do > destination > information

Chỉ cần detect:

kereta

→ intent sẽ thành transport, dù planning score cao hơn.

Ví dụ AI đưa:

paket-tour-bali-3-hari-2-malam-kereta

signals:

planning: 12
transport: 8

Nhưng engine sẽ trả:

transport

Đây không đúng với intent thực tế.

⸻

2. Mục đích ban đầu của priority rule

Priority rule ban đầu được dùng để tránh case:

how-to-go-komodo-island

Detect:

transport
destination

Nếu dùng score thuần:

destination = 8
transport = 7

engine sẽ trả:

destination

Nhưng query thực tế là:

transport

Vì vậy mới có priority.

⸻

3. Nhưng priority tuyệt đối là sai

Vì sẽ xảy ra:

1 weak token
override
1 strong pattern

Ví dụ:

itinerary-bali-3-hari-2-malam-kereta

Transport chỉ là context phụ.

⸻

4. Rule chuẩn nên dùng

Cách đúng là:

max score
+
priority tie-breaker

Rule:

1. compute scores
2. select intent with highest score
3. if tie → apply priority


⸻

5. Spec mới (correct version)

Intent selection:

Step 1: detect keyword matches
Step 2: detect pattern signals
Step 3: compute intent scores

intent_score = base_score + pattern_weight

Selection:

primary_intent = max(intent_score)

Tie breaker:

if multiple intents have same score:
    use priority order

Priority list vẫn giữ:

transport
planning
things_to_do
destination
information


⸻

6. Ví dụ với rule mới

Example 1

jadwal-kereta-bandara-yia

scores:

transport = 7
information = 6

→

transport


⸻

Example 2

itinerary-bali-3-hari-2-malam

scores:

planning = 12
destination = 8

→

planning


⸻

Example 3 (AI case)

paket-tour-bali-3-hari-2-malam-kereta

scores:

planning = 12
transport = 8

→

planning

Correct.

⸻

7. Pseudo-code fix

Replace:

def select_intent(scores):
    for intent in INTENT_PRIORITY:
        if intent in scores:
            return intent

With:

def select_intent(scores):

    if not scores:
        return "destination"

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

8. Điều này không phá architecture

Các phần khác không cần thay đổi:

intent_keywords.json
travel_pattern_signals.json
pattern weights

Chỉ sửa intent selection logic.

⸻

9. Đây cũng là logic Google Ads thực tế

Search intent thường là:

dominant signal
+ contextual signals

không phải:

hard priority


⸻

10. Recommendation

Bạn nên update spec:

priority is tie-breaker only

không phải:

absolute override


⸻

11. Senior dev verdict

AI review của bạn đã phát hiện đúng bug logic.

Rule đúng:

intent = max_score
priority = tie breaker


⸻

💡 Nếu muốn tôi có thể chỉ thêm 1 edge case cực nguy hiểm trong intent scoring mà hầu hết rule-based classifiers đều gặp:

pattern stacking bug

Nó có thể làm một số URL bị intent_score phình lên bất thường và gây sai intent.