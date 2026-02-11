Ok, mình chốt best-practice layout cho riêng page Trend Radar dựa trên đúng bug m đang gặp + bản chất sản phẩm của m (decision radar, không phải dashboard).
Dưới đây là khung tư duy + cách chia layout để m đưa cho AI design/implement không lạc nữa.

⸻

1️⃣ Định nghĩa lại PAGE NÀY LÀ GÌ (rất quan trọng)

Trend Radar ≠ Analytics page
Trend Radar = Decision Inbox

👉 Người dùng mở page này để:
	•	biết cái gì cần làm NGAY
	•	biết cái gì sắp tới
	•	không bị drown trong data

→ Vì vậy layout phải dẫn mắt theo mức độ khẩn cấp, không theo data volume.

⸻

2️⃣ Page nên chia thành 4 vùng rõ ràng (Best Practice)

🟦 ZONE 1 — Page Header (Context, không phải stats)

Mục tiêu: nói cho user biết “mày đang nhìn cái gì”

NÊN CÓ
	•	Page title + 1 dòng mô tả rất ngắn
	•	3 status chips nhẹ (không card):
	•	🔴 At Peak
	•	🟢 Active
	•	🟡 Pre-alert

KHÔNG NÊN
	•	Card to
	•	Border dày
	•	Shadow
	•	Số liệu to gây distraction

Đây chỉ là orientation, không phải KPI.

⸻

🟦 ZONE 2 — Control Bar (1 dòng duy nhất)

Mục tiêu: lọc nhanh, không phá flow đọc

Best practice chia như sau (trái → phải):

[ Search (flex-1) ] [ Source Market ] [ Horizon ]        [ Baseline ] [ Status ]

Nguyên tắc
	•	Search chiếm nhiều không gian nhất
	•	Filter là secondary
	•	Toggle (Baseline / Draft) gom về bên phải
	•	Không wrap nếu màn hình rộng
	•	Không label dài

👉 Nếu control bar wrap = UX fail.

⸻

🟦 ZONE 3 — Action Buckets (CORE của page)

Đây là nơi AI đang làm sai nhiều nhất trước đó.

Cách chia chuẩn:
KHÔNG dùng grid card
KHÔNG trộn lẫn state

👉 Luôn chia theo STATE, theo thứ tự khẩn cấp:
	1.	🔴 AT PEAK / ACTION NOW
	2.	🟢 ACTIVE
	3.	🟡 UPCOMING (PRE-ALERT)

Mỗi bucket:
	•	là 1 section riêng
	•	có header mỏng
	•	có list gọn

⸻

🟦 ZONE 4 — Signal Row (đơn vị hiển thị nhỏ nhất)

Một row chuẩn chỉ có 3 cột (luôn thế):

| STATE | TREND + DESTINATION | TIME SIGNAL |

Chi tiết
	•	STATE: badge + color bar (đọc trong 0.3s)
	•	TREND + DEST:
	•	line 1: Trend name (bold)
	•	line 2: Destination (muted)
	•	TIME:
	•	Starts / Ends / Alert in Xd
	•	Align right

TUYỆT ĐỐI KHÔNG
	•	lặp chữ “UPCOMING PRE-ALERT”
	•	show tất cả tag
	•	show keyword
	•	show product type ở collapsed view

⸻

3️⃣ Progressive Disclosure là bắt buộc

Collapsed (default)
	•	đọc được trong 1 giây
	•	chỉ trả lời: “có cần làm gì không?”

Expanded (click row)

MỚI hiển thị:
	•	summary
	•	product_types
	•	keywords
	•	CTA: “Check campaigns”

👉 Nếu không click mà đã thấy hết → layout sai.

⸻

4️⃣ Giới hạn số item hiển thị (anti-fatigue)

Best practice cho m:
	•	Peak: show ALL (thường rất ít)
	•	Active: max 5–8
	•	Upcoming: max 8–12

Có nút:
	•	“Show more”
	•	“Show less”

Không giới hạn = user bỏ qua toàn bộ Upcoming.

⸻

5️⃣ Màu sắc & density (để AI không phá nữa)

Color
	•	Nền: trắng / xám rất nhạt
	•	State color: chỉ dùng cho bar + badge
	•	Không background màu toàn row

Spacing
	•	Row height ~48–56px
	•	Section spacing rõ ràng
	•	Không border dày, chỉ divider mỏng

