import { useEffect, useMemo, useRef, useState, startTransition } from 'react';
import type { ChangeEvent } from 'react';
import { Download, FileUp, Globe, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { MultiSelectDropdown } from '../../components/common/MultiSelectDropdown';
import { InsightExportModal } from '../AdInsight/InsightExportModal';
import { MetricCard, SafeButton, SurfaceCard } from '../../components/common/ui';
import { SAFE_INTERACTIVE_TRANSITION } from '../../lib/uiMotion';
import {
    buildSessionQuery,
    INITIAL_URL_FILTER_STATE,
    URL_FILTER_EXPORT_FIELDS,
    mapApiRow,
    type ParsedUploadRow,
    type UrlFilterResponse,
    type UrlFilterState,
} from './urlFilterUtils';

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
            write: (data: string) => Promise<void>;
            close: () => Promise<void>;
        }>;
    }>;
}

async function readJsonSafely<T>(response: Response): Promise<T> {
    const responseText = await response.text();
    if (!responseText.trim()) {
        throw new Error(`Empty response from server (${response.status}).`);
    }

    try {
        return JSON.parse(responseText) as T;
    } catch {
        throw new Error(`Invalid JSON response from server (${response.status}).`);
    }
}

const PAGE_STYLE = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
} as const;

const FILTER_ROW_STYLE = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
} as const;

const FILTER_SHELL_STYLE = {
    position: 'relative',
    zIndex: 60,
    overflow: 'visible',
} as const;

const TABLE_CELL_STYLE = {
    padding: '0.75rem 0.7rem',
    borderBottom: '1px solid var(--border-subtle)',
    verticalAlign: 'top',
} as const;

type SortField = 'country' | 'clicks';
type SortDirection = 'asc' | 'desc';

const CLASSIFICATION_ACCENTS: Record<ParsedUploadRow['classification'], { bg: string; text: string; border: string }> = {
    matched: {
        bg: 'rgba(20, 184, 166, 0.12)',
        text: '#0f766e',
        border: 'rgba(15, 118, 110, 0.18)',
    },
    unknown: {
        bg: 'rgba(245, 158, 11, 0.12)',
        text: '#b45309',
        border: 'rgba(180, 83, 9, 0.18)',
    },
};

function formatNumber(value: number | null) {
    if (value === null || Number.isNaN(value)) return '-';
    return value.toLocaleString();
}

