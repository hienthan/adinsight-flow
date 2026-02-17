import { useState, useCallback, useEffect } from 'react';
import { pb } from '../lib/pocketbase';
import { PageRecord } from '../types/adinsight';
import { buildFilterString } from '../pages/AdInsight/insightUtils';

interface UsePlatformAnalyticsProps {
    collection: string;
    perPage: number;
    initialFilters?: Record<string, string>;
}

export function usePlatformAnalytics({
    collection,
    perPage,
    initialFilters = {}
}: UsePlatformAnalyticsProps) {
    const [records, setRecords] = useState<PageRecord[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState<Record<string, string>>(initialFilters);

    const fetchPages = useCallback(async (pageNum: number, currentFilters: Record<string, string>) => {
        setLoading(true);
        try {
            const filterStr = buildFilterString(currentFilters);
            const result = await pb.collection(collection).getList<PageRecord>(pageNum, perPage, {
                sort: 'tier',
                filter: filterStr,
            });

            setRecords(result.items);
            setTotalCount(result.totalItems);
            setTotalPages(result.totalPages);
            setCurrentPage(pageNum);
        } catch (err: any) {
            if (err?.isAbort) return;
            console.error(`Fetch error for ${collection}:`, err);
        } finally {
            setLoading(false);
        }
    }, [collection, perPage]);

    useEffect(() => {
        setFilters(initialFilters);
        setCurrentPage(1);
    }, [collection]); // Reset filters when platform/collection changes

    useEffect(() => {
        setCurrentPage(1);
        fetchPages(1, filters);
    }, [filters, perPage, fetchPages]);

    return {
        records,
        totalCount,
        totalPages,
        loading,
        currentPage,
        filters,
        setFilters,
        fetchPages: (page: number) => fetchPages(page, filters),
        refresh: () => fetchPages(currentPage, filters)
    };
}
