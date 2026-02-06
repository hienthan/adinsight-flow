// This file contains the existing AdInsight URL analysis logic
// Migrated from App.tsx for the new router structure

import { useEffect, useState, useCallback } from 'react';
import { pb } from '../../lib/pocketbase';
import {
    Search,
    MapPin,
    Download,
    Lock,
    ExternalLink,
    ShieldCheck,
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
    include_for_dsa: boolean;
    exclude_for_dsa: boolean;
    is_private: boolean;
    languages: string[];
    content_type: string;
}

export default function AdInsightPage() {
    const [pages, setPages] = useState<PageRecord[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(100);
    const [selectedTag] = useState('experiences-activity');
    const [selectedLang] = useState('zh-HK');
    const [searchInput, setSearchInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTier, setFilterTier] = useState('');
    const [filterCountry, setFilterCountry] = useState('');
    const [filterPrivate, setFilterPrivate] = useState<boolean | null>(null);
    const [filterLanguage, setFilterLanguage] = useState('all');
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
                setCountries(uniqueCountries);
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
            case '3': return { background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' };
            default: return { background: 'var(--bg-overlay)', color: 'var(--text-dim)', border: '1px solid var(--border-subtle)' };
        }
    };

    const fetchPages = useCallback(async (pageNum: number) => {
        if (loading) return;
        setLoading(true);

        try {
            let filterString = `sitemap_tag = "${selectedTag}"`;

            if (filterLanguage !== 'all') {
                if (filterLanguage === 'both') {
                    filterString += ` && languages ~ "zh-HK" && languages ~ "zh-TW"`;
                } else {
                    filterString += ` && languages ~ "${filterLanguage}"`;
                }
            }

            if (searchTerm) filterString += ` && slug ~ "${searchTerm}"`;
            if (filterTier) filterString += ` && tier = "${filterTier}"`;
            if (filterCountry) filterString += ` && country = "${filterCountry}"`;
            if (filterPrivate !== null) filterString += ` && is_private = ${filterPrivate}`;

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
    }, [selectedTag, searchTerm, filterTier, filterCountry, filterPrivate, filterLanguage, perPage, loading]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(searchInput);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Fetch on filter change
    useEffect(() => {
        setCurrentPage(1);
        fetchPages(1);
    }, [selectedTag, selectedLang, searchTerm, filterTier, filterCountry, filterPrivate, filterLanguage, perPage]);

    const handleExport = async () => {
        let filterString = `sitemap_tag = "${selectedTag}"`;

        if (filterLanguage !== 'all') {
            if (filterLanguage === 'both') {
                filterString += ` && languages ~ "zh-HK" && languages ~ "zh-TW"`;
            } else {
                filterString += ` && languages ~ "${filterLanguage}"`;
            }
        }

        if (searchTerm) filterString += ` && slug ~ "${searchTerm}"`;
        if (filterTier) filterString += ` && tier = "${filterTier}"`;
        if (filterCountry) filterString += ` && country = "${filterCountry}"`;
        if (filterPrivate !== null) filterString += ` && is_private = ${filterPrivate}`;

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

                const country = record.country || 'Unknown';
                const city = country === 'Unknown' ? '' : (record.city || '');
                const tier = `Tier${record.tier || 'Unknown'}`;
                const privacy = record.is_private ? 'Private' : 'Public';

                const labels = city
                    ? [country, city, tier, privacy].join(',')
                    : [country, tier, privacy].join(',');

                return `${url},${labels}`;
            }).join('\n');

            const csv = csvHeader + csvRows;

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const urlObj = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const lang = filterLanguage !== 'all' && filterLanguage !== 'both' ? filterLanguage : 'all';
            const sitemap = selectedTag.replace('experiences-', '');
            const country = filterCountry ? filterCountry.toLowerCase().replace(/\s+/g, '-') : 'all';
            const privacy = filterPrivate === null ? 'all' : (filterPrivate ? 'private' : 'public');
            const tier = filterTier ? `tier${filterTier}` : 'all';

            a.download = `${lang}-${sitemap}-${country}-${privacy}-${tier}-${allRecords.length}.csv`;
            a.href = urlObj;
            a.click();

            console.log(`Exported ${allRecords.length} URLs to CSV`);
        } catch (err) {
            console.error('Export error:', err);
            alert('Export failed. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    const handleReset = () => {
        setFilterTier('');
        setFilterCountry('');
        setFilterPrivate(null);
        setFilterLanguage('all');
        setSearchTerm('');
        setSearchInput('');
    };

    const isFiltered = searchTerm || filterTier || filterCountry || filterPrivate !== null || filterLanguage !== 'all';

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
                            {isFiltered ? 'Matched URL Analytics' : 'Global URL Inventory'}
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>
                            {isFiltered ? 'Showing results for current active filters' : 'Total crawled URLs available in sitemaps'}
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
                    <label>Search Slug</label>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                        <input
                            type="text"
                            placeholder="Type to search..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && setSearchTerm(searchInput)}
                            style={{ width: '240px', paddingLeft: '2.5rem' }}
                        />
                    </div>
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
                    <label>Private</label>
                    <select value={filterPrivate === null ? '' : filterPrivate.toString()} onChange={(e) => setFilterPrivate(e.target.value === '' ? null : e.target.value === 'true')}>
                        <option value="">All Types</option>
                        <option value="false">Public</option>
                        <option value="true">Private</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label>Tier</label>
                    <select value={filterTier} onChange={(e) => setFilterTier(e.target.value)}>
                        <option value="">All Tiers</option>
                        <option value="1">Tier 1</option>
                        <option value="2">Tier 2</option>
                        <option value="5">Tier 5</option>
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
                        onClick={handleExport}
                        disabled={exporting}
                        className="hero-btn hero-btn-primary"
                        style={{ padding: '0.6rem 1.5rem' }}
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
                                <th style={{ width: '60px' }}>Tier</th>
                                <th>Location</th>
                                <th style={{ width: '100px' }}>Access</th>
                                <th style={{ width: '60px', textAlign: 'center' }}>DSA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pages.map((page) => (
                                <tr key={page.id}>
                                    <td style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', width: '80px' }}>#{page.canonical_id}</td>
                                    <td style={{ maxWidth: '320px', overflow: 'hidden' }}>
                                        <a href={page.url} target="_blank" rel="noopener noreferrer" className="slug-link" title="Open original URL" style={{ maxWidth: '100%' }}>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{page.slug}</span>
                                            <ExternalLink size={12} style={{ flexShrink: 0 }} />
                                        </a>
                                    </td>
                                    <td style={{ fontWeight: 600, color: 'var(--text-main)', minWidth: '200px' }}>{page.translated_title_vi}</td>
                                    <td style={{ width: '60px' }}>
                                        <div
                                            className="hero-badge"
                                            style={{
                                                textTransform: 'none',
                                                padding: '0.2rem 0.5rem',
                                                fontSize: '0.75rem',
                                                fontWeight: 800,
                                                borderRadius: '6px',
                                                minWidth: '24px',
                                                justifyContent: 'center',
                                                ...getTierStyle(page.tier)
                                            }}
                                        >
                                            {page.tier}
                                        </div>
                                    </td>
                                    <td style={{ minWidth: '150px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <MapPin size={12} style={{ color: 'hsl(var(--primary))', opacity: 0.8 }} />
                                            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-dim)', fontWeight: 500 }}>{page.city}, {page.country}</span>
                                        </div>
                                    </td>
                                    <td style={{ width: '100px' }}>
                                        {page.is_private ?
                                            <div className="hero-badge" style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.15)', textTransform: 'none', gap: '0.4rem', borderRadius: '6px' }}>
                                                <Lock size={12} /> <span>Private</span>
                                            </div> :
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, paddingLeft: '0.5rem' }}>Public</span>
                                        }
                                    </td>
                                    <td style={{ width: '60px', textAlign: 'center' }}>
                                        {page.include_for_dsa ?
                                            <div title="DSA Active" style={{ color: '#22c55e', display: 'flex', justifyContent: 'center' }}>
                                                <ShieldCheck size={18} strokeWidth={2.5} />
                                            </div> :
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>
                                        }
                                    </td>
                                </tr>
                            ))}
                            {loading && (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>Loading next batch...</td></tr>
                            )}
                            {pages.length === 0 && !loading && (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>No records found for active filters.</td></tr>
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
        </div>
    );
}
