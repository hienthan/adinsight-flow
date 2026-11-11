import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, BarChart3, RefreshCw, Search } from 'lucide-react';
import type { CampaignTestTrack } from '../../types/campaign';
import { FilterChip, SafeButton, SurfaceCard, ToolbarGroup, createAmbientSurface } from '../../components/common/ui';
import {
    filterTracks,
    formatPlatform,
    formatSlug,
    getQueryErrorMessage,
    useCampaignTestTracks,
    useTrackSummary,
} from './campaignTestTrackingShared';
import {
    getTrackAccent,
    headerCellStyle,
    MiniCountBadge,
    sourceCellStyle,
    TrackLaneCard,
} from './campTestTrackingComponents';
import {
    CAMP_TEST_FILTER_SHELL_STYLE,
    CAMP_TEST_PAGE_BACKGROUND,
    CAMP_TEST_SUMMARY_SHELL_STYLE,
    CAMP_TEST_THEME_CLASS,
    CAMP_TEST_THEME_CSS,
    createCampTestPanelStyle,
} from './campTestTrackingTheme';

interface MatrixCellData {
    sourceMarket: string;
    destinationCountry: string;
    total: number;
    live: number;
    testing: number;
    failed: number;
}

export default function CampCoverageOverviewPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [search, setSearch] = useState('');
    const [platformFilter, setPlatformFilter] = useState('all');
    const [sourceMarketFilter, setSourceMarketFilter] = useState('all');
    const [destinationCountryFilter, setDestinationCountryFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [patternTopicFilter, setPatternTopicFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [resultFilter, setResultFilter] = useState('all');
    const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null);
    const deferredSearch = useDeferredValue(search);

    const tracksQuery = useCampaignTestTracks();
    const tracks = tracksQuery.data || [];

    useEffect(() => {
        const platform = searchParams.get('platform');
        const sourceMarket = searchParams.get('sourceMarket');
        const destinationCountry = searchParams.get('destinationCountry');
        if (platform) setPlatformFilter(platform);
        if (sourceMarket) setSourceMarketFilter(sourceMarket);
        if (destinationCountry) setDestinationCountryFilter(destinationCountry);
    }, [searchParams]);

    const platformOptions = useMemo(() => {
        const map = new Map<string, string>();
        tracks.forEach((track) => map.set(track.platform, formatPlatform(track)));
        return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
    }, [tracks]);
    const sourceMarketOptions = useMemo(() => Array.from(new Set(tracks.map((track) => track.source_market))).sort(), [tracks]);
    const destinationCountryOptions = useMemo(() => Array.from(new Set(tracks.map((track) => track.destination_country))).sort(), [tracks]);
    const safeDestinationCountryOptions = useMemo(
        () => destinationCountryOptions.filter(Boolean),
        [destinationCountryOptions],
    );
    const categoryOptions = useMemo(() => Array.from(new Set(tracks.map((track) => track.category || '').filter(Boolean))).sort(), [tracks]);
    const patternTopicOptions = useMemo(() => Array.from(new Set(tracks.map((track) => track.pattern_topic))).sort(), [tracks]);

    const baseFilteredTracks = useMemo(() => filterTracks(tracks, {
        platform: platformFilter,
        sourceMarket: sourceMarketFilter,
        destinationCountry: destinationCountryFilter,
        destinationCity: 'all',
        laneScope: 'all',
        category: categoryFilter,
        patternTopic: patternTopicFilter,
        status: statusFilter,
        result: resultFilter,
        cookieState: 'all',
        search: deferredSearch,
    }), [
        categoryFilter,
        deferredSearch,
        destinationCountryFilter,
        patternTopicFilter,
        platformFilter,
        resultFilter,
        sourceMarketFilter,
        statusFilter,
        tracks,
    ]);

    const summary = useTrackSummary(baseFilteredTracks);
    const destinationTracks = useMemo(
        () => baseFilteredTracks.filter((track) => track.lane_scope !== 'market_only'),
        [baseFilteredTracks],
    );
    const marketOnlyTracks = useMemo(
        () => baseFilteredTracks.filter((track) => track.lane_scope === 'market_only'),
        [baseFilteredTracks],
    );

    const matrixData = useMemo(() => {
        const sourceMarkets = Array.from(new Set(destinationTracks.map((track) => track.source_market))).sort();
        const destinationCountries = Array.from(new Set(destinationTracks.map((track) => track.destination_country || '').filter(Boolean))).sort();
        const cellMap = new Map<string, MatrixCellData>();

        destinationTracks.forEach((track) => {
            const key = `${track.source_market}|${track.destination_country}`;
            const existing = cellMap.get(key) || {
                sourceMarket: track.source_market,
                destinationCountry: track.destination_country || '',
                total: 0,
                live: 0,
                testing: 0,
                failed: 0,
            };
            existing.total += 1;
            if (track.status === 'live') existing.live += 1;
            if (track.status === 'testing') existing.testing += 1;
            if (track.status === 'failed') existing.failed += 1;
            cellMap.set(key, existing);
        });

        return { sourceMarkets, destinationCountries, cellMap };
    }, [destinationTracks]);

    const selectedCellTracks = useMemo(() => {
        if (!selectedCellKey) return destinationTracks;
        const [sourceMarket, destinationCountry] = selectedCellKey.split('|');
        return destinationTracks.filter((track) => track.source_market === sourceMarket && track.destination_country === destinationCountry);
    }, [destinationTracks, selectedCellKey]);

    const selectedCellMeta = selectedCellKey ? (() => {
        const [sourceMarket, destinationCountry] = selectedCellKey.split('|');
        return { sourceMarket, destinationCountry };
    })() : null;

    const groupedByPlatform = useMemo(() => {
        const map = new Map<string, { label: string; tracks: CampaignTestTrack[] }>();
        selectedCellTracks.forEach((track) => {
            const key = track.platform;
            const current = map.get(key) || { label: formatPlatform(track), tracks: [] };
            current.tracks.push(track);
            map.set(key, current);
        });
        return Array.from(map.entries())
            .map(([platformId, value]) => ({ platformId, ...value }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [selectedCellTracks]);

    const marketCoverageCount = new Set(baseFilteredTracks.map((track) => `${track.platform}|${track.source_market}|${track.lane_scope}`)).size;
    const destinationCoverageCount = new Set(destinationTracks.map((track) => track.destination_country)).size;
    const topicCoverageCount = new Set(baseFilteredTracks.map((track) => track.pattern_topic)).size;
    const trackErrorMessage = tracksQuery.error
        ? getQueryErrorMessage(tracksQuery.error, 'The coverage data query failed before the matrix could load.')
        : null;

    const openTestingCreate = () => {
        const params = new URLSearchParams();
        params.set('modal', 'create');
        if (platformFilter !== 'all') params.set('platform', platformFilter);
        if (selectedCellMeta?.sourceMarket) params.set('sourceMarket', selectedCellMeta.sourceMarket);
        else if (sourceMarketFilter !== 'all') params.set('sourceMarket', sourceMarketFilter);
        if (selectedCellMeta?.destinationCountry) params.set('destinationCountry', selectedCellMeta.destinationCountry);
        else if (destinationCountryFilter !== 'all') params.set('destinationCountry', destinationCountryFilter);
        if (categoryFilter !== 'all') params.set('category', categoryFilter);
        if (patternTopicFilter !== 'all') params.set('patternTopic', patternTopicFilter);
        navigate(`/camp-tracking/testing?${params.toString()}`);
    };

    const openTestingEdit = (track: CampaignTestTrack) => {
        const params = new URLSearchParams();
        params.set('track', track.id);
        params.set('modal', 'edit');
        navigate(`/camp-tracking/testing?${params.toString()}`);
    };

    return (
        <div className={`page-container ${CAMP_TEST_THEME_CLASS}`} style={{ ...CAMP_TEST_PAGE_BACKGROUND, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <style>{CAMP_TEST_THEME_CSS}</style>
            <SurfaceCard
                radius="1.5rem"
                style={{
                    ...createAmbientSurface('#0f766e', 0.34),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, rgba(15, 118, 110, 0.18) 0%, rgba(6, 182, 212, 0.12) 100%)',
                        color: '#0f766e',
                    }}>
                        <BarChart3 size={20} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 850, letterSpacing: '-0.03em', color: 'var(--text-main)' }}>
                            Coverage Overview
                        </h1>
                        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-dim)', fontWeight: 600 }}>
                            Scan portfolio coverage by platform, source market, destination, and topic from one place.
                        </p>
                    </div>
                </div>

                <ToolbarGroup compact style={{ marginLeft: 'auto' }}>
                    <SafeButton
                        onClick={() => tracksQuery.refetch()}
                        className="hero-btn hero-btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 0.8rem' }}
                    >
                        <RefreshCw size={15} className={tracksQuery.isRefetching ? 'animate-spin' : ''} />
                        Refresh
                    </SafeButton>
                </ToolbarGroup>
            </SurfaceCard>

            {trackErrorMessage ? (
                <SurfaceCard
                    radius="1.2rem"
                    variant="soft"
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        flexWrap: 'wrap',
                        border: '1px solid rgba(239, 68, 68, 0.18)',
                        background: 'rgba(239, 68, 68, 0.08)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem', minWidth: 0 }}>
                        <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#fff',
                            color: '#b91c1c',
                            flex: '0 0 auto',
                        }}>
                            <AlertTriangle size={18} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.98rem', fontWeight: 850, color: 'var(--text-main)' }}>
                                Coverage data failed to load
                            </div>
                            <div style={{ marginTop: '0.25rem', color: 'var(--text-dim)', fontWeight: 650, lineHeight: 1.5 }}>
                                The page is failing fast now, so a missing collection or backend error should show up immediately instead of looking like a slow load.
                            </div>
                            <div style={{ marginTop: '0.45rem', color: '#b91c1c', fontWeight: 700 }}>
                                {trackErrorMessage}
                            </div>
                        </div>
                    </div>
                    <SafeButton
                        onClick={() => tracksQuery.refetch()}
                        className="hero-btn hero-btn-secondary"
                        style={{ padding: '0.6rem 0.85rem', whiteSpace: 'nowrap' }}
                    >
                        {tracksQuery.isRefetching ? 'Retrying...' : 'Retry Coverage Data'}
                    </SafeButton>
                </SurfaceCard>
            ) : null}

            <SurfaceCard radius="1.3rem" variant="soft" style={{ ...CAMP_TEST_FILTER_SHELL_STYLE, display: 'flex', flexWrap: 'wrap', gap: '0.8rem', alignItems: 'flex-end' }}>
                <div style={{ minWidth: '220px', flex: '1 1 260px' }}>
                    <div className="camp-test-filter-label">
                        Search
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                        <input
                            className="camp-test-filter-control"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Market, destination, topic, lane title..."
                            style={{ width: '100%', paddingLeft: '2.45rem' }}
                        />
                    </div>
                </div>

                <FilterSelect label="Platform" value={platformFilter} onChange={setPlatformFilter} options={[['all', 'All Platforms'], ...platformOptions]} />
                <FilterSelect label="Source Market" value={sourceMarketFilter} onChange={setSourceMarketFilter} options={[['all', 'All Markets'], ...sourceMarketOptions.map((value) => [value, value] as [string, string])]} />
                <FilterSelect label="Destination" value={destinationCountryFilter} onChange={setDestinationCountryFilter} options={[['all', 'All Countries'], ...safeDestinationCountryOptions.map((value) => [value, formatSlug(value)] as [string, string])]} />
                <FilterSelect label="Category" value={categoryFilter} onChange={setCategoryFilter} options={[['all', 'All Categories'], ...categoryOptions.map((value) => [value, formatSlug(value)] as [string, string])]} />
                <FilterSelect label="Topic" value={patternTopicFilter} onChange={setPatternTopicFilter} options={[['all', 'All Topics'], ...patternTopicOptions.map((value) => [value, formatSlug(value)] as [string, string])]} />
                <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={[
                    ['all', 'All Statuses'],
                    ['live', 'Live'],
                    ['testing', 'Testing'],
                    ['watching', 'Watching'],
                    ['planned', 'Planned'],
                    ['failed', 'Failed'],
                    ['paused', 'Paused'],
                    ['archived', 'Archived'],
                ]} />
                <FilterSelect label="Result" value={resultFilter} onChange={setResultFilter} options={[
                    ['all', 'All Results'],
                    ['positive', 'Positive'],
                    ['neutral', 'Neutral'],
                    ['mixed', 'Mixed'],
                    ['negative', 'Negative'],
                ]} />
            </SurfaceCard>

            <SurfaceCard radius="1.35rem" style={{ ...CAMP_TEST_SUMMARY_SHELL_STYLE, display: 'flex', flexWrap: 'wrap', gap: '0.65rem', alignItems: 'center' }}>
                <MetricPill label="Live" value={summary.live} tone="green" />
                <MetricPill label="Testing" value={summary.testing} tone="blue" />
                <MetricPill label="Failed" value={summary.failed} tone="red" />
                <MetricPill label="Cookie On" value={summary.cookieOn} tone="teal" />
                <MetricPill label="Do Not Retest" value={summary.doNotRetest} tone="slate" />
                <MetricPill label="Markets Covered" value={marketCoverageCount} tone="amber" />
                <MetricPill label="Destinations Covered" value={destinationCoverageCount} tone="emerald" />
                <MetricPill label="Topics Active" value={topicCoverageCount} tone="violet" />
            </SurfaceCard>

            <SurfaceCard radius="1.35rem" style={{ ...createCampTestPanelStyle('#3b82f6'), display: 'flex', flexDirection: 'column', gap: '0.9rem', overflowX: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 850, color: 'var(--text-main)' }}>Coverage Matrix</h2>
                        <p style={{ margin: '0.2rem 0 0', color: 'var(--text-dim)', fontSize: '0.84rem', fontWeight: 600 }}>
                            Click a cell to narrow the lane list below.
                        </p>
                    </div>
                    {selectedCellMeta ? (
                        <SafeButton
                            onClick={() => setSelectedCellKey(null)}
                            className="hero-btn hero-btn-secondary"
                            style={{ padding: '0.5rem 0.75rem' }}
                        >
                            Clear cell filter
                        </SafeButton>
                    ) : null}
                </div>

                {trackErrorMessage ? (
                    <InlineErrorState
                        title="Coverage matrix unavailable"
                        message="The matrix is paused because lane records did not load successfully."
                    />
                ) : tracksQuery.isLoading ? (
                    <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-dim)', fontWeight: 700 }}>Loading coverage matrix...</div>
                ) : matrixData.sourceMarkets.length === 0 || matrixData.destinationCountries.length === 0 ? (
                    <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-dim)', fontWeight: 700 }}>No lanes available for the current filters.</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0.5rem' }}>
                        <thead>
                            <tr>
                                <th style={headerCellStyle}>Source</th>
                                {matrixData.destinationCountries.map((country) => (
                                    <th key={country} style={headerCellStyle}>{formatSlug(country)}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {matrixData.sourceMarkets.map((sourceMarket) => (
                                <tr key={sourceMarket}>
                                    <td style={sourceCellStyle}>{sourceMarket}</td>
                                    {matrixData.destinationCountries.map((country) => {
                                        const key = `${sourceMarket}|${country}`;
                                        const cell = matrixData.cellMap.get(key);
                                        const isSelected = selectedCellKey === key;
                                        return (
                                            <td key={key}>
                                                <SafeButton
                                                    onClick={() => setSelectedCellKey((prev) => prev === key ? null : key)}
                                                    style={{
                                                        width: '100%',
                                                        minHeight: '86px',
                                                        padding: '0.75rem',
                                                        borderRadius: '16px',
                                                        textAlign: 'left',
                                                        border: isSelected
                                                            ? '1px solid color-mix(in srgb, hsl(var(--primary)) 28%, var(--border-subtle) 72%)'
                                                            : '1px solid var(--border-subtle)',
                                                        background: cell
                                                            ? isSelected
                                                                ? 'linear-gradient(135deg, hsla(var(--primary)/0.08) 0%, rgba(255,255,255,0.02) 100%)'
                                                                : 'var(--bg-content)'
                                                            : 'var(--bg-overlay)',
                                                        opacity: cell ? 1 : 0.74,
                                                    }}
                                                >
                                                    {!cell ? (
                                                        <div style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.8rem' }}>No lane</div>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                                                                <span style={{ fontSize: '1.2rem', fontWeight: 850, color: 'var(--text-main)' }}>{cell.total}</span>
                                                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)' }}>lanes</span>
                                                            </div>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                                                                {cell.live ? <MiniCountBadge label={`Live ${cell.live}`} color="#047857" /> : null}
                                                                {cell.testing ? <MiniCountBadge label={`Test ${cell.testing}`} color="#2563eb" /> : null}
                                                                {cell.failed ? <MiniCountBadge label={`Fail ${cell.failed}`} color="#b91c1c" /> : null}
                                                            </div>
                                                        </div>
                                                    )}
                                                </SafeButton>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </SurfaceCard>

            <SurfaceCard radius="1.35rem" style={{ ...createCampTestPanelStyle('#14b8a6'), display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 850, color: 'var(--text-main)' }}>Lane Breakdown</h2>
                        <p style={{ margin: '0.2rem 0 0', color: 'var(--text-dim)', fontSize: '0.84rem', fontWeight: 600 }}>
                            {selectedCellMeta
                                ? `${selectedCellMeta.sourceMarket} -> ${formatSlug(selectedCellMeta.destinationCountry)}`
                                : 'All filtered lanes'}
                        </p>
                    </div>
                    <SafeButton
                        onClick={openTestingCreate}
                        style={{
                            borderRadius: '12px',
                            border: '1px solid hsl(var(--primary))',
                            background: 'hsla(var(--primary) / 0.08)',
                            color: 'hsl(var(--primary))',
                            fontWeight: 800,
                            padding: '0.7rem 0.95rem',
                        }}
                    >
                        Create Lane
                    </SafeButton>
                </div>

                {trackErrorMessage ? (
                    <InlineErrorState
                        title="Lane breakdown unavailable"
                        message="Fix the coverage data query first, then the grouped lane list will populate normally."
                    />
                ) : groupedByPlatform.length === 0 ? (
                    <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-dim)', fontWeight: 700 }}>No lanes match the current view.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {groupedByPlatform.map((group) => (
                            <div key={group.platformId} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                <div style={{ fontSize: '0.92rem', fontWeight: 850, color: 'var(--text-main)' }}>{group.label}</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.8rem' }}>
                                    {group.tracks.map((track) => {
                                        return (
                                            <TrackLaneCard
                                                key={track.id}
                                                track={track}
                                                mode="next_action"
                                                onClick={() => navigate(`/camp-tracking/testing?track=${track.id}`)}
                                                action={(
                                                    <SafeButton
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            openTestingEdit(track);
                                                        }}
                                                        style={{
                                                            borderRadius: '10px',
                                                            border: `1px solid ${getTrackAccent(track)}22`,
                                                            background: 'var(--bg-overlay)',
                                                            color: 'var(--text-main)',
                                                            fontWeight: 800,
                                                            padding: '0.42rem 0.68rem',
                                                        }}
                                                    >
                                                        Edit
                                                    </SafeButton>
                                                )}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </SurfaceCard>

            <SurfaceCard radius="1.35rem" style={{ ...createCampTestPanelStyle('#7c3aed'), display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 850, color: 'var(--text-main)' }}>Market-Only Lanes</h2>
                    <p style={{ margin: '0.2rem 0 0', color: 'var(--text-dim)', fontSize: '0.84rem', fontWeight: 600 }}>
                        Brand or platform-awareness lanes that intentionally do not target a destination market.
                    </p>
                </div>

                {trackErrorMessage ? (
                    <InlineErrorState
                        title="Market-only lanes unavailable"
                        message="Fix the coverage data query first, then the market-only lane section will populate normally."
                    />
                ) : marketOnlyTracks.length === 0 ? (
                    <div style={{ padding: '2.6rem 0', textAlign: 'center', color: 'var(--text-dim)', fontWeight: 700 }}>No market-only lanes match the current filters.</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.8rem' }}>
                        {marketOnlyTracks.map((track) => (
                            <TrackLaneCard
                                key={track.id}
                                track={track}
                                mode="next_action"
                                onClick={() => navigate(`/camp-tracking/testing?track=${track.id}`)}
                                action={(
                                    <SafeButton
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            openTestingEdit(track);
                                        }}
                                        style={{
                                            borderRadius: '10px',
                                            border: `1px solid ${getTrackAccent(track)}22`,
                                            background: 'var(--bg-overlay)',
                                            color: 'var(--text-main)',
                                            fontWeight: 800,
                                            padding: '0.42rem 0.68rem',
                                        }}
                                    >
                                        Edit
                                    </SafeButton>
                                )}
                            />
                        ))}
                    </div>
                )}
            </SurfaceCard>
        </div>
    );
}

function InlineErrorState({
    title,
    message,
}: {
    title: string;
    message: string;
}) {
    return (
        <div style={{
            padding: '2.8rem 1rem',
            textAlign: 'center',
            borderRadius: '18px',
            border: '1px solid rgba(239, 68, 68, 0.14)',
            background: 'rgba(239, 68, 68, 0.05)',
        }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '12px', background: '#fff', color: '#b91c1c' }}>
                <AlertTriangle size={18} />
            </div>
            <div style={{ marginTop: '0.8rem', color: 'var(--text-main)', fontWeight: 800 }}>{title}</div>
            <div style={{ marginTop: '0.35rem', color: 'var(--text-dim)', fontWeight: 650, lineHeight: 1.5 }}>{message}</div>
        </div>
    );
}

function FilterSelect({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<[string, string]>;
}) {
    const isPlaceholder = value === 'all';
    return (
        <div className="camp-test-filter-group">
            <div className="camp-test-filter-label">
                {label}
            </div>
            <select
                className="camp-test-filter-control"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                style={{
                    color: isPlaceholder ? 'var(--text-muted)' : 'var(--text-main)',
                    fontWeight: isPlaceholder ? 600 : 700,
                }}
            >
                {options.map(([optionValue, optionLabel]) => (
                    <option key={optionValue} value={optionValue}>
                        {optionLabel}
                    </option>
                ))}
            </select>
        </div>
    );
}

function MetricPill({ label, value, tone }: { label: string; value: number; tone: 'green' | 'blue' | 'red' | 'teal' | 'slate' | 'amber' | 'emerald' | 'violet' }) {
    const tones = {
        green: { bg: 'rgba(16, 185, 129, 0.06)', border: 'rgba(16, 185, 129, 0.14)', color: '#047857' },
        blue: { bg: 'rgba(37, 99, 235, 0.06)', border: 'rgba(37, 99, 235, 0.14)', color: '#2563eb' },
        red: { bg: 'rgba(239, 68, 68, 0.06)', border: 'rgba(239, 68, 68, 0.14)', color: '#b91c1c' },
        teal: { bg: 'rgba(15, 118, 110, 0.06)', border: 'rgba(15, 118, 110, 0.14)', color: '#0f766e' },
        slate: { bg: 'rgba(71, 85, 105, 0.06)', border: 'rgba(71, 85, 105, 0.14)', color: '#475569' },
        amber: { bg: 'rgba(245, 158, 11, 0.06)', border: 'rgba(245, 158, 11, 0.14)', color: '#b45309' },
        emerald: { bg: 'rgba(5, 150, 105, 0.06)', border: 'rgba(5, 150, 105, 0.14)', color: '#047857' },
        violet: { bg: 'rgba(124, 58, 237, 0.06)', border: 'rgba(124, 58, 237, 0.14)', color: '#7c3aed' },
    } as const;

    const styleDef = tones[tone];
    return (
        <FilterChip
            active={false}
            onClick={() => {}}
            activeBackground="transparent"
            inactiveBackground={styleDef.bg}
            activeBorder="transparent"
            inactiveBorder={styleDef.border}
            activeColor={styleDef.color}
            inactiveColor={styleDef.color}
            style={{ cursor: 'default' }}
        >
            {label}: {value}
        </FilterChip>
    );
}
