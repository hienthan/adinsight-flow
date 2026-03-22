import { useDeferredValue, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Network, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { pb } from '../../lib/pocketbase';
import { useCountryOptions, resolveCountryOption } from '../../hooks/useCountryOptions';
import { SafeButton, SurfaceCard } from '../../components/common/ui';
import OutboundMapGeo from './OutboundMapGeo';
import OutboundMapGraph from './OutboundMapGraph';
import OutboundMapMatrix from './OutboundMapMatrix';
import OutboundMapSignals from './OutboundMapSignals';
import OutboundMapStats from './OutboundMapStats';
import OutboundMapToolbar from './OutboundMapToolbar';
import RouteDetailDrawer from './RouteDetailDrawer';
import RouteFormModal from './RouteFormModal';
import { useCampaignOptions, useCampaignPlatforms, useOutboundRoutes } from './useOutboundRoutes';
import type { CampaignRouteFilters, CampaignRouteFormValues, CampaignRouteRecord, RouteViewMode } from './types';
import {
    DEFAULT_ROUTE_FORM_VALUES,
    DEFAULT_SOURCE_MARKETS,
    buildDestinationLabel,
    buildRouteKey,
    buildRouteName,
    deriveGraph,
    deriveGapSignals,
    deriveKpis,
    deriveMatrix,
    deriveAttentionRoutes,
    filterRoutes,
} from './utils';

const INITIAL_FILTERS: CampaignRouteFilters = {
    platform: '',
    sourceMarkets: '',
    destinations: '',
    statuses: 'active|planned',
    priorities: '',
    seasonalTags: '',
    search: '',
    coreOnly: false,
};

type ModalState =
    | { mode: 'closed' }
    | { mode: 'create'; seed?: { sourceMarket?: string; destinationCode?: string; destinationLabel?: string } }
    | { mode: 'edit'; route: CampaignRouteRecord };

export default function OutboundMapPage() {
    const queryClient = useQueryClient();
    const countryOptions = useCountryOptions();
    const [filters, setFilters] = useState(INITIAL_FILTERS);
    const [viewMode, setViewMode] = useState<RouteViewMode>('matrix');
    const [selectedRouteId, setSelectedRouteId] = useState<string>();
    const [selectedRouteStack, setSelectedRouteStack] = useState<CampaignRouteRecord[]>([]);
    const [modalState, setModalState] = useState<ModalState>({ mode: 'closed' });
    const deferredSearch = useDeferredValue(filters.search);

    const routesQuery = useOutboundRoutes();
    const platformsQuery = useCampaignPlatforms();
    const campaignsQuery = useCampaignOptions();

    const filteredRoutes = useMemo(() => {
        return filterRoutes(routesQuery.data || [], {
            ...filters,
            search: deferredSearch,
        });
    }, [deferredSearch, filters, routesQuery.data]);

    const matrix = useMemo(() => deriveMatrix(filteredRoutes), [filteredRoutes]);
    const graph = useMemo(() => deriveGraph(filteredRoutes), [filteredRoutes]);
    const kpis = useMemo(() => deriveKpis(filteredRoutes), [filteredRoutes]);
    const gapSignals = useMemo(() => deriveGapSignals(filteredRoutes), [filteredRoutes]);
    const attentionRoutes = useMemo(() => deriveAttentionRoutes(filteredRoutes), [filteredRoutes]);
    const selectedRoute = filteredRoutes.find((route) => route.id === selectedRouteId)
        || routesQuery.data?.find((route) => route.id === selectedRouteId);

    const openRouteStack = (routes: CampaignRouteRecord[]) => {
        if (routes.length === 0) return;
        setSelectedRouteStack(routes);
        setSelectedRouteId(routes[0].id);
    };

    const createRouteMutation = useMutation({
        mutationFn: async (payload: Record<string, unknown>) => {
            return pb.collection('campaign_routes').create<CampaignRouteRecord>(payload);
        },
        onSuccess: () => {
            toast.success('Route created');
            queryClient.invalidateQueries({ queryKey: ['campaign-routes'] });
        },
        onError: (error: unknown) => {
            toast.error(getMutationErrorMessage(error));
        },
    });

    const updateRouteMutation = useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
            return pb.collection('campaign_routes').update<CampaignRouteRecord>(id, payload);
        },
        onSuccess: () => {
            toast.success('Route updated');
            queryClient.invalidateQueries({ queryKey: ['campaign-routes'] });
        },
        onError: (error: unknown) => {
            toast.error(getMutationErrorMessage(error));
        },
    });

    const openCreateModal = (seed?: { sourceMarket?: string; destinationCode?: string; destinationLabel?: string }) => {
        setModalState({ mode: 'create', seed });
    };

    const modalInitialValues = useMemo((): CampaignRouteFormValues | undefined => {
        if (modalState.mode === 'edit') {
            const route = modalState.route;
            return {
                route_name: route.route_name,
                platform: route.platform || '',
                source_market: route.source_market,
                destination_country: route.destination_country,
                destination_country_code: route.destination_country_code || '',
                destination_city: route.destination_city || '',
                destination_label: route.destination_label || route.destination_country,
                campaigns: route.campaigns || route.expand?.campaigns?.map((campaign) => campaign.id) || [],
                status: route.status,
                priority: route.priority || '',
                owner: route.owner || '',
                is_core_route: Boolean(route.is_core_route),
                seasonal_tags: route.seasonal_tags || [],
                start_date: route.start_date?.slice(0, 10) || '',
                end_date: route.end_date?.slice(0, 10) || '',
                last_reviewed_date: route.last_reviewed_date?.slice(0, 10) || '',
                budget_hint: route.budget_hint?.toString() || '',
                target_roas_hint: route.target_roas_hint?.toString() || '',
                notes: route.notes || '',
            };
        }

        if (modalState.mode === 'create') {
            const option = modalState.seed?.destinationCode
                ? resolveCountryOption(modalState.seed.destinationCode)
                : resolveCountryOption(modalState.seed?.destinationLabel);

            return {
                ...DEFAULT_ROUTE_FORM_VALUES,
                source_market: modalState.seed?.sourceMarket || DEFAULT_ROUTE_FORM_VALUES.source_market,
                destination_country: option?.label || modalState.seed?.destinationLabel || '',
                destination_country_code: option?.code || modalState.seed?.destinationCode || '',
                destination_label: option?.label || modalState.seed?.destinationLabel || '',
            };
        }

        return undefined;
    }, [modalState]);

    const handleSubmit = async (values: CampaignRouteFormValues) => {
        const normalizedDestinationCountry = values.destination_country.trim();
        const normalizedDestinationCity = values.destination_city.trim();
        const destinationLabel = buildDestinationLabel(normalizedDestinationCountry, normalizedDestinationCity || undefined);
        const routeName = buildRouteName(values.source_market, normalizedDestinationCountry, normalizedDestinationCity || undefined);
        const routeKey = buildRouteKey({
            platformId: values.platform || undefined,
            sourceMarket: values.source_market,
            destinationCountryCode: values.destination_country_code,
            destinationCity: normalizedDestinationCity || undefined,
        });

        const payload = {
            route_key: routeKey,
            route_name: routeName,
            platform: values.platform || null,
            source_market: values.source_market,
            destination_country: normalizedDestinationCountry,
            destination_country_code: values.destination_country_code,
            destination_city: normalizedDestinationCity || '',
            destination_label: destinationLabel,
            campaigns: values.campaigns,
            status: values.status,
            priority: values.priority || null,
            owner: values.owner.trim() || '',
            is_core_route: values.is_core_route,
            seasonal_tags: values.seasonal_tags,
            start_date: values.start_date || '',
            end_date: values.end_date || '',
            last_reviewed_date: values.last_reviewed_date || '',
            budget_hint: values.budget_hint ? Number(values.budget_hint) : null,
            target_roas_hint: values.target_roas_hint ? Number(values.target_roas_hint) : null,
            notes: values.notes.trim(),
            tags: [],
            metadata: {},
        };

        if (modalState.mode === 'edit') {
            await updateRouteMutation.mutateAsync({ id: modalState.route.id, payload });
            setSelectedRouteId(modalState.route.id);
        } else {
            const createdRecord = await createRouteMutation.mutateAsync(payload);
            setSelectedRouteId(createdRecord.id);
        }

        setModalState({ mode: 'closed' });
    };

    const loading = routesQuery.isLoading || platformsQuery.isLoading || campaignsQuery.isLoading;
    const hasError = routesQuery.error || platformsQuery.error || campaignsQuery.error;

    return (
        <div
            className="page-container"
            style={{
                paddingBottom: '4rem',
                backgroundImage: 'radial-gradient(circle at top left, rgba(6,182,212,0.045) 0%, rgba(255,255,255,0) 28%), radial-gradient(circle at top right, rgba(251,113,133,0.04) 0%, rgba(255,255,255,0) 30%)',
            }}
        >
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '1rem',
                marginBottom: '1.5rem',
                marginTop: '1rem',
                padding: '1.3rem 1.4rem',
                borderRadius: '26px',
                background: 'linear-gradient(140deg, var(--bg-content) 0%, rgba(148,163,184,0.04) 48%, var(--bg-content) 100%)',
                border: '1px solid rgba(148,163,184,0.14)',
                boxShadow: '0 24px 40px -34px rgba(15,23,42,0.28)',
                position: 'relative',
                overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute',
                    top: '-34px',
                    right: '-34px',
                    width: '140px',
                    height: '140px',
                    borderRadius: '999px',
                    background: 'rgba(6,182,212,0.07)',
                    filter: 'blur(16px)',
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: '-50px',
                    left: '-34px',
                    width: '150px',
                    height: '150px',
                    borderRadius: '999px',
                    background: 'rgba(251,113,133,0.06)',
                    filter: 'blur(18px)',
                }} />
                <div>
                    <div style={{ color: 'var(--text-dim)', fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Camp Tracking
                    </div>
                    <h1 style={{ marginTop: '0.45rem', fontSize: '2.4rem', letterSpacing: '-0.06em' }}>
                        Outbound Route Diagram
                    </h1>
                    <p style={{ marginTop: '0.55rem', color: 'var(--text-dim)', maxWidth: '780px', lineHeight: 1.6 }}>
                        Track outbound coverage from source markets to destination countries, keep route ownership visible,
                        and attach campaigns directly to each route record.
                    </p>
                </div>

                <SafeButton
                    onClick={() => {
                        queryClient.invalidateQueries({ queryKey: ['campaign-routes'] });
                        queryClient.invalidateQueries({ queryKey: ['campaign-platforms'] });
                        queryClient.invalidateQueries({ queryKey: ['campaigns', 'outbound-route-options'] });
                    }}
                    style={{
                        borderRadius: '14px',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-content)',
                        color: 'var(--text-dim)',
                        fontWeight: 800,
                        padding: '0.85rem 1rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                    }}
                >
                    <RefreshCcw size={15} />
                    Refresh
                </SafeButton>
            </div>

            {hasError && (
                <SurfaceCard variant="soft" radius="18px" style={{ marginBottom: '1rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start' }}>
                        <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '14px',
                            display: 'grid',
                            placeItems: 'center',
                            background: 'rgba(239, 68, 68, 0.08)',
                            color: '#ef4444',
                            flexShrink: 0,
                        }}>
                            <Network size={18} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800 }}>Failed to load Outbound Map data.</div>
                            <div style={{ marginTop: '0.35rem', color: 'var(--text-dim)', lineHeight: 1.6 }}>
                                {getMutationErrorMessage(hasError)}
                                {' '}If PocketBase is not running, start it first and apply the new `campaign_routes` migration.
                            </div>
                        </div>
                    </div>
                </SurfaceCard>
            )}

            <div style={{ display: 'grid', gap: '1rem' }}>
                <OutboundMapStats kpis={kpis} />
                <OutboundMapSignals
                    gapSignals={gapSignals}
                    attentionRoutes={attentionRoutes}
                    onCreateGap={(signal) => openCreateModal(signal)}
                    onSelectRoute={(route) => openRouteStack([route])}
                />

                <OutboundMapToolbar
                    filters={filters}
                    onFiltersChange={(updater) => setFilters(updater)}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    countryOptions={countryOptions}
                    platforms={platformsQuery.data || []}
                    availableSourceMarkets={Array.from(new Set([
                        ...DEFAULT_SOURCE_MARKETS,
                        ...(routesQuery.data || []).map((route) => route.source_market),
                    ])).sort()}
                    onOpenCreate={() => openCreateModal()}
                />

                {loading ? (
                    <SurfaceCard variant="soft" radius="20px" style={{ minHeight: '360px', display: 'grid', placeItems: 'center', color: 'var(--text-dim)', fontWeight: 700 }}>
                        Loading outbound routes...
                    </SurfaceCard>
                ) : filteredRoutes.length === 0 ? (
                    <SurfaceCard variant="soft" radius="20px" style={{ minHeight: '320px', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                        <div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>No route matched the current filter.</div>
                            <div style={{ marginTop: '0.45rem', color: 'var(--text-dim)' }}>
                                Try clearing filters or create your first outbound route.
                            </div>
                        </div>
                    </SurfaceCard>
                ) : (
                    <>
                        {viewMode === 'matrix' && (
                            <OutboundMapMatrix
                                sourceMarkets={matrix.sourceMarkets}
                                destinations={matrix.destinations}
                                cells={matrix.cells}
                                onSelectRoutes={openRouteStack}
                                onQuickAdd={openCreateModal}
                            />
                        )}

                        {viewMode === 'graph' && (
                            <OutboundMapGraph
                                sourceNodes={graph.sourceNodes}
                                destinationNodes={graph.destinationNodes}
                                edges={graph.edges}
                                onSelectRoute={(routeId) => {
                                    const route = filteredRoutes.find((item) => item.id === routeId) || routesQuery.data?.find((item) => item.id === routeId);
                                    if (route) openRouteStack([route]);
                                }}
                            />
                        )}

                        {viewMode === 'geo' && (
                            <OutboundMapGeo
                                routes={filteredRoutes}
                                onSelectRoute={(route) => openRouteStack([route])}
                            />
                        )}
                    </>
                )}
            </div>

            <RouteDetailDrawer
                route={selectedRoute}
                routes={selectedRouteStack}
                onClose={() => {
                    setSelectedRouteId(undefined);
                    setSelectedRouteStack([]);
                }}
                onEdit={(route) => setModalState({ mode: 'edit', route })}
                onSelectRoute={(route) => setSelectedRouteId(route.id)}
            />

            <RouteFormModal
                open={modalState.mode !== 'closed'}
                title={modalState.mode === 'edit' ? 'Edit Route' : 'Create Route'}
                countryOptions={countryOptions}
                platforms={platformsQuery.data || []}
                campaigns={campaignsQuery.data || []}
                initialValues={modalInitialValues}
                isSaving={createRouteMutation.isPending || updateRouteMutation.isPending}
                onClose={() => setModalState({ mode: 'closed' })}
                onSubmit={handleSubmit}
            />
        </div>
    );
}

function getMutationErrorMessage(error: unknown) {
    if (!error) return 'Unknown error.';
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    return 'Unexpected error.';
}
