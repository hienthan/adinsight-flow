import { Suspense, lazy, useState, useCallback, useMemo, startTransition } from 'react';
import { useParams } from 'react-router-dom';
import { Globe, Download, LayoutDashboard, List, RefreshCw } from 'lucide-react';
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
import {
    SAFE_BUTTON_SELECTORS,
    SAFE_CARD_SELECTORS,
    createSafeInteractionScopeCss,
} from '../../lib/uiMotion';
import { SafeButton } from '../../components/common/ui/SafeButton';
import { SurfaceCard } from '../../components/common/ui/SurfaceCard';
import { ToolbarGroup } from '../../components/common/ui/ToolbarGroup';
import { createAmbientSurface, createPremiumBadgeStyle } from '../../components/common/ui';
import { AdInsightProviderBoundary } from './AdInsightProviderBoundary';

const AdInsightDashboard = lazy(() =>
    import('./Dashboard/AdInsightDashboard').then((module) => ({ default: module.AdInsightDashboard })),
);

const HEADER_ACTIONS_STYLE = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    flex: 1,
    justifyContent: 'flex-end',
    minHeight: '36px',
} as const;

const PAGINATION_CARD_STYLE = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '1.5rem',
    gap: '2rem',
} as const;

const VIEW_TOOLBAR_STYLE = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    flexWrap: 'wrap',
    marginBottom: '1rem',
} as const;

const PAGE_SIZE_OPTIONS = [50, 100, 200, 500] as const;

interface SaveFilePickerWindow extends Window {
    showSaveFilePicker?: (options?: {
        suggestedName?: string;
        id?: string;
        types?: Array<{
            description: string;
            accept: Record<string, string[]>;
        }>;
    }) => Promise<{
        createWritable: () => Promise<{
            write: (contents: BlobPart) => Promise<void>;
            close: () => Promise<void>;
        }>;
    }>;
}

