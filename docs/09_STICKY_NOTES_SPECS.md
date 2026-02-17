0) Mục tiêu

Right Sidebar = Platform Sticky Command Center
	•	Scan nhanh (đọc 2–3 dòng)
	•	Edit nhanh (inline)
	•	Không task manager: không due date, không status
	•	Priority per line do user tô màu trong editor

⸻

1) Data contract (PocketBase)

Collection: campaign_platforms

Fields dùng:
	•	id
	•	display_name (vd: Trip-MO)
	•	color (hex)
	•	sticky_note (text / html / editor-json-string tuỳ editor)
	•	is_pinned (bool)
	•	updated (autodate)

Query default:
	•	fetch tất cả campaign_platforms
	•	sort client-side: is_pinned desc, sticky_note non-empty desc, display_name asc

⸻

2) Entry points + Layout container

2.1. Right sidebar container
	•	Fixed right side, luôn có thể mở ở mọi page.
	•	Width:
	•	collapsed: 48px (chỉ icon)
	•	expanded: 360–420px (responsive)
	•	Toggle:
	•	button ở góc phải hoặc hotkey Ctrl/Cmd + \ (optional)

2.2. Header
	•	Title: Sticky
	•	Actions:
	•	Collapse icon
	•	(Optional) Expand width icon (360 ↔ 480)

⸻

3) List structure

3.1 Sections
	•	Section 1: Pinned
	•	Section 2: All Platforms

Rules:
	•	Pinned chỉ hiển thị những platform có is_pinned=true (kệ có note hay không)
	•	All Platforms hiển thị:
	•	default: chỉ show những platform sticky_note != empty
	•	có toggle Show empty (off by default) để lộ các platform trống khi cần

3.2 Card (compact scan-first)

Mỗi platform render 1 card:

Card header
	•	Left: vertical color strip 4px theo campaign_platforms.color (KHÔNG tô full background)
	•	Platform badge:
	•	display_name
	•	Right icons:
	•	pin toggle (filled nếu pinned)
	•	chevron/expand indicator

Card body (collapsed)
	•	Preview text:
	•	render plain-text preview từ sticky_note (strip html nếu có)
	•	max 2–3 lines, ellipsis + fade bottom
	•	Nếu empty:
	•	hiển thị “No sticky note” (chỉ khi Show empty bật)

Card footer (tiny)
	•	Updated {relative time} (vd: “Updated 2d ago”) — optional

⸻

4) Expand / Edit behavior (edit-second)

4.1 Expand
	•	Click card (không click pin) → toggle expanded
	•	Chỉ 1 card expanded tại một thời điểm (accordion) để không dài.
	•	Expand animation height 150–250ms.

4.2 Inline editor
	•	Editor inline ngay trong card:
	•	full width
	•	min height 160px, max height 60vh (scroll inside)
	•	Toolbar:
	•	compact toolbar (bold / color / bullet / link) — đúng nhu cầu “priority per line”
	•	Khi expanded:
	•	focus cursor vào editor

4.3 Auto-save
	•	Save trigger:
	•	debounce 600–900ms sau khi user stop typing
	•	và onBlur (click ra ngoài)
	•	Save UI:
	•	trạng thái nhỏ: Saving... → Saved → (ẩn)
	•	nếu lỗi: Retry button + toast

4.4 No “Done”
	•	Không có checkbox, không status.
	•	User xóa dòng ngay trong editor.

⸻

5) Pin behavior
	•	Click pin icon:
	•	optimistic update is_pinned
	•	card chuyển sang section Pinned ngay
	•	Pinned section luôn ở trên.

⸻

6) Performance / UX constraints
	•	List virtual scroll nếu platforms > 50 (optional, v1 có thể bỏ)
	•	Avoid re-render editor của card khác khi typing (memoize)
	•	Strip HTML to preview phải nhanh (simple regex hoặc DOMParser)

⸻

7) Empty state
	•	Nếu không có platform nào có sticky_note và Show empty OFF:
	•	hiển thị empty panel message:
	•	“No sticky notes yet”
	•	hint: “Turn on ‘Show empty’ to add notes for a platform.”

⸻

8) Accessibility
	•	Keyboard:
	•	Up/Down chọn card
	•	Enter expand/collapse
	•	P toggle pin khi card focused (optional)
	•	ARIA label cho pin/toggle.

⸻

9) Non-goals (đừng làm để tránh nặng)
	•	Không campaign linking dropdown
	•	Không due date / reminder
	•	Không multi-note per platform
	•	Không search/filter nâng cao (v1)

⸻

10) Implementation notes cho AI (để nó đỡ hỏi)
	•	Preview generation: sticky_note sẽ giống như các notes khác hiện tại (general_notes.content, campaigns.general_notes dùng html gì đó t quên rồi) HTML → convert to plain text preview.
	•	Update call: PATCH record campaign_platforms/{id} fields: sticky_note, is_pinned
	•	Concurrency: nếu save đang pending mà user tiếp tục gõ → chỉ gửi bản mới nhất (cancel previous).