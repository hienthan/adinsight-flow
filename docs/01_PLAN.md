# 01_PLAN - Sitemap Intelligence Strategy

## Core Objective
Maximize DSA Performance while minimizing manual effort and AI costs by using "Sitemap Intelligence" (URL-only analysis).

## Strategy (No-Crawl)
1. **Source**: Trust platform Sitemaps (XML) as the single source of truth for URLs.
2. **Analysis**: Extract metadata (Country, City, Intent, Tier) solely from URL slugs.
3. **Translation**: Automatically reconstruct Vietnamese titles from English slugs using a local dictionary.
4. **Execution**: Classify 33k+ URLs in minutes using rule-based Python logic.

## Logic Layers
- **Rule-First**: 80% categorization using high-frequency keywords.
- **AI-Second**: 15% batch-analysis of ambiguous slugs.
- **Manual-Final**: 5% human verification via GUI for top-tier targets.
