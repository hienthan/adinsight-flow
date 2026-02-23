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

    // 3. Search Term & Exclude Term (Generic for Title)
    if (currentFilters.searchTerm && currentFilters.titleKey) {
        const terms = currentFilters.searchTerm.split(/[,|\s]+/).filter(t => t.trim().length > 0);
        terms.forEach(term => {
            parts.push(`${currentFilters.titleKey} ~ "${term.trim()}"`);
        });
    }

    if (currentFilters.excludeTerm && currentFilters.titleKey) {
        const terms = currentFilters.excludeTerm.split(/[,|\s]+/).filter(t => t.trim().length > 0);
        terms.forEach(term => {
            parts.push(`${currentFilters.titleKey} !~ "${term.trim()}"`);
        });
    }

    const basicFields = ['tier', 'funnel_stage', 'country', 'city', 'sub_tag', 'content_type'];

    Object.keys(currentFilters).forEach(key => {
        const value = currentFilters[key];
        if (!value) return;

        // Skip internal/special keys
        if (['sitemap_tag', 'language', 'searchTerm', 'excludeTerm', 'titleKey'].includes(key)) return;

        const isExclusion = key.startsWith('!');
        const baseKey = isExclusion ? key.slice(1) : key;

        if (basicFields.includes(baseKey)) {
            const values = value.split(',').filter(Boolean);
            if (values.length > 0) {
                const operator = isExclusion ? '!=' : '=';
                const joinner = isExclusion ? ' && ' : ' || ';

                const subQueries = values.map(v => {
                    const cleanVal = v.trim();
                    if (baseKey === 'country' && cleanVal === 'Vietnam') {
                        return isExclusion
                            ? `(${baseKey} != "Vietnam" && ${baseKey} != "Viet Nam")`
                            : `(${baseKey} = "Vietnam" || ${baseKey} = "Viet Nam")`;
                    }
                    return `${baseKey} ${operator} "${cleanVal}"`;
                });

                if (subQueries.length > 1) {
                    parts.push(`(${subQueries.join(joinner)})`);
                } else {
                    parts.push(subQueries[0]);
                }
            }
        }
    });

    // 5. Only show active records (if specified by platform)
    // Removed to show all records (inactive will be styled specially in UI)
    // if (currentFilters.activeFilterKey) {
    //     parts.push(`${currentFilters.activeFilterKey} = true`);
    // }

    return parts.join(' && ');
};
