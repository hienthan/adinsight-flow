import { useState, useCallback, useEffect } from 'react';
import { pb } from '../lib/pocketbase';
import { PageRecord } from '../types/adinsight';
import { buildFilterString } from '../pages/AdInsight/insightUtils';

interface UsePlatformAnalyticsProps {
    collection: string;
    perPage: number;
    initialFilters?: Record<string, string>;
    initialSortField?: string;
    initialSortDirection?: 'asc' | 'desc';
}

export function usePlatformAnalytics({
    collection,
    perPage,
    initialFilters = {},
    initialSortField = 'id',
    initialSortDirection = 'desc'
}: UsePlatformAnalyticsProps) {
    const [records, setRecords] = useState<PageRecord[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState<Record<string, string>>(initialFilters);
    const [sortField, setSortField] = useState(initialSortField);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialSortDirection);

    const fetchPages = useCallback(async (pageNum: number, currentFilters: Record<string, string>, currentSort: string) => {
        setLoading(true);
        try {
            const filterStr = buildFilterString(currentFilters);
            const result = await pb.collection(collection).getList<PageRecord>(pageNum, perPage, {
                sort: currentSort,
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
        setRecords([]);
        setTotalCount(0);
        setTotalPages(0);
        setFilters(initialFilters);
        setSortField(initialSortField);
        setSortDirection(initialSortDirection);
        setCurrentPage(1);
    }, [collection, initialSortField, initialSortDirection, JSON.stringify(initialFilters)]); // Reset filters when platform/collection changes

    useEffect(() => {
        setCurrentPage(1);
        const sortStr = (sortDirection === 'desc' ? '-' : '') + sortField;
        fetchPages(1, filters, sortStr);
    }, [filters, perPage, sortField, sortDirection, fetchPages]);

    const handleSortChange = (field: string) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    return {
        records,
        totalCount,
        totalPages,
        loading,
        currentPage,
        filters,
        setFilters,
        sortField,
        sortDirection,
        handleSortChange,
        fetchPages: (page: number) => fetchPages(page, filters, (sortDirection === 'desc' ? '-' : '') + sortField),
        refresh: () => fetchPages(currentPage, filters, (sortDirection === 'desc' ? '-' : '') + sortField)
    };
}
