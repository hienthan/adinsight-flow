You are helping implement UI logic and notification rules for a Travel Trend Signal system (PocketBase).

Data Model (trend_signals)
- key: string unique
- trend_type: string (ref)
- source_markets: string[] (e.g., ["HK"], ["TW"], ["ID"])
- destinations: {code:string, name:string}[]   // decision units (JP/KR/BALI/TH/KANTO/...)
- mode: "recurring" | "one_off"
- Recurring fields (mode="recurring"): start_mmdd, end_mmdd, peak_start_mmdd?, peak_end_mmdd?
- One-off fields (mode="one_off"): start_date, end_date, peak_start_date?, peak_end_date?
- product_types: string[] (tags for actions)
- keywords: string[] (stable intent keywords)
- priority: "high" | "medium"
- summary: string

IMPORTANT:
- HK/TW are SOURCE MARKETS ONLY, never destinations.
- This system is a reminder/insight tool; it does NOT decide CPC/budget automatically.

Goal
Build:
1) TrendSignalsPage UI list
2) Notification engine (weekly/daily) with clear rules:
   - when to alert
   - how many alerts per signal per year
   - priority ordering

User Controls (UI)
- Selected source market: dropdown {HK, TW, ID, ...}
- Time horizon filter: {Today, Next 7 days, Next 14 days, Next 30 days, All}
- Toggle: show only High priority (optional)
- Toggle: include Baseline/Always-on signals (optional) (e.g., entry_pretrip/outbound_planning)

Date Resolution
For each trend_signal:
If mode="one_off":
  use explicit start_date/end_date; optional peak_start_date/peak_end_date
If mode="recurring":
  Resolve MM-DD into dates around "today" as the NEXT occurrence window:
  - Compute start = date(currentYear, start_mm, start_dd)
  - Compute end = date(currentYear, end_mm, end_dd)
  - If end < start, treat as wrap-year: end = date(currentYear+1, end_mm, end_dd)
  - If today > end, shift to next year (start/end + 1 year)
  - Apply same logic for peak_start/peak_end if provided (peak should fall within start/end range; if missing, ignore peak)

Derived Fields per signal (computed in UI)
- pre_alert_days = signal.pre_alert_days if exists else trend_type.default_pre_alert_days (if trend_types available; otherwise fallback to 14)
- pre_alert_date = start - pre_alert_days
- state (one of):
  - UPCOMING_PREALERT: today < pre_alert_date
  - IN_PREALERT: pre_alert_date <= today < start
  - ACTIVE: start <= today <= end
  - PEAK: peak_start <= today <= peak_end (if peak exists, overrides ACTIVE label)
  - ENDED: today > end (should normally not show unless "All")

Filtering by source market
- Only show signals where:
  - signal.source_markets contains selected market
  - OR signal.source_markets is empty/null (treat as "ALL markets")
- Never infer HK/TW as destinations.

What to Alert (Notification Rules)
We want a small, non-spammy set of alerts per signal occurrence:
A) Pre-alert notification: fire ONCE when today == pre_alert_date
B) Start notification: fire ONCE when today == start
C) Peak notification: fire ONCE when today == peak_start (only if peak_start exists)
D) End notification: fire ONCE when today == end

Spam control / idempotency
- Implement a local log table/kv store (or PB collection) "notification_log" keyed by:
  (signal.key + "|" + occurrenceYear + "|" + alertType)
- If already fired, do not fire again.
- occurrenceYear for recurring signals = the resolved start.year (not calendar current year necessarily).
- For one_off signals = start_date.year

Scheduling frequency
- If the app runs daily: evaluate alerts daily.
- If weekly-only: evaluate alerts with a window:
  - fire any alertType where alertDate is within [today, today+6] and not fired.
  - include alertDate in payload so user sees the exact date.

Priority Ordering in UI
Sort order (highest usefulness first):
1) state weight: PEAK > ACTIVE > IN_PREALERT > UPCOMING_PREALERT > ENDED
2) priority: high before medium
3) soonest relevant date:
   - if IN_PREALERT: sort by start ascending
   - if UPCOMING_PREALERT: sort by pre_alert_date ascending
   - if ACTIVE/PEAK: sort by end ascending
4) tie-breaker: trend_type then key

Display Requirements (TrendSignalsPage)
For each signal card/row show:
- Title: trend_type name + destinations names (joined)
- Tags: source_markets, product_types, priority
- Dates:
  - show resolved start/end
  - if peak exists show peak range
  - show pre_alert_date and pre_alert_days
- State badge: PRE-ALERT / ACTIVE / PEAK / ENDED
- summary (short)
- keywords (collapsible)

Baseline signals
- Provide UI toggle: "Include baseline"
- Baseline definition: signals whose trend_type is entry_pretrip or outbound_planning OR (start_mmdd="01-01" and end_mmdd="12-31")
- Default baseline toggle OFF to reduce noise.

Deliverables
- Implement resolveRecurringWindow(today, start_mmdd, end_mmdd, peak_start_mmdd?, peak_end_mmdd?)
- Implement computeState(today, pre_alert_date, start, end, peak_start?, peak_end?)
- Implement getAlertsDue(today, horizonDays, selectedMarket) returning alert payloads with:
  signal.key, alertType, alertDate, priority, destinations, product_types, summary
- Implement UI sorting and filtering above.

---

Notification logs:

Implement notification idempotency for trend alerts.

Context:
- Alerts types: PRE_ALERT, START, PEAK_START, END
- For recurring signals, each alert should fire once per occurrence window (year).
- For weekly evaluation, fire alerts whose alertDate falls within [today, today+6] and were not fired yet.

Requirement:
Create a persistent notification_log store (PocketBase collection or local KV) with fields:
- log_key (string, unique) = `${signalKey}|${occurrenceKey}|${alertType}`
- signal_key (string)
- source_market (string)
- alert_type (enum)
- alert_date (date)
- occurrence_key (string)   // for recurring: resolvedStartDate in YYYY-MM-DD; for one_off: start_date in YYYY-MM-DD
- created_at

Rules:
1) occurrence_key:
   - recurring: use the resolved START date (YYYY-MM-DD) for that occurrence.
   - one_off: use start_date (YYYY-MM-DD).
2) Before firing an alert, check if log_key exists. If exists, skip.
3) After firing, insert log record.
4) If user changes dates in a trend_signal, the occurrence_key changes, so alerts can re-fire correctly for the new window without manual cleanup.
5) If source_markets includes multiple markets and the UI triggers per selected market, include source_market in log_key to avoid cross-market suppression:
   log_key = `${signalKey}|${sourceMarket}|${occurrenceKey}|${alertType}`

Deliverables:
- propose PocketBase collection schema for notification_log
- functions:
  - buildLogKey(signalKey, sourceMarket, occurrenceKey, alertType)
  - hasFired(logKey)
  - markFired(logKey, metadata)
- weekly evaluation pseudo-code that uses the 7-day window and idempotency check.