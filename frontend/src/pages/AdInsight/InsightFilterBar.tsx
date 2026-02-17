import React, { useState, useEffect } from 'react';
import { Search, Download } from 'lucide-react';
import { FilterDef } from '../../types/adinsight';

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

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchInput !== (currentValues.searchTerm || '')) {
                onFilterChange('searchTerm', searchInput);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchInput, onFilterChange, currentValues.searchTerm]);

    // Update local input if filters are reset from parent
    useEffect(() => {
        setSearchInput(currentValues.searchTerm || '');
    }, [currentValues.searchTerm]);

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
                                    style={{ width: '400px', paddingLeft: '2.5rem' }}
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
                    return (
                        <div className="filter-group" key={filter.id}>
                            <label>{filter.label}</label>
                            <input
                                type="text"
                                list="country-list"
                                value={currentValues[filter.id] || ''}
                                onChange={(e) => onFilterChange(filter.id, e.target.value)}
                                placeholder={filter.placeholder}
                                style={{ width: '160px' }}
                            />
                            <datalist id="country-list">
                                <option value="">Global / All</option>
                                {countries.map(c => <option key={c} value={c} />)}
                            </datalist>
                        </div>
                    );
                }

                if (filter.type === 'select') {
                    return (
                        <div className="filter-group" key={filter.id}>
                            <label>{filter.label}</label>
                            <select
                                value={currentValues[filter.id] || ''}
                                onChange={(e) => onFilterChange(filter.id, e.target.value)}
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
                            style={{ width: '120px' }}
                        />
                    </div>
                );
            })}

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem', alignSelf: 'flex-end' }}>
                <button
                    onClick={onReset}
                    className="hero-btn hero-btn-secondary"
                    style={{ padding: '0.6rem 1.2rem' }}
                >
                    Reset
                </button>

                <button
                    onClick={onExport}
                    disabled={isExporting}
                    className="hero-btn hero-btn-primary"
                    style={{ padding: '0.6rem 1.5rem', gap: '0.6rem' }}
                >
                    <Download size={18} />
                    {isExporting ? 'Exporting...' : 'Export DSA CSV'}
                </button>
            </div>
        </section>
    );
};
