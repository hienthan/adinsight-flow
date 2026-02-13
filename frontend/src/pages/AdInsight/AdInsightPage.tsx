// This file contains the existing AdInsight URL analysis logic
// Migrated from App.tsx for the new router structure

import { useEffect, useState, useCallback } from 'react';
import { pb } from '../../lib/pocketbase';
import {
    Search,
    MapPin,
    Download,
    ExternalLink,
} from 'lucide-react';

interface PageRecord {
    id: string;
    url: string;
    slug: string;
    country: string;
    city: string;
    tier: string;
    canonical_id: string;
    translated_title_vi: string;
    funnel_stage?: string;
    include_for_dsa: boolean;
    exclude_for_dsa: boolean;
    is_private: boolean;
    languages: string[];
    content_type: string;
    sub_tag?: string;  // NEW: for mobility URLs
    metadata?: {
        funnel_rule_hit?: string;
        tier_source?: string;
        year_detected?: string;
        geo_source?: string;
    };
}

const DEFAULT_SITEMAP_TAGS = ['blog', 'activity', 'mobility'];

const toTitleCase = (value: string) =>
    value
        .split('-')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

const buildSitemapTagFilter = (tag: string) => {
    if (tag === 'activity') {
        return '(sitemap_tag = "activity" || sitemap_tag = "experiences-activity")';
    }
    if (tag === 'mobility') {
        return '(sitemap_tag = "mobility" || sitemap_tag = "experiences-mobility")';
    }
    return `sitemap_tag = "${tag}"`;
};

