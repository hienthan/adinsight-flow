# 03_GUI_SPEC - Monitoring & Export GUI

## Tech Stack & Architecture
- **Architecture**: No-Backend (Thin Client). React communicates directly with PocketBase.
- **Frontend**: React + Vite + TypeScript.
- **Styling**: Modern CSS, Dark Mode by default.
- **Performance**: High (Virtual Scrolling for 100k+ rows).

## Screens & Components

### 1. Unified Sidebar (Navigation)
- **Top Level**: Platform List (Klook, Traveloka, etc.).
- **Sub Level**: Sitemap Tags (experiences-activity, hotel-sitemap, etc.).
- **Badges**: Show count of total URLs per tag.

### 2. Monitoring Dashboard (The Grid)
- **Global Filters**: 
    - Dropdowns: Country, City, Tier, Category Hint (Loaded from `platform_metadata`).
    - Multi-select: Language (zh-HK, zh-TW, en-US).
    - Search: Real-time search by URL keyword.
- **Data Table**: 
    - Columns: ID, Original slug, VI Title, Tier, Flags (Include/Exclude).
    - Features: Inline edit for `translated_title_vi`.
    - **Bulk Actions**: Select multiple -> Change Tier, Set Include/Exclude DSA.

### 3. Smart Deduplication Visibility
- When viewing an activity, show a "Languages available" indicator.
- Clicking an indicator switches the view to that language's URL/Title while keeping the same Tier/Metadata.

### 4. Export Module
- One-click export of current filtered view to Google Ads Page Feed (CSV).
