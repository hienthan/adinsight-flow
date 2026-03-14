import type { CampaignRouteFormValues, CampaignRouteRecord, RouteGapSignal, RouteGraphEdge, RouteGraphNode, RouteHealthState, RouteKpis, RouteMatrixCell } from './types';

const splitFilterValues = (value: string) => value.split('|').map((item) => item.trim()).filter(Boolean);

export const ROUTE_STATUS_META = {
    active: { label: 'Active', color: '#10b981', soft: 'rgba(16, 185, 129, 0.12)' },
    planned: { label: 'Planned', color: '#3b82f6', soft: 'rgba(59, 130, 246, 0.12)' },
    paused: { label: 'Paused', color: '#f59e0b', soft: 'rgba(245, 158, 11, 0.12)' },
    archived: { label: 'Archived', color: '#94a3b8', soft: 'rgba(148, 163, 184, 0.16)' },
} as const;

export const ROUTE_PRIORITY_META = {
    low: { label: 'Low', color: '#94a3b8' },
    medium: { label: 'Medium', color: '#0ea5e9' },
    high: { label: 'High', color: '#f97316' },
    critical: { label: 'Critical', color: '#ef4444' },
} as const;

export const DEFAULT_SOURCE_MARKETS = ['HK', 'TW', 'ID'];
export const DEFAULT_SEASONAL_TAGS = ['spring', 'summer', 'autumn', 'winter', 'sakura', 'golden_week', 'year_end', 'ramadan', 'school_break'];
export const DEFAULT_ROUTE_FORM_VALUES: CampaignRouteFormValues = {
    route_name: '',
    platform: '',
    source_market: 'HK',
    destination_country: '',
    destination_country_code: '',
    destination_city: '',
    destination_label: '',
    campaigns: [],
    status: 'active',
    priority: '',
    owner: '',
    is_core_route: false,
    seasonal_tags: [],
    start_date: '',
    end_date: '',
    last_reviewed_date: '',
    budget_hint: '',
    target_roas_hint: '',
    notes: '',
};

export const buildDestinationLabel = (country: string, city?: string) => {
    return city ? `${city}, ${country}` : country;
};

export const buildRouteName = (sourceMarket: string, destinationCountry: string, destinationCity?: string) => {
    return `${sourceMarket} -> ${buildDestinationLabel(destinationCountry, destinationCity)}`;
};

export const buildRouteKey = ({
    platformId,
    sourceMarket,
    destinationCountryCode,
    destinationCity,
}: {
    platformId?: string;
    sourceMarket: string;
    destinationCountryCode: string;
    destinationCity?: string;
}) => {
    const cityPart = destinationCity?.trim().toLowerCase().replace(/\s+/g, '-') || 'all';
    return [platformId || 'global', sourceMarket.toUpperCase(), destinationCountryCode.toUpperCase(), cityPart].join('|');
};

export const getRouteHealthState = (route: CampaignRouteRecord): RouteHealthState => {
    if (route.status === 'planned') return 'planned';
    if (route.status === 'paused' || route.status === 'archived') return 'paused';
    if ((route.campaigns?.length || route.expand?.campaigns?.length || 0) === 0) return 'unmapped';

    if (route.last_reviewed_date) {
        const reviewedAt = new Date(route.last_reviewed_date);
        if (!Number.isNaN(reviewedAt.getTime())) {
            const dayDiff = (Date.now() - reviewedAt.getTime()) / (1000 * 60 * 60 * 24);
            if (dayDiff > 21) return 'stale';
        }
    }

    return 'healthy';
};

export const filterRoutes = (routes: CampaignRouteRecord[], filters: {
    platform: string;
    sourceMarkets: string;
    destinations: string;
    statuses: string;
    priorities: string;
    seasonalTags: string;
    search: string;
    coreOnly: boolean;
}) => {
    const selectedSourceMarkets = new Set(splitFilterValues(filters.sourceMarkets));
    const selectedDestinations = new Set(splitFilterValues(filters.destinations));
    const selectedStatuses = new Set(splitFilterValues(filters.statuses));
    const selectedPriorities = new Set(splitFilterValues(filters.priorities));
    const selectedSeasonalTags = new Set(splitFilterValues(filters.seasonalTags));
    const searchNeedle = filters.search.trim().toLowerCase();

    return routes.filter((route) => {
        if (filters.platform && route.platform !== filters.platform) return false;
        if (selectedSourceMarkets.size > 0 && !selectedSourceMarkets.has(route.source_market)) return false;
        if (selectedDestinations.size > 0 && !selectedDestinations.has(route.destination_country)) return false;
        if (selectedStatuses.size > 0 && !selectedStatuses.has(route.status)) return false;
        if (selectedPriorities.size > 0 && (!route.priority || !selectedPriorities.has(route.priority))) return false;
        if (filters.coreOnly && !route.is_core_route) return false;

        if (selectedSeasonalTags.size > 0) {
            const routeTags = new Set(route.seasonal_tags || []);
            const matchesTag = [...selectedSeasonalTags].some((tag) => routeTags.has(tag));
            if (!matchesTag) return false;
        }

        if (!searchNeedle) return true;

        const haystack = [
            route.route_name,
            route.source_market,
            route.destination_country,
            route.destination_city,
            route.destination_country_code,
            route.owner,
            route.expand?.platform?.display_name,
            ...(route.expand?.campaigns?.map((campaign) => campaign.name) || []),
        ]
            .filter(Boolean)
            .join(' | ')
            .toLowerCase();

        return haystack.includes(searchNeedle);
    });
};

