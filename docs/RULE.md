# Frontend Development Guidelines (AI Standards)

This project follows strict UI/UX patterns to ensure consistency across the Google Ads Crawler platform. AI agents must adhere to these rules.

## 🚀 Critical Rules

### 1. Tailwind CSS v4 ONLY
- **Syntax**: `class-(--variable-name)`
- **Correct**: `bg-(--bg-content)`, `text-(--text-main)`, `border-(--border-subtle)`
- **Incorrect**: Do NOT use brackets `[...]` for variables.

### 2. Component Choice Strategy
- **Reference Page**: `frontend/src/pages/AdInsight/AdInsightPage.tsx`
- **Filter Bars**: Use **Native HTML** elements (`input`, `select`, `button`).
  - Wrap in `<div className="filter-group">`.
  - This allows `index.css` to handle rounding, padding, and borders consistently.
- **Complex UI**: Use **HeroUI** for Modals, Tabs, etc.
  - **Warning**: HeroUI components often conflict with global CSS. Use `classNames` or inline `style` to FORCE correct padding/borders.

### 3. Dark Mode Support
- Every new component **MUST** support Dark Mode.
- Use only the following tokens:
  - Surfaces: `var(--bg-content)`, `var(--bg-main)`, `var(--bg-overlay)`
  - Text: `var(--text-main)`, `var(--text-dim)`, `var(--text-muted)`
  - Border: `var(--border-subtle)`
  - Primary: `hsl(var(--primary))`

### 4. Logic & Data Verification
- **Field Mappings**: Before writing "save" logic, check the database schema in `db/`.
- **Field Check**: `notes` is the correct field for Signal Strategy, NOT `strategy_notes`.

## 🛠 Lessons Learned (Avoid these mistakes)
- **Search Icons**: Place icons absolutely `left-3` inside a relative container, then give the input `pl-10`.
- **Status Toggles**: Selected state must be high-contrast (e.g., `hsl(var(--primary))` background).
- **Modals**: Ensure `backdrop="blur"` and `rounded-[18px]` for a premium look.

---
*Created on 2026-02-10 - Follow these rules to avoid UI regressions.*
