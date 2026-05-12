import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Beaker, Flag, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateForInput, pb } from '../../lib/pocketbase';
import { prepareNoteHtmlForRender } from '../../lib/noteHtml';
import type { Campaign, CampaignPlatform, CampaignTestTrack } from '../../types/campaign';
import { FilterChip, SafeButton, SurfaceCard, ToolbarGroup, createAmbientSurface } from '../../components/common/ui';
import {
    filterTracks,
    formatDestination,
    formatPlatform,
    formatSlug,
    getQueryErrorMessage,
    sortTracks,
    TEST_TYPE_LABELS,
    useCampaignTestTracks,
    useCampaignTestUpdates,
    useTrackSummary,
} from './campaignTestTrackingShared';
import {
    DetailSection,
    DetailStat,
    getTrackAccent,
    LinkedCampaignButton,
    MiniBadge,
    TrackDetailHero,
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
import CampTestTrackModal from './CampTestTrackModal';
import CampTestUpdateModal from './CampTestUpdateModal';

export default function CampTestTrackingPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [platformFilter, setPlatformFilter] = useState('all');
    const [sourceMarketFilter, setSourceMarketFilter] = useState('all');
    const [destinationCountryFilter, setDestinationCountryFilter] = useState('all');
    const [destinationCityFilter, setDestinationCityFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [patternTopicFilter, setPatternTopicFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [resultFilter, setResultFilter] = useState('all');
    const [cookieFilter, setCookieFilter] = useState('all');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [quickFocus, setQuickFocus] = useState<'all' | 'testing' | 'failed' | 'cookie_on' | 'do_not_retest'>('all');
    const [modalState, setModalState] = useState<{ mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; track: CampaignTestTrack }>({ mode: 'closed' });
    const [updateModalState, setUpdateModalState] = useState<{ mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; updateId: string }>({ mode: 'closed' });
    const deferredSearch = useDeferredValue(search);

    const tracksQuery = useCampaignTestTracks();
    const updatesQuery = useCampaignTestUpdates();
    const platformsQuery = useQuery<CampaignPlatform[]>({
        queryKey: ['campaign-platforms', 'camp-test-tracking'],
        queryFn: async () => pb.collection('campaign_platforms').getFullList<CampaignPlatform>({
            sort: 'order,display_name',
            fields: 'id,display_name,platform_name,color,order,created,updated',
        }),
        retry: false,
    });
    const campaignsQuery = useQuery<Campaign[]>({
        queryKey: ['campaigns', 'camp-test-tracking'],
        queryFn: async () => pb.collection('campaigns').getFullList<Campaign>({
            sort: 'name',
            fields: 'id,name,platform,status,priority,created,updated,created_date,is_dsa',
        }),
        retry: false,
    });
    const upsertTrackMutation = useMutation({
        mutationFn: async ({
            id,
            payload,
        }: {
            id?: string;
            payload: Record<string, unknown>;
        }) => {
            if (id) {
                return pb.collection('campaign_test_tracks').update<CampaignTestTrack>(id, payload);
            }
            return pb.collection('campaign_test_tracks').create<CampaignTestTrack>(payload);
        },
        onSuccess: async (record) => {
            toast.success(modalState.mode === 'edit' ? 'Lane updated' : 'Lane created');
            await queryClient.invalidateQueries({ queryKey: ['campaign-test-tracks'] });
            setSelectedId(record.id);
            setModalState({ mode: 'closed' });
            clearModalQueryParams();
        },
        onError: (error: unknown) => {
            toast.error(error instanceof Error ? error.message : 'Failed to save lane.');
        },
    });
    const upsertUpdateMutation = useMutation({
        mutationFn: async ({
            id,
            payload,
        }: {
            id?: string;
            payload: Record<string, unknown>;
        }) => {
            if (id) {
                return pb.collection('campaign_test_updates').update(id, payload);
            }
            return pb.collection('campaign_test_updates').create(payload);
        },
        onSuccess: async () => {
            toast.success(updateModalState.mode === 'edit' ? 'Timeline update saved' : 'Timeline update added');
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['campaign-test-updates'] }),
                queryClient.invalidateQueries({ queryKey: ['campaign-test-tracks'] }),
            ]);
            setUpdateModalState({ mode: 'closed' });
        },
        onError: (error: unknown) => {
            toast.error(error instanceof Error ? error.message : 'Failed to save timeline update.');
        },
    });

    const sortedTracks = useMemo(() => sortTracks(tracksQuery.data || []), [tracksQuery.data]);
    const requestedTrackId = searchParams.get('track');
    const requestedModal = searchParams.get('modal');
    const createSeed = useMemo(() => ({
        platform: searchParams.get('platform') || '',
        lane_scope: (searchParams.get('laneScope') as CampaignTestTrack['lane_scope'] | null) || 'destination',
        source_market: searchParams.get('sourceMarket') || 'US',
        destination_country: searchParams.get('destinationCountry') || '',
        destination_city: searchParams.get('destinationCity') || '',
        pattern_topic: searchParams.get('patternTopic') || '',
        category: searchParams.get('category') || '',
    }), [searchParams]);

    const clearModalQueryParams = () => {
        const next = new URLSearchParams(searchParams);
        ['modal', 'platform', 'laneScope', 'sourceMarket', 'destinationCountry', 'destinationCity', 'patternTopic', 'category'].forEach((key) => next.delete(key));
        setSearchParams(next, { replace: true });
    };

    useEffect(() => {
        if (requestedTrackId && sortedTracks.some((track) => track.id === requestedTrackId) && selectedId !== requestedTrackId) {
            setSelectedId(requestedTrackId);
            return;
        }
        if (!selectedId && sortedTracks.length > 0) setSelectedId(sortedTracks[0].id);
        if (selectedId && sortedTracks.length > 0 && !sortedTracks.some((track) => track.id === selectedId)) {
            setSelectedId(sortedTracks[0].id);
        }
    }, [requestedTrackId, selectedId, sortedTracks]);

    useEffect(() => {
        if (requestedModal === 'create') {
            setModalState({ mode: 'create' });
            return;
        }
        if (requestedModal === 'edit' && requestedTrackId) {
            const track = sortedTracks.find((item) => item.id === requestedTrackId);
            if (track) setModalState({ mode: 'edit', track });
        }
    }, [requestedModal, requestedTrackId, sortedTracks]);

    const platformOptions = useMemo(() => {
        const map = new Map<string, string>();
        sortedTracks.forEach((track) => map.set(track.platform, formatPlatform(track)));
        return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
    }, [sortedTracks]);

    const sourceMarketOptions = useMemo(
        () => Array.from(new Set(sortedTracks.map((track) => track.source_market))).sort(),
        [sortedTracks],
    );
    const destinationCountryOptions = useMemo(
        () => Array.from(new Set(sortedTracks.map((track) => track.destination_country || '').filter(Boolean))).sort(),
        [sortedTracks],
    );
    const destinationCityOptions = useMemo(
        () => Array.from(new Set(sortedTracks.map((track) => track.destination_city || '').filter(Boolean))).sort(),
        [sortedTracks],
    );
    const categoryOptions = useMemo(
        () => Array.from(new Set(sortedTracks.map((track) => track.category || '').filter(Boolean))).sort(),
        [sortedTracks],
    );
    const patternTopicOptions = useMemo(
        () => Array.from(new Set(sortedTracks.map((track) => track.pattern_topic))).sort(),
        [sortedTracks],
    );

    const baseFilteredTracks = useMemo(() => filterTracks(sortedTracks, {
        platform: platformFilter,
        sourceMarket: sourceMarketFilter,
        destinationCountry: destinationCountryFilter,
        destinationCity: destinationCityFilter,
        laneScope: 'all',
        category: categoryFilter,
        patternTopic: patternTopicFilter,
        status: statusFilter,
        result: resultFilter,
        cookieState: cookieFilter,
        search: deferredSearch,
    }), [
        categoryFilter,
        cookieFilter,
        deferredSearch,
        destinationCityFilter,
        destinationCountryFilter,
        patternTopicFilter,
        platformFilter,
        resultFilter,
        sortedTracks,
        sourceMarketFilter,
        statusFilter,
    ]);
    const filteredTracks = useMemo(() => {
        switch (quickFocus) {
            case 'testing':
                return baseFilteredTracks.filter((track) => track.status === 'testing');
            case 'failed':
                return baseFilteredTracks.filter((track) => track.status === 'failed');
            case 'cookie_on':
                return baseFilteredTracks.filter((track) => track.cookie_test_state === 'on');
            case 'do_not_retest':
                return baseFilteredTracks.filter((track) => track.do_not_retest);
            default:
                return baseFilteredTracks;
        }
    }, [baseFilteredTracks, quickFocus]);

    const summary = useTrackSummary(baseFilteredTracks);
    const selectedTrack = filteredTracks.find((track) => track.id === selectedId) || filteredTracks[0] || null;
    const selectedUpdates = useMemo(
        () => (updatesQuery.data || []).filter((update) => update.test_track === selectedTrack?.id),
        [selectedTrack?.id, updatesQuery.data],
    );
    const selectedUpdate = useMemo(
        () => updateModalState.mode === 'edit'
            ? selectedUpdates.find((update) => update.id === updateModalState.updateId) || null
            : null,
        [selectedUpdates, updateModalState],
    );
    const trackDataErrorMessages = useMemo(() => {
        const messages: string[] = [];
        if (tracksQuery.error) messages.push(`Lane records: ${getQueryErrorMessage(tracksQuery.error)}`);
        return messages;
    }, [tracksQuery.error]);
    const supportErrorMessages = useMemo(() => {
        const messages: string[] = [];
        if (updatesQuery.error) messages.push(`Timeline updates: ${getQueryErrorMessage(updatesQuery.error)}`);
        if (platformsQuery.error) messages.push(`Platform options: ${getQueryErrorMessage(platformsQuery.error)}`);
        if (campaignsQuery.error) messages.push(`Campaign options: ${getQueryErrorMessage(campaignsQuery.error)}`);
        return messages;
    }, [campaignsQuery.error, platformsQuery.error, updatesQuery.error]);
    const refreshAll = async () => {
        await Promise.allSettled([
            tracksQuery.refetch(),
            updatesQuery.refetch(),
            platformsQuery.refetch(),
            campaignsQuery.refetch(),
        ]);
    };

    return (
        <div className={`page-container ${CAMP_TEST_THEME_CLASS}`} style={{ ...CAMP_TEST_PAGE_BACKGROUND, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <style>{`
                ${CAMP_TEST_THEME_CSS}
            `}</style>
            <SurfaceCard
                radius="1.5rem"
                style={{
                    ...createAmbientSurface('#7c3aed', 0.34),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                        <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.18) 0%, rgba(59, 130, 246, 0.12) 100%)',
                            color: '#7c3aed',
                        }}>
                            <Beaker size={20} />
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 850, letterSpacing: '-0.03em', color: 'var(--text-main)' }}>
                                Camp Test Tracking
                            </h1>
                            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-dim)', fontWeight: 600 }}>
                                Review lane-level coverage and testing knowledge by market, destination, and topic.
                            </p>
                        </div>
                    </div>
                </div>

                <ToolbarGroup compact style={{ marginLeft: 'auto' }}>
                    <SafeButton
                        onClick={() => {
                            clearModalQueryParams();
                            setModalState({ mode: 'create' });
                        }}
                        className="hero-btn hero-btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 0.8rem' }}
                    >
                        Add Lane
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

            {trackDataErrorMessages.length ? (
                <QueryAlertCard
                    tone="critical"
                    title="Camp Test Tracking data failed to load"
                    messages={trackDataErrorMessages}
                    actionLabel="Retry Data"
                    onAction={refreshAll}
                    isBusy={tracksQuery.isRefetching}
                />
            ) : null}

            {supportErrorMessages.length ? (
                <QueryAlertCard
                    tone="warning"
                    title="Editor options are partially unavailable"
                    messages={supportErrorMessages}
                    description="You can still review lane records, but create/edit flows may be incomplete until these queries recover."
                    actionLabel="Retry Editor Data"
                    onAction={refreshAll}
                    isBusy={platformsQuery.isRefetching || campaignsQuery.isRefetching}
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
                            placeholder="Title, market, destination, topic, notes..."
                            style={{
                                width: '100%',
                                paddingLeft: '2.45rem',
                            }}
                        />
                    </div>
                </div>

                <FilterSelect label="Platform" value={platformFilter} onChange={setPlatformFilter} options={[['all', 'All Platforms'], ...platformOptions]} />
                <FilterSelect label="Source Market" value={sourceMarketFilter} onChange={setSourceMarketFilter} options={[['all', 'All Markets'], ...sourceMarketOptions.map((value) => [value, value] as [string, string])]} />
                <FilterSelect label="Destination" value={destinationCountryFilter} onChange={setDestinationCountryFilter} options={[['all', 'All Countries'], ...destinationCountryOptions.map((value) => [value, formatSlug(value)] as [string, string])]} />
                <FilterSelect label="City" value={destinationCityFilter} onChange={setDestinationCityFilter} options={[['all', 'All Cities'], ...destinationCityOptions.map((value) => [value, formatSlug(value)] as [string, string])]} />
                <FilterSelect label="Topic" value={patternTopicFilter} onChange={setPatternTopicFilter} options={[['all', 'All Topics'], ...patternTopicOptions.map((value) => [value, formatSlug(value)] as [string, string])]} />
                <FilterSelect label="Category" value={categoryFilter} onChange={setCategoryFilter} options={[['all', 'All Categories'], ...categoryOptions.map((value) => [value, formatSlug(value)] as [string, string])]} />
                <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={[
                    ['all', 'All Statuses'],
                    ['testing', 'Testing'],
                    ['live', 'Live'],
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
                <FilterSelect label="Cookie" value={cookieFilter} onChange={setCookieFilter} options={[
                    ['all', 'All States'],
                    ['on', 'On'],
                    ['off', 'Off'],
                    ['mixed', 'Mixed'],
                    ['not_applicable', 'N/A'],
                ]} />
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
                <FilterChip
                    active={false}
                    onClick={() => {}}
                    activeBackground="transparent"
                    inactiveBackground="rgba(16, 185, 129, 0.06)"
                    activeBorder="transparent"
                    inactiveBorder="rgba(16, 185, 129, 0.14)"
                    activeColor="#047857"
                    inactiveColor="#047857"
                    style={{ cursor: 'default' }}
                >
                    Live: {summary.live}
                </FilterChip>
                <FilterChip
                    active={quickFocus === 'testing'}
                    onClick={() => {
                        setQuickFocus((prev) => prev === 'testing' ? 'all' : 'testing');
                    }}
                    activeBackground="hsl(var(--primary))"
                    inactiveBackground="var(--bg-overlay)"
                    activeBorder="hsl(var(--primary))"
                    inactiveBorder="var(--border-subtle)"
                    activeColor="#fff"
                    inactiveColor="var(--text-dim)"
                >
                    Testing: {summary.testing}
                </FilterChip>
                <FilterChip
                    active={quickFocus === 'failed'}
                    onClick={() => {
                        setQuickFocus((prev) => prev === 'failed' ? 'all' : 'failed');
                    }}
                    activeBackground="#b91c1c"
                    inactiveBackground="rgba(239, 68, 68, 0.05)"
                    activeBorder="#ef4444"
                    inactiveBorder="rgba(239, 68, 68, 0.12)"
                    activeColor="#fff"
                    inactiveColor="#b91c1c"
                    indicator={<AlertTriangle size={14} />}
                >
                    Failed: {summary.failed}
                </FilterChip>
                <FilterChip
                    active={quickFocus === 'cookie_on'}
                    onClick={() => {
                        setQuickFocus((prev) => prev === 'cookie_on' ? 'all' : 'cookie_on');
                    }}
                    activeBackground="#0f766e"
                    inactiveBackground="rgba(15, 118, 110, 0.05)"
                    activeBorder="#0f766e"
                    inactiveBorder="rgba(15, 118, 110, 0.14)"
                    activeColor="#fff"
                    inactiveColor="#0f766e"
                >
                    Cookie On: {summary.cookieOn}
                </FilterChip>
                <FilterChip
                    active={quickFocus === 'do_not_retest'}
                    onClick={() => {
                        setQuickFocus((prev) => prev === 'do_not_retest' ? 'all' : 'do_not_retest');
                    }}
                    activeBackground="#475569"
                    inactiveBackground="rgba(71, 85, 105, 0.05)"
                    activeBorder="#475569"
                    inactiveBorder="rgba(71, 85, 105, 0.14)"
                    activeColor="#fff"
                    inactiveColor="#475569"
                    indicator={<Flag size={14} />}
                >
                    Do Not Retest: {summary.doNotRetest}
                </FilterChip>
                <FilterChip
                    active={false}
                    onClick={() => {}}
                    activeBackground="transparent"
                    inactiveBackground="rgba(245, 158, 11, 0.05)"
                    activeBorder="transparent"
                    inactiveBorder="rgba(245, 158, 11, 0.14)"
                    activeColor="#b45309"
                    inactiveColor="#b45309"
                    style={{ cursor: 'default' }}
                >
                    Needs Review: {summary.needsReview}
                </FilterChip>
            </SurfaceCard>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 1.06fr) minmax(380px, 1fr)', gap: '1rem', alignItems: 'start' }}>
                <SurfaceCard
                    radius="1.35rem"
                    style={{
                        ...createCampTestPanelStyle('#3b82f6'),
                        minHeight: '65vh',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.8rem',
                    }}
                >
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 850, color: 'var(--text-main)' }}>Lane Records</h2>
                        <p style={{ margin: '0.2rem 0 0', color: 'var(--text-dim)', fontSize: '0.84rem', fontWeight: 600 }}>
                            {filteredTracks.length} lanes in current view
                        </p>
                    </div>

                    {trackDataErrorMessages.length ? (
                        <InlineQueryState
                            tone="critical"
                            title="Lane records are unavailable"
                            message="The main test tracking data did not load, so this view is paused until the retry succeeds."
                        />
                    ) : tracksQuery.isLoading ? (
                        <div style={{ padding: '5rem 0', textAlign: 'center', color: 'var(--text-dim)', fontWeight: 700 }}>Loading lane records...</div>
                    ) : filteredTracks.length === 0 ? (
                        <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-dim)', fontWeight: 700 }}>No lane records match the current filters.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {filteredTracks.map((track) => {
                                return (
                                    <TrackLaneCard
                                        key={track.id}
                                        track={track}
                                        selected={track.id === selectedTrack?.id}
                                        onClick={() => setSelectedId(track.id)}
                                    />
                                );
                            })}
                        </div>
                    )}
                </SurfaceCard>

                <SurfaceCard
                    radius="1.35rem"
                    style={{
                        ...createCampTestPanelStyle('#14b8a6'),
                        minHeight: '65vh',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                    }}
                >
                    {trackDataErrorMessages.length ? (
                        <InlineQueryState
                            tone="critical"
                            title="Lane details are unavailable"
                            message="Fix the data load error first, then the detail pane and timeline will populate normally."
                        />
                    ) : !selectedTrack ? (
                        <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-dim)', fontWeight: 700 }}>
                            Pick a lane record to inspect details and update history.
                        </div>
                    ) : (
                        <>
                            <TrackDetailHero
                                track={selectedTrack}
                                action={(
                                    <SafeButton
                                        onClick={() => {
                                            clearModalQueryParams();
                                            setModalState({ mode: 'edit', track: selectedTrack });
                                        }}
                                        style={{
                                            borderRadius: '12px',
                                            border: `1px solid rgba(15, 23, 42, 0.08)`,
                                            background: 'var(--bg-overlay)',
                                            color: 'var(--text-main)',
                                            fontWeight: 800,
                                            padding: '0.7rem 0.95rem',
                                        }}
                                    >
                                        Edit Lane
                                    </SafeButton>
                                )}
                            />

                            <DetailSection title="Current State">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}>
                                    <DetailStat label="Status" value={formatSlug(selectedTrack.status)} accent={getTrackAccent(selectedTrack)} />
                                    <DetailStat label="Result" value={selectedTrack.result ? formatSlug(selectedTrack.result) : '-'} accent={getTrackAccent(selectedTrack)} />
                                    <DetailStat label="Cookie" value={formatSlug(selectedTrack.cookie_test_state || 'not_applicable')} accent={getTrackAccent(selectedTrack)} />
                                    <DetailStat label="Type" value={TEST_TYPE_LABELS[selectedTrack.test_type] || formatSlug(selectedTrack.test_type)} accent={getTrackAccent(selectedTrack)} />
                                    <DetailStat label="Scope" value={formatSlug(selectedTrack.lane_scope)} accent={getTrackAccent(selectedTrack)} />
                                    <DetailStat label="Destination" value={formatDestination(selectedTrack)} accent={getTrackAccent(selectedTrack)} />
                                    <DetailStat label="Last Reviewed" value={formatDateForInput(selectedTrack.last_reviewed_at || selectedTrack.updated)} accent={getTrackAccent(selectedTrack)} />
                                </div>
                            </DetailSection>

                            <DetailSection title="Summary Note">
                                <RichHtml value={selectedTrack.summary_note || '<p>No summary note yet.</p>'} />
                            </DetailSection>

                            {selectedTrack.failure_note ? (
                                <DetailSection title="Failure Note">
                                    <RichHtml value={selectedTrack.failure_note} />
                                </DetailSection>
                            ) : null}

                            <DetailSection title="Next Action">
                                <div style={{ color: 'var(--text-main)', fontWeight: 650, lineHeight: 1.55 }}>
                                    {selectedTrack.next_action || 'No next action set yet.'}
                                </div>
                            </DetailSection>

                            <DetailSection title="Linked Campaigns">
                                {selectedTrack.expand?.linked_campaigns?.length ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                                        {selectedTrack.expand.linked_campaigns.map((campaign: Campaign) => (
                                            <LinkedCampaignButton
                                                key={campaign.id}
                                                campaign={campaign}
                                                accent={getTrackAccent(selectedTrack)}
                                                onClick={() => navigate(`/camp-tracking/campaign/${campaign.id}`)}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ color: 'var(--text-dim)', fontWeight: 650 }}>No linked campaigns yet.</div>
                                )}
                            </DetailSection>

                            <DetailSection title="Update Timeline">
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <SafeButton
                                        onClick={() => setUpdateModalState({ mode: 'create' })}
                                        style={{
                                            borderRadius: '12px',
                                            border: '1px solid var(--border-subtle)',
                                            background: 'var(--bg-overlay)',
                                            color: 'var(--text-main)',
                                            fontWeight: 800,
                                            padding: '0.7rem 0.95rem',
                                        }}
                                    >
                                        Add Update
                                    </SafeButton>
                                </div>
                                {updatesQuery.error ? (
                                    <InlineQueryState
                                        tone="warning"
                                        title="Timeline updates are unavailable"
                                        message="Lane records loaded, but the update history query failed. Retry from the top banner to restore the timeline."
                                    />
                                ) : selectedUpdates.length ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {selectedUpdates.map((update) => (
                                            <SurfaceCard key={update.id} variant="inset" padding="0.9rem 1rem" radius="14px">
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                                                            {formatSlug(update.update_type)}
                                                        </div>
                                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', fontWeight: 700, marginTop: '0.2rem' }}>
                                                            {formatDateForInput(update.created)}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                                        {update.important_flag ? <MiniBadge>Important</MiniBadge> : null}
                                                        <SafeButton
                                                            onClick={() => setUpdateModalState({ mode: 'edit', updateId: update.id })}
                                                            style={{
                                                                borderRadius: '10px',
                                                                border: '1px solid var(--border-subtle)',
                                                                background: 'var(--bg-content)',
                                                                color: 'var(--text-main)',
                                                                fontWeight: 800,
                                                                padding: '0.42rem 0.68rem',
                                                            }}
                                                        >
                                                            Edit
                                                        </SafeButton>
                                                    </div>
                                                </div>
                                                <div style={{ marginTop: '0.7rem' }}>
                                                    <RichHtml value={update.note} />
                                                </div>
                                            </SurfaceCard>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ color: 'var(--text-dim)', fontWeight: 650 }}>No update log yet.</div>
                                )}
                            </DetailSection>
                        </>
                    )}
                </SurfaceCard>
            </div>

            <CampTestTrackModal
                open={modalState.mode !== 'closed'}
                mode={modalState.mode === 'edit' ? 'edit' : 'create'}
                initialTrack={modalState.mode === 'edit' ? modalState.track : null}
                seed={modalState.mode === 'create' ? createSeed : null}
                platforms={platformsQuery.data || []}
                campaigns={campaignsQuery.data || []}
                existingTracks={sortedTracks}
                isSaving={upsertTrackMutation.isPending}
                onOpenExistingTrack={(track) => {
                    setSelectedId(track.id);
                    setModalState({ mode: 'edit', track });
                }}
                onClose={() => {
                    setModalState({ mode: 'closed' });
                    clearModalQueryParams();
                }}
                onSubmit={async (payload) => {
                    await upsertTrackMutation.mutateAsync({
                        id: modalState.mode === 'edit' ? modalState.track.id : undefined,
                        payload,
                    });
                }}
            />

            {selectedTrack ? (
                <CampTestUpdateModal
                    open={updateModalState.mode !== 'closed'}
                    mode={updateModalState.mode === 'edit' ? 'edit' : 'create'}
                    track={selectedTrack}
                    initialUpdate={selectedUpdate}
                    isSaving={upsertUpdateMutation.isPending}
                    onClose={() => setUpdateModalState({ mode: 'closed' })}
                    onSubmit={async (payload) => {
                        await upsertUpdateMutation.mutateAsync({
                            id: updateModalState.mode === 'edit' ? updateModalState.updateId : undefined,
                            payload,
                        });
                    }}
                />
            ) : null}
        </div>
    );
}

