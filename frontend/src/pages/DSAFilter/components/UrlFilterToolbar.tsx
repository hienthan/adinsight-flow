import { memo } from 'react';
import { Search } from 'lucide-react';
import { MultiSelectDropdown } from '../../../components/common/MultiSelectDropdown';
import { SafeButton, SurfaceCard } from '../../../components/common/ui';
import type { UrlFilterState } from '../urlFilterUtils';
import { URL_FILTER_ROW_STYLE, URL_FILTER_SHELL_STYLE } from '../urlFilterViewUtils';

type SortField = 'country' | 'clicks';
type SortDirection = 'asc' | 'desc';

interface UrlFilterToolbarProps {
    countryOptions: Array<{ label: string; value: string }>;
    filters: UrlFilterState;
    searchInput: string;
    excludeInput: string;
    sortField: SortField;
    sortDirection: SortDirection;
    hasRows: boolean;
    onSearchInputChange: (value: string) => void;
    onExcludeInputChange: (value: string) => void;
    onFilterValueChange: <K extends keyof UrlFilterState>(id: K, value: UrlFilterState[K]) => void;
    onSortChange: (field: SortField, direction: SortDirection) => void;
    onIncludeFiltered: () => void;
    onExcludeFiltered: () => void;
    onResetFilters: () => void;
}

export const UrlFilterToolbar = memo(function UrlFilterToolbar({
    countryOptions,
    filters,
    searchInput,
    excludeInput,
    sortField,
    sortDirection,
    hasRows,
    onSearchInputChange,
    onExcludeInputChange,
    onFilterValueChange,
    onSortChange,
    onIncludeFiltered,
    onExcludeFiltered,
    onResetFilters,
}: UrlFilterToolbarProps) {
    return (
        <SurfaceCard
            className="filter-container"
            padding="0.95rem 1rem"
            radius="1.3rem"
            style={{
                ...URL_FILTER_SHELL_STYLE,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                background: [
                    'radial-gradient(circle at top right, rgba(59, 130, 246, 0.14) 0%, transparent 26%)',
                    'radial-gradient(circle at left bottom, rgba(20, 184, 166, 0.08) 0%, transparent 28%)',
                    'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 98%, white 2%) 0%, color-mix(in srgb, var(--bg-content) 89%, var(--bg-main) 11%) 100%)',
                ].join(', '),
                boxShadow: '0 26px 48px -34px rgba(15, 23, 42, 0.72)',
                border: '1px solid color-mix(in srgb, var(--border-subtle) 80%, rgba(59, 130, 246, 0.2) 20%)',
            }}
        >
            <div style={{ ...URL_FILTER_ROW_STYLE, alignItems: 'flex-end' }}>
                <div className="filter-group">
                    <label>Search</label>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(event) => onSearchInputChange(event.target.value)}
                            placeholder="Search headline, country, city"
                            style={{ width: '220px', paddingLeft: '2.45rem' }}
                        />
                    </div>
                </div>

                <div className="filter-group">
                    <label>Country</label>
                    <MultiSelectDropdown
                        options={countryOptions}
                        value={filters.includeCountries}
                        onChange={(value) => onFilterValueChange('includeCountries', value)}
                        placeholder="All"
                        width="170px"
                        showSearch
                    />
                </div>

                <div className="filter-group">
                    <label>Include</label>
                    <select value={filters.includeStatus} onChange={(event) => onFilterValueChange('includeStatus', event.target.value as UrlFilterState['includeStatus'])} style={{ width: '118px' }}>
                        <option value="all">All</option>
                        <option value="included">Included</option>
                        <option value="excluded">Excluded</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label>Matching</label>
                    <select value={filters.classification} onChange={(event) => onFilterValueChange('classification', event.target.value as UrlFilterState['classification'])} style={{ width: '128px' }}>
                        <option value="all">All</option>
                        <option value="matched">Matched</option>
                        <option value="unknown">Unknown</option>
                    </select>
                </div>
            </div>

            <div style={URL_FILTER_ROW_STYLE}>
                <div className="filter-group">
                    <label>!Country</label>
                    <MultiSelectDropdown
                        options={countryOptions}
                        value={filters.excludeCountries}
                        onChange={(value) => onFilterValueChange('excludeCountries', value)}
                        placeholder="None"
                        width="170px"
                        showSearch
                    />
                </div>

                <div className="filter-group">
                    <label>!Search</label>
                    <input
                        type="text"
                        value={excludeInput}
                        onChange={(event) => onExcludeInputChange(event.target.value)}
                        placeholder="Hide matching text"
                        style={{ width: '190px' }}
                    />
                </div>

                <div className="filter-group">
                    <label>Sort</label>
                    <select
                        value={`${sortField}:${sortDirection}`}
                        onChange={(event) => {
                            const [field, direction] = event.target.value.split(':') as [SortField, SortDirection];
                            onSortChange(field, direction);
                        }}
                        style={{ width: '148px' }}
                    >
                        <option value="clicks:desc">Clicks ↓</option>
                        <option value="clicks:asc">Clicks ↑</option>
                        <option value="country:asc">Country A-Z</option>
                        <option value="country:desc">Country Z-A</option>
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap', marginLeft: 'auto' }}>
                    <SafeButton onClick={onIncludeFiltered} className="hero-btn hero-btn-secondary" style={{ padding: '0.72rem 0.88rem' }} disabled={!hasRows}>
                        Include Filtered
                    </SafeButton>
                    <SafeButton onClick={onExcludeFiltered} className="hero-btn hero-btn-secondary" style={{ padding: '0.72rem 0.88rem' }} disabled={!hasRows}>
                        Exclude Filtered
                    </SafeButton>
                    <SafeButton onClick={onResetFilters} className="hero-btn hero-btn-secondary" style={{ padding: '0.72rem 0.88rem' }}>
                        Reset
                    </SafeButton>
                </div>
            </div>
        </SurfaceCard>
    );
});
