Ngắn gọn, m copy nguyên khối này đưa cho AI là đủ 👇

⸻

📌 NOTE CHO AI – CÁCH TREAT HK / TW
	•	HK (Hong Kong) và TW (Taiwan) KHÔNG phải destination trong hệ thống này.
	•	HK / TW được treat là source_markets (nơi chạy ads, nơi user search).

Quy ước bắt buộc:
	1.	KHÔNG seed HK / TW như destination (không có travel season riêng).
	2.	HK / TW chỉ xuất hiện trong field source_markets.
	3.	Destination luôn là nơi người dùng đi:
	•	JP, KR, Bali, Thailand, …
	4.	Trend signal = destination-based,
Notify / timing = source_market-based.

Ví dụ đúng:

{
  "key": "cherry_blossom__hk__jp_kanto_kansai",
  "source_markets": ["HK"],
  "destinations": [{ "code":"JP","name":"Japan" }],
  "mode": "recurring"
}

Ví dụ sai:
	•	❌ destination = HK
	•	❌ destination = TW
	•	❌ seed “Hong Kong travel season” cho feature này

Khi nào HK / TW mới là destination?
	•	Chỉ khi build feature inbound HK/TW (local attractions, hotel, esim inbound).
	•	KHÔNG thuộc scope feature hiện tại.

⸻

✅ Kết luận cho AI

HK / TW = lens để đọc trend, không phải nơi đi.
Seed thêm HK / TW nghĩa là nhân bản trend theo source_market, không phải tạo destination mới.

⸻
