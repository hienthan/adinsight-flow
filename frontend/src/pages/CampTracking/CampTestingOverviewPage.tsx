import { useDeferredValue, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, BarChart3, RefreshCw, Search, Sparkles } from 'lucide-react';
import { FilterChip, SafeButton, SurfaceCard, ToolbarGroup, createAmbientSurface, toAlphaColor } from '../../components/common/ui';
import type { CampaignTestTrack } from '../../types/campaign';
import {
    filterTracks,
    formatPlatformFamily,
    formatSlug,
    getPlatformFamilyKey,
    getQueryErrorMessage,
    useCampaignTestTracks,
} from './campaignTestTrackingShared';
import {
    CAMP_TEST_FILTER_SHELL_STYLE,
    CAMP_TEST_PAGE_BACKGROUND,
    CAMP_TEST_SUMMARY_SHELL_STYLE,
    CAMP_TEST_THEME_CLASS,
    CAMP_TEST_THEME_CSS,
    createCampTestPanelStyle,
} from './campTestTrackingTheme';
import { MiniBadge, TrackLaneCard } from './campTestTrackingComponents';

type FamilySummary = {
    key: string;
    label: string;
    accent: string;
    tracks: CampaignTestTrack[];
};

type MarketSummary = {
    market: string;
    total: number;
    live: number;
    testing: number;
    failed: number;
    watching: number;
    destinations: string[];
    topics: string[];
};

type TopicSummary = {
    topic: string;
    total: number;
    live: number;
    testing: number;
    failed: number;
    watching: number;
    markets: string[];
};

