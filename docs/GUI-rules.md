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

### 0. Refactor must preserve layout unless the task explicitly asks for redesign

When refactoring a GUI section:

- preserve the existing layout structure
- preserve alignment, spacing hierarchy, and visual grouping
- preserve responsive behavior
- preserve the existing visual contract for the section, especially in modals and dense dashboard headers

Do not replace markup with a primitive if that primitive changes flex growth, stacking, alignment, or spacing.

Rule:

- refactor behavior and reuse first
- redesign layout only when explicitly requested

Visual contract includes:

- border radius
- shadow weight
- shell/background layering
- padding hierarchy
- header and footer chrome

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

Import rule:

- prefer importing shared GUI primitives from [`frontend/src/components/common/ui/index.ts`](/Users/hienthan/Developments/GoogleAds/crawler-demo/frontend/src/components/common/ui/index.ts) when possible
- add new reusable GUI primitives to the same folder and re-export them there

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
- must stay layout-neutral by default

Rule:

- `SurfaceCard` must not impose flex direction or layout flow unless the caller explicitly asks for it
- primitives that wrap legacy classes must reset layout-affecting defaults when needed
- primitives should be layout-neutral and visually predictable before being used as drop-in replacements

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
4. Check `ToolbarGroup`
5. Check `SectionHeader`
6. Check `uiMotion.ts`

If none fit, add a new primitive instead of duplicating a one-off implementation three times.

### Layout primitives

Use `ToolbarGroup` and `SectionHeader` before rebuilding title/action rows by hand.

Files:

- [`frontend/src/components/common/ui/ToolbarGroup.tsx`](/Users/hienthan/Developments/GoogleAds/crawler-demo/frontend/src/components/common/ui/ToolbarGroup.tsx)
- [`frontend/src/components/common/ui/SectionHeader.tsx`](/Users/hienthan/Developments/GoogleAds/crawler-demo/frontend/src/components/common/ui/SectionHeader.tsx)

Use `ToolbarGroup` for:

- segmented controls
- compact toolbar clusters
- action groups that need a premium surface wrapper

Use `SectionHeader` for:

- panel titles with actions
- grouped list headers
- reusable title/subtitle rows

Rule:

- if a page has a repeated "title left + actions right" pattern, use `SectionHeader`
- if a page has a repeated compact action cluster, use `ToolbarGroup`

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

### Phase 2 guidance: leaf components first

When refactoring the app incrementally:

- prefer leaf components before page sections
- prefer self-contained modals, cards, list items, and toolbar items before page wrappers
- do not mix page layout refactor into a leaf-component cleanup task

Good Phase 2 targets:

- item cards
- modal chrome
- compact action rows
- filter widgets
- small reusable section blocks

Avoid in Phase 2:

- page grid restructuring
- shell layout changes
- route composition changes unless explicitly doing performance work

### Phase 3 guidance: section-level refactor

After leaf components are stable:

- refactor one page section family at a time
- keep query, filtering, sorting, and mutation logic in place
- change section chrome, wrappers, and action rows before touching content rendering internals

Good Phase 3 targets:

- page headers
- filter clusters
- status bars
- empty states
- pagination bars
- table wrappers and table chrome, but not row business logic in the same batch

Rule:

- if a section already has stable behavior, only refactor its UI shell and repeated control markup
- do not mix section refactor with data-flow rewrites in the same batch

### Phase 4 guidance: page-level cleanup

After a page has passed Phase 3:

- reduce repeated inline style literals by extracting page-local constants
- extract repeated presentational mapping logic into page-local helpers
- keep these helpers in the same page file unless they are clearly reusable across multiple pages

Good Phase 4 targets:

- repeated filter option arrays
- repeated segmented-control item definitions
- repeated badge rendering logic
- repeated layout style objects used in one page

Rule:

- page cleanup should reduce JSX density, not redesign the page
- do not promote page-specific styles into global primitives unless at least two pages genuinely share the same pattern
- prefer local constants and local helper functions before creating a new shared abstraction

### Modal shell rule

When refactoring a modal:

- use one primary visual shell only
- do not stack an extra wrapper with its own background and shadow unless the old modal already used that pattern
- preserve the previous overlay darkness unless redesign is requested
- preserve radius, overflow clipping, header/body/footer spacing, and max-height behavior

Common regression to avoid:

- outer wrapper becomes square while inner surface is rounded
- modal feels heavier because shell styling is duplicated

### Overflow and stacking rule

When a primitive wraps a legacy class that has `overflow: hidden`, treat that as part of the visual contract, not as a safe default for all use cases.

Rule:

- any section that contains dropdowns, popovers, or menus must explicitly allow visible overflow on the relevant shell
- fix clipping at the shell that creates the clipping context before raising `z-index`
- only use higher `z-index` after overflow clipping has been removed or confirmed not to be the cause

Known root cause:

- `SurfaceCard` inherits `hero-card`
- `hero-card` applies `overflow: hidden`
- this can clip `MultiSelectDropdown` menus inside filter bars and make it look like the table is covering the dropdown

### Modal parity rule

When a modal belongs to an existing modal family in the app:

- keep overlay tone and opacity aligned with sibling modals
- keep shell radius and shadow tier aligned unless the modal is intentionally a different type
- if a modal embeds an editor or sticky toolbar, add a local safe interaction scope for modal actions instead of relying on global `hero-*` hover behavior

Common regression to avoid:

- one modal uses a darker black overlay while the rest use the blue-tinted shell overlay
- editor toolbars inside modals reintroduce cursor flicker because button hover behavior is not locally neutralized

## Future Direction

The next safe cleanup steps should be:

- replace more `hero-card` wrappers with `SurfaceCard`
- replace more icon/tool buttons with `SafeButton`
- expand `ToolbarGroup` and `SectionHeader` usage where title/action rows still repeat
- reduce inline style volume in large pages
- use page-local config arrays for repeated tabs, field groups, and summary metrics before introducing new shared abstractions
- keep page cleanup focused on presentational repetition; do not rewrite chart/data derivation logic just to make JSX shorter
- lazy-load additional heavy feature areas and modals when justified by bundle analysis

## Code-Splitting Rules

Route-level code-splitting is now allowed and preferred for large page modules.

Current direction:

- lazy-load route pages from `App.tsx`
- wrap route rendering in `Suspense`
- use a simple non-jarring fallback

Do:

- split by route or heavy feature boundary
- keep layout shell eager if it is needed on every page
- prefer a few meaningful chunks over many tiny chunks

Do not:

- lazy-load tiny shared primitives
- over-fragment related components that always render together
- add code-splitting before basic reuse and cleanup are in place

## Chunking Rules

When the route-level splits are already in place but the main chunk is still too large:

- audit dependency families before changing build config
- split vendor code by feature boundary, not alphabetically and not one-package-per-chunk
- keep chunk groups stable enough that future features can reuse browser cache

Preferred chunk families in this app:

- `react-core`: React runtime only
- `app-framework`: router, query client, toast infrastructure
- `data-client`: PocketBase and date helpers used across many features
- `ui-kit`: HeroUI and related interaction/runtime packages
- `editor-markdown`: Tiptap, markdown, sanitization, syntax highlighting
- `charts`: charting and data-viz dependencies
- `dnd`: drag and drop runtime

Preferred lazy boundaries in this app:

- feature providers like `HeroUIProvider` should live at the smallest route subtree that actually uses them
- chart dashboards should be lazy if the default view is still table/list
- editor runtimes should be lazy at modal or expanded-panel boundaries when the editor is not immediately needed
- when a heavy UI kit is only used for simple `Button` or `Chip` cases, prefer local primitives before adding more chunk rules

Do:

- keep heavy editor/chart dependencies out of the shell bundle
- split feature-heavy vendor groups even if some routes already lazy-load
- prefer a few meaningful shared chunks over lots of tiny vendor shards

Do not:

- create one chunk per package without evidence
- split tiny utility packages just because they are in `node_modules`
- refactor product code for bundle reasons before checking whether build config can solve the problem first

## Non-Goals

These rules are not saying:

- no motion at all
- no premium styling
- no inline style ever

They do mean:

- motion must be deliberate
- styling must be composable
- fixes must not reintroduce browser/compositor instability
