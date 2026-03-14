import { Search } from 'lucide-react';
import { MultiSelectDropdown } from '../../components/common/MultiSelectDropdown';
import { SafeButton, SurfaceCard, ToolbarGroup } from '../../components/common/ui';
import type { CountryOption } from '../../hooks/useCountryOptions';
import type { CampaignPlatform } from '../../types/campaign';
import type { CampaignRouteFilters, RouteViewMode } from './types';
import { DEFAULT_SEASONAL_TAGS } from './utils';

interface OutboundMapToolbarProps {
    filters: CampaignRouteFilters;
    onFiltersChange: (updater: (previous: CampaignRouteFilters) => CampaignRouteFilters) => void;
    viewMode: RouteViewMode;
    onViewModeChange: (mode: RouteViewMode) => void;
    countryOptions: CountryOption[];
    platforms: CampaignPlatform[];
    availableSourceMarkets: string[];
    onOpenCreate: () => void;
}

const STATUS_OPTIONS = [
    { label: 'Active', value: 'active' },
    { label: 'Planned', value: 'planned' },
    { label: 'Paused', value: 'paused' },
    { label: 'Archived', value: 'archived' },
];

const PRIORITY_OPTIONS = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Critical', value: 'critical' },
];

const VIEW_OPTIONS: Array<{ id: RouteViewMode; label: string }> = [
    { id: 'matrix', label: 'Matrix View' },
    { id: 'graph', label: 'Route Graph' },
    { id: 'geo', label: 'Geo Board' },
];

export default function OutboundMapToolbar({
    filters,
    onFiltersChange,
    viewMode,
    onViewModeChange,
    countryOptions,
    platforms,
    availableSourceMarkets,
    onOpenCreate,
}: OutboundMapToolbarProps) {
    const updateField = <K extends keyof CampaignRouteFilters>(key: K, value: CampaignRouteFilters[K]) => {
        onFiltersChange((previous) => ({
            ...previous,
            [key]: value,
        }));
    };

    return (
        <SurfaceCard variant="soft" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                    <ToolbarGroup compact>
                        <select
                            value={filters.platform}
                            onChange={(event) => updateField('platform', event.target.value)}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--text-main)',
                                minWidth: '150px',
                                outline: 'none',
                                fontWeight: 600,
                            }}
                        >
                            <option value="">All Platforms</option>
                            {platforms.map((platform) => (
                                <option key={platform.id} value={platform.id}>
                                    {platform.display_name}
                                </option>
                            ))}
                        </select>
                    </ToolbarGroup>

                    <div className="filter-group">
                        <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>Source</label>
                        <MultiSelectDropdown
                            options={availableSourceMarkets.map((market) => ({ label: market, value: market }))}
                            value={filters.sourceMarkets}
                            onChange={(value) => updateField('sourceMarkets', value)}
                            placeholder="All markets"
                            width="150px"
                        />
                    </div>

                    <div className="filter-group">
                        <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>Destination</label>
                        <MultiSelectDropdown
                            options={countryOptions.map((option) => ({ label: option.label, value: option.value }))}
                            value={filters.destinations}
                            onChange={(value) => updateField('destinations', value)}
                            placeholder="Global / All"
                            width="190px"
                            showSearch
                        />
                    </div>

                    <div className="filter-group">
                        <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>Status</label>
                        <MultiSelectDropdown
                            options={STATUS_OPTIONS}
                            value={filters.statuses}
                            onChange={(value) => updateField('statuses', value)}
                            placeholder="All statuses"
                            width="150px"
                        />
                    </div>

                    <div className="filter-group">
                        <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>Priority</label>
                        <MultiSelectDropdown
                            options={PRIORITY_OPTIONS}
                            value={filters.priorities}
                            onChange={(value) => updateField('priorities', value)}
                            placeholder="All priorities"
                            width="150px"
                        />
                    </div>

                    <div className="filter-group">
                        <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>Season</label>
                        <MultiSelectDropdown
                            options={DEFAULT_SEASONAL_TAGS.map((tag) => ({ label: tag, value: tag }))}
                            value={filters.seasonalTags}
                            onChange={(value) => updateField('seasonalTags', value)}
                            placeholder="All seasons"
                            width="170px"
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <SafeButton
                        onClick={() => updateField('coreOnly', !filters.coreOnly)}
                        style={{
                            borderRadius: '999px',
                            border: `1px solid ${filters.coreOnly ? 'hsl(var(--primary))' : 'var(--border-subtle)'}`,
                            background: filters.coreOnly ? 'hsla(var(--primary) / 0.1)' : 'var(--bg-content)',
                            color: filters.coreOnly ? 'hsl(var(--primary))' : 'var(--text-dim)',
                            fontWeight: 700,
                            padding: '0.75rem 1rem',
                        }}
                    >
                        Core Only
                    </SafeButton>

                    <SafeButton
                        onClick={onOpenCreate}
                        style={{
                            borderRadius: '12px',
                            border: '1px solid hsl(var(--primary))',
                            background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, #2563eb 100%)',
                            color: 'white',
                            fontWeight: 800,
                            padding: '0.8rem 1.1rem',
                            boxShadow: 'var(--shadow-glow)',
                        }}
                    >
                        Add Route
                    </SafeButton>
                </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ position: 'relative', flex: '1 1 340px', minWidth: '280px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(event) => updateField('search', event.target.value)}
                        placeholder="Search HK -> JP, Tokyo, campaign name..."
                        style={{
                            width: '100%',
                            borderRadius: '14px',
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--bg-content)',
                            color: 'var(--text-main)',
                            padding: '0.85rem 1rem 0.85rem 2.7rem',
                            fontWeight: 500,
                            outline: 'none',
                        }}
                    />
                </div>

                <ToolbarGroup compact style={{ flexWrap: 'wrap' }}>
                    {VIEW_OPTIONS.map((option) => (
                        <SafeButton
                            key={option.id}
                            onClick={() => onViewModeChange(option.id)}
                            style={{
                                borderRadius: '10px',
                                border: '1px solid transparent',
                                background: viewMode === option.id ? 'hsla(var(--primary) / 0.12)' : 'transparent',
                                color: viewMode === option.id ? 'hsl(var(--primary))' : 'var(--text-dim)',
                                fontWeight: 700,
                                padding: '0.65rem 0.95rem',
                            }}
                        >
                            {option.label}
                        </SafeButton>
                    ))}
                </ToolbarGroup>
            </div>
        </SurfaceCard>
    );
}
