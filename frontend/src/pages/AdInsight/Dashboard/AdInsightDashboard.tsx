import { useState, useMemo } from 'react';
import { useDashboardData } from './useDashboardData';
import { DashboardCharts } from './DashboardCharts';
import { MultiSelectDropdown } from '../../../components/common/MultiSelectDropdown';
import { PlatformConfig } from '../../../types/adinsight';
import { SurfaceCard } from '../../../components/common/ui';

const DASHBOARD_PAGE_STYLE = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
} as const;

const FILTER_BAR_STYLE = {
    position: 'relative',
    zIndex: 60,
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    flexWrap: 'wrap',
    overflow: 'visible',
} as const;

const LIVE_COUNT_STYLE = {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: 'var(--text-dim)',
    fontWeight: 600,
} as const;

const ERROR_STATE_STYLE = {
    padding: '2rem',
    textAlign: 'center',
    background: 'rgba(239,68,68,0.06)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '12px',
    color: '#ef4444',
    fontSize: '0.9rem',
    fontWeight: 600,
} as const;

interface AdInsightDashboardProps {
    platformInfo: PlatformConfig;
    sitemapTags: string[];
}

export function AdInsightDashboard({ platformInfo, sitemapTags }: AdInsightDashboardProps) {
    const [pattern, setPattern] = useState(platformInfo.defaultSitemapTags[0] || 'activities');
    // '' = All provinces (same convention as InsightFilterBar)
    const [province, setProvince] = useState<string>('');

    const filters = useMemo(() => ({
        platformInfo: { 
            collection: platformInfo.collection, 
            id: platformInfo.id,
            titleKey: platformInfo.titleKey
        },
        sitemap_tag: pattern,
        province,
        activeFilterKey: platformInfo.activeFilterKey
    }), [platformInfo, pattern, province]);

    const { data: records, isLoading, isError } = useDashboardData(filters);

    // Build province options from platform config — using slug value to match PocketBase storage
    const provinceOptions = useMemo(() => {
        const configFilter = platformInfo.filters.find(f => f.id === 'province');
        const all = [{ label: 'All', value: '' }];
        if (configFilter?.options) {
            const rest = configFilter.options
                .filter(o => o.value !== '' && o.label !== 'All');
            return [...all, ...rest]; // value = slug e.g. 'east-java' — matches what PocketBase stores
        }
        return all;
    }, [platformInfo.filters]);

    // Build sitemap_tag options for the select
    const sitemapTagOptions = useMemo(() =>
        sitemapTags.map(tag => ({ label: tag, value: tag })),
        [sitemapTags]
    );

    // Filtering is now handled SERVER-SIDE in useDashboardData via buildFilterString
    const filteredRecords = records || [];
    const urlCount = filteredRecords.length;

    return (
        <div style={DASHBOARD_PAGE_STYLE}>

            {/* ── Filter bar — matches InsightFilterBar design exactly ── */}
            <SurfaceCard className="filter-container" variant="soft" style={FILTER_BAR_STYLE}>
                {/* Pattern Selector */}
                <div className="filter-group">
                    <label>Pattern <span style={{ color: '#ef4444' }}>*</span></label>
                    <select
                        value={pattern}
                        onChange={e => setPattern(e.target.value)}
                        style={{ width: '140px' }}
                    >
                        {sitemapTagOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                {/* Province Filter — same MultiSelectDropdown as InsightFilterBar */}
                <div className="filter-group">
                    <label>Province</label>
                    <MultiSelectDropdown
                        options={provinceOptions}
                        value={province}
                        onChange={val => setProvince(val)}
                        placeholder="All"
                        width="180px"
                    />
                </div>

                {/* Live count badge — right-aligned */}
                {!isLoading && records && (
                    <div style={LIVE_COUNT_STYLE}>
                        <span style={{
                            display: 'inline-block',
                            width: '7px', height: '7px',
                            borderRadius: '50%',
                            backgroundColor: '#10b981',
                            animation: 'pulse 2s infinite'
                        }} />
                        {urlCount.toLocaleString()} URL{urlCount !== 1 ? 's' : ''}{province ? ` · ${province}` : ' · All Provinces'}
                    </div>
                )}

                {/* CSS for filter labels, same as InsightFilterBar internal style */}
                <style>{`
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
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.4; }
                    }
                `}</style>
            </SurfaceCard>

            {/* ── Dashboard Charts ─────────────────────────────────── */}
            {isError ? (
                <div style={ERROR_STATE_STYLE}>
                    Failed to load dashboard data. Check PocketBase connection.
                </div>
            ) : (
                <DashboardCharts records={filteredRecords} isLoading={isLoading} />
            )}
        </div>
    );
}
