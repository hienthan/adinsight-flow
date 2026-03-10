# Frontend UI/UX Standards & Best Practices

## 🚀 Critical UI Rules

### 1. Layout & Grid System
- **SignalRow Table**: Use a **3-column grid** layout:
    - **Col 1 (Status + Name)**: `flex-1` or `grid-cols-[1.5fr]`.
    - **Col 2 (Product Types)**: Dedicated wide column to utilize available width.
    - **Col 3 (Timeline/Lifecycle)**: Alignment to the right.
- **Responsive**: Ensure all columns use `min-w-0` and `truncate` for text safety.

### 2. Component Design (Chips & Badges)
- **Radius**: DO NOT use `radius="full"` for small chips as it creates inconsistent shapes (circles vs ovals). Use **`radius="sm"` (4px)** or **`radius="md"` (8px)** for a uniform, professional look.
- **Coloring**: Always use `variant="flat"` with specific `color` props (`primary`, `secondary`, `warning`).
- **Styling**: Force background colors using Tailwind if HeroUI defaults are overridden by global CSS.

### 3. Spacing & Padding (The "Borders" Rule)
- **Root Cause of "Touching Borders"**: Standard HeroUI `ModalBody` or `CardBody` often have default padding that gets stripped by project-specific reset CSS or `overflow-hidden`.
- **Triệt để fix**: 
    - **Modals**: Wrap content in a `div` with explicit **`px-10 py-8`** (or more) inside the Body.
    - **Cards/Rows**: Use explicit padding on the *inner* container, never trust the library's default.
    - **SignalRow**: Scan rows must have `px-8` to `px-10` horizontal padding.

### 4. Logic & Features
- **Field Mappings**: Use `notes` for strategy documentation.
- **Date Formats**: Use `MM-DD` for timeline compact views.
- **Pre-alert**: Always show before the start date with a clear distinction.

---
*Last updated: 2026-02-10*