export default function CampTestingOverviewPage() {
    const navigate = useNavigate();
    const tracksQuery = useCampaignTestTracks();
    const tracks = tracksQuery.data || [];

    const [familyFilter, setFamilyFilter] = useState('all');
    const [sourceMarketFilter, setSourceMarketFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [topicFilter, setTopicFilter] = useState('all');
    const [search, setSearch] = useState('');
    const deferredSearch = useDeferredValue(search);

    const familyOptions = useMemo(() => {
        const map = new Map<string, string>();
        tracks.forEach((track) => map.set(getPlatformFamilyKey(track), formatPlatformFamily(track)));
        return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
    }, [tracks]);

    const sourceMarketOptions = useMemo(() => Array.from(new Set(tracks.map((track) => track.source_market))).sort(), [tracks]);
    const topicOptions = useMemo(() => Array.from(new Set(tracks.map((track) => track.pattern_topic))).sort(), [tracks]);

    const filteredTracks = useMemo(() => {
        const base = filterTracks(tracks, {
            platform: 'all',
            sourceMarket: sourceMarketFilter,
            destinationCountry: 'all',
            destinationCity: 'all',
            laneScope: 'all',
            category: 'all',
            patternTopic: topicFilter,
            status: statusFilter,
            result: 'all',
            cookieState: 'all',
            search: deferredSearch,
        });

        if (familyFilter === 'all') return base;
        return base.filter((track) => getPlatformFamilyKey(track) === familyFilter);
    }, [deferredSearch, familyFilter, sourceMarketFilter, statusFilter, topicFilter, tracks]);

    const globalSummary = useMemo(() => {
        const sourceMarkets = new Set<string>();
        const families = new Set<string>();
        let live = 0;
        let testing = 0;
        let failed = 0;
        let watching = 0;
        let marketOnly = 0;
        let doNotRetest = 0;

        filteredTracks.forEach((track) => {
            families.add(getPlatformFamilyKey(track));
            sourceMarkets.add(track.source_market);
            if (track.status === 'live') live += 1;
            if (track.status === 'testing') testing += 1;
            if (track.status === 'failed') failed += 1;
            if (track.status === 'watching') watching += 1;
            if (track.lane_scope === 'market_only') marketOnly += 1;
            if (track.do_not_retest) doNotRetest += 1;
        });

        return {
            families: families.size,
            markets: sourceMarkets.size,
            live,
            testing,
            failed,
            watching,
            marketOnly,
            doNotRetest,
        };
    }, [filteredTracks]);

    const familyGroups = useMemo<FamilySummary[]>(() => {
        const map = new Map<string, FamilySummary>();
        filteredTracks.forEach((track) => {
            const key = getPlatformFamilyKey(track);
            const current = map.get(key) || {
                key,
                label: formatPlatformFamily(track),
                accent: track.expand?.platform?.color || '#3b82f6',
                tracks: [],
            };
            current.tracks.push(track);
            map.set(key, current);
        });

        return Array.from(map.values())
            .map((group) => ({
                ...group,
                tracks: [...group.tracks].sort((a, b) => a.title.localeCompare(b.title)),
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [filteredTracks]);

    const trackErrorMessage = tracksQuery.error
        ? getQueryErrorMessage(tracksQuery.error, 'The testing overview query failed before the dashboard could load.')
        : null;

    return (
        <div className={`page-container ${CAMP_TEST_THEME_CLASS}`} style={{ ...CAMP_TEST_PAGE_BACKGROUND, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <style>{CAMP_TEST_THEME_CSS}</style>

            <SurfaceCard
                radius="1.5rem"
                style={{
                    ...createAmbientSurface('#2563eb', 0.34),
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
                        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.18) 0%, rgba(14, 165, 233, 0.12) 100%)',
                        color: '#2563eb',
                    }}>
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 850, letterSpacing: '-0.03em', color: 'var(--text-main)' }}>
                            Testing Overview
                        </h1>
                        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-dim)', fontWeight: 600 }}>
                            Scan each platform family at a glance before drilling into lane-level detail.
                        </p>
                    </div>
                </div>

                <ToolbarGroup compact style={{ marginLeft: 'auto' }}>
                    <SafeButton
                        onClick={() => navigate('/camp-tracking/coverage')}
                        className="hero-btn hero-btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 0.8rem' }}
                    >
                        <BarChart3 size={15} />
                        Coverage Detail
                    </SafeButton>
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
                <InlineErrorState
                    title="Testing overview failed to load"
                    message={trackErrorMessage}
                />
            ) : null}

            <SurfaceCard
                radius="1.3rem"
                variant="soft"
                style={{
                    ...CAMP_TEST_FILTER_SHELL_STYLE,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.8rem',
                    alignItems: 'flex-end',
                }}
            >
                <div style={{ minWidth: '260px', flex: '1 1 320px' }}>
                    <div className="camp-test-filter-label">Search</div>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                        <input
                            className="camp-test-filter-control"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Platform family, market, topic, notes..."
                            style={{ width: '100%', paddingLeft: '2.45rem' }}
                        />
                    </div>
                </div>

                <FilterSelect label="Platform Family" value={familyFilter} onChange={setFamilyFilter} options={[['all', 'All Families'], ...familyOptions]} />
                <FilterSelect label="Source Market" value={sourceMarketFilter} onChange={setSourceMarketFilter} options={[['all', 'All Markets'], ...sourceMarketOptions.map((value) => [value, value] as [string, string])]} />
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
                <FilterSelect label="Topic" value={topicFilter} onChange={setTopicFilter} options={[['all', 'All Topics'], ...topicOptions.map((value) => [value, formatSlug(value)] as [string, string])]} />
            </SurfaceCard>

            <SurfaceCard
                radius="1.35rem"
                style={{
                    ...CAMP_TEST_SUMMARY_SHELL_STYLE,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.65rem',
                    alignItems: 'center',
                }}
            >
                <MetricPill label="Families" value={globalSummary.families} tone="slate" />
                <MetricPill label="Markets" value={globalSummary.markets} tone="amber" />
                <MetricPill label="Live" value={globalSummary.live} tone="green" />
                <MetricPill label="Testing" value={globalSummary.testing} tone="blue" />
                <MetricPill label="Watching" value={globalSummary.watching} tone="violet" />
                <MetricPill label="Failed" value={globalSummary.failed} tone="red" />
                <MetricPill label="Market-Only" value={globalSummary.marketOnly} tone="teal" />
                <MetricPill label="Do Not Retest" value={globalSummary.doNotRetest} tone="rose" />
            </SurfaceCard>

            {tracksQuery.isLoading ? (
                <SurfaceCard radius="1.35rem" style={{ ...createCampTestPanelStyle('#2563eb'), padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-dim)', fontWeight: 700 }}>
                    Loading testing overview...
                </SurfaceCard>
            ) : familyGroups.length === 0 ? (
                <SurfaceCard radius="1.35rem" style={{ ...createCampTestPanelStyle('#2563eb'), padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-dim)', fontWeight: 700 }}>
                    No testing lanes match the current filters.
                </SurfaceCard>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {familyGroups.map((family) => (
                        <PlatformFamilyBlock key={family.key} family={family} onOpenTrack={(trackId) => navigate(`/camp-tracking/testing?track=${trackId}`)} />
                    ))}
                </div>
            )}
        </div>
    );
}

function PlatformFamilyBlock({
    family,
    onOpenTrack,
}: {
    family: FamilySummary;
    onOpenTrack: (trackId: string) => void;
}) {
    const summary = useMemo(() => {
        const destinations = new Set<string>();
        const topics = new Set<string>();
        const markets = new Set<string>();
        let live = 0;
        let testing = 0;
        let failed = 0;
        let watching = 0;
        let marketOnly = 0;
        let doNotRetest = 0;

        family.tracks.forEach((track) => {
            markets.add(track.source_market);
            topics.add(track.pattern_topic);
            if (track.destination_country) destinations.add(track.destination_country);
            if (track.status === 'live') live += 1;
            if (track.status === 'testing') testing += 1;
            if (track.status === 'failed') failed += 1;
            if (track.status === 'watching') watching += 1;
            if (track.lane_scope === 'market_only') marketOnly += 1;
            if (track.do_not_retest) doNotRetest += 1;
        });

        return {
            live,
            testing,
            failed,
            watching,
            marketOnly,
            doNotRetest,
            destinationCount: destinations.size,
            topicCount: topics.size,
            markets: Array.from(markets).sort(),
        };
    }, [family.tracks]);

    const marketRows = useMemo<MarketSummary[]>(() => {
        const map = new Map<string, MarketSummary>();
        family.tracks.forEach((track) => {
            const current = map.get(track.source_market) || {
                market: track.source_market,
                total: 0,
                live: 0,
                testing: 0,
                failed: 0,
                watching: 0,
                destinations: [],
                topics: [],
            };

            current.total += 1;
            if (track.status === 'live') current.live += 1;
            if (track.status === 'testing') current.testing += 1;
            if (track.status === 'failed') current.failed += 1;
            if (track.status === 'watching') current.watching += 1;
            if (track.destination_country && !current.destinations.includes(track.destination_country)) current.destinations.push(track.destination_country);
            if (!current.topics.includes(track.pattern_topic)) current.topics.push(track.pattern_topic);
            map.set(track.source_market, current);
        });

        return Array.from(map.values()).sort((a, b) => b.total - a.total || a.market.localeCompare(b.market));
    }, [family.tracks]);

    const topicRows = useMemo<TopicSummary[]>(() => {
        const map = new Map<string, TopicSummary>();
        family.tracks.forEach((track) => {
            const current = map.get(track.pattern_topic) || {
                topic: track.pattern_topic,
                total: 0,
                live: 0,
                testing: 0,
                failed: 0,
                watching: 0,
                markets: [],
            };
            current.total += 1;
            if (track.status === 'live') current.live += 1;
            if (track.status === 'testing') current.testing += 1;
            if (track.status === 'failed') current.failed += 1;
            if (track.status === 'watching') current.watching += 1;
            if (!current.markets.includes(track.source_market)) current.markets.push(track.source_market);
            map.set(track.pattern_topic, current);
        });

        return Array.from(map.values()).sort((a, b) => b.total - a.total || a.topic.localeCompare(b.topic));
    }, [family.tracks]);

    const failureMemory = useMemo(
        () => family.tracks
            .filter((track) => track.status === 'failed' || track.do_not_retest)
            .sort((a, b) => (b.last_state_changed_at || b.last_reviewed_at || b.updated || '').localeCompare(a.last_state_changed_at || a.last_reviewed_at || a.updated || ''))
            .slice(0, 3),
        [family.tracks],
    );

    const marketOnlyTracks = useMemo(
        () => family.tracks.filter((track) => track.lane_scope === 'market_only').slice(0, 3),
        [family.tracks],
    );

    const recentTracks = useMemo(
        () => [...family.tracks]
            .sort((a, b) => (b.last_state_changed_at || b.last_reviewed_at || b.updated || '').localeCompare(a.last_state_changed_at || a.last_reviewed_at || a.updated || ''))
            .slice(0, 3),
        [family.tracks],
    );

    return (
        <SurfaceCard
            radius="1.4rem"
            style={{
                ...createCampTestPanelStyle(family.accent),
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', flexWrap: 'wrap' }}>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 850, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
                            {family.label}
                        </h2>
                        <MiniBadge accent={family.accent}>{summary.markets.length} markets</MiniBadge>
                        <MiniBadge accent="#0f766e">{summary.destinationCount} destinations</MiniBadge>
                        <MiniBadge accent="#7c3aed">{summary.topicCount} topics</MiniBadge>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.7rem' }}>
                        {summary.markets.map((market) => (
                            <MiniBadge key={market}>{market}</MiniBadge>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', justifyContent: 'flex-end' }}>
                    <MiniSummaryBadge label="Live" value={summary.live} color="#047857" />
                    <MiniSummaryBadge label="Testing" value={summary.testing} color="#2563eb" />
                    <MiniSummaryBadge label="Watching" value={summary.watching} color="#7c3aed" />
                    <MiniSummaryBadge label="Failed" value={summary.failed} color="#b91c1c" />
                    <MiniSummaryBadge label="Market-only" value={summary.marketOnly} color="#0f766e" />
                    <MiniSummaryBadge label="No retest" value={summary.doNotRetest} color="#be185d" />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr) minmax(0, 1fr)', gap: '0.9rem' }}>
                <SectionShell title="By Market" subtitle="Where this platform family is currently active.">
                    <div style={{ display: 'grid', gap: '0.65rem' }}>
                        {marketRows.slice(0, 5).map((row) => (
                            <div key={row.market} style={{
                                borderRadius: '16px',
                                border: `1px solid ${toAlphaColor(family.accent, 0.14)}`,
                                background: toAlphaColor(family.accent, 0.04),
                                padding: '0.85rem 0.9rem',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}>
                                    <div style={{ fontWeight: 850, color: 'var(--text-main)' }}>{row.market}</div>
                                    <MiniBadge accent={family.accent}>{row.total} lanes</MiniBadge>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.55rem' }}>
                                    {row.live ? <StatusCount label={`Live ${row.live}`} color="#047857" /> : null}
                                    {row.testing ? <StatusCount label={`Testing ${row.testing}`} color="#2563eb" /> : null}
                                    {row.watching ? <StatusCount label={`Watching ${row.watching}`} color="#7c3aed" /> : null}
                                    {row.failed ? <StatusCount label={`Failed ${row.failed}`} color="#b91c1c" /> : null}
                                </div>
                                <div style={{ marginTop: '0.6rem', color: 'var(--text-dim)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                                    Destinations: {row.destinations.length ? row.destinations.slice(0, 3).map(formatSlug).join(', ') : 'Market-only'}
                                </div>
                                <div style={{ marginTop: '0.2rem', color: 'var(--text-dim)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                                    Topics: {row.topics.slice(0, 3).map(formatSlug).join(', ')}
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionShell>

                <SectionShell title="Topic Health" subtitle="What this platform family is testing hardest right now.">
                    <div style={{ display: 'grid', gap: '0.65rem' }}>
                        {topicRows.slice(0, 5).map((row) => (
                            <div key={row.topic} style={{
                                borderRadius: '16px',
                                border: `1px solid ${toAlphaColor(family.accent, 0.14)}`,
                                background: toAlphaColor(family.accent, 0.04),
                                padding: '0.85rem 0.9rem',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}>
                                    <div style={{ fontWeight: 850, color: 'var(--text-main)' }}>{formatSlug(row.topic)}</div>
                                    <MiniBadge accent={family.accent}>{row.total}</MiniBadge>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.55rem' }}>
                                    {row.live ? <StatusCount label={`Live ${row.live}`} color="#047857" /> : null}
                                    {row.testing ? <StatusCount label={`Testing ${row.testing}`} color="#2563eb" /> : null}
                                    {row.watching ? <StatusCount label={`Watching ${row.watching}`} color="#7c3aed" /> : null}
                                    {row.failed ? <StatusCount label={`Failed ${row.failed}`} color="#b91c1c" /> : null}
                                </div>
                                <div style={{ marginTop: '0.6rem', color: 'var(--text-dim)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                                    Markets: {row.markets.map(formatSlug).join(', ')}
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionShell>

                <SectionShell title="Failure Memory" subtitle="What this platform family should avoid repeating.">
                    {failureMemory.length === 0 ? (
                        <EmptySection message="No failed or do-not-retest lanes in the current view." />
                    ) : (
                        <div style={{ display: 'grid', gap: '0.7rem' }}>
                            {failureMemory.map((track) => (
                                <TrackLaneCard
                                    key={track.id}
                                    track={track}
                                    onClick={() => onOpenTrack(track.id)}
                                />
                            ))}
                        </div>
                    )}
                </SectionShell>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '0.9rem' }}>
                <SectionShell title="Market-Only Lanes" subtitle="Brand or platform-awareness tests with no destination market.">
                    {marketOnlyTracks.length === 0 ? (
                        <EmptySection message="No market-only lanes in the current view." />
                    ) : (
                        <div style={{ display: 'grid', gap: '0.7rem' }}>
                            {marketOnlyTracks.map((track) => (
                                <TrackLaneCard
                                    key={track.id}
                                    track={track}
                                    onClick={() => onOpenTrack(track.id)}
                                />
                            ))}
                        </div>
                    )}
                </SectionShell>

                <SectionShell title="Recent Focus" subtitle="Most recently reviewed or changed lanes.">
                    <div style={{ display: 'grid', gap: '0.7rem' }}>
                        {recentTracks.map((track) => (
                            <TrackLaneCard
                                key={track.id}
                                track={track}
                                mode="next_action"
                                onClick={() => onOpenTrack(track.id)}
                            />
                        ))}
                    </div>
                </SectionShell>
            </div>
        </SurfaceCard>
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
            <div className="camp-test-filter-label">{label}</div>
            <select
                className="camp-test-filter-control"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                style={{ color: isPlaceholder ? 'var(--text-muted)' : 'var(--text-main)', fontWeight: isPlaceholder ? 600 : 700 }}
            >
                {options.map(([optionValue, optionLabel]) => (
                    <option key={optionValue} value={optionValue}>{optionLabel}</option>
                ))}
            </select>
        </div>
    );
}

function MetricPill({ label, value, tone }: { label: string; value: number; tone: 'green' | 'blue' | 'red' | 'violet' | 'teal' | 'slate' | 'amber' | 'rose' }) {
    const tones = {
        green: { bg: 'rgba(16, 185, 129, 0.06)', border: 'rgba(16, 185, 129, 0.14)', color: '#047857' },
        blue: { bg: 'rgba(37, 99, 235, 0.06)', border: 'rgba(37, 99, 235, 0.14)', color: '#2563eb' },
        red: { bg: 'rgba(239, 68, 68, 0.06)', border: 'rgba(239, 68, 68, 0.14)', color: '#b91c1c' },
        violet: { bg: 'rgba(124, 58, 237, 0.06)', border: 'rgba(124, 58, 237, 0.14)', color: '#7c3aed' },
        teal: { bg: 'rgba(15, 118, 110, 0.06)', border: 'rgba(15, 118, 110, 0.14)', color: '#0f766e' },
        slate: { bg: 'rgba(71, 85, 105, 0.06)', border: 'rgba(71, 85, 105, 0.14)', color: '#475569' },
        amber: { bg: 'rgba(245, 158, 11, 0.06)', border: 'rgba(245, 158, 11, 0.14)', color: '#b45309' },
        rose: { bg: 'rgba(190, 24, 93, 0.06)', border: 'rgba(190, 24, 93, 0.14)', color: '#be185d' },
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

function MiniSummaryBadge({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.32rem',
            padding: '0.32rem 0.62rem',
            borderRadius: '999px',
            background: toAlphaColor(color, 0.08),
            border: `1px solid ${toAlphaColor(color, 0.16)}`,
            color,
            fontSize: '0.72rem',
            fontWeight: 850,
        }}>
            {label}: {value}
        </span>
    );
}

function StatusCount({ label, color }: { label: string; color: string }) {
    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.24rem 0.5rem',
            borderRadius: '999px',
            background: toAlphaColor(color, 0.08),
            border: `1px solid ${toAlphaColor(color, 0.16)}`,
            color,
            fontSize: '0.7rem',
            fontWeight: 800,
        }}>
            {label}
        </span>
    );
}

function SectionShell({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle: string;
    children: React.ReactNode;
}) {
    return (
        <SurfaceCard
            variant="inset"
            radius="1.1rem"
            style={{
                border: '1px solid color-mix(in srgb, var(--border-subtle) 62%, rgba(59, 130, 246, 0.18) 38%)',
                background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 97%, white 3%) 0%, color-mix(in srgb, var(--bg-content) 91%, var(--bg-main) 9%) 100%)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.8rem',
            }}
        >
            <div>
                <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {title}
                </div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.84rem', fontWeight: 600, marginTop: '0.22rem', lineHeight: 1.5 }}>
                    {subtitle}
                </div>
            </div>
            {children}
        </SurfaceCard>
    );
}

function EmptySection({ message }: { message: string }) {
    return (
        <div style={{
            padding: '2rem 1rem',
            borderRadius: '16px',
            border: '1px dashed var(--border-subtle)',
            background: 'var(--bg-overlay)',
            color: 'var(--text-dim)',
            fontWeight: 650,
            textAlign: 'center',
        }}>
            {message}
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
        <SurfaceCard
            radius="1.2rem"
            variant="soft"
            style={{
                border: '1px solid rgba(239, 68, 68, 0.18)',
                background: 'rgba(239, 68, 68, 0.08)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.8rem',
            }}
        >
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
            <div>
                <div style={{ fontSize: '0.98rem', fontWeight: 850, color: 'var(--text-main)' }}>{title}</div>
                <div style={{ marginTop: '0.35rem', color: '#b91c1c', fontWeight: 700, lineHeight: 1.5 }}>{message}</div>
            </div>
        </SurfaceCard>
    );
}
