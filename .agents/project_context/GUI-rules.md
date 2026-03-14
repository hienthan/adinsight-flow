# GUI Rules

This document defines the GUI conventions for the current frontend.
It exists to prevent regressions, avoid browser/GPU hover bugs, and keep the UI premium without accumulating fragile code.

## Goals

- Keep the UI visually premium.
- Keep interactions stable in Chromium/WebKit.
- Prefer reusable primitives over large inline style duplication.
- Avoid patterns that cause hover flicker, cursor hit-testing issues, or layout jank.

## Root Problem We Fixed

The app had multiple hotspots using:

- `transition: all`
- hover `transform`
- hover `filter`
- looped `scale` / `box-shadow` animations
- these effects inside `sticky`, `fixed`, or `overflow` layouts

That combination can trigger compositor and hit-testing bugs, especially in pages like `GlobalNotesPage`, shell sidebars, and dense dashboards.

## Hard Rules

### 1. Do not use `transition: all`

Always transition only the properties you actually need.

Approved default:

- `background-color`
- `border-color`
- `color`
- `box-shadow`
- `opacity`

Use shared tokens from [`frontend/src/lib/uiMotion.ts`](/Users/hienthan/Developments/GoogleAds/crawler-demo/frontend/src/lib/uiMotion.ts):

- `SAFE_INTERACTIVE_TRANSITION`
- `SAFE_PANEL_TRANSITION`
- `SAFE_ITEM_TRANSITION`

### 2. Avoid hover `transform` and `filter` in complex layout zones

Do not add hover `translate`, `scale`, `rotate`, `brightness`, `grayscale`, or similar effects inside:

- `position: sticky` containers
- `position: fixed` shell elements
- nested `overflow: auto` / `overflow: hidden` layouts
- rich text editors
- sidebars and toolbars

If emphasis is needed, use:

- background color change
- border color change
- text color change
- subtle shadow change
- opacity change

### 3. Avoid continuous animation loops for attention

Do not use infinite pulsing or scaling for badges, chips, or icons in the app shell.

Prefer:

- static accent color
- subtle inset shadow
- stronger border
- stronger foreground color

### 4. Do not patch this via `frontend/src/index.css` unless the rule is truly global

This app has fragile legacy shared classes like `hero-card`, `hero-btn`, `nav-item`.
When fixing interaction bugs, prefer local subtree scoping instead of mutating the global behavior for the entire app.

Use scoped helpers from [`frontend/src/lib/uiMotion.ts`](/Users/hienthan/Developments/GoogleAds/crawler-demo/frontend/src/lib/uiMotion.ts):

- `createSafeInteractionScopeCss(...)`
- selector groups like `SAFE_BUTTON_SELECTORS`, `SAFE_CARD_SELECTORS`, `SAFE_NAV_SELECTORS`

## Preferred Primitives

Use these first before introducing new inline patterns.

### `SafeButton`

File:

- [`frontend/src/components/common/ui/SafeButton.tsx`](/Users/hienthan/Developments/GoogleAds/crawler-demo/frontend/src/components/common/ui/SafeButton.tsx)

Use for:

- icon buttons
- toolbar buttons
- segmented toggles
- lightweight action buttons with custom inline visuals

Why:

- centralizes safe interaction transition
- reduces button boilerplate

### `FilterChip`

File:

- [`frontend/src/components/common/ui/FilterChip.tsx`](/Users/hienthan/Developments/GoogleAds/crawler-demo/frontend/src/components/common/ui/FilterChip.tsx)

Use for:

- dashboard quick filters
- status toggles
- summary chips

Why:

- keeps premium chip styling reusable
- prevents each page from reimplementing active/inactive motion incorrectly

### `SurfaceCard`

File:

- [`frontend/src/components/common/ui/SurfaceCard.tsx`](/Users/hienthan/Developments/GoogleAds/crawler-demo/frontend/src/components/common/ui/SurfaceCard.tsx)

Use for:

- page header containers
- premium content surfaces
- card-like panels that do not need custom library components

Why:

- centralizes surface tokens
- defaults to safe motion
- encourages `no-lift` behavior

## Current Shared Motion Helpers

File:

