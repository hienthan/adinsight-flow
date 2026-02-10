Table 1 — trend_types

Purpose: định nghĩa “trend là gì” (tĩnh, reuse nhiều năm)

Fields
	•	key — text, required, unique
Ví dụ: cherry_blossom, ski_snow, golden_week, worldcup, expo
	•	name — text, required
Ví dụ: Cherry Blossom (Sakura)
	•	category — select (single), required
Options: seasonal_travel, entry_pretrip, peak_window, one_off
	•	default_priority — select (single), default medium
Options: high, medium
	•	default_pre_alert_days — number, default 14
(vd Golden Week có thể 21)
	•	notes — text/editor, optional
(mô tả ngắn: “thường spike trước X tuần”, “hay gắn với rail/attraction/esim”…)

Indexes
	•	Unique: key

⸻

Table 2 — trend_signals

Purpose: record dùng để notify + context (đây là thứ app đọc hằng tuần)

Fields (core)
	•	key — text, required, unique
Gợi ý format:
	•	mode: select (single), required
Options: recurring, one_off
Nếu mode = "recurring" → chỉ dùng start_mmdd, end_mmdd, peak_*_mmdd
Nếu mode = "one_off" → chỉ dùng start_date, end_date, peak_*_date
	•	trend_type — relation -> trend_types, required, maxSelect=1
	•	status — select (single), default active
Options: draft, active, archived
	•	priority — select (single), required
Options: high, medium
(m có thể default theo type, nhưng field này cho override)
	•	pre_alert_days — number, optional
(nếu trống → dùng trend_types.default_pre_alert_days)
	    source_markets → select (multiple) → options: HK, TW, ID, …
source_markets trống → trend áp dụng cho mọi market
	 	product_types → select (multiple) → options: esim, entry_pretrip, rail, attraction, hotel, flight, guide_content, pass
product_types trống → trend chỉ mang tính nhắc thời điểm, không gợi hành động cụ thể
	•	destinations — json, required
Array các “decision units”. Ví dụ:
[
  {"code":"JP","name":"Japan"},
  {"code":"KR","name":"South Korea"},
  {"code":"BALI","name":"Bali"}
]

code tự đặt miễn nhất quán: country code (JP/KR) hoặc custom unit (BALI, HOKKAIDO, PHUKET…)

	•	summary — text/editor, optional
(context để m tự verify + gợi ý hướng tìm URL)

Fields (calendar logic)
- Nếu mode = "recurring": dùng start_mmdd, end_mmdd, peak_*_mmdd.
- Nếu mode = "one_off": dùng start_date, end_date, peak_*_date.

Lưu ý: window qua năm (vd 12-15 → 02-28) vẫn xử lý được ở UI bằng logic wrap-around.

Fields (keywords notes)
	•	keywords — json, optional
Array stable intent keywords, ví dụ:
["japan cherry blossom season","best time to see sakura","sakura forecast japan"]

(Hoặc m có thể dùng text multiline, nhưng json array dễ map hơn)

	•	notes — text, optional
(insight ngắn: “DSA first”, “RSA phrase match ổn”, “mở camp cũ tên X”…)

Indexes
	•	Unique: key

⸻

Antigravity mapping rules (dùng ngay)

1) Resolve window cho từng signal

Nếu is_one_off=true
	•	dùng trực tiếp: start_date/end_date/(peak...)

Nếu is_one_off=false (recurring)
	•	Parse start_mmdd/end_mmdd vào năm hiện tại Y:
	•	start = date(Y, MM, DD)
	•	end = date(Y, MM, DD)
	•	Nếu end < start ⇒ window “wrap” qua năm:
	•	end = date(Y+1, end_MM, end_DD)
	•	Peak cũng xử lý tương tự nếu có.

2) Khi nào notify?

Giả sử đã resolve start/end/peak_*:
	•	pre_alert_at = start - pre_alert_days
	•	Notify types:
	•	pre-alert: today == pre_alert_at
	•	start: today == start
	•	peak: today == peak_start (nếu có)
	•	end: today == end

3) “This week / upcoming”
	•	Active now: start <= today <= end
	•	Upcoming 14/21/28d: today < start <= today+N

4) Destination display
	•	show destinations[].name (JP / Bali / Hokkaido…)
	•	DSA URLs: m tự tìm theo destination + trend (đúng workflow m muốn)