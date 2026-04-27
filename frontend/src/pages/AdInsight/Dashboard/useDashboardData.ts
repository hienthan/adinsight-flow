import { useQuery } from '@tanstack/react-query';
import { pb } from '../../../lib/pocketbase';
import { PageRecord } from '../../../types/adinsight';
import { buildFilterString } from '../insightUtils';

export interface DashboardFilters {
    platformInfo: { collection: string, id: string; titleKey: string };
    pattern?: string;
    province?: string;
    country?: string;
    readiness_hint?: string;
    activeFilterKey?: string;
}

export function useDashboardData(filters: DashboardFilters) {
    // Include province and activeFilterKey in queryKey so we refetch if settings change
    const queryKey = ['dashboardData', filters.platformInfo.collection, filters.pattern, filters.province, filters.country, filters.readiness_hint, filters.activeFilterKey];

    return useQuery({
        queryKey,
        queryFn: async () => {
            const { collection, id, titleKey } = filters.platformInfo;
            
            // Build the exact same filter string used in the List View
            const filterMap: Record<string, string> = {
                titleKey // Required for searchTerm/excludeTerm but we don't use them here yet
            };

            if (id === 'traveloka') {
                filterMap.country = 'Indonesia';
            }

            if (filters.pattern) {
                if (id === 'trip') {
                    filterMap.pattern = filters.pattern;
                } else {
                    filterMap.sitemap_tag = filters.pattern;
                }
            }

            if (filters.province) {
                filterMap.province = filters.province;
            }

            if (filters.country) {
                filterMap.country = filters.country;
            }

            if (filters.readiness_hint) {
                filterMap.readiness_hint = filters.readiness_hint;
            }

            let pbFilter = buildFilterString(filterMap);
            
            // Enforce active records filtering for the dashboard
            if (filters.activeFilterKey) {
                const activeClause = `${filters.activeFilterKey} = true`;
                pbFilter = pbFilter ? `(${pbFilter}) && ${activeClause}` : activeClause;
            }
            
            const records = await pb.collection(collection).getFullList<PageRecord>({
                filter: pbFilter,
                fields: id === 'trip'
                    ? 'id,url,country,city,pattern,traffic,traffic_pct,keyword_count,traffic_change,intent_primary,content_type,topic_type,geo_entity,geo_category,readiness_hint,market_fit,semrush_metrics'
                    : 'id,url,province,intent_primary,intent_type,tier,sub_tag,final_score,content_type',
            });

            return records;
        },
        staleTime: 5 * 60 * 1000,
        enabled: !!filters.platformInfo.collection
    });
}
