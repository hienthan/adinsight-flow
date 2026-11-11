import React, { useState, useEffect } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import { FilterDef } from '../../types/adinsight';
import { MultiSelectDropdown } from '../../components/common/MultiSelectDropdown';
import { SafeButton, SurfaceCard } from '../../components/common/ui';
import { SAFE_INTERACTIVE_TRANSITION } from '../../lib/uiMotion';

interface InsightFilterBarProps {
    filters: FilterDef[];
    currentValues: Record<string, string>;
    onFilterChange: (id: string, value: string) => void;
    countries: string[];
    sitemapTags: string[];
}

const MAIN_FILTER_IDS = ['searchTerm', 'searchUrl', 'country', 'sitemap_tag', 'content_type', 'funnel_stage', 'tier', 'affiliate_tier', 'geo_category', 'province', 'dsa_campaign', 'language', 'page_type', 'intent_primary', 'classification_confidence', 'city', 'is_private', 'is_active', 'show_url', 'pattern', 'geo_entity', 'topic_type', 'readiness_hint', 'market_fit', 'transport_scope', 'transport_affiliate_fit', 'transport_geo_scope', 'transport_trip_stage'];
const EXCLUDE_FILTER_IDS = ['searchTerm', 'country', 'city', 'tier', 'content_type', 'pattern', 'topic_type'];

const FILTER_BAR_SHELL_STYLE = {
    position: 'relative',
    zIndex: 60,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1rem',
    overflow: 'visible',
} as const;

const FILTER_ROW_STYLE = {
    display: 'flex',
    alignItems: 'stretch',
    gap: '0.65rem',
    flexWrap: 'wrap',
} as const;

const EXCLUSION_SECTION_STYLE = {
    display: 'flex',
    alignItems: 'stretch',
    gap: '0.65rem',
    flexWrap: 'wrap',
    padding: '0.75rem',
    borderRadius: '16px',
    animation: 'fadeIn 0.3s ease-out',
    marginTop: '0.25rem',
    position: 'relative',
} as const;

const COUNTRY_LABEL_OVERRIDES: Record<string, string> = {
    Unknown: 'Unknown',
    united_states: 'United States',
    united_kingdom: 'United Kingdom',
    usa: 'USA',
    uae: 'UAE',
};

const formatCountryLabel = (rawValue: string) => {
    const trimmed = rawValue.trim();
    if (!trimmed) return '';
    if (COUNTRY_LABEL_OVERRIDES[trimmed]) return COUNTRY_LABEL_OVERRIDES[trimmed];

    return trimmed
        .replace(/_/g, ' ')
        .replace(/\b\w+/g, (part) => {
            const lower = part.toLowerCase();
            if (['of', 'and', 'the'].includes(lower)) return lower;
            return lower.charAt(0).toUpperCase() + lower.slice(1);
        });
};

const FILTER_SHELL_STYLE = {
    ...FILTER_BAR_SHELL_STYLE,
    borderRadius: '1.35rem',
    background: [
        'radial-gradient(circle at top right, rgba(59, 130, 246, 0.16) 0%, transparent 24%)',
        'radial-gradient(circle at left bottom, rgba(20, 184, 166, 0.1) 0%, transparent 28%)',
        'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 97%, white 3%) 0%, color-mix(in srgb, var(--bg-content) 90%, var(--bg-main) 10%) 100%)',
    ].join(', '),
    boxShadow: '0 30px 54px -38px rgba(15, 23, 42, 0.76)',
    border: '1px solid color-mix(in srgb, var(--border-subtle) 78%, rgba(59, 130, 246, 0.22) 22%)',
} as const;

