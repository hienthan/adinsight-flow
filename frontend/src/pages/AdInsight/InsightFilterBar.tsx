import React, { useState, useEffect } from 'react';
import { Search, Download } from 'lucide-react';
import { FilterDef } from '../../types/adinsight';
import { MultiSelectDropdown } from '../../components/common/MultiSelectDropdown';

interface InsightFilterBarProps {
    filters: FilterDef[];
    currentValues: Record<string, string>;
    onFilterChange: (id: string, value: string) => void;
    onReset: () => void;
    onExport: () => void;
    countries: string[];
    sitemapTags: string[];
    isExporting: boolean;
}

export const InsightFilterBar: React.FC<InsightFilterBarProps> = ({
    filters,
    currentValues,
    onFilterChange,
    onReset,
    onExport,
    countries,
    sitemapTags,
    isExporting
}) => {
    // Local state for debouncing search
    const [searchInput, setSearchInput] = useState(currentValues.searchTerm || '');
    const [excludeInput, setExcludeInput] = useState(currentValues.excludeTerm || '');

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

    return (
        <section className="filter-bar">
            {filters.map((filter) => {
                if (filter.id === 'searchTerm') {
                    return (
                        <div className="filter-group" key={filter.id}>
                            <label>{filter.label}</label>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                                <input
                                    type="text"
                                    placeholder={filter.placeholder}
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    style={{ width: '220px', paddingLeft: '2.5rem' }}
                                />
                            </div>
                        </div>
                    );
                }

                if (filter.id === 'excludeTerm') {
                    return (
                        <div className="filter-group" key={filter.id}>
                            <label>{filter.label}</label>
                            <div style={{ position: 'relative' }}>
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
                                <input
                                    type="text"
                                    placeholder={filter.placeholder}
                                    value={excludeInput}
                                    onChange={(e) => setExcludeInput(e.target.value)}
                                    style={{ width: '180px', paddingLeft: '2rem' }}
                                />
                            </div>
                        </div>
                    );
                }

                if (filter.id === 'sitemap_tag') {
                    return (
                        <div className="filter-group" key={filter.id}>
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
                        <div className="filter-group" key={filter.id}>
                            <label>{filter.label}</label>
                            <MultiSelectDropdown
                                options={countryOptions}
                                value={currentValues[filter.id] || ''}
                                onChange={(val) => onFilterChange(filter.id, val)}
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
                            <div className="filter-group" key={filter.id}>
                                <label>{filter.label}</label>
                                <MultiSelectDropdown
                                    options={filter.options}
                                    value={currentValues[filter.id] || ''}
                                    onChange={(val) => onFilterChange(filter.id, val)}
                                    placeholder="All"
                                    width={filter.id === 'content_type' ? '180px' : '150px'}
                                />
                            </div>
                        );
                    }

                    return (
                        <div className="filter-group" key={filter.id}>
                            <label>{filter.label}</label>
                            <select
                                value={currentValues[filter.id] || ''}
                                onChange={(e) => onFilterChange(filter.id, e.target.value)}
                                style={{ width: filter.id === 'language' ? '90px' : (filter.id === 'tier' ? '65px' : '140px') }}
                            >
                                {filter.options?.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    );
                }

                return (
                    <div className="filter-group" key={filter.id}>
                        <label>{filter.label}</label>
                        <input
                            type="text"
                            placeholder={filter.placeholder}
                            value={currentValues[filter.id] || ''}
                            onChange={(e) => onFilterChange(filter.id, e.target.value)}
                            style={{ width: filter.id === 'city' ? '120px' : '100px' }}
                        />
                    </div>
                );
            })}

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.6rem', alignSelf: 'flex-end' }}>
                <button
                    onClick={onReset}
                    className="hero-btn hero-btn-secondary"
                    style={{ padding: '0.6rem 1rem', fontSize: '13px' }}
                >
                    Reset
                </button>

                <button
                    onClick={onExport}
                    disabled={isExporting}
                    className="hero-btn hero-btn-primary"
                    style={{ padding: '0.6rem 1.2rem', gap: '0.5rem', fontSize: '13px' }}
                >
                    <Download size={16} />
                    {isExporting ? 'Exporting...' : 'CSV'}
                </button>
            </div>
        </section>
    );
};
