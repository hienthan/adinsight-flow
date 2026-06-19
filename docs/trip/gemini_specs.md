# CLASSIFIER SPECIFICATION V1.0 - TRIP.COM ADS ENGINE

## 1. INTENT & CONTENT CLASSIFICATION RULES

### TYPE 01: VISA & ENTRY DOCUMENTS
- Content Type: Visa, Entry Requirements, Arrival Card
- Intent Stage: High MOFU (Ready to travel)
- Priority: P0 (Critical - High Bid)
- Risk Level: Low
- Pattern Keywords: visa, entry-requirements, arrival-card, permit, declaration-form, entry-permit, landing-slip
- Action Logic: Gán label "High_Intent_Entry". Áp dụng giá thầu cao nhất để chiếm lĩnh vị trí.

### TYPE 02: TRANSPORT UTILITY & AIRLINE OPS
- Content Type: Baggage Rules, Check-in, On-board Info
- Intent Stage: Mid MOFU (Preparation phase)
- Priority: P1 (High - Optimal Bid)
- Risk Level: Low
- Pattern Keywords: baggage, luggage, power-bank, liquids, check-in, seat-selection, on-board, airline-operations, flight-status
- Action Logic: Gán label "Transport_Utility". Mục tiêu chính là gieo Cookie Transport (Flight/Train).

### TYPE 03: AIRLINE BRAND & PROMOTIONS
- Content Type: Airline Reviews, Ticket Promos, Brand Specifics
- Intent Stage: MOFU/BOFU (Decision phase)
- Priority: P1 (High)
- Risk Level: High (Brand Policy Risk)
- Pattern Keywords: cathay, hkexpress, peach-airlines, air-asia, buy-one-get-one, miles, asia-miles, member-discount
- Action Logic: Gán label "Brand_Promo". Cần lớp lọc (Filter) để tránh vi phạm chính sách Trademark của Google/Affiliate.

### TYPE 04: DESTINATION & TRAVEL GUIDES
- Content Type: Things to do, Itinerary, Souvenirs
- Intent Stage: TOFU (Inspiration phase)
- Priority: P2 (Medium - Moderate Bid)
- Risk Level: Medium
- Pattern Keywords: guide, things-to-do, itinerary, souvenirs, attractions, best-spots, travel-guide, top-10
- Action Logic: Gán label "Destination_Guide". Chỉ chạy nếu trang có dữ liệu lịch sử tốt (Clicks > 50).

### TYPE 05: WEATHER & CURRENCY (TRAFFIC BAIT)
- Content Type: Weather, Exchange Rate
- Intent Stage: Early TOFU (Information seeking)
- Priority: P3 (Low - Bottom Bid)
- Risk Level: High (ROI Risk)
- Pattern Keywords: weather, temperature, currency, exchange, exchange-rate, forecast, climate
- Action Logic: Gán label "Traffic_Bait". Đặt Bid ở mức tối thiểu chỉ để lấy Volume dữ liệu.

### TYPE 06: LOCAL DOMESTIC (EXCLUSION)
- Content Type: Local Dining, Local Neighborhoods (e.g. within Hong Kong)
- Intent Stage: Non-Travel (Resident intent)
- Priority: EXCLUDE
- Risk Level: Critical (Waste of budget)
- Pattern Keywords: tsim-sha-tsui, mong-kok, sham-shui-po, yuen-long, kwun-tong, tsing-yi, sham-tseng
- Action Logic: Tự động loại bỏ (Auto-Exclude) khỏi Page Feed.

## 2. GEO-LOGIC FALLBACK (FOR UNKNOWN COUNTRY)

- Rule 01: Nếu Content Type thuộc "Transport Utility" hoặc "Airline Brand" -> Set Geo_Entity = "Global_Transport".
- Rule 02: Nếu Content Type là "General Utility" (Weather/Currency) mà không có tên quốc gia trong Title -> Set Geo_Entity = "Unknown_Global" và gán nhãn Low Priority.
- Rule 03: Ưu tiên bóc tách tên quốc gia từ URL trước, sau đó mới đến Title.

## 3. FINANCIAL SCORING & BIDDING LOGIC

- Logic: Expected_CPC = (AOV * Commission_Rate * CR) / 1.2
- Group A (High Value): Visa_Entry, Transport_Utility (Mục tiêu tROAS cao).
- Group B (Volume Play): Destination_Guide (Mục tiêu tROAS trung bình).
- Group C (Low Quality): Weather_Currency (Mục tiêu vét traffic).