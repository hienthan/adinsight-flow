 Danh sách đầy đủ các optimization khả thi (đưa một lần duy nhất, để bạn quyết định dùng hay bỏ)

⸻

DANH SÁCH TẤT CẢ OPTIMIZATION KHẢ THI (FINAL LIST)

Đây là toàn bộ các improvement thường dùng cho slug classifier.
Tôi đưa một lần duy nhất, không thêm nữa.

Bạn có thể chọn dùng hoặc bỏ.

⸻

Optimization 1 — Token Normalization

Chuẩn hóa slug:

tempat-makan-di-bandung
→ tempat makan bandung

Giúp match keyword chính xác.

⸻

Optimization 2 — Stopword Removal

Bỏ các từ:

di
ke
dari
yang
dan
untuk
terbaik

Ví dụ:

tempat makan terbaik di bandung
→ tempat makan bandung


⸻

Optimization 3 — Keyword Index

Thay vì loop category → keyword.

Build index:

keyword → category

Lookup:

O(1)


⸻

Optimization 4 — Multi-token Keyword Support

Ví dụ:

tempat-makan
makan-siang
air-terjun
taman-nasional

Phải match phrase, không chỉ token.

⸻

Optimization 5 — Longest Keyword Match

Nếu slug có:

tempat makan

Không match:

makan

mà match:

tempat-makan


⸻

Optimization 6 — Category Priority

Tránh conflict.

Ví dụ slug:

festival-kuliner-bandung

match:

festival
kuliner

Priority:

events > culinary


⸻

Optimization 7 — Multiple Category Output

Engine nên cho phép:

content_type_primary
content_type_secondary

Ví dụ:

festival-kuliner

primary: events
secondary: culinary


⸻

Optimization 8 — Keyword Frequency Weight

Nếu slug chứa nhiều keyword cùng category:

kuliner malam bandung

score culinary cao hơn.

⸻

Optimization 9 — Geo-aware Classification

Nếu slug có:

pantai bali
gunung bromo

category gần như chắc chắn:

attractions


⸻

Optimization 10 — Pattern Priority Override

Một số pattern override keyword.

Ví dụ:

3-hari-2-malam

→

planning

dù có keyword khác.

⸻

KẾT LUẬN

Dataset JSON trên + classifier pipeline hiện tại của bạn:

slug
→ intent detection
→ geo detection
→ content classification
→ campaign grouping

là đủ mạnh cho Traveloka Explore.

⸻
