import { useEffect, useMemo, useRef, useState, startTransition } from 'react';
import type { ChangeEvent } from 'react';
import { Download, FileUp, FilterX, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { MetricCard, SafeButton, SurfaceCard } from '../../components/common/ui';
import { InvalidKeywordsPanel } from './components/InvalidKeywordsPanel';
import { SearchTermsGroupCard } from './components/SearchTermsGroupCard';
import {
    buildSearchTermsGroups,
    createTemplateCsv,
    INITIAL_SEARCH_TERMS_FILTERS,
    processSearchTermsCsv,
    readFileText,
    type SearchTermsFilters,
    type SearchTermsGroup,
    type SearchTermsPlatform,
} from './searchTermsUtils';
import { formatCurrency, formatNumber, getInvalidKeywordKey } from './searchTermsViewUtils';

const PAGE_STYLE = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
} as const;

const FILTER_ROW_STYLE = {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '0.75rem',
    flexWrap: 'wrap',
} as const;

function arraysEqual(left: string[], right: string[]) {
    if (left.length !== right.length) return false;
    for (let index = 0; index < left.length; index += 1) {
        if (left[index] !== right[index]) return false;
    }
    return true;
}

function triggerDownload(fileName: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
}

export default function SearchTermsPage() {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [platform, setPlatform] = useState<SearchTermsPlatform>('Klook');
    const [fileName, setFileName] = useState('');
    const [importedRows, setImportedRows] = useState<ReturnType<typeof processSearchTermsCsv>['rows']>([]);
    const [invalidRows, setInvalidRows] = useState<ReturnType<typeof processSearchTermsCsv>['invalidRows']>([]);
    const [headerColumns, setHeaderColumns] = useState<string[]>([]);
    const [filters, setFilters] = useState<SearchTermsFilters>(INITIAL_SEARCH_TERMS_FILTERS);
    const [searchInput, setSearchInput] = useState('');
    const [urlInput, setUrlInput] = useState('');
    const [excludeInput, setExcludeInput] = useState('');
    const [invalidTranslatedSearch, setInvalidTranslatedSearch] = useState('');
    const [copyInvalidWithClicks, setCopyInvalidWithClicks] = useState(false);
    const [copyTermsWithClicks, setCopyTermsWithClicks] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingError, setProcessingError] = useState('');
    const [selectionByGroup, setSelectionByGroup] = useState<Record<string, string[]>>({});
    const [invalidSelection, setInvalidSelection] = useState<string[]>([]);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const setFilterValue = <K extends keyof SearchTermsFilters>(key: K, value: SearchTermsFilters[K]) => {
        startTransition(() => {
            setFilters((previous) => ({ ...previous, [key]: value }));
        });
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchInput !== filters.search) setFilterValue('search', searchInput);
        }, 220);
        return () => clearTimeout(timer);
    }, [filters.search, searchInput]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (urlInput !== filters.urlContains) setFilterValue('urlContains', urlInput);
        }, 220);
        return () => clearTimeout(timer);
    }, [filters.urlContains, urlInput]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (excludeInput !== filters.excludeText) setFilterValue('excludeText', excludeInput);
        }, 220);
        return () => clearTimeout(timer);
    }, [excludeInput, filters.excludeText]);

    const groupedResults = useMemo(() => buildSearchTermsGroups(importedRows, filters), [filters, importedRows]);
    const visibleGroups = useMemo(() => groupedResults.filter((group) => group.terms.length > 0), [groupedResults]);

    useEffect(() => {
        setSelectionByGroup((previous) => {
            const next: Record<string, string[]> = {};
            let changed = false;
            const previousKeys = Object.keys(previous);

            groupedResults.forEach((group) => {
                const validIds = new Set(group.terms.map((term) => term.termId));
                const existing = Object.prototype.hasOwnProperty.call(previous, group.groupId)
                    ? previous[group.groupId].filter((termId) => validIds.has(termId))
                    : group.terms.map((term) => term.termId);
                next[group.groupId] = existing;

                if (!Object.prototype.hasOwnProperty.call(previous, group.groupId) || !arraysEqual(existing, previous[group.groupId])) {
                    changed = true;
                }
            });

            if (previousKeys.length !== Object.keys(next).length) changed = true;
            return changed ? next : previous;
        });
    }, [groupedResults]);

    const totalClicks = useMemo(() => importedRows.reduce((sum, row) => sum + row.clicks, 0), [importedRows]);
    const totalCost = useMemo(() => importedRows.reduce((sum, row) => sum + row.cost, 0), [importedRows]);
    const uniqueUrlCount = useMemo(() => new Set(importedRows.map((row) => row.urlNormalized)).size, [importedRows]);
    const readyUrlCount = useMemo(() => visibleGroups.reduce((count, group) => count + ((selectionByGroup[group.groupId] ?? []).length > 0 ? 1 : 0), 0), [selectionByGroup, visibleGroups]);

    const invalidReasonSummary = useMemo(() => {
        const grouped = invalidRows.reduce<Record<string, number>>((accumulator, row) => {
            accumulator[row.reason] = (accumulator[row.reason] || 0) + 1;
            return accumulator;
        }, {});
        return Object.entries(grouped).sort((left, right) => right[1] - left[1]).map(([reason, count]) => `${reason}: ${count}`);
    }, [invalidRows]);

    const filteredInvalidRows = useMemo(() => {
        const needle = invalidTranslatedSearch.trim().toLowerCase();
        if (!needle) return invalidRows;
        return invalidRows.filter((row) => row.translatedTerm.toLowerCase().includes(needle));
    }, [invalidRows, invalidTranslatedSearch]);

    const invalidKeywordRows = useMemo(() => {
        const seen = new Set<string>();
        return filteredInvalidRows.filter((row) => {
            const key = getInvalidKeywordKey(row);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [filteredInvalidRows]);

    useEffect(() => {
        setInvalidSelection((previous) => {
            const validKeys = new Set(invalidKeywordRows.map((row) => getInvalidKeywordKey(row)));
            const next = previous.filter((key) => validKeys.has(key));
            return arraysEqual(previous, next) ? previous : next;
        });
    }, [invalidKeywordRows]);

    const resetWorkspace = () => {
        setFileName('');
        setImportedRows([]);
        setInvalidRows([]);
        setHeaderColumns([]);
        setProcessingError('');
        setFilters(INITIAL_SEARCH_TERMS_FILTERS);
        setSearchInput('');
        setUrlInput('');
        setExcludeInput('');
        setInvalidTranslatedSearch('');
        setCopyInvalidWithClicks(false);
        setCopyTermsWithClicks(false);
        setSelectionByGroup({});
        setInvalidSelection([]);
        setExpandedGroups({});
    };

    const handleDownloadTemplate = () => {
        triggerDownload('dsa-search-terms-template.csv', createTemplateCsv(), 'text/csv;charset=utf-8;');
    };

    const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setProcessingError('');

        try {
            const text = await readFileText(file);
            const result = processSearchTermsCsv(text, platform);
            if (result.missingRequiredHeaders.length > 0) {
                throw new Error(`Missing required columns: ${result.missingRequiredHeaders.join(', ')}`);
            }

            startTransition(() => {
                setFileName(file.name);
                setImportedRows(result.rows);
                setInvalidRows(result.invalidRows);
                setHeaderColumns(result.headerColumns);
                setFilters(INITIAL_SEARCH_TERMS_FILTERS);
                setSearchInput('');
                setUrlInput('');
                setExcludeInput('');
                setInvalidTranslatedSearch('');
                setCopyInvalidWithClicks(false);
                setCopyTermsWithClicks(false);
                setSelectionByGroup({});
                setInvalidSelection([]);
                setExpandedGroups({});
            });

            toast.success(`Imported ${result.rows.length.toLocaleString()} valid terms across ${new Set(result.rows.map((row) => row.urlNormalized)).size.toLocaleString()} URLs`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to process CSV.';
            setProcessingError(message);
            toast.error(message);
        } finally {
            setIsProcessing(false);
            if (event.target) event.target.value = '';
        }
    };

    const toggleGroupExpanded = (groupId: string) => {
        setExpandedGroups((previous) => ({ ...previous, [groupId]: !previous[groupId] }));
    };

    const selectAllInGroup = (group: SearchTermsGroup) => {
        setSelectionByGroup((previous) => ({ ...previous, [group.groupId]: group.terms.map((term) => term.termId) }));
    };

    const clearSelectionInGroup = (groupId: string) => {
        setSelectionByGroup((previous) => ({ ...previous, [groupId]: [] }));
    };

    const toggleTermSelection = (groupId: string, termId: string) => {
        setSelectionByGroup((previous) => {
            const existing = previous[groupId] ?? [];
            const next = existing.includes(termId) ? existing.filter((value) => value !== termId) : [...existing, termId];
            return { ...previous, [groupId]: next };
        });
    };

    const handleCopy = async (group: SearchTermsGroup, mode: 'selected' | 'all') => {
        const selectedIds = new Set(selectionByGroup[group.groupId] ?? []);
        const terms = (mode === 'selected' ? group.terms.filter((term) => selectedIds.has(term.termId)) : group.terms)
            .map((term) => copyTermsWithClicks ? `${term.displayTerm} ${formatNumber(term.clicks)}` : term.displayTerm)
            .filter(Boolean);

        if (terms.length === 0) {
            toast.error('No terms available for this copy action.');
            return;
        }

        try {
            await navigator.clipboard.writeText(terms.join(', '));
            toast.success(mode === 'selected' ? 'Selected terms copied' : 'All terms copied');
        } catch {
            toast.error('Copy failed. Clipboard permission may be blocked.');
        }
    };

    const toggleInvalidSelection = (key: string) => {
        setInvalidSelection((previous) => previous.includes(key) ? previous.filter((value) => value !== key) : [...previous, key]);
    };

    const selectAllInvalidKeywords = () => {
        setInvalidSelection(invalidKeywordRows.map((row) => getInvalidKeywordKey(row)));
    };

    const clearInvalidKeywordSelection = () => {
        setInvalidSelection([]);
    };

    const handleCopyInvalidKeywords = async (mode: 'selected' | 'filtered') => {
        const selectedKeys = new Set(invalidSelection);
        const keywords = invalidKeywordRows
            .filter((row) => mode === 'filtered' || selectedKeys.has(getInvalidKeywordKey(row)))
            .map((row) => copyInvalidWithClicks ? `${row.searchTerm} ${formatNumber(row.clicks)}` : row.searchTerm)
            .filter(Boolean);

        if (keywords.length === 0) {
            toast.error('No invalid search terms available for copy.');
            return;
        }

        try {
            await navigator.clipboard.writeText(keywords.join(', '));
            toast.success(mode === 'selected' ? 'Selected invalid search terms copied' : 'Filtered invalid search terms copied');
        } catch {
            toast.error('Copy failed. Clipboard permission may be blocked.');
        }
    };

    return (
        <div className="page-container" style={PAGE_STYLE}>
            <SurfaceCard
                padding="0.8rem 0.95rem"
                radius="1.3rem"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.85rem',
                    flexWrap: 'wrap',
                    background: [
                        'radial-gradient(circle at top right, rgba(14, 165, 233, 0.16) 0%, transparent 24%)',
                        'radial-gradient(circle at left bottom, rgba(20, 184, 166, 0.1) 0%, transparent 28%)',
                        'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 98%, white 2%) 0%, color-mix(in srgb, var(--bg-content) 92%, var(--bg-main) 8%) 100%)',
                    ].join(', '),
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '1.12rem', fontWeight: 850, letterSpacing: '-0.03em', color: 'var(--text-main)' }}>
                            Search Terms Mapper
                        </div>
                        <span className="hero-badge" style={{ background: 'rgba(14, 165, 233, 0.12)', color: '#0369a1', border: '1px solid rgba(3, 105, 161, 0.18)' }}>
                            Local Processing
                        </span>
                        <span className="hero-badge" style={{ background: 'rgba(15, 118, 110, 0.12)', color: '#0f766e', border: '1px solid rgba(15, 118, 110, 0.18)' }}>
                            No PB Insert
                        </span>
                        <span className="hero-badge" style={{ background: 'rgba(37, 99, 235, 0.12)', color: '#1d4ed8', border: '1px solid rgba(37, 99, 235, 0.18)' }}>
                            /dsa-filter/search-terms
                        </span>
                    </div>
                    <div style={{ fontSize: '0.86rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                        Upload search-term CSV, group rows by landing page URL, and copy ranked term sets for RSA.
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <div className="filter-group">
                        <label>Platform</label>
                        <select value={platform} onChange={(event) => setPlatform(event.target.value as SearchTermsPlatform)} style={{ width: '136px' }}>
                            <option value="Klook">Klook</option>
                            <option value="Traveloka">Traveloka</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <SafeButton onClick={() => fileInputRef.current?.click()} className="hero-btn hero-btn-primary" style={{ padding: '0.78rem 0.95rem', gap: '0.5rem' }} disabled={isProcessing}>
                            <FileUp size={17} />
                            <span>{isProcessing ? 'Processing...' : 'Upload CSV'}</span>
                        </SafeButton>

                        <SafeButton onClick={handleDownloadTemplate} className="hero-btn hero-btn-secondary" style={{ padding: '0.78rem 0.95rem', gap: '0.5rem' }}>
                            <Download size={17} />
                            <span>Template</span>
                        </SafeButton>

                        <SafeButton onClick={resetWorkspace} className="hero-btn hero-btn-secondary" style={{ padding: '0.78rem 0.95rem', gap: '0.5rem' }} disabled={importedRows.length === 0 && invalidRows.length === 0}>
                            <Trash2 size={17} />
                            <span>Reset</span>
                        </SafeButton>
                    </div>
                </div>

                {processingError ? (
                    <div style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.22)', background: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', fontWeight: 700, fontSize: '0.84rem' }}>
                        {processingError}
                    </div>
                ) : null}
            </SurfaceCard>

            <input ref={fileInputRef} type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" onChange={handleFileSelect} style={{ display: 'none' }} />

            <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                <MetricCard label="Terms" value={importedRows.length.toLocaleString()} helper={fileName || 'No file yet'} accent="#0284c7" style={{ padding: '0.8rem 0.9rem' }} />
                <MetricCard label="URLs" value={uniqueUrlCount.toLocaleString()} helper={`${visibleGroups.length.toLocaleString()} visible`} accent="#2563eb" style={{ padding: '0.8rem 0.9rem' }} />
                <MetricCard label="Ready URLs" value={readyUrlCount.toLocaleString()} helper="URLs with selected terms" accent="#0f766e" style={{ padding: '0.8rem 0.9rem' }} />
                <MetricCard label="Invalid Rows" value={invalidRows.length.toLocaleString()} helper={headerColumns.length > 0 ? `${headerColumns.length} columns detected` : 'Template check'} accent="#d97706" style={{ padding: '0.8rem 0.9rem' }} />
                <MetricCard label="Clicks" value={formatNumber(totalClicks)} helper={`${formatCurrency(totalCost)} total cost`} accent="#14b8a6" style={{ padding: '0.8rem 0.9rem' }} />
            </div>

            <InvalidKeywordsPanel
                invalidRows={invalidRows}
                invalidReasonSummary={invalidReasonSummary}
                invalidTranslatedSearch={invalidTranslatedSearch}
                onInvalidTranslatedSearchChange={setInvalidTranslatedSearch}
                copyInvalidWithClicks={copyInvalidWithClicks}
                onCopyInvalidWithClicksChange={setCopyInvalidWithClicks}
                invalidSelection={invalidSelection}
                onToggleInvalidSelection={toggleInvalidSelection}
                onSelectAllInvalidKeywords={selectAllInvalidKeywords}
                onClearInvalidKeywordSelection={clearInvalidKeywordSelection}
                onCopyInvalidKeywords={handleCopyInvalidKeywords}
            />

            <SurfaceCard
                className="filter-container"
                padding="0.95rem 1rem"
                radius="1.3rem"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    background: [
                        'radial-gradient(circle at top right, rgba(14, 165, 233, 0.14) 0%, transparent 26%)',
                        'radial-gradient(circle at left bottom, rgba(20, 184, 166, 0.08) 0%, transparent 28%)',
                        'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 98%, white 2%) 0%, color-mix(in srgb, var(--bg-content) 89%, var(--bg-main) 11%) 100%)',
                    ].join(', '),
                    boxShadow: '0 26px 48px -34px rgba(15, 23, 42, 0.72)',
                    border: '1px solid color-mix(in srgb, var(--border-subtle) 80%, rgba(14, 165, 233, 0.2) 20%)',
                }}
            >
                <div style={FILTER_ROW_STYLE}>
                    <div className="filter-group">
                        <label>Search</label>
                        <div style={{ position: 'relative' }}>
                            <input type="text" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search URL, headline, term" style={{ width: '220px', paddingLeft: '1rem' }} />
                        </div>
                    </div>

                    <div className="filter-group">
                        <label>URL Contains</label>
                        <input type="text" value={urlInput} onChange={(event) => setUrlInput(event.target.value)} placeholder="e.g. yufuin-no-mori" style={{ width: '200px' }} />
                    </div>

                    <div className="filter-group">
                        <label>Min Clicks</label>
                        <input type="number" min="0" value={filters.minClicks} onChange={(event) => setFilterValue('minClicks', event.target.value)} placeholder="0" style={{ width: '108px' }} />
                    </div>

                    <div className="filter-group">
                        <label>Min Impr.</label>
                        <input type="number" min="0" value={filters.minImpressions} onChange={(event) => setFilterValue('minImpressions', event.target.value)} placeholder="0" style={{ width: '108px' }} />
                    </div>

                    <div className="filter-group">
                        <label>Sort</label>
                        <select value={filters.sortBy} onChange={(event) => setFilterValue('sortBy', event.target.value as SearchTermsFilters['sortBy'])} style={{ width: '132px' }}>
                            <option value="clicks">Clicks</option>
                            <option value="cost">Cost</option>
                            <option value="terms">Terms</option>
                            <option value="url">URL</option>
                        </select>
                    </div>
                </div>

                <div style={{ ...FILTER_ROW_STYLE, alignItems: 'center' }}>
                    <div className="filter-group">
                        <label>Copy Mode</label>
                        <select value={filters.copyMode} onChange={(event) => setFilterValue('copyMode', event.target.value as SearchTermsFilters['copyMode'])} style={{ width: '164px' }}>
                            <option value="original-only">Original Only</option>
                            <option value="translated-first">Translated First</option>
                            <option value="translated-only">Translated Only</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>!Term</label>
                        <input type="text" value={excludeInput} onChange={(event) => setExcludeInput(event.target.value)} placeholder="Hide terms containing..." style={{ width: '200px' }} />
                    </div>

                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 700 }}>
                        <input type="checkbox" checked={copyTermsWithClicks} onChange={(event) => setCopyTermsWithClicks(event.target.checked)} style={{ accentColor: '#0f766e' }} />
                        <span>Copy URL terms with clicks</span>
                    </label>

                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 700 }}>
                        <input
                            type="checkbox"
                            checked={filters.dedupeTerms}
                            onChange={(event) => setFilterValue('dedupeTerms', event.target.checked)}
                            style={{ accentColor: '#0284c7' }}
                        />
                        <span>Deduplicate terms</span>
                    </label>

                    <div style={{ display: 'flex', gap: '0.55rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
                        <SafeButton
                            onClick={() => {
                                setFilters(INITIAL_SEARCH_TERMS_FILTERS);
                                setSearchInput('');
                                setUrlInput('');
                                setExcludeInput('');
                            }}
                            className="hero-btn hero-btn-secondary"
                            style={{ padding: '0.72rem 0.88rem', gap: '0.45rem' }}
                        >
                            <FilterX size={16} />
                            <span>Reset Filters</span>
                        </SafeButton>
                    </div>
                </div>
            </SurfaceCard>

            <SurfaceCard padding="0" radius="1.3rem" style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.95rem 1rem', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                            Grouped URLs
                        </div>
                        <div style={{ marginTop: '0.25rem', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
                            {visibleGroups.length.toLocaleString()} URL groups ready for review
                        </div>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                        {readyUrlCount.toLocaleString()} groups currently have selected terms
                    </div>
                </div>

                {importedRows.length === 0 && invalidRows.length === 0 ? (
                    <div style={{ padding: '1.6rem 1.1rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                        Upload a CSV to map search terms by landing page URL.
                    </div>
                ) : visibleGroups.length === 0 ? (
                    <div style={{ padding: '1.6rem 1.1rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                        No URL groups match the current filters.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '0.9rem' }}>
                        {visibleGroups.map((group) => (
                            <SearchTermsGroupCard
                                key={group.groupId}
                                group={group}
                                isExpanded={!!expandedGroups[group.groupId]}
                                selectedIds={selectionByGroup[group.groupId] ?? []}
                                copyWithClicks={copyTermsWithClicks}
                                onCopy={handleCopy}
                                onToggleExpanded={toggleGroupExpanded}
                                onSelectAll={selectAllInGroup}
                                onClearSelection={clearSelectionInGroup}
                                onToggleTermSelection={toggleTermSelection}
                            />
                        ))}
                    </div>
                )}
            </SurfaceCard>

            <style>{`
                .filter-container .filter-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.42rem;
                }
                .filter-container label {
                    font-size: 0.68rem;
                    font-weight: 800;
                    color: var(--text-dim);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    opacity: 0.92;
                }
                .filter-container input,
                .filter-container select {
                    height: 40px;
                    border-radius: 12px;
                    border: 1px solid color-mix(in srgb, var(--border-subtle) 82%, rgba(14, 165, 233, 0.16) 18%);
                    background: linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(248,250,252,0.88) 100%);
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.66), 0 10px 24px -20px rgba(15, 23, 42, 0.42);
                    transition: border-color 0.2s ease, box-shadow 0.2s ease;
                    color: var(--text-main);
                }
                .filter-container input:focus,
                .filter-container select:focus {
                    outline: none;
                    border-color: rgba(14, 165, 233, 0.36);
                    box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.08), inset 0 1px 0 rgba(255,255,255,0.75);
                }
                .dark .filter-container input,
                .dark .filter-container select {
                    background: linear-gradient(180deg, rgba(15,23,42,0.82) 0%, rgba(2,6,23,0.92) 100%);
                    border-color: rgba(148, 163, 184, 0.18);
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 12px 24px -20px rgba(0,0,0,0.5);
                    color: #f8fafc;
                }
                .dark .filter-container select option {
                    background-color: #020617;
                    color: #f8fafc;
                }
            `}</style>
        </div>
    );
}
