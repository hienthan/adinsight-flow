import React, { useState, useEffect } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import { FilterDef } from '../../types/adinsight';
import { MultiSelectDropdown } from '../../components/common/MultiSelectDropdown';

interface InsightFilterBarProps {
    filters: FilterDef[];
    currentValues: Record<string, string>;
    onFilterChange: (id: string, value: string) => void;
    countries: string[];
    sitemapTags: string[];
}

export const InsightFilterBar: React.FC<InsightFilterBarProps> = ({
    filters,
    currentValues,
    onFilterChange,
    countries,
    sitemapTags,
}) => {
    // Local state for debouncing search
    const [searchInput, setSearchInput] = useState(currentValues.searchTerm || '');
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
            if (excludeInput !== (currentValues.excludeTerm || '')) {
                onFilterChange('excludeTerm', excludeInput);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [excludeInput, onFilterChange, currentValues.excludeTerm]);

    // Update local input if filters are reset from parent
    useEffect(() => {
        setSearchInput(currentValues.searchTerm || '');
        setExcludeInput(currentValues.excludeTerm || '');
    }, [currentValues.searchTerm, currentValues.excludeTerm]);

    const renderFilter = (filter: FilterDef, isExclusion: boolean = false) => {
        const fieldId = isExclusion ? `!${filter.id}` : filter.id;
        const displayLabel = isExclusion ? `!${filter.label}` : filter.label;
        const currentValue = currentValues[fieldId] || '';

        if (filter.id === 'searchTerm' || filter.id === 'excludeTerm') {
            const value = isExclusion ? excludeInput : searchInput;
            const setter = isExclusion ? setExcludeInput : setSearchInput;
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
                            placeholder={filter.placeholder}
                            value={value}
                            onChange={(e) => setter(e.target.value)}
                            style={{ width: isExclusion ? '180px' : '220px', paddingLeft: isExclusion ? '2rem' : '2.5rem' }}
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
                        style={{ width: '120px' }}
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
                ...filteredCountries.map(c => ({ label: c, value: c }))
            ];

            return (
                <div className="filter-group" key={fieldId}>
                    <label>{displayLabel}</label>
                    <MultiSelectDropdown
                        options={countryOptions}
                        value={currentValue}
                        onChange={(val) => onFilterChange(fieldId, val)}
                        placeholder="Global / All"
                        width="160px"
                        showSearch
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
                                filter.id === 'content_type' || filter.id === 'dsa_campaign' ? '180px' :
                                    (filter.id === 'tier' || filter.id === 'affiliate_tier' ? '100px' : '150px')
                            }
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
                        style={{ width: filter.id === 'tier' || filter.id === 'affiliate_tier' ? '65px' : '140px' }}
                    >
                        {filter.options?.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
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
                    style={{ width: '100px' }}
                />
            </div>
        );
    };

    const mainFilters = filters.filter(f => ['searchTerm', 'country', 'content_type', 'funnel_stage', 'tier', 'affiliate_tier', 'geo_category', 'province', 'dsa_campaign'].includes(f.id));

    // For logical exclusion filters, we find the base definitions and map them
    const excludeIds = ['searchTerm', 'country', 'tier', 'content_type'];
    const exclusionBaseFilters = filters.filter(f => excludeIds.includes(f.id));

    return (
        <section className="filter-container" style={{ position: 'relative', zIndex: 60, display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-soft)', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                {mainFilters.map(f => renderFilter(f))}

                <button
                    onClick={() => setIsExcludeVisible(!isExcludeVisible)}
                    className="exclude-toggle"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: '0.6rem',
                        borderRadius: '10px',
                        border: '1px solid',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        alignSelf: 'flex-end',
                        width: '40px',
                        height: '40px',
                    }}
                    title="Toggle Exclusions"
                >
                    <AlertCircle size={20} className="exclude-icon" />
                </button>
            </div>

            {isExcludeVisible && (
                <div className="exclude-section animate-fade" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    flexWrap: 'wrap',
                    padding: '1.25rem',
                    borderRadius: '16px',
                    animation: 'fadeIn 0.3s ease-out',
                    marginTop: '0.75rem',
                    position: 'relative'
                }}>
                    {exclusionBaseFilters.map(f => renderFilter(f, true))}
                </div>
            )}

            <style>
                {`
                    .filter-container .filter-group {
                        display: flex;
                        flex-direction: column;
                        gap: 0.4rem;
                    }
                    .filter-container label {
                        font-size: 0.72rem;
                        font-weight: 800;
                        color: var(--text-dim);
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        opacity: 0.9;
                    }

                    /* Exclude Toggle Premium Styling */
                    .exclude-toggle {
                        background: var(--bg-overlay);
                        border-color: var(--border-subtle);
                        color: var(--text-dim);
                    }
                    .exclude-toggle:hover {
                        background: var(--muted);
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
                        background: rgba(255, 252, 252, 0.8) !important;
                        border: 1px solid rgba(239, 68, 68, 0.15) !important;
                        box-shadow: 0 4px 20px -5px rgba(0, 0, 0, 0.02);
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
                    :global(.dark) .filter-container .exclude-toggle {
                        background: rgba(255, 255, 255, 0.03);
                        border-color: rgba(255, 255, 255, 0.08);
                    }

                    :global(.dark) .filter-container:has(.exclude-section) .exclude-toggle {
                        background: rgba(239, 68, 68, 0.08) !important;
                        border-color: rgba(239, 68, 68, 0.4) !important;
                        color: #fca5a5 !important;
                        box-shadow: 0 0 20px rgba(239, 68, 68, 0.15) !important;
                    }
                    :global(.dark) .filter-container:has(.exclude-section) .exclude-toggle .exclude-icon {
                        fill: rgba(239, 68, 68, 0.2) !important;
                    }

                    :global(.dark) .exclude-section {
                        background: rgba(15, 10, 10, 0.6) !important; /* Deep red-black tint */
                        border: 1px solid rgba(239, 68, 68, 0.25) !important;
                        box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.3) !important;
                    }
                    :global(.dark) .exclude-section label {
                        color: #fca5a5 !important;
                        opacity: 1 !important;
                        text-shadow: 0 0 10px rgba(239, 68, 68, 0.1);
                    }
                    
                    /* CRITICAL: Fix input backgrounds in dark mode */
                    :global(.dark) .exclude-section select,
                    :global(.dark) .exclude-section input,
                    :global(.dark) .exclude-section .search-input-wrapper input {
                        background-color: #020617 !important; /* Very deep blue-black */
                        background-image: none !important;
                        border-color: rgba(239, 68, 68, 0.2) !important;
                        color: #f8fafc !important;
                    }
                    :global(.dark) .exclude-section select:focus,
                    :global(.dark) .exclude-section input:focus {
                        border-color: rgba(239, 68, 68, 0.5) !important;
                        background-color: #000000 !important;
                    }
                    :global(.dark) .exclude-section select option {
                        background-color: #020617;
                        color: #f8fafc;
                    }

                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(-8px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}
            </style>
        </section>
    );
};
