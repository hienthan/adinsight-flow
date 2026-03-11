import { useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Globe, Download } from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { usePlatformAnalytics } from '../../hooks/usePlatformAnalytics';
import { usePlatformMeta } from '../../hooks/usePlatformMeta';
import { PLATFORMS } from '../../config/platforms';
import { InsightDataTable } from './InsightDataTable';
import { InsightFilterBar } from './InsightFilterBar';
import { InsightExportModal } from './InsightExportModal';
import { InsightActionBar } from './InsightActionBar';
import { buildFilterString } from './insightUtils';
import { PageRecord } from '../../types/adinsight';

export default function AdInsightPage() {
    const { platform } = useParams();
    const platformId = (platform === 'traveloka' ? 'traveloka' : 'klook');
    const config = PLATFORMS[platformId];

    const [perPage, setPerPage] = useState(100);
    const initialFilters = useMemo(() => {
        const filters: Record<string, string> = {
            sitemap_tag: config.defaultSitemapTags[0],
            titleKey: config.titleKey as string,
        };
        if (config.activeFilterKey) {
            filters.activeFilterKey = config.activeFilterKey as string;
        }
        if (platformId === 'traveloka') {
            filters.country = 'Indonesia';
        }
        return filters;
    }, [config, platformId]);

    const {
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
        fetchPages
    } = usePlatformAnalytics({
        collection: config.collection,
        perPage: perPage,
        initialFilters,
        initialSortField: platformId === 'traveloka' ? 'province' : 'id',
        initialSortDirection: platformId === 'traveloka' ? 'asc' : 'desc'
    });

    const { countries, sitemapTags } = usePlatformMeta(config.defaultSitemapTags);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exporting, setExporting] = useState(false);

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);



    const handleSelect = useCallback((id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    }, []);

    const handleSelectAll = useCallback((ids: string[], isSelected: boolean) => {
        if (isSelected) {
            // Add all visible IDs that aren't already selected
            setSelectedIds(prev => Array.from(new Set([...prev, ...ids])));
        } else {
            // Remove visible IDs from selection
            setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
        }
    }, []);

    const handleBulkUpdate = async (payload: Partial<PageRecord>) => {
        if (selectedIds.length === 0) return;
        setIsBulkUpdating(true);
        try {
            // Execute in parallel
            const promises = selectedIds.map(id =>
                pb.collection(config.collection).update(id, payload)
            );
            await Promise.all(promises);
            // Refresh table
            await fetchPages(currentPage);
        } catch (err) {
            console.error('Bulk update failed', err);
            alert('Failed to update some records. Please check the network log.');
        } finally {
            setIsBulkUpdating(false);
        }
    };

    const handleFilterChange = useCallback((id: string, value: string) => {
        setFilters(prev => ({ ...prev, [id]: value }));
    }, [setFilters]);

    const handleReset = () => {
        setFilters(initialFilters);
    };



    const handleExport = async (selectedFields: string[], customFileName: string, customLabel?: string) => {
        try {
            setExporting(true);
            const baseFilterString = buildFilterString(filters);
            let filterString = baseFilterString;
            
            // For export, always enforce that the record is active
            if (config.activeFilterKey) {
                const activeCondition = `${config.activeFilterKey} = true`;
                filterString = baseFilterString ? `(${baseFilterString}) && ${activeCondition}` : activeCondition;
            }

            const allRecords: PageRecord[] = [];
            let page = 1;
            let hasMore = true;

            while (hasMore) {
                const result = await pb.collection(config.collection).getList<PageRecord>(page, 500, {
                    sort: (sortDirection === 'desc' ? '-' : '') + sortField,
                    filter: filterString,
                });

                allRecords.push(...result.items);
                hasMore = result.items.length === 500;
                page++;
            }

            const csvHeader = 'Page URL,Custom Label\n';
            const csvRows = allRecords.map(record => {
                const url = record.url;

                const labelParts: string[] = [];

                // Helper to clean labels
                const cleanLabel = (val: string) => String(val).toLowerCase().replace(/\s+/g, '-').replace(/,/g, '');

                let titleLabel = '';

                selectedFields.forEach(field => {
                    const value = record[field as keyof PageRecord];
                    if (value) {
                        if (field === config.titleKey) {
                            // Leave title human-readable for NotebookLM, just strip characters that break the CSV/Label format
                            titleLabel = String(value).replace(/[;,]/g, ' ').replace(/\s+/g, ' ').trim();
                        } else {
                            let prefix = '';
                            if (field === 'country') prefix = 'geo=';
                            else if (field === 'province') prefix = 'province=';
                            else if (field === 'city') prefix = 'city=';
                            else if (field === 'tier') prefix = 'tier=';
                            else if (field === 'content_type') prefix = 'ctype=';
                            else if (field === 'funnel_stage') prefix = 'funnel=';
                            else if (field === 'sub_tag') prefix = 'tag=';
                            // dsa_campaign gets an empty prefix since its values are already formatted (e.g. TVLK_ID_Leisure_Hotspots)

                            labelParts.push(`${prefix}${cleanLabel(String(value))}`);
                        }
                    }
                });

                if (titleLabel) {
                    labelParts.push(titleLabel);
                }


                // Append custom label suffix if provided
                if (customLabel && customLabel.trim() !== '') {
                    labelParts.push(customLabel.trim());
                }

                const labels = labelParts.join(';');
                return `${url},${labels}`;
            }).join('\n');

            const csv = csvHeader + csvRows;

            // Format default filename (e.g. traveloka -> tvlk, activities -> act)
            let formattedPlatform = platformId;
            let formattedTag = filters.sitemap_tag || 'all';

            if (platformId === 'traveloka') {
                formattedPlatform = 'tvlk';
                if (formattedTag === 'activities') formattedTag = 'act';
            }

            const defaultName = `${formattedPlatform}-${formattedTag}-${allRecords.length}`;
            const fileNameToUse = `${customFileName || defaultName}.csv`;

            // Support for File System Access API (Persistent Path)
            if ('showSaveFilePicker' in window) {
                try {
                    const handle = await (window as any).showSaveFilePicker({
                        suggestedName: fileNameToUse,
                        id: 'adinsight-export',
                        types: [{
                            description: 'CSV File',
                            accept: { 'text/csv': ['.csv'] },
                        }],
                    });
                    const writable = await handle.createWritable();
                    await writable.write(csv);
                    await writable.close();
                    setIsExportModalOpen(false);
                    return;
                } catch (err: any) {
                    if (err.name === 'AbortError') return;
                    console.error('File Picker error, falling back:', err);
                }
            }

            // Fallback for unsupported browsers or errors
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const urlObj = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.download = fileNameToUse;
            a.href = urlObj;
            a.click();

            setIsExportModalOpen(false);
        } catch (err) {
            console.error('Export error:', err);
            alert('Export failed. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    const isFiltered = Object.keys(filters).some(k =>
        !['sitemap_tag', 'titleKey'].includes(k) && filters[k]
    ) || (filters.sitemap_tag !== config.defaultSitemapTags[0]);

    return (
        <div className="page-container">
            <InsightActionBar
                selectedCount={selectedIds.length}
                onClear={() => setSelectedIds([])}
                onApply={(payload) => {
                    const finalPayload: any = { ...payload };
                    if (payload.is_active !== undefined) {
                        finalPayload.include_for_dsa = payload.is_active;
                    }
                    if (payload.country) {
                        finalPayload.country = payload.country;
                    }
                    handleBulkUpdate(finalPayload);
                }}
                isUpdating={isBulkUpdating}
            />

            {/* Header / Platform Switcher */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
                padding: '1rem 1.5rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-soft)'
            }}>
                {/* Left: Platform Switcher */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: 'hsla(var(--primary) / 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'hsl(var(--primary))'
                        }}>
                            <Globe size={18} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                                {config.name} Analytics
                            </h3>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0 }}>
                                Collection: {config.collection}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Center: Record Count */}
                <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'hsl(var(--primary))', lineHeight: 1 }}>
                        {totalCount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginTop: '0.25rem' }}>
                        {isFiltered ? 'Matching Records' : 'Total Records'}
                    </div>
                </div>

                {/* Right: Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, justifyContent: 'flex-end' }}>
                    <button
                        onClick={handleReset}
                        className="hero-btn"
                        style={{
                            padding: '0.6rem 1rem',
                            fontSize: '13px',
                            fontWeight: 700,
                            visibility: isFiltered ? 'visible' : 'hidden',
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--bg-overlay)',
                            borderRadius: '10px'
                        }}
                    >
                        Reset
                    </button>

                    <button
                        onClick={() => setIsExportModalOpen(true)}
                        disabled={exporting}
                        className="hero-btn hero-btn-primary"
                        style={{
                            padding: '0.6rem 1.2rem',
                            gap: '0.5rem',
                            fontSize: '13px',
                            borderRadius: '10px'
                        }}
                    >
                        <Download size={16} />
                        {exporting ? 'Exporting...' : 'CSV'}
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <InsightFilterBar
                filters={config.filters}
                currentValues={filters}
                onFilterChange={handleFilterChange}
                countries={countries}
                sitemapTags={sitemapTags}
            />

            {/* Main Content Table */}
            <div className="animate-fade">
                <InsightDataTable
                    records={records}
                    columns={config.columns}
                    loading={loading || isBulkUpdating}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSortChange}
                    selectedIds={selectedIds}
                    onSelect={handleSelect}
                    onSelectAll={handleSelectAll}
                />

                {/* Pagination */}
                <div
                    className="hero-card"
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '1.5rem',
                        padding: '1.25rem',
                        gap: '2rem'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Per page:</span>
                        <select
                            value={perPage}
                            onChange={(e) => setPerPage(Number(e.target.value))}
                            style={{
                                padding: '0.4rem',
                                borderRadius: '0.75rem',
                                border: '1px solid var(--border-subtle)',
                                background: 'var(--bg-content)',
                                fontSize: '0.85rem',
                                color: 'var(--text-main)'
                            }}
                        >
                            <option value="50">50</option>
                            <option value="100">100</option>
                            <option value="200">200</option>
                            <option value="500">500</option>
                        </select>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                            Showing {((currentPage - 1) * perPage) + 1}-{Math.min(currentPage * perPage, totalCount)} of {totalCount.toLocaleString()}
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                            onClick={() => fetchPages(currentPage - 1)}
                            disabled={currentPage === 1 || loading}
                            className="hero-btn hero-btn-secondary"
                            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                        >
                            ← Prev
                        </button>

                        <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', padding: '0 0.5rem', fontWeight: 700 }}>
                            Page {currentPage} / {totalPages}
                        </span>

                        <button
                            onClick={() => fetchPages(currentPage + 1)}
                            disabled={currentPage === totalPages || loading}
                            className="hero-btn hero-btn-secondary"
                            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                        >
                            Next →
                        </button>
                    </div>
                </div>
            </div>

            {/* Export Modal */}
            <InsightExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onExport={handleExport}
                fields={config.exportFields}
                totalCount={totalCount}
                isExporting={exporting}
            />


        </div>
    );
}