- [`frontend/src/lib/uiMotion.ts`](/Users/hienthan/Developments/GoogleAds/crawler-demo/frontend/src/lib/uiMotion.ts)

What belongs there:

- motion tokens
- safe selector groups
- scoped CSS helper generators

What should not belong there:

- page-specific colors
- domain-specific layout decisions
- business logic

## Patterns To Prefer

### Premium emphasis

Prefer this order of emphasis:

1. Typography
2. Spacing
3. Surface contrast
4. Border contrast
5. Shadow refinement
6. Motion

Motion is the last layer, not the first.

### Page-level safety scope

If a page uses legacy `hero-*` classes but needs safer behavior, apply a scoped style block at the page root using `createSafeInteractionScopeCss(...)`.

This is the preferred migration path until the legacy shared classes are fully replaced.

### Reuse before inventing

Before adding a new inline interactive block:

1. Check `SafeButton`
2. Check `FilterChip`
3. Check `SurfaceCard`
4. Check `uiMotion.ts`

If none fit, add a new primitive instead of duplicating a one-off implementation three times.

## Patterns To Avoid

- `transition: all`
- hover `transform: translateX(...)`
- hover `transform: translateY(...)`
- hover `transform: scale(...)`
- hover `filter: brightness(...)`
- hover `filter: grayscale(...)`
- infinite pulse animation in shell UI
- applying new global fixes directly in `index.css` for local bugs
- mixing many inline style literals without extracting shared constants or primitives

## Areas Already Refactored

These files already follow the newer safe interaction direction and should be used as reference implementations:

- [`frontend/src/pages/GlobalNotes/GlobalNotesPage.tsx`](/Users/hienthan/Developments/GoogleAds/crawler-demo/frontend/src/pages/GlobalNotes/GlobalNotesPage.tsx)
- [`frontend/src/components/common/RichTextEditor.tsx`](/Users/hienthan/Developments/GoogleAds/crawler-demo/frontend/src/components/common/RichTextEditor.tsx)
- [`frontend/src/components/layout/Header.tsx`](/Users/hienthan/Developments/GoogleAds/crawler-demo/frontend/src/components/layout/Header.tsx)
- [`frontend/src/components/layout/StickyNotesSidebar.tsx`](/Users/hienthan/Developments/GoogleAds/crawler-demo/frontend/src/components/layout/StickyNotesSidebar.tsx)
- [`frontend/src/components/layout/Sidebar.tsx`](/Users/hienthan/Developments/GoogleAds/crawler-demo/frontend/src/components/layout/Sidebar.tsx)
- [`frontend/src/pages/CampTracking/CampOverview.tsx`](/Users/hienthan/Developments/GoogleAds/crawler-demo/frontend/src/pages/CampTracking/CampOverview.tsx)
- [`frontend/src/pages/AdInsight/AdInsightPage.tsx`](/Users/hienthan/Developments/GoogleAds/crawler-demo/frontend/src/pages/AdInsight/AdInsightPage.tsx)
- [`frontend/src/pages/AdInsight/components/SignalRow.tsx`](/Users/hienthan/Developments/GoogleAds/crawler-demo/frontend/src/pages/AdInsight/components/SignalRow.tsx)
- [`frontend/src/pages/AdInsight/components/SignalCard.tsx`](/Users/hienthan/Developments/GoogleAds/crawler-demo/frontend/src/pages/AdInsight/components/SignalCard.tsx)

## Migration Strategy

When touching old GUI code:

1. Remove `transition: all`.
2. Remove hover `transform` and `filter` in complex layout zones.
3. Replace duplicated button logic with `SafeButton`.
4. Replace duplicated chip logic with `FilterChip`.
5. Replace repeated surface wrappers with `SurfaceCard` where appropriate.
6. Only after reuse is in place, consider deeper visual cleanup.

## Future Direction

The next safe cleanup steps should be:

- replace more `hero-card` wrappers with `SurfaceCard`
- replace more icon/tool buttons with `SafeButton`
- introduce a small set of toolbar and section-header primitives
- reduce inline style volume in large pages
- then tackle bundle-size improvements separately

## Non-Goals

These rules are not saying:

- no motion at all
- no premium styling
- no inline style ever

They do mean:

- motion must be deliberate
- styling must be composable
- fixes must not reintroduce browser/compositor instability
