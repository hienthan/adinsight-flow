const tokenizeSearchInput = (value: string) =>
    value
        .split(/[\s,]+/)
        .map((token) => token.trim())
        .filter(Boolean);

const buildContainsSearchClauses = (field: string, rawValue: string, isExclusion = false) => {
    const tokens = tokenizeSearchInput(rawValue);
    return tokens.map((token) => {
        const variants = token.split('|').map((part) => part.trim()).filter(Boolean);
        if (variants.length === 0) return '';

        if (isExclusion) {
            const clauses = variants.map((variant) => `${field} !~ "${variant}"`);
            return clauses.length > 1 ? `(${clauses.join(' && ')})` : clauses[0];
        }

        const clauses = variants.map((variant) => `${field} ~ "${variant}"`);
        return clauses.length > 1 ? `(${clauses.join(' || ')})` : clauses[0];
    }).filter(Boolean);
};

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

    // 2. Language logic
    if (currentFilters.language && currentFilters.language !== 'all') {
        const isKlook = currentFilters.titleKey === 'translated_title_vi';
        const langField = isKlook ? 'languages' : 'language';

        if (currentFilters.language === 'both') {
            parts.push(`${langField} ~ "zh-HK" && ${langField} ~ "zh-TW"`);
        } else {
            // For list fields like 'languages' in PocketBase, we use ~ (contains)
            // For single string fields like 'language', we use = (exact match)
            const operator = isKlook ? '~' : '=';
            parts.push(`${langField} ${operator} "${currentFilters.language}"`);
        }
    }

    // 3. Search Term & Exclude Term (Generic for Title)
    if (currentFilters.searchTerm && currentFilters.titleKey) {
        parts.push(...buildContainsSearchClauses(currentFilters.titleKey, currentFilters.searchTerm));
    }

    if (currentFilters.searchUrl) {
        parts.push(...buildContainsSearchClauses('url', currentFilters.searchUrl));
    }

    if (currentFilters.excludeTerm && currentFilters.titleKey) {
        parts.push(...buildContainsSearchClauses(currentFilters.titleKey, currentFilters.excludeTerm, true));
    }

    const basicFields = [
        'tier', 'funnel_stage', 'country', 'city', 'sub_tag', 'content_type',
        'affiliate_tier', 'affiliate_score', 'dsa_campaign', 'geo_category', 'province',
        'intent_type', 'intent_primary', 'page_type', 'classification_confidence', 'is_private', 'is_active',
        'pattern', 'geo_entity', 'topic_type', 'readiness_hint', 'market_fit', 'language'
    ];

    Object.keys(currentFilters).forEach(key => {
        const value = currentFilters[key];
        if (!value) return;

        // Skip internal/special keys
        if (['sitemap_tag', 'language', 'searchTerm', 'searchUrl', 'excludeTerm', 'titleKey', 'show_url'].includes(key)) return;

        const isExclusion = key.startsWith('!');
        const baseKey = isExclusion ? key.slice(1) : key;

        if (basicFields.includes(baseKey)) {
            const values = value.split('|').filter(Boolean);
            if (values.length > 0) {
                const operator = isExclusion ? '!=' : '=';
                const joinner = isExclusion ? ' && ' : ' || ';

                const subQueries = values.map(v => {
                    const cleanVal = v.trim();
                    if (baseKey === 'classification_confidence') {
                        if (cleanVal === 'high') return `${baseKey} >= 0.85`;
                        if (cleanVal === 'medium') return `(${baseKey} >= 0.70 && ${baseKey} < 0.85)`;
                        if (cleanVal === 'low') return `${baseKey} < 0.70`;
                    }
                    if (baseKey === 'country') {
                        if (cleanVal === 'Vietnam') {
                            return isExclusion
                                ? `(${baseKey} != "Vietnam" && ${baseKey} != "Viet Nam")`
                                : `(${baseKey} = "Vietnam" || ${baseKey} = "Viet Nam")`;
                        }
                        if (cleanVal.toLowerCase() === 'indonesia') {
                            return isExclusion
                                ? `(${baseKey} != "Indonesia" && ${baseKey} != "indonesia")`
                                : `(${baseKey} = "Indonesia" || ${baseKey} = "indonesia")`;
                        }
                    }
                    if (baseKey === 'province') {
                        if (cleanVal === 'jakarta') {
                            return isExclusion
                                ? `(${baseKey} != "jakarta" && ${baseKey} != "dki-jakarta")`
                                : `(${baseKey} = "jakarta" || ${baseKey} = "dki-jakarta")`;
                        }
                    }
                    if (baseKey === 'dsa_campaign') {
                        const campOperator = isExclusion ? '!~' : '~';
                        return `${baseKey} ${campOperator} "${cleanVal}"`;
                    }
                    if (baseKey === 'is_private') {
                        return `${baseKey} = ${cleanVal === 'true' ? 'true' : 'false'}`;
                    }
                    if (baseKey === 'is_active') {
                        return `${baseKey} = ${cleanVal === 'true' ? 'true' : 'false'}`;
                    }
                    return `${baseKey} ${operator} "${cleanVal}"`;
                });

                const groupedQuery = subQueries.length > 1
                    ? `(${subQueries.join(joinner)})`
                    : subQueries[0];

                parts.push(groupedQuery.startsWith('(') ? groupedQuery : `(${groupedQuery})`);
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
