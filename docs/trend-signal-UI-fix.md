You are fixing the UI of a Trend Signals Radar, NOT an analytics dashboard.

Context:
- Users scan this page daily to decide what campaigns to prepare or scale.
- The current UI is too dense and card-heavy, making state recognition difficult.
- HeroUI components are available but NOT the focus; information hierarchy is.

UI GOALS:
1. State-first visibility: users must identify PEAK / ACTIVE / PRE-ALERT in under 0.5 seconds.
2. Reduce cognitive load: fewer colors, fewer visible tags, progressive disclosure.
3. Action-oriented layout: each signal suggests a next action (prepare / monitor / scale).

REQUIRED CHANGES:

A) Layout restructuring
- Replace uniform grid of cards with 3 stacked sections:
  1. "🔥 At Peak / Action Now"
  2. "⚡ Active"
  3. "⏰ Upcoming (Pre-alert)"
- Each section is collapsible.
- Default expanded order: Peak → Active → Upcoming.

B) Card redesign (compact by default)
Collapsed card MUST show ONLY:
- Trend title
- Destination(s)
- State badge (color-coded)
- Key date (start / peak / pre-alert date)

Expanded card shows:
- Summary (1–2 lines max)
- Product Types (icons or muted chips)
- Keywords (collapsible or tooltip)

C) State visualization (MANDATORY)
- Use a vertical color strip or left border:
  - Red = PEAK
  - Orange = ACTIVE
  - Blue = PRE-ALERT
- State badge must be visually dominant (not text-only).

D) Tag handling
- Hide source_market and product_types by default.
- Show them only in expanded view or on hover.
- NEVER show more than 3 tags at once in collapsed view.

E) Top summary refactor
Replace numeric counters with actionable summaries:
- "3 trends need action this week"
- "5 trends entering pre-alert in next 7 days"

F) HeroUI usage guidance
- Use Card only for expanded view.
- Use List / Accordion / Disclosure patterns for collapsed lists.
- Do NOT force everything into Card + Grid.

DELIVERABLE:
- Refactored component structure (pseudo-code acceptable)
- Clear separation between collapsed vs expanded UI
- No new features, ONLY UI clarity fixes

---

Part 2:

You are debugging and fixing a broken Trend Radar UI (React + HeroUI). Do NOT change data logic or backend. Only fix UI rendering and layout bugs.

CRITICAL BUGS OBSERVED (must fix all):
1) "[object Object]" is being rendered in the list items (destinations are objects). Fix rendering by mapping destinations to destination.name (fallback to string if already string).
2) Large dark/opaque overlays are covering sections (looks like an accidental absolute overlay / gradient / backdrop). Remove any full-width absolute layers, backdrops, pseudo-elements, or opacity wrappers that overlap the list.
3) Accordion/section blocks have incorrect heights and overflow, causing huge dark rectangles and unreadable content. Fix container sizing, overflow handling, and background colors.
4) Text contrast is too low (dark background with dark text). Ensure readable contrast across all sections.
5) Section headers (AT PEAK / ACTIVE / UPCOMING) and rows are misaligned and too tall. Make them compact and consistent.
6) Filters row (Search + Market dropdown + Horizon dropdown + Active/Draft toggle) alignment is messy. Fix spacing, baseline alignment, and responsive wrapping.

REQUIREMENTS:
A) DATA RENDERING (MANDATORY)
- Create a helper:
  - getDestinationLabel(destinations):
      - if array of objects -> join(dest.name)
      - if array of strings -> join(string)
      - else empty
- Ensure NO direct rendering of objects in JSX.

B) REMOVE OVERLAYS (MANDATORY)
- Search the component and its wrappers for any of:
  - absolute/fixed positioned divs spanning full width/height
  - gradient overlays, backdrops, opacity layers, masks, pseudo-elements
  - “bg-black/50”, “opacity-*”, “backdrop-blur” applied to list containers
- Remove or constrain them to the intended element only.
- Ensure each section background is normal (white/light), no full-width dark blocks.

C) LAYOUT REBUILD (keep same features, just fix UI)
- Use a clean stacked layout:
  - Header: title + 3 compact stat pills (not huge cards)
  - Controls row: Search | Source Market | Horizon | Status segmented control (ACTIVE/DRAFT/ALL)
  - Three collapsible sections: PEAK, ACTIVE, UPCOMING
- Each section:
  - max height with scroll inside (e.g., 360–520px)
  - proper overflow-y-auto
  - no overflow hidden that clips content
  - no negative margins

D) ROW / CARD DESIGN (COMPACT)
- Each signal row (collapsed) should show:
  - Left: state badge + trend type name
  - Middle: destinations label (joined names)
  - Right: key date label (e.g., STARTS 10 Feb / PEAK 25 Mar / ALERT 21 days)
- No more than 2 lines per row.
- On expand: show summary + product_types chips + keywords collapsible.
- Ensure row height is stable and does not balloon.

E) STYLING & ACCESSIBILITY
- Use neutral background (white/light gray), avoid dark overlays.
- Provide clear separators (divider or subtle border).
- Ensure font sizes are readable; avoid tiny faint text.
- Ensure focus states visible for keyboard nav.

F) HEROUI COMPONENT USAGE (use but do not force)
- Prefer HeroUI: Accordion, Input, Select, Chip, Badge, Card (only expanded), Divider.
- Do NOT wrap entire sections in heavy Card with dark background.
- Keep section headers as AccordionTrigger with light background.