⸻

6️⃣ Anti-pattern (cấm AI làm)

❌ Card cho mỗi signal
❌ Grid 3 cột cho signals
❌ Lặp state text nhiều lần
❌ Dark background cho list
❌ Show tất cả signals cùng lúc
❌ Dashboard KPI mindset

⸻

7️⃣ Một câu m nên nói thẳng với AI (rất hiệu quả)

“Design this page as a priority inbox, not a dashboard.
Optimize for scan → decide → act, not for showing data.”

⸻

Nếu m muốn, bước tiếp theo mình có thể:
	•	viết wireframe ASCII chuẩn cho page này
	•	hoặc design spec (spacing, font, color tokens) để AI code không lệch

--------------------------
wireframe ASCII  
┌──────────────────────────────────────────────────────────────────────────────┐
│ Trend Radar                                                                  │
│ Daily intelligence scan of emerging seasonal spikes and market shifts.       │
│                                                                              │
│ [ 🔴 At Peak: 0 ]   [ 🟢 Active: 1 ]   [ 🟡 Pre-alert: 22 ]                    │
└──────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│ 🔍 Search trends (name, destination...)                                      │
│ ──────────────────────────────────────────────────────────────────────────── │
│ [ Search (flex-1)________________________ ]  [ Source: All ▼ ] [ Horizon ▼ ] │
│                                                     [ Baseline ] [ Status ▼ ] │
└──────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│ 🔴 AT PEAK / ACTION NOW (0)                                    [ collapse ▲ ] │
│──────────────────────────────────────────────────────────────────────────────│
│  No trends currently at peak.                                                 │
└──────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│ 🟢 ACTIVE TRENDS (1)                                         [ collapse ▲ ]  │
│──────────────────────────────────────────────────────────────────────────────│
│ ▌🟢  Cherry Blossom Season                                 Ends 5 Apr        │
│      Japan · Kanto · Kansai                                                     │
│                                                                              │
│      ▸ expand ▼                                                              │
└──────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│ 🟡 UPCOMING (PRE-ALERT) (22)                               [ collapse ▼ ]    │
│──────────────────────────────────────────────────────────────────────────────│
│ ▌🟡  Cherry Blossom Season                             Starts 15 Feb         │
│      Japan · Kanto · Kansai                                                     │
│                                                                              │
│ ▌🟡  Cherry Blossom Season                             Alert in 2d           │
│      South Korea · Seoul · Jeju                                               │
│                                                                              │
│ ▌🟡  Songkran Festival                                Alert in 29d          │
│      Thailand · Bangkok · Chiang Mai                                         │
│                                                                              │
│ ▌🟡  Golden Week                                     Alert in 29d           │
│      Japan                                                                   │
│                                                                              │
│  …                                                                            │
│                                                                              │
│        [ Show more ↓ ]                                                        │
└──────────────────────────────────────────────────────────────────────────────┘


( EXPANDED ROW – only when user clicks a row )

┌──────────────────────────────────────────────────────────────────────────────┐
│ ▌🟡  Cherry Blossom Season                             Starts 15 Feb         │
│      Japan · Kanto · Kansai                                                     │
│──────────────────────────────────────────────────────────────────────────────│
│ Summary:                                                                      │
│ Peak cherry blossom travel season. Pre-trip research spikes strongly in HK.  │
│                                                                              │
│ Product types:  [ Guide ] [ Rail ] [ Attraction ] [ eSIM ]                   │
│                                                                              │
│ Keywords:                                                                     │
│  • Japan cherry blossom                                                       │
│  • Sakura season Japan                                                        │
│  • Tokyo cherry blossom                                                       │
│                                                                              │
│ [ Check related campaigns → ]                                                 │
└──────────────────────────────────────────────────────────────────────────────┘

Quy ước AI PHẢI TUÂN THỦ (đính kèm wireframe)
	•	1 row = 1 decision unit
	•	3 cột cố định: State | Trend + Destination | Time
	•	Không card grid
	•	Không show keyword / product type khi collapsed
	•	Upcoming phải có giới hạn + Show more
	•	Expanded chỉ xuất hiện khi click

Nếu m muốn, bước kế tiếp mình làm được ngay:
	•	Design token spec (spacing, font size, màu cho PEAK / ACTIVE / PRE-ALERT)
	•	hoặc React component skeleton (HeroUI + Tailwind class chuẩn)