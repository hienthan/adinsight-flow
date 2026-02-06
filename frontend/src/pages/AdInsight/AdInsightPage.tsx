// This file contains the existing AdInsight URL analysis logic
// Migrated from App.tsx for the new router structure

import React, { useEffect, useState, useCallback } from 'react';
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

    const getTierClass = (tier: string) => {
        if (tier === '1') return 'badge badge-tier-1';
        if (tier === '2') return 'badge badge-tier-2';
        if (tier === '5') return 'badge badge-tier-5';
        return 'badge';
    };

    const isFiltered = searchTerm || filterTier || filterCountry || filterPrivate !== null || filterLanguage !== 'all';

    return (
        <div className="page-container">
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
                padding: '1rem 1.5rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'var(--accent-glow)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent)'
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
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>
                        {totalCount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginTop: '0.25rem' }}>
                        {isFiltered ? 'Matching URLs' : 'Total URLs'}
                    </div>
                </div>
            </div>

            <section className="filter-bar">
                <div className="filter-group">
                    <label>Search Slug</label>
                    <input
                        type="text"
                        placeholder="Type to search..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && setSearchTerm(searchInput)}
                        style={{ width: '280px' }}
                    />
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
                        placeholder="Search country..."
                        style={{ width: '180px' }}
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
                        <option value="false">Public Only</option>
                        <option value="true">Private Only</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label>Tier</label>
                    <select value={filterTier} onChange={(e) => setFilterTier(e.target.value)}>
                        <option value="">All Tiers</option>
                        <option value="1">Tier 1 (High Intent)</option>
                        <option value="2">Tier 2 (Activities)</option>
                        <option value="3">Tier 3 (Services)</option>
                        <option value="4">Tier 4 (Packages)</option>
                        <option value="5">Tier 5 (Guides)</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label>&nbsp;</label>
                    <button onClick={handleReset} style={{ background: 'var(--secondary)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                        Reset
                    </button>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'flex-end', height: '100%', paddingBottom: '0.2rem' }}>
                    <button className="primary-btn" onClick={handleExport} style={{ border: 'none', padding: '0.65rem 1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <Download size={18} /> Export URLs
                    </button>
                </div>
            </section>

            <section className="animate-fade">
                <div className="data-table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: '80px' }}>Can. ID</th>
                                <th>Slug</th>
                                <th>Vi. Title (Smart Trans)</th>
                                <th style={{ width: '60px' }}>Tier</th>
                                <th>Location</th>
                                <th style={{ width: '90px' }}>Access</th>
                                <th style={{ width: '90px' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pages.map((page) => (
                                <tr key={page.id}>
                                    <td style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>#{page.canonical_id}</td>
                                    <td>
                                        <a href={page.url} target="_blank" rel="noopener noreferrer" className="slug-link" title="Open original URL">
                                            {page.slug} <ExternalLink size={12} style={{ marginLeft: '4px' }} />
                                        </a>
                                    </td>
                                    <td style={{ fontWeight: 500, color: 'var(--accent)' }}>{page.translated_title_vi}</td>
                                    <td><span className={getTierClass(page.tier)}>T{page.tier}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <MapPin size={12} color="var(--accent)" />
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{page.city}, {page.country}</span>
                                        </div>
                                    </td>
                                    <td>
                                        {page.is_private ?
                                            <span className="private-tag"><Lock size={12} /> Private</span> :
                                            <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Public</span>
                                        }
                                    </td>
                                    <td>
                                        {page.include_for_dsa ?
                                            <span style={{ color: '#4ade80', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}><ShieldCheck size={14} /> Active</span> :
                                            <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>-</span>
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

                    {/* Pagination */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '1.5rem',
                        padding: '1rem',
                        background: 'var(--secondary)',
                        borderRadius: '12px',
                        gap: '2rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Per page:</span>
                            <select
                                value={perPage}
                                onChange={(e) => setPerPage(Number(e.target.value))}
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

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                                onClick={() => fetchPages(currentPage - 1)}
                                disabled={currentPage === 1}
                                style={{
                                    padding: '0.4rem 0.75rem',
                                    background: currentPage === 1 ? 'var(--secondary)' : 'var(--bg-card)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    color: currentPage === 1 ? 'var(--text-dim)' : 'var(--text-main)',
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    fontSize: '0.85rem'
                                }}
                            >
                                ← Prev
                            </button>

                            <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', padding: '0 0.5rem' }}>
                                Page {currentPage} of {totalPages}
                            </span>

                            <button
                                onClick={() => fetchPages(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                style={{
                                    padding: '0.4rem 0.75rem',
                                    background: currentPage === totalPages ? 'var(--secondary)' : 'var(--bg-card)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    color: currentPage === totalPages ? 'var(--text-dim)' : 'var(--text-main)',
                                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                    fontSize: '0.85rem'
                                }}
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