IMPLEMENTATION TASKS (do these in code):
1) Add helper functions:
   - formatDestinations(destinations)
   - formatKeyDate(signalState, dates)
2) Replace any destination rendering with formatDestinations().
3) Remove any overlay/backdrop divs and any “opacity” wrappers causing dark blocks.
4) Enforce consistent section containers:
   - className: "rounded-lg border bg-white"
   - inner list: "max-h-[420px] overflow-y-auto"
5) Fix controls row with flex wrap:
   - "flex flex-wrap items-center gap-3"
   - ensure segmented control does not overlap.
6) Add a small debug-safe fallback:
   - if destinations is invalid -> show "—" not object.

DELIVERABLE:
Return the updated TrendSignalsPage.tsx (or the main component file) with the above fixes applied. Ensure the UI has no dark overlays, no [object Object], compact readable lists, and properly aligned controls.

---

Part 3
You are fixing Trend Radar UI v3 (React + HeroUI). Do NOT change business logic/date logic. Fix ONLY layout/visual bugs and responsiveness.

OBSERVED UI ISSUES (must fix):
1) Massive empty whitespace on the RIGHT side of the page. The main content is constrained to a narrow column and not using available width.
2) The list UI still looks broken: rows have heavy double borders, inconsistent padding, cramped text, and repeated “UPCOMING PREALERT” labels creating visual noise.
3) Section containers and headers are visually mis-sized (thick outlines, awkward spacing, misaligned chevrons).
4) Controls row (Search + dropdowns + BASELINE + ACTIVE/DRAFT/ALL) is cramped and misaligned; spacing/width allocation is wrong.
5) Too many items shown at once in “Upcoming (Pre-alert)” causing scanning fatigue; needs progressive disclosure without altering data.

MANDATORY FIXES

A) FIX THE RIGHT-SIDE WHITESPACE (Layout width)
- Identify and remove any container constraints such as:
  - max-w-* (max-w-2xl, max-w-5xl, max-w-screen-lg, etc.)
  - fixed widths (w-[900px], w-[1024px]) or “container mx-auto” that limits width
- Ensure the MAIN content area fills the available space next to the sidebar:
  - outer layout: display:flex
  - sidebar: fixed width
  - main content: flex:1; min-width:0; width:100%;
- Set main page wrapper to:
  - className="w-full max-w-none flex-1 min-w-0 px-6"
- Ensure no parent has “justify-center” or “mx-auto” that centers a narrow column.
- If there is a Shell/Layout component, fix it there (preferred) not inside the page.

B) REBUILD CONTROLS ROW (clean + responsive)
- Controls row must be:
  - className="flex flex-wrap items-center gap-3 w-full"
- Search input should be flexible:
  - className="flex-1 min-w-[320px]"
- Dropdowns should not shrink to tiny:
  - className="min-w-[160px]"
- BASELINE toggle + status segmented control should align right on wide screens:
  - wrap them in a right cluster: className="ml-auto flex items-center gap-2"
- On small screens, allow wrap to next line without overlap.

C) SECTION VISUAL FIX (stop the “thick border” bug)
- Remove heavy borders/outlines on every row.
- Use ONE subtle container border per section:
  - section wrapper: "rounded-lg border border-default-200 bg-background"
- Inside list, use Divider between rows instead of row borders:
  - "divide-y divide-default-200"
- Section header should be compact:
  - height ~ 40–48px, no thick outline, no dark background.

D) ROW DESIGN FIX (compact + readable + no repeated labels)
- Each row should be a 3-column layout (grid) to avoid messy alignment:
  - grid-cols-[120px_1fr_140px] on desktop
  - stack on mobile (sm: grid-cols-1)
- Column content:
  1) Left: State Badge ONLY (e.g., PEAK/ACTIVE/PRE-ALERT). Do NOT repeat “UPCOMING PREALERT” twice.
  2) Middle: Trend name + destinations (single line, secondary line muted)
  3) Right: Key date label (e.g., "Starts 15 Feb" or "Alert in 12d") aligned right
- Enforce max 2 lines for the middle column:
  - trend name: truncate
  - destinations: truncate, muted
- No per-row outer border; only dividers.

E) PROGRESSIVE DISCLOSURE (reduce noise without changing data)
- In each section, default show only top N items:
  - Peak: show all (usually small)
  - Active: show up to 10
  - Upcoming: show up to 12
- Add “Show more / Show less” per section (pure UI state).
- Keep search working over all items, but render limited results until expanded.

F) HEROUI COMPONENT GUIDANCE (do not misuse Card)
- Use Accordion for sections, but do NOT nest Accordions per row.
- For rows: use a simple div/button for expand.
- Expanded row panel shows summary + product_types chips + keywords list (collapsible).
- Avoid Card around the entire page or sections.

IMPLEMENTATION CHECKLIST (code tasks)
1) Fix the page/container width:
   - remove max-width constraints
   - ensure main content is flex-1 min-w-0 w-full max-w-none
2) Refactor controls row with flex-1 search + right cluster
3) Refactor sections to: Accordion (3 items) + each has a list container with divide-y
4) Refactor row renderer to grid columns and remove duplicated labels
5) Add per-section “Show more” UI limit (10/12) with internal state
6) Verify NO horizontal overflow and no unused right whitespace on 1440px width

DELIVERABLE
Return updated code for:
- The layout shell component if it causes right whitespace (preferred), OR
- TrendSignalsPage.tsx with correct full-width behavior.
Ensure the page uses full available width, controls align cleanly, lists are readable, and Upcoming is not an endless wall of items by default.