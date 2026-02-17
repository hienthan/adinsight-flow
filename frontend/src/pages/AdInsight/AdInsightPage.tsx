import { useState, useCallback, useMemo } from 'react';
import { Globe } from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { usePlatformAnalytics } from '../../hooks/usePlatformAnalytics';
import { usePlatformMeta } from '../../hooks/usePlatformMeta';
import { PLATFORMS } from '../../config/platforms';
import { InsightDataTable } from './InsightDataTable';
import { InsightFilterBar } from './InsightFilterBar';
import { InsightExportModal } from './InsightExportModal';
import { buildFilterString } from './insightUtils';
import { PageRecord } from '../../types/adinsight';

export default function AdInsightPage() {
    const [platformId, setPlatformId] = useState<'klook' | 'traveloka'>('klook');
    const config = PLATFORMS[platformId];

    const [perPage, setPerPage] = useState(100);
    const initialFilters = useMemo(() => ({
        sitemap_tag: config.defaultSitemapTags[0],
        titleKey: config.titleKey
    }), [config]);

    const {
        records,
        totalCount,
        totalPages,
        loading,
        currentPage,
        filters,
        setFilters,
        fetchPages
    } = usePlatformAnalytics({
        collection: config.collection,
        perPage: perPage,
        initialFilters
    });

    const { countries, sitemapTags } = usePlatformMeta(config.defaultSitemapTags);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exporting, setExporting] = useState(false);

    const handleFilterChange = useCallback((id: string, value: string) => {
        setFilters(prev => ({ ...prev, [id]: value }));
    }, [setFilters]);

    const handleReset = () => {
        setFilters(initialFilters);
    };

    const handlePlatformSwitch = (id: 'klook' | 'traveloka') => {
        setPlatformId(id);
    };

    const handleExport = async (selectedFields: string[], customFileName: string) => {
        try {
            setExporting(true);
            const filterString = buildFilterString(filters);
            const allRecords: PageRecord[] = [];
            let page = 1;
            let hasMore = true;

            while (hasMore) {
                const result = await pb.collection(config.collection).getList<PageRecord>(page, 500, {
                    sort: 'tier',
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

                selectedFields.forEach(field => {
                    const value = record[field as keyof PageRecord];
                    if (field === 'tier' && value) {
                        labelParts.push(`Tier${value}`);
                    } else if (value) {
                        labelParts.push(String(value));
                    }
                });

                const labels = labelParts.join(';');
                return `${url},${labels}`;
            }).join('\n');

            const csv = csvHeader + csvRows;
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const urlObj = URL.createObjectURL(blob);
            const a = document.createElement('a');

            const defaultName = `${platformId}-${filters.sitemap_tag || 'all'}-${allRecords.length}`;
            a.download = `${customFileName || defaultName}.csv`;
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-overlay)', padding: '0.4rem', borderRadius: '12px' }}>
                        {(['klook', 'traveloka'] as const).map(id => (
                            <button
                                key={id}
                                onClick={() => handlePlatformSwitch(id)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: platformId === id ? 'hsl(var(--primary))' : 'transparent',
                                    color: platformId === id ? '#fff' : 'var(--text-dim)'
                                }}
                            >
                                {id.toUpperCase()}
                            </button>
                        ))}
                    </div>

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

                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'hsl(var(--primary))', lineHeight: 1 }}>
                        {totalCount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginTop: '0.25rem' }}>
                        {isFiltered ? 'Matching Records' : 'Total Records'}
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <InsightFilterBar
                filters={config.filters}
                currentValues={filters}
                onFilterChange={handleFilterChange}
                onReset={handleReset}
                onExport={() => setIsExportModalOpen(true)}
                countries={countries}
                sitemapTags={sitemapTags}
                isExporting={exporting}
            />

            {/* Main Content Table */}
            <div className="animate-fade">
                <InsightDataTable
                    records={records}
                    columns={config.columns}
                    loading={loading}
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