export const InsightFilterBar: React.FC<InsightFilterBarProps> = ({
    filters,
    currentValues,
    onFilterChange,
    countries,
    sitemapTags,
}) => {
    // Local state for debouncing search
    const [searchInput, setSearchInput] = useState(currentValues.searchTerm || '');
    const [searchUrlInput, setSearchUrlInput] = useState(currentValues.searchUrl || '');
    const [excludeInput, setExcludeInput] = useState(currentValues.excludeTerm || '');
    const [isExcludeVisible, setIsExcludeVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchInput !== (currentValues.searchTerm || '')) {
                onFilterChange('searchTerm', searchInput);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchInput, onFilterChange, currentValues.searchTerm]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchUrlInput !== (currentValues.searchUrl || '')) {
                onFilterChange('searchUrl', searchUrlInput);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchUrlInput, onFilterChange, currentValues.searchUrl]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (excludeInput !== (currentValues.excludeTerm || '')) {
                onFilterChange('excludeTerm', excludeInput);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [excludeInput, onFilterChange, currentValues.excludeTerm]);

    // Update local input if filters are reset from parent
    useEffect(() => {
        setSearchInput(currentValues.searchTerm || '');
        setSearchUrlInput(currentValues.searchUrl || '');
        setExcludeInput(currentValues.excludeTerm || '');
    }, [currentValues.searchTerm, currentValues.searchUrl, currentValues.excludeTerm]);

    const renderFilter = (filter: FilterDef, isExclusion: boolean = false) => {
        const fieldId = isExclusion ? `!${filter.id}` : filter.id;
        const displayLabel = isExclusion ? `!${filter.label}` : filter.label;
        const currentValue = currentValues[fieldId] || '';

        if (filter.id === 'searchTerm' || filter.id === 'searchUrl' || filter.id === 'excludeTerm') {
            const value =
                filter.id === 'searchUrl'
                    ? searchUrlInput
                    : (isExclusion ? excludeInput : searchInput);
            const setter =
                filter.id === 'searchUrl'
                    ? setSearchUrlInput
                    : (isExclusion ? setExcludeInput : setSearchInput);
            const icon = isExclusion ? (
                <div style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-dim)',
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    lineHeight: 1
                }}>!</div>
            ) : (
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            );

            return (
                <div className="filter-group" key={fieldId}>
                    <label>{isExclusion ? '!Title' : filter.label}</label>
                    <div style={{ position: 'relative' }}>
                        {icon}
                        <input
                            type="text"
                            placeholder={
                                filter.id === 'searchTerm' || filter.id === 'searchUrl' || filter.id === 'excludeTerm'
                                    ? `${filter.placeholder || 'Search...'} Use | for OR`
                                    : filter.placeholder
                            }
                            value={value}
                            onChange={(e) => setter(e.target.value)}
                            style={{
                                width: filter.id === 'searchUrl' ? '220px' : (isExclusion ? '156px' : '190px'),
                                paddingLeft: isExclusion ? '1.85rem' : '2.25rem'
                            }}
                        />
                    </div>
                </div>
            );
        }

        if (filter.id === 'sitemap_tag') {
            return (
                <div className="filter-group" key={fieldId}>
                    <label>{filter.label}</label>
                    <select
                        value={currentValues[filter.id] || sitemapTags[0]}
                        onChange={(e) => onFilterChange(filter.id, e.target.value)}
                        style={{ width: '108px' }}
                    >
                        {sitemapTags.map((tag) => (
                            <option key={tag} value={tag}>
                                {tag.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </option>
                        ))}
                    </select>
                </div>
            );
        }

        if (filter.id === 'country') {
            const sortedCountries = [...countries].sort((a, b) => a.localeCompare(b));
            const hasUnknown = sortedCountries.includes('Unknown');
            const filteredCountries = sortedCountries.filter(c => c !== 'Unknown');

            const countryOptions = [
                { label: 'All', value: '' },
                ...(hasUnknown ? [{ label: 'Unknown', value: 'Unknown' }] : []),
                ...filteredCountries.map(c => ({ label: formatCountryLabel(c), value: c }))
            ];

            return (
                <div className="filter-group" key={fieldId}>
                    <label>{displayLabel}</label>
                    <MultiSelectDropdown
                        options={countryOptions}
                        value={currentValue}
                        onChange={(val) => onFilterChange(fieldId, val)}
                        placeholder="Global / All"
                        width="142px"
                        showSearch
                        variant="premium"
                    />
                </div>
            );
        }

        if (filter.type === 'select') {
            if (filter.multiple && filter.options) {
                return (
                    <div className="filter-group" key={fieldId}>
                        <label>{displayLabel}</label>
                        <MultiSelectDropdown
                            options={filter.options}
                            value={currentValue}
                            onChange={(val) => onFilterChange(fieldId, val)}
                            placeholder="All"
                                width={
                                filter.id === 'content_type' || filter.id === 'dsa_campaign'
                                    ? '154px'
                                    : filter.id === 'page_type'
                                        ? '136px'
                                        : filter.id === 'intent_primary'
                                            ? '148px'
                                            : filter.id === 'readiness_hint' || filter.id === 'market_fit' || filter.id === 'transport_affiliate_fit'
                                                ? '136px'
                                                : filter.id === 'transport_scope'
                                                    ? '166px'
                                                    : filter.id === 'transport_geo_scope'
                                                        ? '162px'
                                                        : filter.id === 'transport_trip_stage'
                                                            ? '158px'
                                                : filter.id === 'pattern'
                                                    ? '178px'
                                                    : filter.id === 'topic_type'
                                                        ? '150px'
                                                        : filter.id === 'tier' || filter.id === 'affiliate_tier'
                                                            ? '84px'
                                                            : '132px'
                            }
                            variant="premium"
                        />
                    </div>
                );
            }

            return (
                <div className="filter-group" key={fieldId}>
                    <label>{displayLabel}</label>
                    <select
                        value={currentValue}
                        onChange={(e) => onFilterChange(fieldId, e.target.value)}
                        style={{ width: filter.id === 'tier' || filter.id === 'affiliate_tier' ? '60px' : (filter.id === 'language' ? '92px' : '124px') }}
                    >
                        {filter.options?.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            );
        }

        if (filter.type === 'checkbox') {
            const checked = currentValue === 'true';
            const checkboxLabel = filter.id === 'show_url' ? 'URL' : 'Private';
            return (
                <div className="filter-group" key={fieldId} style={{ minWidth: '88px' }}>
                    <label>{displayLabel}</label>
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        minHeight: '38px',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '999px',
                        border: checked
                            ? '1px solid color-mix(in srgb, hsl(var(--primary)) 28%, var(--border-subtle) 72%)'
                            : '1px solid var(--border-subtle)',
                        background: checked
                            ? 'linear-gradient(135deg, hsla(var(--primary)/0.1) 0%, hsla(var(--primary)/0.03) 100%)'
                            : 'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 96%, white 4%) 0%, color-mix(in srgb, var(--bg-content) 90%, var(--bg-main) 10%) 100%)',
                        boxShadow: checked
                            ? '0 10px 16px -16px hsla(var(--primary)/0.45)'
                            : 'inset 0 1px 0 rgba(255,255,255,0.55)',
                        cursor: 'pointer',
                        userSelect: 'none',
                    }}>
                        <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => onFilterChange(fieldId, e.target.checked ? 'true' : '')}
                            style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: 'hsl(var(--primary))' }}
                        />
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: checked ? 'hsl(var(--primary))' : 'var(--text-main)', letterSpacing: '0.01em' }}>
                            {checkboxLabel}
                        </span>
                    </label>
                </div>
            );
        }

        return (
            <div className="filter-group" key={fieldId}>
                <label>{displayLabel}</label>
                <input
                    type="text"
                    placeholder={filter.placeholder}
                    value={currentValue}
                    onChange={(e) => onFilterChange(fieldId, e.target.value)}
                    style={{ width: filter.id === 'dsa_campaign' ? '148px' : (filter.id === 'city' ? '126px' : (filter.id === 'geo_entity' ? '148px' : '100px')) }}
                />
            </div>
        );
    };

    const mainFilters = filters.filter(f => MAIN_FILTER_IDS.includes(f.id));

    // For logical exclusion filters, we find the base definitions and map them
    const exclusionBaseFilters = filters.filter(f => EXCLUDE_FILTER_IDS.includes(f.id));

    return (
        <SurfaceCard
            className="filter-container"
            variant="soft"
            style={FILTER_SHELL_STYLE}
        >
            <div style={FILTER_ROW_STYLE}>
                {mainFilters.map(f => renderFilter(f))}

                <SafeButton
                    onClick={() => setIsExcludeVisible(!isExcludeVisible)}
                    className="exclude-toggle"
                    aria-pressed={isExcludeVisible}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: '0.55rem',
                        borderRadius: '12px',
                        border: '1px solid',
                        transition: SAFE_INTERACTIVE_TRANSITION,
                        alignSelf: 'stretch',
                        width: '42px',
                        minHeight: '70px',
                    }}
                    title="Toggle Exclusions"
                >
                    <AlertCircle size={17} className="exclude-icon" />
                </SafeButton>
            </div>

            {isExcludeVisible && (
                <div className="exclude-section animate-fade" style={EXCLUSION_SECTION_STYLE}>
                    {exclusionBaseFilters.map(f => renderFilter(f, true))}
                </div>
            )}

            <style>
                {`
                    .filter-container .filter-group {
                        display: flex;
                        flex-direction: column;
                        position: relative;
                        z-index: 1;
                        gap: 0.38rem;
                        padding: 0.62rem 0.68rem 0.68rem;
                        border-radius: 0.88rem;
                        min-width: fit-content;
                        background:
                            linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 94%, white 6%) 0%, color-mix(in srgb, var(--bg-content) 90%, var(--bg-main) 10%) 100%);
                        border: 1px solid color-mix(in srgb, var(--border-subtle) 80%, rgba(59, 130, 246, 0.16) 20%);
                        box-shadow: inset 0 1px 0 rgba(255,255,255,0.45), 0 18px 34px -30px rgba(15, 23, 42, 0.4);
                        backdrop-filter: blur(14px);
                    }
                    .filter-container .filter-group:focus-within {
                        z-index: 120;
                    }
                    .filter-container label {
                        font-size: 0.64rem;
                        font-weight: 800;
                        color: color-mix(in srgb, var(--text-dim) 88%, var(--text-main) 12%);
                        text-transform: uppercase;
                        letter-spacing: 0.08em;
                        opacity: 0.94;
                    }
                    .filter-container input,
                    .filter-container select {
                        height: 38px;
                        border-radius: 11px;
                        border: 1px solid color-mix(in srgb, var(--border-subtle) 78%, rgba(59, 130, 246, 0.22) 22%);
                        background:
                            linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 97%, white 3%) 0%, color-mix(in srgb, var(--bg-content) 92%, var(--bg-main) 8%) 100%);
                        box-shadow: inset 0 1px 0 rgba(255,255,255,0.66), 0 16px 28px -24px rgba(15, 23, 42, 0.44);
                        transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
                        color: var(--text-main);
                        padding-right: 0.8rem;
                        font-size: 0.82rem;
                    }
                    .filter-container input::placeholder {
                        color: var(--text-muted);
                    }
                    .filter-container input:focus,
                    .filter-container select:focus {
                        outline: none;
                        border-color: rgba(59, 130, 246, 0.42);
                        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.08), 0 18px 30px -24px rgba(59, 130, 246, 0.26), inset 0 1px 0 rgba(255,255,255,0.75);
                    }

                    /* Exclude Toggle Premium Styling */
                    .exclude-toggle {
                        background:
                            linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 94%, white 6%) 0%, color-mix(in srgb, var(--bg-content) 90%, var(--bg-main) 10%) 100%);
                        border-color: color-mix(in srgb, var(--border-subtle) 76%, rgba(59, 130, 246, 0.18) 24%);
                        color: var(--text-dim);
                        box-shadow: inset 0 1px 0 rgba(255,255,255,0.64), 0 18px 30px -24px rgba(15, 23, 42, 0.42);
                    }
                    .exclude-toggle:hover {
                        background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(241,245,249,0.94) 100%);
                        transform: translateY(-1px);
                    }
                    .exclude-toggle .exclude-icon {
                        fill: transparent;
                        color: currentColor;
                        transition: all 0.25s ease;
                    }

                    /* Active Toggle State - Premium (Light Mode Default) */
                    .filter-container:has(.exclude-section) .exclude-toggle {
                        background: #fef2f2 !important;
                        border-color: rgba(239, 68, 68, 0.3) !important;
                        color: #ef4444 !important;
                        box-shadow: 0 0 15px rgba(239, 68, 68, 0.1) !important;
                    }
                    .filter-container:has(.exclude-section) .exclude-toggle .exclude-icon {
                        fill: rgba(239, 68, 68, 0.05) !important;
                        transform: scale(1.05);
                    }

                    /* Exclude Section - Premium (Light Mode Default) */
                    .exclude-section {
                        background: linear-gradient(180deg, rgba(255, 247, 247, 0.82) 0%, rgba(255, 252, 252, 0.94) 100%) !important;
                        border: 1px solid rgba(239, 68, 68, 0.15) !important;
                        box-shadow: 0 20px 30px -24px rgba(239, 68, 68, 0.35);
                    }
                    .exclude-section .filter-group {
                        background: linear-gradient(180deg, rgba(255,255,255,0.84) 0%, rgba(255,250,250,0.94) 100%) !important;
                        border-color: rgba(239, 68, 68, 0.14) !important;
                        box-shadow: inset 0 1px 0 rgba(255,255,255,0.68), 0 18px 34px -30px rgba(239, 68, 68, 0.16) !important;
                    }
                    .exclude-section label {
                        color: #dc2626 !important;
                        font-weight: 900 !important;
                        letter-spacing: 0.06em !important;
                    }
                    .exclude-section select,
                    .exclude-section input {
                        background: white !important;
                        border-color: rgba(239, 68, 68, 0.12) !important;
                        color: #0f172a !important;
                    }

                    /* === DARK MODE OVERRIDES (High Specificity) === */
                    .dark .filter-container .exclude-toggle {
                        background: linear-gradient(180deg, rgba(15,23,42,0.84) 0%, rgba(2,6,23,0.9) 100%);
                        border-color: rgba(148, 163, 184, 0.18);
                        color: var(--text-dim);
                        box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 12px 24px -20px rgba(0,0,0,0.5);
                    }
                    .dark .filter-container .filter-group {
                        background: linear-gradient(180deg, rgba(15,23,42,0.84) 0%, rgba(2,6,23,0.9) 100%);
                        border-color: rgba(148, 163, 184, 0.18);
                        box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 32px -28px rgba(0,0,0,0.54);
                    }

                    .dark .filter-container:has(.exclude-section) .exclude-toggle {
                        background: rgba(239, 68, 68, 0.08) !important;
                        border-color: rgba(239, 68, 68, 0.4) !important;
                        color: #fca5a5 !important;
                        box-shadow: 0 0 20px rgba(239, 68, 68, 0.15) !important;
                    }
                    .dark .filter-container:has(.exclude-section) .exclude-toggle .exclude-icon {
                        fill: rgba(239, 68, 68, 0.2) !important;
                    }

                    .dark .exclude-section {
                        background: linear-gradient(180deg, rgba(20, 10, 10, 0.78) 0%, rgba(15, 10, 10, 0.68) 100%) !important;
                        border: 1px solid rgba(239, 68, 68, 0.25) !important;
                        box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.3) !important;
                    }
                    .dark .exclude-section label {
                        color: #fca5a5 !important;
                        opacity: 1 !important;
                        text-shadow: 0 0 10px rgba(239, 68, 68, 0.1);
                    }
                    .dark .exclude-section .filter-group {
                        background: linear-gradient(180deg, rgba(24, 12, 12, 0.76) 0%, rgba(10, 7, 7, 0.86) 100%) !important;
                        border-color: rgba(239, 68, 68, 0.18) !important;
                        box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), 0 18px 32px -26px rgba(0,0,0,0.45) !important;
                    }
                    
                    /* CRITICAL: Fix input backgrounds in dark mode */
                    .dark .exclude-section select,
                    .dark .exclude-section input,
                    .dark .exclude-section .search-input-wrapper input {
                        background-color: #020617 !important; /* Very deep blue-black */
                        background-image: none !important;
                        border-color: rgba(239, 68, 68, 0.2) !important;
                        color: #f8fafc !important;
                    }
                    .dark .exclude-section input::placeholder {
                        color: rgba(248, 250, 252, 0.56) !important;
                    }
                    .dark .exclude-section select:focus,
                    .dark .exclude-section input:focus {
                        border-color: rgba(239, 68, 68, 0.5) !important;
                        background-color: #000000 !important;
                    }
                    .dark .exclude-section select option {
                        background-color: #020617;
                        color: #f8fafc;
                    }
                    .dark .filter-container input,
                    .dark .filter-container select {
                        background: linear-gradient(180deg, rgba(15,23,42,0.82) 0%, rgba(2,6,23,0.92) 100%);
                        border-color: rgba(148, 163, 184, 0.18);
                        box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 12px 24px -20px rgba(0,0,0,0.5);
                        color: #f8fafc;
                    }
                    .dark .filter-container input::placeholder {
                        color: rgba(248, 250, 252, 0.56);
                    }
                    .dark .filter-container select option {
                        background-color: #020617;
                        color: #f8fafc;
                    }

                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(-8px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}
            </style>
        </SurfaceCard>
    );
};