function formatCurrency(value: number | null) {
    if (value === null || Number.isNaN(value)) return '-';
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatPercent(value: number | null) {
    if (value === null || Number.isNaN(value)) return '-';
    return `${value.toFixed(2)}%`;
}

export default function UrlFilterPage() {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [platform, setPlatform] = useState('Klook');
    const [sessionId, setSessionId] = useState('');
    const [fileName, setFileName] = useState('');
    const [countryOptions, setCountryOptions] = useState<Array<{ label: string; value: string }>>([]);
    const [rows, setRows] = useState<ParsedUploadRow[]>([]);
    const [summary, setSummary] = useState<UrlFilterResponse['summary'] | null>(null);
    const [filters, setFilters] = useState<UrlFilterState>(INITIAL_URL_FILTER_STATE);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isFetchingRows, setIsFetchingRows] = useState(false);
    const [processingError, setProcessingError] = useState('');
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [excludeInput, setExcludeInput] = useState('');
    const [sortField, setSortField] = useState<SortField>('clicks');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    const effectiveFilters = useMemo(() => filters, [filters]);
    const displayedRows = useMemo(() => {
        const nextRows = [...rows];
        nextRows.sort((left, right) => {
            if (sortField === 'country') {
                const countryCompare = left.pageCountry.localeCompare(right.pageCountry);
                if (countryCompare !== 0) {
                    return sortDirection === 'asc' ? countryCompare : -countryCompare;
                }
                const clicksDelta = (left.clicks ?? 0) - (right.clicks ?? 0);
                return sortDirection === 'asc' ? clicksDelta : -clicksDelta;
            }

            const clicksDelta = (left.clicks ?? 0) - (right.clicks ?? 0);
            if (clicksDelta !== 0) {
                return sortDirection === 'asc' ? clicksDelta : -clicksDelta;
            }
            const countryCompare = left.pageCountry.localeCompare(right.pageCountry);
            return sortDirection === 'asc' ? countryCompare : -countryCompare;
        });
        return nextRows;
    }, [rows, sortDirection, sortField]);

    const setFilterValue = (id: keyof UrlFilterState, value: string) => {
        startTransition(() => {
            setFilters((previous) => ({ ...previous, [id]: value }));
        });
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchInput !== filters.searchTerm) {
                setFilterValue('searchTerm', searchInput);
            }
        }, 350);
        return () => clearTimeout(timer);
    }, [filters.searchTerm, searchInput]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (excludeInput !== filters.excludeTerm) {
                setFilterValue('excludeTerm', excludeInput);
            }
        }, 350);
        return () => clearTimeout(timer);
    }, [excludeInput, filters.excludeTerm]);

    useEffect(() => {
        setSearchInput(filters.searchTerm);
        setExcludeInput(filters.excludeTerm);
    }, [filters.excludeTerm, filters.searchTerm]);

    useEffect(() => {
        if (!sessionId) return;

        let ignore = false;
        const controller = new AbortController();

        const run = async () => {
            setIsFetchingRows(true);
            try {
                const response = await fetch(`/api/dsa-filter/url/sessions/${sessionId}?${buildSessionQuery(effectiveFilters)}`, {
                    signal: controller.signal,
                });
                const payload = await readJsonSafely<UrlFilterResponse | { error: string }>(response);
                if (!response.ok) {
                    throw new Error('error' in payload ? payload.error : 'Failed to load session rows.');
                }
                if (ignore) return;

                const typedPayload = payload as UrlFilterResponse;
                setRows(typedPayload.rows.map(mapApiRow));
                setSummary(typedPayload.summary);
                setCountryOptions(typedPayload.country_options.map((country) => ({ label: country, value: country })));
            } catch (error) {
                if (controller.signal.aborted || ignore) return;
                const message = error instanceof Error ? error.message : 'Failed to load filtered rows.';
                toast.error(message);
            } finally {
                if (!ignore) setIsFetchingRows(false);
            }
        };

        run();

        return () => {
            ignore = true;
            controller.abort();
        };
    }, [effectiveFilters, sessionId]);

    const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setProcessingError('');
        setIsProcessing(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('platform', platform.toLowerCase());

            const response = await fetch('/api/dsa-filter/url/sessions', {
                method: 'POST',
                body: formData,
            });
            const payload = await readJsonSafely<UrlFilterResponse | { error: string }>(response);
            if (!response.ok) {
                throw new Error('error' in payload ? payload.error : 'Failed to process file.');
            }

            const typedPayload = payload as UrlFilterResponse;
            startTransition(() => {
                setSessionId(typedPayload.session_id);
                setFileName(typedPayload.meta.file_name);
                setRows([]);
                setSummary(typedPayload.summary);
                setCountryOptions(typedPayload.country_options.map((country) => ({ label: country, value: country })));
                setFilters(INITIAL_URL_FILTER_STATE);
            });

            toast.success(`Processed ${typedPayload.summary.total_rows.toLocaleString()} URLs from ${typedPayload.meta.file_name}`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to process file.';
            setProcessingError(message);
            toast.error(message);
        } finally {
            setIsProcessing(false);
            if (event.target) event.target.value = '';
        }
    };

    const patchRows = async (rowIds: number[], include: boolean) => {
        if (!sessionId || rowIds.length === 0) return;

        try {
            const response = await fetch(`/api/dsa-filter/url/sessions/${sessionId}/rows/include`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ row_ids: rowIds, include }),
            });
            const payload = await readJsonSafely<{ ok?: boolean; error?: string }>(response);
            if (!response.ok) {
                throw new Error(payload.error || 'Failed to update row include state.');
            }

            setRows((previous) => previous.map((row) => (rowIds.includes(row.rowId) ? { ...row, include } : row)));
            setFilters((previous) => ({ ...previous }));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update row state.';
            toast.error(message);
        }
    };

    const handleExport = async (selectedFields: string[], customFileName: string, customLabel?: string) => {
        const includedCount = rows.filter((row) => row.include).length;
        if (!sessionId || includedCount === 0) {
            toast.error('No included rows are available for export.');
            return;
        }

        try {
            setIsExporting(true);
            const defaultName = `dsa-url-filter-${includedCount}`;
            const fileNameToUse = `${customFileName || defaultName}`;
            const exportParams = new URLSearchParams();
            exportParams.set('search_term', effectiveFilters.searchTerm);
            exportParams.set('include_countries', effectiveFilters.includeCountries);
            exportParams.set('exclude_countries', effectiveFilters.excludeCountries);
            exportParams.set('include_status', effectiveFilters.includeStatus);
            exportParams.set('classification', effectiveFilters.classification);
            exportParams.set('exclude_term', effectiveFilters.excludeTerm);
            exportParams.set('fields', selectedFields.join('|'));
            exportParams.set('custom_label', customLabel || '');
            exportParams.set('file_name', fileNameToUse);

            const response = await fetch(`/api/dsa-filter/url/sessions/${sessionId}/export?${exportParams.toString()}`);
            if (!response.ok) {
                const payload = await response.json().catch(() => ({ error: 'Export failed.' })) as { error?: string };
                throw new Error(payload.error || 'Export failed.');
            }
            const csv = await response.text();

            if ('showSaveFilePicker' in window) {
                try {
                    const picker = (window as SaveFilePickerWindow).showSaveFilePicker;
                    if (!picker) throw new Error('File picker unavailable');
                    const handle = await picker({
                        suggestedName: `${fileNameToUse}.csv`,
                        id: 'dsa-url-filter-export',
                        types: [{
                            description: 'CSV File',
                            accept: { 'text/csv': ['.csv'] },
                        }],
                    });
                    const writable = await handle.createWritable();
                    await writable.write(csv);
                    await writable.close();
                    setIsExportModalOpen(false);
                    toast.success('Export complete');
                    return;
                } catch (error: unknown) {
                    if (error instanceof DOMException && error.name === 'AbortError') return;
                }
            }

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const urlObject = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.download = `${fileNameToUse}.csv`;
            anchor.href = urlObject;
            anchor.click();
            URL.revokeObjectURL(urlObject);
            setIsExportModalOpen(false);
            toast.success('Export complete');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Export failed. Please try again.';
            toast.error(message);
        } finally {
            setIsExporting(false);
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
                        'radial-gradient(circle at top right, rgba(20, 184, 166, 0.12) 0%, transparent 24%)',
                        'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 98%, white 2%) 0%, color-mix(in srgb, var(--bg-content) 92%, var(--bg-main) 8%) 100%)',
                    ].join(', '),
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '1.12rem', fontWeight: 850, letterSpacing: '-0.03em', color: 'var(--text-main)' }}>
                        URL Filter
                    </div>
                    <span className="hero-badge" style={{ background: 'rgba(15, 118, 110, 0.12)', color: '#0f766e', border: '1px solid rgba(15, 118, 110, 0.18)' }}>
                        No PB Insert
                    </span>
                    <span className="hero-badge" style={{ background: 'rgba(37, 99, 235, 0.12)', color: '#1d4ed8', border: '1px solid rgba(37, 99, 235, 0.18)' }}>
                        /dsa-filter/url
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <div className="filter-group">
                        <label>Platform</label>
                        <select value={platform} onChange={(event) => setPlatform(event.target.value)} style={{ width: '136px' }}>
                            <option value="Klook">Klook</option>
                            <option value="Traveloka">Traveloka</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <SafeButton
                            onClick={() => fileInputRef.current?.click()}
                            className="hero-btn hero-btn-primary"
                            style={{ padding: '0.78rem 0.95rem', gap: '0.5rem' }}
                            disabled={isProcessing}
                        >
                            <FileUp size={17} />
                            <span>{isProcessing ? 'Processing...' : 'Upload CSV'}</span>
                        </SafeButton>

                        <SafeButton
                            onClick={() => {
                                setSessionId('');
                                setFileName('');
                                setRows([]);
                                setSummary(null);
                                setCountryOptions([]);
                                setProcessingError('');
                                setFilters(INITIAL_URL_FILTER_STATE);
                            }}
                            className="hero-btn hero-btn-secondary"
                            style={{ padding: '0.78rem 0.95rem', gap: '0.5rem' }}
                            disabled={!sessionId}
                        >
                            <Trash2 size={17} />
                            <span>Reset</span>
                        </SafeButton>
                    </div>
                </div>

                {processingError ? (
                    <div style={{
                        padding: '0.75rem 0.9rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(239, 68, 68, 0.22)',
                        background: 'rgba(239, 68, 68, 0.08)',
                        color: '#dc2626',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                    }}>
                        {processingError}
                    </div>
                ) : null}
            </SurfaceCard>

            <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,text/csv,text/tab-separated-values"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />

            <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                <MetricCard label="Rows" value={(summary?.total_rows ?? 0).toLocaleString()} helper={fileName || 'No file yet'} icon={Globe} accent="#0f766e" style={{ padding: '0.8rem 0.9rem' }} />
                <MetricCard label="Matched" value={(summary?.matched_rows ?? 0).toLocaleString()} helper={`${formatNumber(summary?.included_clicks ?? 0)} clicks`} accent="#2563eb" style={{ padding: '0.8rem 0.9rem' }} />
                <MetricCard label="Unknown" value={(summary?.unknown_rows ?? 0).toLocaleString()} helper="Kept unless excluded" accent="#d97706" style={{ padding: '0.8rem 0.9rem' }} />
                <MetricCard label="Included" value={(summary?.included_rows ?? 0).toLocaleString()} helper={`${formatCurrency(summary?.included_cost ?? 0)} cost`} icon={Download} accent="#14b8a6" style={{ padding: '0.8rem 0.9rem' }} />
            </div>

            <SurfaceCard
                className="filter-container"
                padding="0.95rem 1rem"
                radius="1.3rem"
                style={{
                    ...FILTER_SHELL_STYLE,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    background: [
                        'radial-gradient(circle at top right, rgba(59, 130, 246, 0.14) 0%, transparent 26%)',
                        'radial-gradient(circle at left bottom, rgba(20, 184, 166, 0.08) 0%, transparent 28%)',
                        'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 98%, white 2%) 0%, color-mix(in srgb, var(--bg-content) 89%, var(--bg-main) 11%) 100%)',
                    ].join(', '),
                    boxShadow: '0 26px 48px -34px rgba(15, 23, 42, 0.72)',
                    border: '1px solid color-mix(in srgb, var(--border-subtle) 80%, rgba(59, 130, 246, 0.2) 20%)',
                }}
            >
                <div style={{ ...FILTER_ROW_STYLE, alignItems: 'flex-end' }}>
                    <div className="filter-group">
                        <label>Search</label>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                            <input
                                type="text"
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                                placeholder="Search headline, country, city"
                                style={{ width: '220px', paddingLeft: '2.45rem' }}
                            />
                        </div>
                    </div>

                    <div className="filter-group">
                        <label>Country</label>
                        <MultiSelectDropdown
                            options={countryOptions}
                            value={filters.includeCountries}
                            onChange={(value) => setFilterValue('includeCountries', value)}
                            placeholder="All"
                            width="170px"
                            showSearch
                        />
                    </div>

                    <div className="filter-group">
                        <label>Include</label>
                        <select value={filters.includeStatus} onChange={(event) => setFilterValue('includeStatus', event.target.value)} style={{ width: '118px' }}>
                            <option value="all">All</option>
                            <option value="included">Included</option>
                            <option value="excluded">Excluded</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Matching</label>
                        <select value={filters.classification} onChange={(event) => setFilterValue('classification', event.target.value)} style={{ width: '128px' }}>
                            <option value="all">All</option>
                            <option value="matched">Matched</option>
                            <option value="unknown">Unknown</option>
                        </select>
                    </div>
                </div>

                <div style={FILTER_ROW_STYLE}>
                    <div className="filter-group">
                        <label>!Country</label>
                        <MultiSelectDropdown
                            options={countryOptions}
                            value={filters.excludeCountries}
                            onChange={(value) => setFilterValue('excludeCountries', value)}
                            placeholder="None"
                            width="170px"
                            showSearch
                        />
                    </div>

                    <div className="filter-group">
                        <label>!Search</label>
                        <input
                            type="text"
                            value={excludeInput}
                            onChange={(event) => setExcludeInput(event.target.value)}
                            placeholder="Hide matching text"
                            style={{ width: '190px' }}
                        />
                    </div>

                    <div className="filter-group">
                        <label>Sort</label>
                        <select
                            value={`${sortField}:${sortDirection}`}
                            onChange={(event) => {
                                const [field, direction] = event.target.value.split(':') as [SortField, SortDirection];
                                setSortField(field);
                                setSortDirection(direction);
                            }}
                            style={{ width: '148px' }}
                        >
                            <option value="clicks:desc">Clicks ↓</option>
                            <option value="clicks:asc">Clicks ↑</option>
                            <option value="country:asc">Country A-Z</option>
                            <option value="country:desc">Country Z-A</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap', marginLeft: 'auto' }}>
                        <SafeButton
                            onClick={() => patchRows(rows.map((row) => row.rowId), true)}
                            className="hero-btn hero-btn-secondary"
                            style={{ padding: '0.72rem 0.88rem' }}
                            disabled={!sessionId || rows.length === 0}
                        >
                            Include Filtered
                        </SafeButton>
                        <SafeButton
                            onClick={() => patchRows(rows.map((row) => row.rowId), false)}
                            className="hero-btn hero-btn-secondary"
                            style={{ padding: '0.72rem 0.88rem' }}
                            disabled={!sessionId || rows.length === 0}
                        >
                            Exclude Filtered
                        </SafeButton>
                        <SafeButton
                            onClick={() => setFilters(INITIAL_URL_FILTER_STATE)}
                            className="hero-btn hero-btn-secondary"
                            style={{ padding: '0.72rem 0.88rem' }}
                        >
                            Reset
                        </SafeButton>
                    </div>
                </div>
            </SurfaceCard>

            <SurfaceCard padding="0" radius="1.3rem" style={{ overflow: 'hidden' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    padding: '0.9rem 1rem',
                    borderBottom: '1px solid var(--border-subtle)',
                }}>
                    <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                            URLs
                        </div>
                        <div style={{ marginTop: '0.25rem', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
                            {displayedRows.length.toLocaleString()} rows{isFetchingRows ? ' · Refreshing...' : ''}
                        </div>
                    </div>

                    <SafeButton
                        onClick={() => setIsExportModalOpen(true)}
                        className="hero-btn hero-btn-primary"
                        style={{ padding: '0.75rem 0.9rem', gap: '0.5rem' }}
                        disabled={rows.filter((row) => row.include).length === 0}
                    >
                        <Download size={17} />
                        <span>Export Included</span>
                    </SafeButton>
                </div>

                {!sessionId ? (
                    <div style={{ padding: '1.6rem 1.1rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                        Upload a CSV to start filtering URLs by country.
                    </div>
                ) : displayedRows.length === 0 ? (
                    <div style={{ padding: '1.6rem 1.1rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                        No rows match the current filters.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto', maxHeight: '72vh', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '930px' }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--bg-content)' }}>
                                <tr>
                                    {['Include', 'Country', 'Headline', 'Clicks', 'Impr.', 'Cost', 'CTR'].map((header) => (
                                        <th
                                            key={header}
                                            style={{
                                                ...TABLE_CELL_STYLE,
                                                textAlign: 'left',
                                                fontSize: '0.7rem',
                                                letterSpacing: '0.08em',
                                                textTransform: 'uppercase',
                                                color: 'var(--text-muted)',
                                                background: 'var(--bg-content)',
                                            }}
                                        >
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {displayedRows.map((row) => {
                                    const accent = CLASSIFICATION_ACCENTS[row.classification];
                                    return (
                                        <tr
                                            key={row.rowId}
                                            style={{
                                                background: row.include ? 'transparent' : 'rgba(148, 163, 184, 0.06)',
                                                transition: SAFE_INTERACTIVE_TRANSITION,
                                            }}
                                        >
                                            <td style={TABLE_CELL_STYLE}>
                                                <input
                                                    type="checkbox"
                                                    checked={row.include}
                                                    onChange={() => patchRows([row.rowId], !row.include)}
                                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0f766e' }}
                                                />
                                            </td>
                                            <td style={TABLE_CELL_STYLE}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        width: 'fit-content',
                                                        padding: '0.24rem 0.52rem',
                                                        borderRadius: '999px',
                                                        background: accent.bg,
                                                        color: accent.text,
                                                        border: `1px solid ${accent.border}`,
                                                        fontSize: '0.72rem',
                                                        fontWeight: 800,
                                                    }}>
                                                        {row.pageCountry}
                                                    </span>
                                                    {row.pageCity !== 'Unknown' ? (
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{row.pageCity}</span>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td style={{ ...TABLE_CELL_STYLE, maxWidth: '540px' }}>
                                                <a
                                                    href={row.urlNormalized}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{
                                                        color: 'var(--text-main)',
                                                        fontWeight: 600,
                                                        textDecoration: 'none',
                                                        lineHeight: 1.45,
                                                    }}
                                                    title={row.urlNormalized}
                                                >
                                                    {row.headline || row.urlNormalized}
                                                </a>
                                            </td>
                                            <td style={TABLE_CELL_STYLE}>{formatNumber(row.clicks)}</td>
                                            <td style={TABLE_CELL_STYLE}>{formatNumber(row.impressions)}</td>
                                            <td style={TABLE_CELL_STYLE}>{formatCurrency(row.cost)}</td>
                                            <td style={TABLE_CELL_STYLE}>{formatPercent(row.ctr)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </SurfaceCard>

            <InsightExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onExport={handleExport}
                fields={URL_FILTER_EXPORT_FIELDS.map((field) => ({ ...field }))}
                totalCount={rows.filter((row) => row.include).length}
                isExporting={isExporting}
            />

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
                    border: 1px solid color-mix(in srgb, var(--border-subtle) 82%, rgba(15, 118, 110, 0.16) 18%);
                    background: linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(248,250,252,0.88) 100%);
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.66), 0 10px 24px -20px rgba(15, 23, 42, 0.42);
                    transition: border-color 0.2s ease, box-shadow 0.2s ease;
                    color: var(--text-main);
                }
                .filter-container input:focus,
                .filter-container select:focus {
                    outline: none;
                    border-color: rgba(15, 118, 110, 0.36);
                    box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.08), inset 0 1px 0 rgba(255,255,255,0.75);
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
