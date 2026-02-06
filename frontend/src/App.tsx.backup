import React, { useEffect, useState, useRef, useCallback } from 'react';
import { pb } from './lib/pocketbase';
import {
  Search,
  Globe,
  MapPin,
  Tag,
  Download,
  ChevronRight,
  BarChart3,
  Layers,
  ChevronLeft,
  Lock,
  ExternalLink,
  ShieldCheck,
  Globe2
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

interface MetadataRecord {
  value: string;
  type: string;
}

function App() {
  // Data State
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [sitemaps, setSitemaps] = useState<{ tag: string, lang: string }[]>([]);
  const [totalCount, setTotalCount] = useState(0); // Added total results count

  // App State
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Filter States
  const [selectedTag, setSelectedTag] = useState('experiences-activity');
  const [selectedLang, setSelectedLang] = useState('zh-HK');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterPrivate, setFilterPrivate] = useState<boolean | null>(null);
  const [filterLanguage, setFilterLanguage] = useState('all'); // New: all, zh-HK, zh-TW, both

  const observer = useRef<IntersectionObserver | null>(null);

  // Fetch Metadata
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const records = await pb.collection('platform_metadata').getFullList<MetadataRecord>({
          sort: 'value'
        });

        // Remove duplicates and sort
        const uniqueCountries = Array.from(new Set(records.filter(r => r.type === 'country').map(r => r.value))).sort();
        setCountries(uniqueCountries);

        const tags = records.filter(r => r.type === 'sitemap_tag').map(r => {
          const [tag, lang] = r.value.split(':');
          return { tag, lang };
        });
        setSitemaps(tags);
      } catch (err) {
        console.error('Meta fetch error', err);
      }
    };
    fetchMeta();
  }, []);

  // Fetch Pages (with Pagination)
  const fetchPages = useCallback(async (pageNum: number, isNew: boolean = false) => {
    if (loading) return;
    setLoading(true);

    try {
      let filterString = `sitemap_tag = "${selectedTag}"`;

      // Language filtering using languages JSON array
      if (filterLanguage !== 'all') {
        if (filterLanguage === 'both') {
          // Must have both zh-HK AND zh-TW
          filterString += ` && languages ~ "zh-HK" && languages ~ "zh-TW"`;
        } else {
          // Must have the selected language
          filterString += ` && languages ~ "${filterLanguage}"`;
        }
      }

      if (searchTerm) filterString += ` && slug ~ "${searchTerm}"`;
      if (filterTier) filterString += ` && tier = "${filterTier}"`;
      if (filterCountry) filterString += ` && country = "${filterCountry}"`;
      if (filterPrivate !== null) filterString += ` && is_private = ${filterPrivate}`;

      const result = await pb.collection('pages').getList<PageRecord>(pageNum, 50, {
        sort: 'tier', // Ascending: 1, 2, 3...
        filter: filterString,
      });

      setPages(prev => isNew ? result.items : [...prev, ...result.items]);
      setHasMore(result.items.length === 50);
      setTotalCount(result.totalItems); // Update total count
    } catch (err: any) {
      if (err?.isAbort) return; // Gracefully ignore PocketBase auto-cancellation
      console.error('Fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTag, selectedLang, searchTerm, filterTier, filterCountry, filterPrivate, filterLanguage, loading]);

  // Reset and Fetch on Filter change
  useEffect(() => {
    setPageNumber(1);
    fetchPages(1, true);
  }, [selectedTag, selectedLang, searchTerm, filterTier, filterCountry, filterPrivate, filterLanguage]);

  // Infinite Scroll Trigger
  const lastElementRef = useCallback((node: HTMLTableRowElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPageNumber(prev => {
          const next = prev + 1;
          fetchPages(next);
          return next;
        });
      }
    });

    if (node) observer.current.observe(node);
  }, [loading, hasMore, fetchPages]);

  const handleExport = () => {
    // Generate URLs based on selected language filter
    const urls = pages.map(p => {
      const baseUrl = p.url;

      // If specific language selected and page has that language, generate proper URL
      if (filterLanguage !== 'all' && filterLanguage !== 'both') {
        // Replace language code in URL if needed
        // Example: /zh-HK/activity/123 -> /zh-TW/activity/123
        const currentLangPattern = /\/(zh-HK|zh-TW)\//;
        if (currentLangPattern.test(baseUrl)) {
          return baseUrl.replace(currentLangPattern, `/${filterLanguage}/`);
        }
      }

      return baseUrl;
    }).join('\n');

    const blob = new Blob([urls], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const langSuffix = filterLanguage !== 'all' ? `_${filterLanguage}` : '';
    a.download = `dsa_urls_${selectedTag}_${filterCountry || 'all'}${langSuffix}.txt`;
    a.href = url;
    a.click();
  };

  const handleReset = () => {
    setFilterTier('');
    setFilterCountry('');
    setFilterPrivate(null);
    setFilterLanguage('all');
    setSearchTerm('');
  };

  const getTierClass = (tier: string) => {
    if (tier === '1') return 'badge badge-tier-1';
    if (tier === '2') return 'badge badge-tier-2';
    if (tier === '5') return 'badge badge-tier-5';
    return 'badge';
  };

  return (
    <div className="app-container">
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <button className="collapse-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="logo" style={{ marginBottom: '1rem' }} >
          <Layers size={24} color="#3b82f6" />
          <span>AdInsight Flow</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em' }}>PLATFORM</p>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: '8px', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Globe size={18} /> <span>Klook</span>
          </div>

          <p style={{ color: 'var(--text-dim)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em', marginTop: '1rem' }}>SITEMAPS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {sitemaps.length === 0 && <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>Loading tags...</span>}
            {sitemaps.map(s => (
              <div
                key={`${s.tag}:${s.lang}`}
                onClick={() => { setSelectedTag(s.tag); setSelectedLang(s.lang); }}
                className={`nav-item ${selectedTag === s.tag && selectedLang === s.lang ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  background: (selectedTag === s.tag && selectedLang === s.lang) ? 'rgba(255,255,255,0.05)' : 'transparent'
                }}
              >
                <Tag size={16} color={(selectedTag === s.tag && selectedLang === s.lang) ? '#3b82f6' : 'currentColor'} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.85rem' }}>{s.tag.split('-').pop()?.replace(/^\w/, c => c.toUpperCase()) || s.tag}</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{s.lang}</span>
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div style={{ marginTop: 'auto', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
            <BarChart3 size={16} color="#3b82f6" />
            <span>33.7k Active Assets</span>
          </div>
        </div>
      </aside>

      <main className={`main-wrapper ${sidebarCollapsed ? 'full' : ''}`}>
        <header className="top-bar">
          <div className="title-group">
            <h1>Sitemap Insights</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <p>Managing {selectedTag} ({selectedLang})</p>
              <span style={{
                background: 'rgba(59, 130, 246, 0.1)',
                color: '#3b82f6',
                fontSize: '0.75rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '99px',
                fontWeight: 600
              }}>
                Showing {totalCount.toLocaleString()} results
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder="Search slugs..."
                style={{ paddingLeft: '2.5rem', width: '240px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={handleReset} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
              Reset Filters
            </button>
            <button onClick={handleExport} style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
              <Download size={18} /> Export URLs
            </button>
          </div>
        </header>

        <section className="filter-bar">
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
            <label>Language</label>
            <select value={filterLanguage} onChange={(e) => setFilterLanguage(e.target.value)}>
              <option value="all">All Languages</option>
              <option value="zh-HK">zh-HK Only</option>
              <option value="zh-TW">zh-TW Only</option>
              <option value="both">Both (zh-HK & zh-TW)</option>
            </select>
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
                {pages.map((page, index) => (
                  <tr key={page.id} ref={index === pages.length - 1 ? lastElementRef : null}>
                    <td style={{ color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>#{page.canonical_id}</td>
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
                        <span style={{ fontSize: '0.85rem' }}>{page.city}, {page.country}</span>
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
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
