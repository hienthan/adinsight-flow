import { useQuery } from '@tanstack/react-query';
import { pb } from '../../../lib/pocketbase';
import { PageRecord } from '../../../types/adinsight';
import { buildFilterString } from '../insightUtils';

export interface DashboardFilters {
    platformInfo: { collection: string, id: string; titleKey: string };
    sitemap_tag: string;
    province: string;
    activeFilterKey?: string;
}

export function useDashboardData(filters: DashboardFilters) {
    // Include province and activeFilterKey in queryKey so we refetch if settings change
    const queryKey = ['dashboardData', filters.platformInfo.collection, filters.sitemap_tag, filters.province, filters.activeFilterKey];

    return useQuery({
        queryKey,
        queryFn: async () => {
            const { collection, id, titleKey } = filters.platformInfo;
            
            // Build the exact same filter string used in the List View
            const filterMap: Record<string, string> = {
                sitemap_tag: filters.sitemap_tag,
                titleKey // Required for searchTerm/excludeTerm but we don't use them here yet
            };

            if (id === 'traveloka') {
                filterMap.country = 'Indonesia';
            }

            if (filters.province) {
                filterMap.province = filters.province;
            }

            let pbFilter = buildFilterString(filterMap);
            
            // Enforce active records filtering for the dashboard
            if (filters.activeFilterKey) {
                const activeClause = `${filters.activeFilterKey} = true`;
                pbFilter = pbFilter ? `(${pbFilter}) && ${activeClause}` : activeClause;
            }
            
            const records = await pb.collection(collection).getFullList<PageRecord>({
                filter: pbFilter,
                fields: 'id,url,province,intent_primary,intent_type,tier,sub_tag,final_score,content_type',
            });

            return records;
        },
        staleTime: 5 * 60 * 1000,
        enabled: !!filters.platformInfo.collection && !!filters.sitemap_tag
    });
}
