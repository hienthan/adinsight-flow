import { useQuery } from '@tanstack/react-query';
import { pb } from '../../lib/pocketbase';
import type { Campaign, CampaignPlatform } from '../../types/campaign';
import type { CampaignRouteRecord } from './types';

export function useOutboundRoutes() {
    return useQuery({
        queryKey: ['campaign-routes'],
        queryFn: async () => {
            return pb.collection('campaign_routes').getFullList<CampaignRouteRecord>({
                sort: 'source_market,destination_country,route_name',
                expand: 'platform,campaigns',
            });
        },
    });
}

export function useCampaignPlatforms() {
    return useQuery({
        queryKey: ['campaign-platforms'],
        queryFn: async () => {
            return pb.collection('campaign_platforms').getFullList<CampaignPlatform>({
                sort: 'order,display_name',
            });
        },
    });
}

export function useCampaignOptions() {
    return useQuery({
        queryKey: ['campaigns', 'outbound-route-options'],
        queryFn: async () => {
            return pb.collection('campaigns').getFullList<Campaign>({
                sort: 'name',
                fields: 'id,name,platform,status,priority',
                expand: 'platform',
            });
        },
    });
}