export const deriveMatrix = (routes: CampaignRouteRecord[]) => {
    const sourceMarkets = Array.from(new Set([
        ...DEFAULT_SOURCE_MARKETS,
        ...routes.map((route) => route.source_market),
    ]));

    const destinationMap = new Map<string, string>();
    routes.forEach((route) => {
        const code = route.destination_country_code || route.destination_country;
        destinationMap.set(code, route.destination_country);
    });

    const destinationEntries = Array.from(destinationMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
    const cells = new Map<string, RouteMatrixCell>();

    routes.forEach((route) => {
        const destinationCode = route.destination_country_code || route.destination_country;
        const cellKey = `${route.source_market}|${destinationCode}`;
        const campaignCount = route.expand?.campaigns?.length ?? route.campaigns?.length ?? 0;
        const existingCell = cells.get(cellKey);

        if (existingCell) {
            existingCell.routes.push(route);
            existingCell.campaignCount += campaignCount;
            return;
        }

        cells.set(cellKey, {
            sourceMarket: route.source_market,
            destinationCode,
            destinationLabel: route.destination_country,
            routes: [route],
            campaignCount,
        });
    });

    return {
        sourceMarkets,
        destinations: destinationEntries.map(([code, label]) => ({ code, label })),
        cells,
    };
};

export const deriveGraph = (routes: CampaignRouteRecord[]) => {
    const sourceNodes: RouteGraphNode[] = Array.from(new Set(routes.map((route) => route.source_market))).map((sourceMarket) => ({
        id: `source:${sourceMarket}`,
        label: sourceMarket,
        kind: 'source',
    }));

    const destinationNodes: RouteGraphNode[] = Array.from(
        new Map(routes.map((route) => {
            const code = route.destination_country_code || route.destination_country;
            return [code, route.destination_country];
        })).entries(),
    ).map(([code, label]) => ({
        id: `destination:${code}`,
        label,
        kind: 'destination',
    }));

    const edges: RouteGraphEdge[] = routes.map((route) => ({
        id: route.id,
        sourceId: `source:${route.source_market}`,
        destinationId: `destination:${route.destination_country_code || route.destination_country}`,
        status: route.status,
        weight: Math.max(route.expand?.campaigns?.length ?? route.campaigns?.length ?? 0, 1),
        route,
    }));

    return { sourceNodes, destinationNodes, edges };
};

export const deriveKpis = (routes: CampaignRouteRecord[]): RouteKpis => {
    const activeRoutes = routes.filter((route) => route.status === 'active').length;
    const sourceMarketsCovered = new Set(routes.map((route) => route.source_market)).size;
    const destinationsCovered = new Set(routes.map((route) => route.destination_country_code || route.destination_country)).size;
    const unmappedActiveRoutes = routes.filter((route) => route.status === 'active' && (route.expand?.campaigns?.length ?? route.campaigns?.length ?? 0) === 0).length;
    const coreRoutes = routes.filter((route) => route.is_core_route).length;

    return {
        activeRoutes,
        sourceMarketsCovered,
        destinationsCovered,
        unmappedActiveRoutes,
        coreRoutes,
    };
};

export const deriveGapSignals = (routes: CampaignRouteRecord[]): RouteGapSignal[] => {
    const activeRoutes = routes.filter((route) => route.status === 'active' || route.status === 'planned');
    const destinationEntries = Array.from(new Map(
        activeRoutes.map((route) => [
            route.destination_country_code || route.destination_country,
            route.destination_country,
        ]),
    ).entries());

    const activeDestinations = new Set(destinationEntries.map(([code]) => code));
    const sourceMarkets = Array.from(new Set([
        ...DEFAULT_SOURCE_MARKETS,
        ...activeRoutes.map((route) => route.source_market),
    ]));
    const existingKeys = new Set(
        activeRoutes.map((route) => `${route.source_market}|${route.destination_country_code || route.destination_country}`),
    );

    const gaps: RouteGapSignal[] = [];

    sourceMarkets.forEach((sourceMarket) => {
        activeDestinations.forEach((destinationCode) => {
            const key = `${sourceMarket}|${destinationCode}`;
            if (existingKeys.has(key)) return;

            const destinationLabel = destinationEntries.find(([code]) => code === destinationCode)?.[1] || destinationCode;
            gaps.push({
                sourceMarket,
                destinationCode,
                destinationLabel,
            });
        });
    });

    return gaps;
};

export const deriveAttentionRoutes = (routes: CampaignRouteRecord[]) => {
    return routes
        .filter((route) => {
            const health = getRouteHealthState(route);
            return health === 'unmapped' || health === 'stale' || route.status === 'paused';
        })
        .sort((left, right) => {
            const leftScore = getRouteHealthState(left) === 'unmapped' ? 0 : getRouteHealthState(left) === 'stale' ? 1 : 2;
            const rightScore = getRouteHealthState(right) === 'unmapped' ? 0 : getRouteHealthState(right) === 'stale' ? 1 : 2;
            return leftScore - rightScore || left.route_name.localeCompare(right.route_name);
        });
};