export default function AdInsightPage() {
    const [pages, setPages] = useState<PageRecord[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(100);
    const [filterSitemapTag, setFilterSitemapTag] = useState('blog');
    const [searchTitleInput, setSearchTitleInput] = useState('');
    const [searchTitleTerm, setSearchTitleTerm] = useState('');
    const [filterTier, setFilterTier] = useState('');
    const [filterFunnelStage, setFilterFunnelStage] = useState('');
    const [filterCountry, setFilterCountry] = useState('');
    const [filterLanguage, setFilterLanguage] = useState('all');
    const [sitemapTags, setSitemapTags] = useState<string[]>(DEFAULT_SITEMAP_TAGS);
    const [countries, setCountries] = useState<string[]>([]);
    const [exporting, setExporting] = useState(false);

    // Fetch countries metadata
    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const records = await pb.collection('platform_metadata').getFullList({
                    sort: 'value'
                });
                const uniqueCountries = Array.from(new Set(records.filter(r => r.type === 'country').map(r => r.value))).sort();
                const metadataTags = Array.from(
                    new Set(
                        records
                            .filter((r) => r.type === 'sitemap_tag')
                            .map((r) => String(r.value || '').split(':')[0])
                            .filter(Boolean)
                    )
                ).sort();
                setCountries(uniqueCountries);
                const merged = Array.from(new Set([...DEFAULT_SITEMAP_TAGS, ...metadataTags]));
                setSitemapTags(merged);
            } catch (err) {
                console.error('Meta fetch error', err);
            }
        };
        fetchMeta();
    }, []);

    const getTierStyle = (tier: string) => {
        switch (tier) {
            case '1': return { background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' };
            case '2': return { background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' };
            case '3': return { background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.2)' };
            case '5': return { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' };
            default: return { background: 'var(--bg-overlay)', color: 'var(--text-dim)', border: '1px solid var(--border-subtle)' };
        }
    };

    const getFunnelStyle = (stage?: string) => {
        switch (stage) {
            case 'readiness':
                return { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' };
            case 'planning':
                return { background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' };
            default:
                return { background: 'rgba(107, 114, 128, 0.1)', color: '#6b7280', border: '1px solid rgba(107, 114, 128, 0.2)' };
        }
    };

    const fetchPages = useCallback(async (pageNum: number) => {
        // if (loading) return; // Allow re-fetch if params change
        setLoading(true);

        try {
            let filterString = buildSitemapTagFilter(filterSitemapTag);

            if (filterLanguage !== 'all') {
                if (filterLanguage === 'both') {
                    filterString += ` && languages ~ "zh-HK" && languages ~ "zh-TW"`;
                } else {
                    filterString += ` && languages ~ "${filterLanguage}"`;
                }
            }

            if (searchTitleTerm) filterString += ` && translated_title_vi ~ "${searchTitleTerm}"`;
            if (filterTier) filterString += ` && tier = "${filterTier}"`;
            if (filterFunnelStage) filterString += ` && funnel_stage = "${filterFunnelStage}"`;
            if (filterCountry) filterString += ` && country = "${filterCountry}"`;

            const result = await pb.collection('pages').getList<PageRecord>(pageNum, perPage, {
                sort: 'tier',
                filter: filterString,
            });

            setPages(result.items);
            setTotalCount(result.totalItems);
            setTotalPages(result.totalPages);
            setCurrentPage(pageNum);
        } catch (err: any) {
            if (err?.isAbort) return;
            console.error('Fetch error', err);
        } finally {
            setLoading(false);
        }
    }, [filterSitemapTag, searchTitleTerm, filterTier, filterFunnelStage, filterCountry, filterLanguage, perPage]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTitleTerm(searchTitleInput);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTitleInput]);

    useEffect(() => {
        setCurrentPage(1);
        fetchPages(1);
    }, [filterSitemapTag, searchTitleTerm, filterTier, filterFunnelStage, filterCountry, filterLanguage, perPage]);

    const [showExportOptions, setShowExportOptions] = useState(false);
    const [selectedFields, setSelectedFields] = useState<string[]>(['funnel_stage', 'tier', 'country', 'city']);
    const [exportFileName, setExportFileName] = useState('');

    const toggleField = (field: string) => {
        setSelectedFields(prev =>
            prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
        );
    };

    const handleExport = async () => {
        let filterString = buildSitemapTagFilter(filterSitemapTag);

        if (filterLanguage !== 'all') {
            if (filterLanguage === 'both') {
                filterString += ` && languages ~ "zh-HK" && languages ~ "zh-TW"`;
            } else {
                filterString += ` && languages ~ "${filterLanguage}"`;
            }
        }

        if (searchTitleTerm) filterString += ` && translated_title_vi ~ "${searchTitleTerm}"`;
        if (filterTier) filterString += ` && tier = "${filterTier}"`;
        if (filterFunnelStage) filterString += ` && funnel_stage = "${filterFunnelStage}"`;
        if (filterCountry) filterString += ` && country = "${filterCountry}"`;

        try {
            setExporting(true);
            const allRecords: PageRecord[] = [];
            let page = 1;
            let hasMore = true;

            while (hasMore) {
                const result = await pb.collection('pages').getList<PageRecord>(page, 500, {
                    sort: 'tier',
                    filter: filterString,
                });

                allRecords.push(...result.items);
                hasMore = result.items.length === 500;
                page++;
            }

            const csvHeader = 'Page URL,Custom Label\n';
            const csvRows = allRecords.map(record => {
                const url = filterLanguage !== 'all' && filterLanguage !== 'both'
                    ? record.url.replace(/\/(zh-HK|zh-TW)\//, `/${filterLanguage}/`)
                    : record.url;

                const labelParts: string[] = [];

                if (selectedFields.includes('country')) {
                    labelParts.push(record.country || 'Unknown');
                }
                if (selectedFields.includes('city') && record.city) {
                    labelParts.push(record.city);
                }
                if (selectedFields.includes('tier')) {
                    labelParts.push(`Tier${record.tier || 'Unknown'}`);
                }
                if (selectedFields.includes('funnel_stage')) {
                    labelParts.push(record.funnel_stage || 'awareness');
                }
                if (selectedFields.includes('sub_tag') && record.sub_tag) {
                    labelParts.push(record.sub_tag);
                }
                if (selectedFields.includes('funnel_rule_hit') && record.metadata?.funnel_rule_hit) {
                    labelParts.push(record.metadata.funnel_rule_hit);
                }
                if (selectedFields.includes('tier_source') && record.metadata?.tier_source) {
                    labelParts.push(record.metadata.tier_source);
                }
                if (selectedFields.includes('year_detected') && record.metadata?.year_detected) {
                    labelParts.push(record.metadata.year_detected);
                }
                if (selectedFields.includes('geo_source') && record.metadata?.geo_source) {
                    labelParts.push(record.metadata.geo_source);
                }

                const labels = labelParts.join(';');
                return `${url},${labels}`;
            }).join('\n');

            const csv = csvHeader + csvRows;

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const urlObj = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const lang = filterLanguage !== 'all' && filterLanguage !== 'both' ? filterLanguage : 'all';
            const sitemap = filterSitemapTag;
            const country = filterCountry ? filterCountry.toLowerCase().replace(/\s+/g, '-') : 'all';
            const funnel = filterFunnelStage || 'all';
            const tier = filterTier ? `tier${filterTier}` : 'all';

            const defaultName = `${lang}-${sitemap}-${country}-${funnel}-${tier}-${allRecords.length}`;
            a.download = `${exportFileName || defaultName}.csv`;
            a.href = urlObj;
            a.click();

            console.log(`Exported ${allRecords.length} URLs to CSV`);
            setShowExportOptions(false);
        } catch (err) {
            console.error('Export error:', err);
            alert('Export failed. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    const handleReset = () => {
        setFilterSitemapTag('blog');
        setFilterTier('');
        setFilterFunnelStage('');
        setFilterCountry('');
        setFilterLanguage('all');
        setSearchTitleTerm('');
        setSearchTitleInput('');
    };

    const isFiltered = searchTitleTerm || filterTier || filterFunnelStage || filterCountry || filterLanguage !== 'all' || filterSitemapTag !== 'blog';

    return (
        <div className="page-container">
            {/* Header / Summary Card */}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'hsla(var(--primary) / 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'hsl(var(--primary))'
                    }}>
                        <ExternalLink size={20} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                            Klook URL Analytics
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>
                            Platform: Klook | Tag: {filterSitemapTag}
                        </p>
                    </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'hsl(var(--primary))', lineHeight: 1 }}>
                        {totalCount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginTop: '0.25rem' }}>
                        {isFiltered ? 'Matching URLs' : 'Total URLs'}
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <section className="filter-bar">
                <div className="filter-group">
                    <label>Search Title</label>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                        <input
                            type="text"
                            placeholder="Type to search..."
                            value={searchTitleInput}
                            onChange={(e) => setSearchTitleInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && setSearchTitleTerm(searchTitleInput)}
                            style={{ width: '240px', paddingLeft: '2.5rem' }}
                        />
                    </div>
                </div>

                <div className="filter-group">
                    <label>Sitemap Tag</label>
                    <select value={filterSitemapTag} onChange={(e) => setFilterSitemapTag(e.target.value)}>
                        {sitemapTags.map((tag) => (
                            <option key={tag} value={tag}>
                                {toTitleCase(tag)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>Country</label>
                    <input
                        type="text"
                        list="country-list"
                        value={filterCountry}
                        onChange={(e) => setFilterCountry(e.target.value)}
                        placeholder="Global / All"
                        style={{ width: '160px' }}
                    />
                    <datalist id="country-list">
                        <option value="">Global / All</option>
                        {countries.map(c => <option key={c} value={c} />)}
                    </datalist>
                </div>

                <div className="filter-group">
                    <label>Funnel Stage</label>
                    <select value={filterFunnelStage} onChange={(e) => setFilterFunnelStage(e.target.value)}>
                        <option value="">All Stages</option>
                        <option value="awareness">Awareness</option>
                        <option value="planning">Planning</option>
                        <option value="readiness">Readiness</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label>Tier</label>
                    <select value={filterTier} onChange={(e) => setFilterTier(e.target.value)}>
                        <option value="">All Tiers</option>
                        <option value="1">Tier 1</option>
                        <option value="2">Tier 2</option>
                        <option value="3">Tier 3</option>
                        <option value="4">Tier 4</option>
                        <option value="5">Tier 5</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label>Language</label>
                    <select value={filterLanguage} onChange={(e) => setFilterLanguage(e.target.value)}>
                        <option value="all">All Languages</option>
                        <option value="zh-HK">zh-HK Only</option>
                        <option value="zh-TW">zh-TW Only</option>
                        <option value="both">Both (zh-HK & zh-TW)</option>
                    </select>
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem', alignSelf: 'flex-end' }}>
                    <button
                        onClick={handleReset}
                        className="hero-btn hero-btn-secondary"
                        style={{ padding: '0.6rem 1.2rem' }}
                    >
                        Reset
                    </button>

                    <button
                        onClick={() => setShowExportOptions(true)}
                        disabled={exporting}
                        className="hero-btn hero-btn-primary"
                        style={{ padding: '0.6rem 1.5rem', gap: '0.6rem' }}
                    >
                        <Download size={18} />
                        {exporting ? 'Exporting...' : 'Export DSA CSV'}
                    </button>

                </div>
            </section>

            {/* Main Content Table */}
            <div className="animate-fade">
                <div className="data-table-container hero-card" style={{ padding: 0 }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: '80px' }}>ID</th>
                                <th style={{ width: '320px' }}>Slug</th>
                                <th>Smart Title</th>
                                <th style={{ width: '120px' }}>Funnel</th>
                                <th style={{ width: '60px' }}>Tier</th>
                                <th>Location</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pages.map((page) => (
                                <tr key={page.id}>
                                    <td style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', width: '80px' }}>
                                        {page.canonical_id === "0" ? "-" : `#${page.canonical_id}`}
                                    </td>
                                    <td style={{ maxWidth: '320px', overflow: 'hidden' }}>
                                        <a href={page.url} target="_blank" rel="noopener noreferrer" className="slug-link" title="Open original URL" style={{ maxWidth: '100%' }}>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{page.slug}</span>
                                            <ExternalLink size={12} style={{ flexShrink: 0 }} />
                                        </a>
                                    </td>
                                    <td style={{ fontWeight: 600, color: 'var(--text-main)', minWidth: '200px' }}>{page.translated_title_vi}</td>
                                    <td style={{ width: '120px' }}>
                                        <div className="hero-badge" style={{
                                            textTransform: 'capitalize',
                                            padding: '0.2rem 0.5rem',
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            borderRadius: '6px',
                                            justifyContent: 'center',
                                            ...getFunnelStyle(page.funnel_stage)
                                        }}>
                                            {page.funnel_stage || 'awareness'}
                                        </div>
                                    </td>
                                    <td style={{ width: '60px' }}>
                                        <div className="hero-badge" style={{
                                            textTransform: 'none', padding: '0.2rem 0.5rem', fontSize: '0.75rem',
                                            fontWeight: 800, borderRadius: '6px', minWidth: '24px', justifyContent: 'center',
                                            ...getTierStyle(page.tier)
                                        }}>
                                            {page.tier}
                                        </div>
                                    </td>

                                    <td style={{ minWidth: '150px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <MapPin size={12} style={{ color: 'hsl(var(--primary))', opacity: 0.8 }} />
                                            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-dim)', fontWeight: 500 }}>{page.city}, {page.country}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {loading && (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>Loading next batch...</td></tr>
                            )}
                            {pages.length === 0 && !loading && (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>No records found for active filters.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

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
                            style={{ padding: '0.4rem', borderRadius: '0.75rem', border: '1px solid var(--border-subtle)', background: 'var(--bg-content)', fontSize: '0.85rem' }}
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
                            disabled={currentPage === 1}
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
                            disabled={currentPage === totalPages}
                            className="hero-btn hero-btn-secondary"
                            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                        >
                            Next →
                        </button>
                    </div>
                </div>
            </div>
            {/* Export Modal - Placed at root level to avoid clipping and layering issues */}
            {showExportOptions && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(0, 0, 0, 0.25)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 999999,
                    padding: '1.5rem',
                    animation: 'fade-in 0.2s ease-out'
                }} onClick={() => setShowExportOptions(false)}>
                    <div
                        style={{
                            width: '100%',
                            maxWidth: '500px',
                            background: 'var(--bg-card)',
                            borderRadius: '24px',
                            boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.4)',
                            border: '1px solid var(--border-subtle)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            maxHeight: '85vh',
                            position: 'relative',
                            animation: 'zoom-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{
                            padding: '1.75rem 2rem',
                            borderBottom: '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'var(--bg-main)'
                        }}>
                            <div>
                                <h4 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'hsl(var(--primary))', letterSpacing: '-0.02em' }}>
                                    Export Configuration
                                </h4>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', margin: '0.25rem 0 0 0' }}>
                                    Choose fields to include in 'Custom Label'
                                </p>
                            </div>
                            <button
                                onClick={() => setShowExportOptions(false)}
                                style={{
                                    background: 'var(--bg-overlay)',
                                    border: '1px solid var(--border-subtle)',
                                    color: 'var(--text-main)',
                                    cursor: 'pointer',
                                    width: '36px',
                                    height: '36px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '10px',
                                    transition: 'all 0.2s',
                                    fontSize: '1.5rem'
                                }}
                            >
                                &times;
                            </button>
                        </div>

                        {/* Filename Input */}
                        <div style={{ padding: '1.5rem 2rem 0 2rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                                Filename (Optional)
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    placeholder="Enter custom filename..."
                                    value={exportFileName}
                                    onChange={(e) => setExportFileName(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        borderRadius: '12px',
                                        border: '1px solid var(--border-subtle)',
                                        background: 'var(--bg-content)',
                                        fontSize: '0.9rem',
                                        color: 'var(--text-main)',
                                        outline: 'none',
                                        transition: 'all 0.2s'
                                    }}
                                    onFocus={(e) => { e.target.style.borderColor = 'hsl(var(--primary))'; e.target.style.boxShadow = '0 0 0 4px hsla(var(--primary) / 0.1)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = 'var(--border-subtle)'; e.target.style.boxShadow = 'none'; }}
                                />
                                <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: 'var(--text-dim)', pointerEvents: 'none' }}>
                                    .csv
                                </span>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {[
                                    { id: 'country', label: 'Country Name', desc: 'e.g. Hong Kong, Japan' },
                                    { id: 'city', label: 'City Name', desc: 'Included if present' },
                                    { id: 'tier', label: 'Tier (1,2,3,4,5)', desc: 'Adds Tier prefix' },
                                    { id: 'funnel_stage', label: 'Funnel Stage', desc: 'awareness/planning/readiness' },
                                    { id: 'funnel_rule_hit', label: 'Funnel Rule Hit', desc: 'Matched keyword or regex' },
                                    { id: 'tier_source', label: 'Tier Source', desc: 'funnel_stage or year_override' },
                                    { id: 'year_detected', label: 'Year Detected', desc: 'For stale-year tier override' },
                                    { id: 'geo_source', label: 'Geo Source', desc: 'translated_title_vi / decoded_slug / slug' },
                                    { id: 'sub_tag', label: 'Sub-tag', desc: 'Optional taxonomy field' }
                                ].map(field => (
                                    <label
                                        key={field.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            cursor: 'pointer',
                                            padding: '1rem',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border-subtle)',
                                            background: 'var(--bg-content)',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'hsl(var(--primary))'; e.currentTarget.style.background = 'hsla(var(--primary) / 0.02)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'var(--bg-content)'; }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedFields.includes(field.id)}
                                            onChange={() => toggleField(field.id)}
                                            style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'hsl(var(--primary))' }}
                                        />
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>{field.label}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{field.desc}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            padding: '1.5rem 2rem',
                            borderTop: '1px solid var(--border-subtle)',
                            background: 'var(--bg-main)',
                            display: 'flex',
                            gap: '1rem'
                        }}>
                            <button
                                onClick={() => setShowExportOptions(false)}
                                className="hero-btn hero-btn-secondary"
                                style={{ flex: 1, padding: '0.85rem' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleExport}
                                disabled={exporting || selectedFields.length === 0}
                                className="hero-btn hero-btn-primary"
                                style={{ flex: 2, padding: '0.85rem', gap: '0.6rem' }}
                            >
                                {exporting ? 'Exporting...' : (
                                    <>
                                        <Download size={18} />
                                        <span>Export {totalCount.toLocaleString()} Records</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
