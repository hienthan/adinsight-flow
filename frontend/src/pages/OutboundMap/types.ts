import type { Campaign, CampaignPlatform } from '../../types/campaign';

export type RouteStatus = 'planned' | 'active' | 'paused' | 'archived';
export type RoutePriority = 'low' | 'medium' | 'high' | 'critical';
export type RouteViewMode = 'matrix' | 'graph' | 'geo';
export type RouteHealthState = 'healthy' | 'stale' | 'unmapped' | 'paused' | 'planned';

export interface CampaignRouteRecord {
    id: string;
    route_key: string;
    route_name: string;
    platform?: string;
    source_market: string;
    destination_country: string;
    destination_country_code?: string;
    destination_city?: string;
    destination_label?: string;
    campaigns?: string[];
    status: RouteStatus;
    priority?: RoutePriority;
    owner?: string;
    is_core_route?: boolean;
    seasonal_tags?: string[];
    start_date?: string;
    end_date?: string;
    last_reviewed_date?: string;
    budget_hint?: number;
    target_roas_hint?: number;
    notes?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    created: string;
    updated: string;
    expand?: {
        platform?: CampaignPlatform;
        campaigns?: Campaign[];
    };
}

export interface CampaignRouteFormValues {
    route_name: string;
    platform: string;
    source_market: string;
    destination_country: string;
    destination_country_code: string;
    destination_city: string;
    destination_label: string;
    campaigns: string[];
    status: RouteStatus;
    priority: '' | RoutePriority;
    owner: string;
    is_core_route: boolean;
    seasonal_tags: string[];
    start_date: string;
    end_date: string;
    last_reviewed_date: string;
    budget_hint: string;
    target_roas_hint: string;
    notes: string;
}

export interface CampaignRouteFilters {
    platform: string;
    sourceMarkets: string;
    destinations: string;
    statuses: string;
    priorities: string;
    seasonalTags: string;
    search: string;
    coreOnly: boolean;
}

export interface RouteMatrixCell {
    sourceMarket: string;
    destinationCode: string;
    destinationLabel: string;
    routes: CampaignRouteRecord[];
    campaignCount: number;
}

export interface RouteGraphNode {
    id: string;
    label: string;
    kind: 'source' | 'destination';
}

export interface RouteGraphEdge {
    id: string;
    sourceId: string;
    destinationId: string;
    status: RouteStatus;
    weight: number;
    route: CampaignRouteRecord;
}

export interface RouteKpis {
    activeRoutes: number;
    sourceMarketsCovered: number;
    destinationsCovered: number;
    unmappedActiveRoutes: number;
    coreRoutes: number;
}

export interface RouteGapSignal {
    sourceMarket: string;
    destinationCode: string;
    destinationLabel: string;
}
