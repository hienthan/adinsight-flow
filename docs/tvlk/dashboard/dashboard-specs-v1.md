OK. Dưới đây là Dashboard V1 – FINAL SPEC (đã chốt) theo đúng các ràng buộc bạn đưa ra:
	•	❌ Không dùng affiliate_score
	•	✅ Dùng final_score
	•	🌏 Chỉ Indonesia nội địa
	•	🧩 Dashboard theo pattern seed
	•	🔎 Có filter theo pattern + province
	•	📊 Phân tích inventory URL, không phải Google Ads data

Không thêm suggestion mới ngoài spec.

⸻

1️⃣ Global Filters

Dashboard phải có 2 filter toàn cục.

Pattern Selector

Pattern:
[ explore/activities ]

	•	Required
	•	Single select
	•	Dashboard chỉ phân tích 1 pattern tại 1 thời điểm

Query logic:

WHERE pattern = selected_pattern


⸻

Province Filter

Province:
[ All ]
[ Bali ]
[ West Java ]
[ East Java ]
...

	•	Optional
	•	Single select
	•	Default = All

Query logic:

WHERE province = selected_province

Final dataset:

WHERE pattern = selected_pattern
AND (province = selected_province OR selected_province = 'All')


⸻

2️⃣ Section 1 — Executive Summary

Chart Type: KPI Cards

Purpose: overview inventory trong dataset đang filter.

Metrics:

Metric	Definition
Total URLs	số URL trong dataset
Tier1 URLs	số URL Tier1
Average Final Score	avg(final_score)
Provinces Covered	count distinct province

Layout:

[ Total URLs ]
[ Tier1 URLs ]
[ Avg Final Score ]
[ Provinces Covered ]


⸻

3️⃣ Section 2 — Geographical Map

Chart Type: Horizontal Bar Chart

Metric:

URL count by province

Display:

Top provinces by URL count

Fields:

province
url_count

Sorting:

descending by url_count

Limit:

Top 10 provinces


⸻

4️⃣ Section 3 — Intent & Tier Matrix

Chart Type: Stacked Bar Chart

X-axis:

intent

Values:

transport
things_to_do
planning
information

Stack segments:

Tier1
Tier2
Tier3

Metric:

count(URL)

Purpose:

Hiển thị funnel structure của inventory.

⸻

5️⃣ Section 4 — Sub-Tag Ecosystem

Chart Type: Donut Chart

Metric:

URL count by sub_tag

Fields:

sub_tag
url_count

Examples:

nature
train
temple
spa
island
museum
waterfall

Purpose:

Hiển thị granularity của content ecosystem.

⸻

6️⃣ Section 5 — Final Score Intelligence

Section này thay hoàn toàn Affiliate Opportunity Scanner.

⸻

Chart 5.1 — Score Distribution

Chart Type: Area Chart

X-axis:

final_score_bucket

Buckets:

1
2
3
4
5
6
7
8
9
10

Y-axis:

URL count

Purpose:

Hiển thị quality curve của dataset.

⸻

Chart 5.2 — Score by Intent

Chart Type: Bar Chart

Fields:

intent
avg(final_score)

Purpose:

So sánh intent nào có score cao hơn.

⸻

Chart 5.3 — Score by Province

Chart Type: Horizontal Bar

Fields:

province
avg(final_score)

Sorting:

descending avg(final_score)

Purpose:

Xem region nào có inventory chất lượng cao.

⸻

Chart 5.4 — Tier Composition

Chart Type: Donut Chart

Metric:

URL count by tier

Segments:

Tier1
Tier2
Tier3

Purpose:

Hiển thị distribution readiness của inventory.

⸻

7️⃣ Dashboard Layout

GLOBAL FILTERS
Pattern selector
Province filter

ROW 1
Executive Summary (KPI cards)

ROW 2
Geographical Map

ROW 3
Intent & Tier Matrix

ROW 4
Sub-tag Ecosystem | Score Distribution

ROW 5
Score by Intent | Score by Province | Tier Composition


⸻

8️⃣ Data Requirements

Fields cần có trong dataset:

url
pattern
province
intent
tier
sub_tag
final_score

Derived fields:

final_score_bucket
url_count
avg_final_score


⸻

9️⃣ Out of Scope (V1)

Không nằm trong dashboard version này:

google ads api data
campaign performance
affiliate score
prediction models


⸻

10️⃣ Dashboard Objective

Dashboard này trả lời 3 câu hỏi:

1. Inventory depth
2. Funnel structure
3. Traffic priority


⸻

Spec này đã fully compatible với architecture tool của bạn:

Traveloka URLs
↓
URL classifier
↓
pattern dataset
↓
dashboard inventory intelligence
↓
DSA deployment


⸻
