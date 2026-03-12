Use Tremor, they provide the absolute highest ROI for aesthetic quality versus development time.

The Dashboard Specs (V5 Structural Overview)
Since we don't have live Google Ads API data yet (clicks, impressions, ROAS), this dashboard will act as your Inventory Architecture Overview. It answers the question: "What ammunition do I have in my database?"

Here is the exact layout spec we should build:

Section 1: The Executive Summary (Hero Metrics)
Total Market Coverage: Total URLs.
Indonesian Dominance: % of URLs mapped to Country = indonesia.
Golden Inventory (Tier 1): Count of URLs in Tier 1 (High ROAS Readiness).
Average Quality Score: Average final_score across the database.
Section 2: The Geographical Map (Where is our content?)
Chart Type: Horizontal Bar Chart (Tremor BarList or similar).
Metric: Top 10 Provinces by URL count.
Purpose: Shows you exactly which regions have the most content depth (e.g., Bali vs. West Java vs. East Java). Helps decide where to point geographical DSA campaigns.
Section 3: The Intent & Tier Matrix (What phase of the funnel?)
Chart Type: Stacked Bar Chart or Treemap.
X-Axis: The 4 Macro Intents (transport, things_to_do, planning, information).
Y-Axis (Stacked): Segmented by Tiers (Tier 1, 2, 3).
Purpose: Visually proves if your transport links are mostly Tier 1 (True), while information links are mostly Tier 3.
Section 4: The Sub-Tag Ecosystem (The Niche Breakdown)
Chart Type: Donut Chart or Pie Chart.
Metric: The new English sub_tags we just created (nature, train, flight, local_food, spa, etc.).
Purpose: A beautiful, colorful wheel showing the absolute granularity of Traveloka's content. You'll instantly see if you suffer from a lack of hotel content or have an overabundance of nature content.
Section 5: The Funnel Readiness (Score Distribution)
Chart Type: Area Chart or Line Chart.
X-Axis: The 1-10 final_score scale.
Y-Axis: Number of URLs at that score.
Purpose: Shows the "Bell Curve" of your database quality.
--