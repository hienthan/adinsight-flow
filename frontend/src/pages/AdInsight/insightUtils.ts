export const buildFilterString = (currentFilters: Record<string, string>) => {
    const parts: string[] = [];

    // 1. Sitemap Tag (Special logic)
    if (currentFilters.sitemap_tag) {
        const tag = currentFilters.sitemap_tag;
        if (tag === 'activity') {
            parts.push('(sitemap_tag = "activity" || sitemap_tag = "experiences-activity")');
        } else if (tag === 'mobility') {
            parts.push('(sitemap_tag = "mobility" || sitemap_tag = "experiences-mobility")');
        } else {
            parts.push(`sitemap_tag = "${tag}"`);
        }
    }

    // 2. Language (Special logic for Klook)
    if (currentFilters.language && currentFilters.language !== 'all') {
        if (currentFilters.language === 'both') {
            parts.push('languages ~ "zh-HK" && languages ~ "zh-TW"');
        } else {
            parts.push(`languages ~ "${currentFilters.language}"`);
        }
    }

    // 3. Search Term (Generic for Title)
    if (currentFilters.searchTerm && currentFilters.titleKey) {
        parts.push(`${currentFilters.titleKey} ~ "${currentFilters.searchTerm}"`);
    }

    // 4. Other basic filters
    const basicFilters = ['tier', 'funnel_stage', 'country', 'city', 'sub_tag'];
    basicFilters.forEach(key => {
        if (currentFilters[key]) {
            parts.push(`${key} = "${currentFilters[key]}"`);
        }
    });

    return parts.join(' && ');
};