export default function AdInsightPage() {
    const { platform } = useParams();
    const platformId = (platform === 'traveloka' ? 'traveloka' : 'klook');
    const config = PLATFORMS[platformId];

    const [selectedView, setSelectedView] = useState("list");
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

    const handleViewChange = useCallback((view: 'list' | 'dashboard') => {
        startTransition(() => {
            setSelectedView(view);
            setSelectedIds([]);
        });
    }, []);

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
                            else if (field === 'geo_entity') prefix = 'geo_entity=';
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
                    const picker = (window as SaveFilePickerWindow).showSaveFilePicker;
                    if (!picker) {
                        throw new Error('File picker is unavailable');
                    }
                    const handle = await picker({
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
                } catch (err: unknown) {
                    if (err instanceof DOMException && err.name === 'AbortError') return;
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
        <AdInsightProviderBoundary>
            <div className="page-container adinsight-page">
            <style>{`
                ${createSafeInteractionScopeCss('.adinsight-page', [...SAFE_BUTTON_SELECTORS, ...SAFE_CARD_SELECTORS])}
            `}</style>
            <InsightActionBar
                selectedCount={selectedIds.length}
                onClear={() => setSelectedIds([])}
                onApply={(payload) => {
                    const finalPayload: Partial<PageRecord> & { include_for_dsa?: boolean } = { ...payload };
                    if (payload.is_active !== undefined) {
                        finalPayload.include_for_dsa = payload.is_active;
                    }
                    if (payload.country) {
                        finalPayload.country = payload.country;
                    }
                    handleBulkUpdate(finalPayload);
                }}
                isUpdating={isBulkUpdating}
                allowTierUpdate={platformId !== 'traveloka'}
            />

            <SurfaceCard
                padding="1rem 1.1rem"
                style={{
                    ...VIEW_TOOLBAR_STYLE,
                    borderRadius: '1.35rem',
                    paddingBlock: '1.05rem',
                    ...createAmbientSurface('#3b82f6', 0.38),
                    background: [
                        'radial-gradient(circle at top left, rgba(59, 130, 246, 0.14) 0%, transparent 24%)',
                        'radial-gradient(circle at 85% 120%, rgba(20, 184, 166, 0.1) 0%, transparent 28%)',
                        'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 98%, white 2%) 0%, color-mix(in srgb, var(--bg-content) 91%, var(--bg-main) 9%) 100%)',
                    ].join(', '),
                    boxShadow: '0 26px 44px -34px rgba(15, 23, 42, 0.74)',
                    border: '1px solid color-mix(in srgb, var(--border-subtle) 78%, rgba(59, 130, 246, 0.28) 22%)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, hsla(var(--primary) / 0.14) 0%, rgba(20, 184, 166, 0.12) 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'hsl(var(--primary))',
                            border: '1px solid hsla(var(--primary) / 0.18)',
                        }}>
                            <Globe size={18} />
                        </div>
                        <div>
                            <span className="hero-badge" style={{ marginBottom: '0.38rem', ...createPremiumBadgeStyle('#3b82f6', { textColor: '#93c5fd' }) }}>
                                AdInsight Workspace
                            </span>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', margin: '0.12rem 0 0', fontWeight: 700 }}>
                                Collection: {config.collection}
                            </p>
                        </div>
                    </div>

                    <ToolbarGroup
                        compact
                        role="group"
                        aria-label="Switch between List and Dashboard view"
                        style={{
                            background: 'var(--bg-overlay)',
                            overflow: 'hidden',
                            marginLeft: '0.5rem',
                            borderRadius: '12px',
                        }}
                    >
                        <SafeButton
                            aria-label="List View"
                            aria-pressed={selectedView === 'list'}
                            onClick={() => handleViewChange('list')}
                            title="List View"
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '34px', height: '34px', border: 'none', cursor: 'pointer',
                                background: selectedView === 'list' ? 'hsl(var(--primary))' : 'transparent',
                                color: selectedView === 'list' ? 'white' : 'var(--text-dim)',
                            }}
                        >
                            <List size={14} />
                        </SafeButton>
                        <SafeButton
                            aria-label="Dashboard Intelligence View"
                            aria-pressed={selectedView === 'dashboard'}
                            onClick={() => handleViewChange('dashboard')}
                            title="Dashboard Intelligence"
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '34px', height: '34px', border: 'none', cursor: 'pointer',
                                background: selectedView === 'dashboard' ? 'hsl(var(--primary))' : 'transparent',
                                color: selectedView === 'dashboard' ? 'white' : 'var(--text-dim)',
                            }}
                        >
                            <LayoutDashboard size={14} />
                        </SafeButton>
                    </ToolbarGroup>
                </div>
                <div style={HEADER_ACTIONS_STYLE}>
                    {selectedView === 'list' && (
                        <>
                            <SafeButton
                                onClick={() => fetchPages(currentPage)}
                                className="hero-btn hero-btn-ghost"
                                style={{
                                    padding: '0.6rem 0.85rem',
                                    gap: '0.45rem',
                                    fontSize: '13px',
                                    borderRadius: '10px',
                                    background: 'var(--bg-overlay)',
                                    border: '1px solid var(--border-subtle)',
                                }}
                            >
                                <RefreshCw size={15} />
                                Refresh
                            </SafeButton>
                            <SafeButton
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
                            </SafeButton>
                            <SafeButton
                                onClick={() => setIsExportModalOpen(true)}
                                disabled={exporting}
                                className="hero-btn hero-btn-primary"
                                style={{ padding: '0.6rem 1.2rem', gap: '0.5rem', fontSize: '13px', borderRadius: '10px' }}
                            >
                                <Download size={16} />
                                {exporting ? 'Exporting...' : 'CSV'}
                            </SafeButton>
                        </>
                    )}
                </div>
            </SurfaceCard>

            {selectedView === 'list' ? (
                <>
                    <SurfaceCard
                        padding="1rem 1.2rem"
                        style={{
                            marginBottom: '1.5rem',
                            borderRadius: '1.75rem',
                            ...createAmbientSurface('#3b82f6', 0.78),
                            background: [
                                'radial-gradient(circle at top right, rgba(59, 130, 246, 0.14) 0%, transparent 24%)',
                                'radial-gradient(circle at 18% 110%, rgba(245, 158, 11, 0.08) 0%, transparent 28%)',
                                'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 97%, white 3%) 0%, color-mix(in srgb, var(--bg-content) 90%, var(--bg-main) 10%) 100%)',
                            ].join(', '),
                            boxShadow: '0 30px 54px -38px rgba(15, 23, 42, 0.78)',
                            border: '1px solid color-mix(in srgb, var(--border-subtle) 76%, rgba(59, 130, 246, 0.24) 24%)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                            <div>
                                <span className="hero-badge" style={{ marginBottom: '0.55rem', ...createPremiumBadgeStyle('#3b82f6', { textColor: '#93c5fd' }) }}>
                                    AdInsight Workspace
                                </span>
                                <h1 style={{ margin: '0.2rem 0 0', fontSize: '1.75rem', lineHeight: 1.05, color: 'var(--text-main)', fontWeight: 850 }}>
                                    {config.name} Analytics
                                </h1>
                                <p style={{ margin: '0.35rem 0 0', color: 'var(--text-dim)', fontWeight: 600 }}>
                                    Operator-first SEO analytics surface for {config.collection}.
                                </p>
                                <p style={{ margin: '1rem 0 0', color: 'var(--text-main)', fontWeight: 700, maxWidth: '38rem' }}>
                                    Use list mode for record QA, bulk actions, and exports.
                                </p>
                            </div>
                            <div style={{
                                minWidth: '190px',
                                padding: '1rem 1.15rem',
                                borderRadius: '1.25rem',
                                textAlign: 'center',
                                background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 88%, white 12%) 0%, color-mix(in srgb, var(--bg-content) 94%, var(--bg-main) 6%) 100%)',
                                border: '1px solid color-mix(in srgb, var(--border-subtle) 78%, rgba(59, 130, 246, 0.22) 22%)',
                                boxShadow: 'inset 0 1px 0 color-mix(in srgb, white 42%, transparent), 0 18px 32px -28px rgba(59, 130, 246, 0.38)',
                                backdropFilter: 'blur(10px)',
                            }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                                    Live Universe
                                </div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 850, color: 'hsl(var(--primary))', lineHeight: 1 }}>
                                    {totalCount.toLocaleString()}
                                </div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', marginTop: '0.35rem', letterSpacing: '0.05em' }}>
                                    {isFiltered ? 'Matching Records' : 'Total Records'}
                                </div>
                            </div>
                        </div>
                    </SurfaceCard>

                    <InsightFilterBar
                        filters={config.filters}
                        currentValues={filters}
                        onFilterChange={handleFilterChange}
                        countries={countries}
                        sitemapTags={sitemapTags}
                    />

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

                        <SurfaceCard
                            padding="1.25rem"
                            style={{
                                ...PAGINATION_CARD_STYLE,
                                borderRadius: '1.45rem',
                                background: 'linear-gradient(180deg, var(--bg-content) 0%, color-mix(in srgb, var(--bg-content) 90%, var(--bg-main) 10%) 100%)',
                                boxShadow: '0 18px 34px -30px rgba(15, 23, 42, 0.62)',
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
                                    {PAGE_SIZE_OPTIONS.map((size) => (
                                        <option key={size} value={size}>
                                            {size}
                                        </option>
                                    ))}
                                </select>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                                    Showing {((currentPage - 1) * perPage) + 1}-{Math.min(currentPage * perPage, totalCount)} of {totalCount.toLocaleString()}
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <SafeButton
                                    onClick={() => fetchPages(currentPage - 1)}
                                    disabled={currentPage === 1 || loading}
                                    className="hero-btn hero-btn-secondary"
                                    style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                                >
                                    ← Prev
                                </SafeButton>

                                <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', padding: '0 0.5rem', fontWeight: 700 }}>
                                    Page {currentPage} / {totalPages}
                                </span>

                                <SafeButton
                                    onClick={() => fetchPages(currentPage + 1)}
                                    disabled={currentPage === totalPages || loading}
                                    className="hero-btn hero-btn-secondary"
                                    style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                                >
                                    Next →
                                </SafeButton>
                            </div>
                        </SurfaceCard>
                    </div>

                    <InsightExportModal
                        isOpen={isExportModalOpen}
                        onClose={() => setIsExportModalOpen(false)}
                        onExport={handleExport}
                        fields={config.exportFields}
                        totalCount={totalCount}
                        isExporting={exporting}
                    />
                </>
            ) : (
                <Suspense fallback={<div style={{ padding: '2rem', color: 'var(--text-dim)', fontWeight: 700 }}>Loading dashboard...</div>}>
                    <AdInsightDashboard platformInfo={config} sitemapTags={sitemapTags} />
                </Suspense>
            )}

            </div>
        </AdInsightProviderBoundary>
    );
}
