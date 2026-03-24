import { useEffect, useMemo, useRef, useState, startTransition } from 'react';
import type { ChangeEvent } from 'react';
import { toast } from 'sonner';
import { InsightExportModal } from '../AdInsight/InsightExportModal';
import { UrlFilterHero } from './components/UrlFilterHero';
import { UrlFilterResultsTable } from './components/UrlFilterResultsTable';
import { UrlFilterSummaryStrip } from './components/UrlFilterSummaryStrip';
import { UrlFilterToolbar } from './components/UrlFilterToolbar';
import {
    buildSessionQuery,
    INITIAL_URL_FILTER_STATE,
    URL_FILTER_EXPORT_FIELDS,
    mapApiRow,
    type ParsedUploadRow,
    type UrlFilterResponse,
    type UrlFilterState,
} from './urlFilterUtils';
import { URL_FILTER_PAGE_STYLE } from './urlFilterViewUtils';

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

type SortField = 'country' | 'clicks';
type SortDirection = 'asc' | 'desc';

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
    const [isCopyingUrls, setIsCopyingUrls] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [excludeInput, setExcludeInput] = useState('');
    const [sortField, setSortField] = useState<SortField>('clicks');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    const effectiveFilters = useMemo(() => filters, [filters]);
    const includedCount = useMemo(() => rows.filter((row) => row.include).length, [rows]);
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

    const setFilterValue = <K extends keyof UrlFilterState>(id: K, value: UrlFilterState[K]) => {
        startTransition(() => {
            setFilters((previous) => ({ ...previous, [id]: value }));
        });
    };

    const resetPageState = () => {
        setSessionId('');
        setFileName('');
        setRows([]);
        setSummary(null);
        setCountryOptions([]);
        setProcessingError('');
        setFilters(INITIAL_URL_FILTER_STATE);
        setSearchInput('');
        setExcludeInput('');
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
                setSearchInput('');
                setExcludeInput('');
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

    const handleCopySelectedUrls = async () => {
        const includedUrls = displayedRows
            .filter((row) => row.include)
            .map((row) => row.urlNormalized)
            .filter(Boolean);

        if (includedUrls.length === 0) {
            toast.error('No included URLs are available to copy.');
            return;
        }

        const text = includedUrls.join('\n');

        try {
            setIsCopyingUrls(true);
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.setAttribute('readonly', '');
                textArea.style.position = 'absolute';
                textArea.style.left = '-9999px';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }

            setIsExportModalOpen(false);
            toast.success(`Copied ${includedUrls.length.toLocaleString()} URLs`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to copy URLs.';
            toast.error(message);
        } finally {
            setIsCopyingUrls(false);
        }
    };

    return (
        <div className="page-container" style={URL_FILTER_PAGE_STYLE}>
            <UrlFilterHero
                platform={platform}
                isProcessing={isProcessing}
                sessionId={sessionId}
                processingError={processingError}
                onPlatformChange={setPlatform}
                onUploadClick={() => fileInputRef.current?.click()}
                onReset={resetPageState}
            />

            <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,text/csv,text/tab-separated-values"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />

            <UrlFilterSummaryStrip summary={summary} fileName={fileName} />

            <UrlFilterToolbar
                countryOptions={countryOptions}
                filters={filters}
                searchInput={searchInput}
                excludeInput={excludeInput}
                sortField={sortField}
                sortDirection={sortDirection}
                hasRows={!!sessionId && rows.length > 0}
                onSearchInputChange={setSearchInput}
                onExcludeInputChange={setExcludeInput}
                onFilterValueChange={setFilterValue}
                onSortChange={(field, direction) => {
                    setSortField(field);
                    setSortDirection(direction);
                }}
                onIncludeFiltered={() => patchRows(rows.map((row) => row.rowId), true)}
                onExcludeFiltered={() => patchRows(rows.map((row) => row.rowId), false)}
                onResetFilters={() => {
                    setFilters(INITIAL_URL_FILTER_STATE);
                    setSearchInput('');
                    setExcludeInput('');
                }}
            />

            <UrlFilterResultsTable
                sessionId={sessionId}
                displayedRows={displayedRows}
                isFetchingRows={isFetchingRows}
                includedCount={includedCount}
                onOpenExport={() => setIsExportModalOpen(true)}
                onToggleInclude={(rowId, include) => patchRows([rowId], include)}
            />

            <InsightExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onExport={handleExport}
                fields={URL_FILTER_EXPORT_FIELDS.map((field) => ({ ...field }))}
                totalCount={includedCount}
                isExporting={isExporting}
                secondaryActionLabel="Copy URLs"
                onSecondaryAction={handleCopySelectedUrls}
                isSecondaryActionLoading={isCopyingUrls}
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
