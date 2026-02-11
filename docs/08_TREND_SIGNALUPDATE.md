Thay block ngày hiện tại bằng Action Timing Chip

❌ Hiện tại PRE: 14   02-10 → 04-05

Cột 3 Đổi thành:
Peak window
Feb 10 → Apr 05

Cột 4:
⏰ START CAMPAIGNS BY
Jan 27 (in 3 days)

hoặc nếu đã tới ngày:
🟢 START CAMPAIGNS NOW
(pre-alert window)

Logic để tính:
recommendedStartDate = startDate - preAlertDays
daysUntilAction = recommendedStartDate - today

Render theo trạng thái:
	•	daysUntilAction > 0
→ “Start in X days (Jan 27)”
	•	daysUntilAction <= 0 && today < startDate
→ “Start now (pre-alert window)”
	•	today >= startDate
→ “Active – optimize & scale”

----

Perfect, cái này là trái tim của Trend Radar.
Dưới đây là mapping đầy đủ – chuẩn decision UX, m có thể đưa nguyên block này cho AI (hoặc dùng làm spec cho code).

⸻

ACTION TIMING TEXT MAPPING (FINAL SPEC)

Nguyên tắc vàng:
UI luôn trả lời câu hỏi: “BÂY GIỜ TAO NÊN LÀM GÌ?”
Không show toán, không show raw days nếu không cần.

⸻

1️⃣ PRE-ALERT (chưa tới peak, đang giai đoạn chuẩn bị)

Điều kiện

today < startDate
AND today >= preAlertDate

Text hiển thị (ưu tiên)

Primary

🟠 Start campaigns NOW

Secondary (nhỏ hơn)

Peak starts on Feb 10

Optional helper

Pre-alert window (14 days before peak)

Khi pre-alert CHƯA tới (far future)

today < preAlertDate

Primary

🟠 Start in 3 days

Secondary

Recommended prep date: Jan 27


⸻

2️⃣ ACTIVE (đang trong peak window)

Điều kiện

today >= startDate
AND today <= endDate

Text hiển thị

Primary

🟢 Active — optimize & scale

Secondary

Peak ends in 12 days (Apr 05)

Optional helper

Monitor CPC & IS closely

❗ Không dùng chữ “ACTIVE” chung chung – phải gắn với hành động

⸻

3️⃣ AT PEAK / PEAK (điểm nóng nhất)

Điều kiện

today >= peakStart
AND today <= peakEnd

Text hiển thị

Primary (đậm nhất, nổi bật)

🔴 PEAK NOW — maximize coverage

Secondary

Highest demand period

Optional helper

Avoid launching new experiments


⸻

4️⃣ ENDING / WINDING DOWN (sắp hết peak)

Điều kiện

endDate - today <= endingThresholdDays

(ví dụ ≤ 5–7 ngày)

Text hiển thị

Primary

🟡 Peak ending soon

Secondary

Taper budgets after Apr 05

Optional helper

Shift focus to retargeting / evergreen


⸻

5️⃣ ENDED (hết trend – chỉ show nếu user bật All time)

Điều kiện

today > endDate

Text hiển thị

Primary

⚪ Trend ended

Secondary

Review performance & save notes


⸻

ƯU TIÊN MÀU SẮC (để UX rõ ràng)

State	Color cue	Ý nghĩa hành động
PRE-ALERT	🟠 Amber	Chuẩn bị / bật camp
ACTIVE	🟢 Green	Tối ưu / scale
PEAK	🔴 Red	Đẩy mạnh nhất
ENDING	🟡 Yellow	Giảm dần
ENDED	⚪ Gray	Lưu trữ / review


⸻

IMPLEMENTATION NOTE (để AI không bug)
	•	Primary line: font-semibold, màu đậm
	•	Secondary line: text-sm, muted
	•	Không show raw preAlertDays cho user
	•	Chỉ show ngày cụ thể nếu nó giúp quyết định

⸻

CÂU CHỐT ĐỂ ĐƯA CHO AI

“Always show an action-oriented sentence, not a date.
Dates are secondary, actions are primary.”

⸻