function QueryAlertCard({
    tone,
    title,
    description,
    messages,
    actionLabel,
    onAction,
    isBusy = false,
}: {
    tone: 'critical' | 'warning';
    title: string;
    description?: string;
    messages: string[];
    actionLabel: string;
    onAction: () => void | Promise<void>;
    isBusy?: boolean;
}) {
    const styleDef = tone === 'critical'
        ? { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.18)', color: '#b91c1c' }
        : { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.18)', color: '#b45309' };

    return (
        <SurfaceCard
            radius="1.2rem"
            variant="soft"
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap',
                border: `1px solid ${styleDef.border}`,
                background: styleDef.bg,
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
                    color: styleDef.color,
                    flex: '0 0 auto',
                }}>
                    <AlertTriangle size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.98rem', fontWeight: 850, color: 'var(--text-main)' }}>{title}</div>
                    {description ? (
                        <div style={{ marginTop: '0.25rem', color: 'var(--text-dim)', fontWeight: 650, lineHeight: 1.5 }}>
                            {description}
                        </div>
                    ) : null}
                    <div style={{ marginTop: '0.45rem', display: 'flex', flexDirection: 'column', gap: '0.28rem', color: styleDef.color, fontWeight: 700 }}>
                        {messages.map((message) => (
                            <div key={message}>{message}</div>
                        ))}
                    </div>
                </div>
            </div>
            <SafeButton
                onClick={() => void onAction()}
                className="hero-btn hero-btn-secondary"
                style={{ padding: '0.6rem 0.85rem', whiteSpace: 'nowrap' }}
            >
                {isBusy ? 'Retrying...' : actionLabel}
            </SafeButton>
        </SurfaceCard>
    );
}

function InlineQueryState({
    tone,
    title,
    message,
}: {
    tone: 'critical' | 'warning';
    title: string;
    message: string;
}) {
    const styleDef = tone === 'critical'
        ? { bg: 'rgba(239, 68, 68, 0.05)', border: 'rgba(239, 68, 68, 0.14)', color: '#b91c1c' }
        : { bg: 'rgba(245, 158, 11, 0.05)', border: 'rgba(245, 158, 11, 0.14)', color: '#b45309' };

    return (
        <div style={{
            padding: '2.8rem 1rem',
            textAlign: 'center',
            borderRadius: '18px',
            border: `1px solid ${styleDef.border}`,
            background: styleDef.bg,
        }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '12px', background: '#fff', color: styleDef.color }}>
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

function RichHtml({ value }: { value: string }) {
    const rendered = useMemo(() => prepareNoteHtmlForRender(value).html, [value]);
    return (
        <div
            style={{ color: 'var(--text-main)', lineHeight: 1.6, fontSize: '0.92rem' }}
            dangerouslySetInnerHTML={{ __html: rendered }}
        />
    );
}
