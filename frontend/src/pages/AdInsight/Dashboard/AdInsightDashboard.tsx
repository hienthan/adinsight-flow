import { useState, useMemo } from 'react';
import { useDashboardData } from './useDashboardData';
import { DashboardCharts } from './DashboardCharts';
import { MultiSelectDropdown } from '../../../components/common/MultiSelectDropdown';
import { PlatformConfig } from '../../../types/adinsight';
import { SurfaceCard, createAmbientSurface, createPremiumBadgeStyle } from '../../../components/common/ui';

const DASHBOARD_PAGE_STYLE = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
} as const;

const FILTER_BAR_STYLE = {
    position: 'relative',
    zIndex: 60,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '1rem',
    overflow: 'visible',
} as const;

const FILTER_ROW_STYLE = {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    flexWrap: 'wrap',
} as const;

const LIVE_COUNT_STYLE = {
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
            <SurfaceCard
                padding="0.95rem 1rem"
                style={{
                    borderRadius: '1.35rem',
                    ...createAmbientSurface('#3b82f6', 0.85),
                    boxShadow: '0 24px 46px -34px rgba(15, 23, 42, 0.7)',
                }}
            >
                <div className="hero-badge" style={{ marginBottom: '0.45rem', ...createPremiumBadgeStyle('#3b82f6', { textColor: '#93c5fd' }) }}>
                    Dashboard Intelligence
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div>
                        <h2 style={{ fontSize: '1.18rem', fontWeight: 850, letterSpacing: '-0.04em', color: 'var(--text-main)', margin: 0, lineHeight: 1.08 }}>
                            {platformInfo.name} Performance Board
                        </h2>
                        <p style={{ marginTop: '0.28rem', fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 500, lineHeight: 1.4 }}>
                            Executive scan of geo coverage, score quality, and content mix across the current filtered dataset.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
                        <span className="hero-badge" style={createPremiumBadgeStyle('#14b8a6', { textColor: '#5eead4' })}>
                            {province || 'All Provinces'}
                        </span>
                    </div>
                </div>
            </SurfaceCard>

            {/* ── Filter bar — matches InsightFilterBar design exactly ── */}
            <SurfaceCard
                className="filter-container"
                variant="soft"
                style={{
                    ...FILTER_BAR_STYLE,
                    borderRadius: '1.6rem',
                    padding: '1.2rem 1.3rem',
                    background: [
                        'radial-gradient(circle at top right, rgba(59, 130, 246, 0.12) 0%, transparent 24%)',
                        'radial-gradient(circle at left bottom, rgba(16, 185, 129, 0.08) 0%, transparent 26%)',
                        'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 98%, white 2%) 0%, color-mix(in srgb, var(--bg-content) 90%, var(--bg-main) 10%) 100%)',
                    ].join(', '),
                    boxShadow: '0 26px 46px -34px rgba(15, 23, 42, 0.72)',
                    border: '1px solid color-mix(in srgb, var(--border-subtle) 78%, rgba(59, 130, 246, 0.2) 22%)',
                }}
            >
                <div style={FILTER_ROW_STYLE}>
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

                    {!isLoading && records && (
                        <div style={{ ...LIVE_COUNT_STYLE, marginLeft: 'auto' }}>
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
                </div>

                {/* CSS for filter labels, same as InsightFilterBar internal style */}
                <style>{`
                    .filter-container .filter-group {
                        display: flex;
                        flex-direction: column;
                        gap: 0.48rem;
                    }
                    .filter-container label {
                        font-size: 0.72rem;
                        font-weight: 800;
                        color: var(--text-dim);
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        opacity: 0.9;
                    }
                    .filter-container input,
                    .filter-container select {
                        height: 42px;
                        border-radius: 12px;
                        border: 1px solid color-mix(in srgb, var(--border-subtle) 82%, rgba(59, 130, 246, 0.18) 18%);
                        background: linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(248,250,252,0.88) 100%);
                        box-shadow: inset 0 1px 0 rgba(255,255,255,0.66), 0 10px 24px -20px rgba(15, 23, 42, 0.42);
                        transition: border-color 0.2s ease, box-shadow 0.2s ease;
                        color: var(--text-main);
                    }
                    .filter-container input::placeholder {
                        color: var(--text-muted);
                    }
                    .filter-container input:focus,
                    .filter-container select:focus {
                        outline: none;
                        border-color: rgba(59, 130, 246, 0.42);
                        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.08), inset 0 1px 0 rgba(255,255,255,0.75);
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.4; }
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
