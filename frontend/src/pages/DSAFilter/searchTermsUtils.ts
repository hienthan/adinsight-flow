export type SearchTermsPlatform = 'Klook' | 'Traveloka';

export type CopyMode = 'translated-first' | 'original-only' | 'translated-only';
export type GroupSort = 'clicks' | 'cost' | 'terms' | 'url';

export interface ImportedSearchTermRow {
    id: number;
    rowNumber: number;
    searchTerm: string;
    translatedTerm: string;
    headline: string;
    impressions: number;
    clicks: number;
    cost: number;
    ctr: number;
    urlOriginal: string;
    urlNormalized: string;
}

export interface InvalidSearchTermRow {
    rowNumber: number;
    reason: string;
    searchTerm: string;
    translatedTerm: string;
    clicks: number;
    url: string;
}

export interface SearchTermsImportResult {
    rows: ImportedSearchTermRow[];
    invalidRows: InvalidSearchTermRow[];
    headerColumns: string[];
    missingRequiredHeaders: string[];
}

export interface SearchTermsFilters {
    search: string;
    urlContains: string;
    excludeText: string;
    minClicks: string;
    minImpressions: string;
    copyMode: CopyMode;
    sortBy: GroupSort;
    dedupeTerms: boolean;
}

export interface SearchTermItem {
    termId: string;
    displayTerm: string;
    originalTerm: string;
    translatedTerm: string;
    normalizedKey: string;
    clicks: number;
    impressions: number;
    cost: number;
    ctr: number;
    sourceRowCount: number;
    sourceRowIds: number[];
}

export interface SearchTermsGroup {
    groupId: string;
    urlNormalized: string;
    urlOriginal: string;
    headline: string;
    totalClicks: number;
    totalImpressions: number;
    totalCost: number;
    avgCtr: number;
    terms: SearchTermItem[];
}

const HEADER_ALIASES: Record<string, string> = {
    'search term': 'searchTerm',
    'translated term': 'translatedTerm',
    impressions: 'impressions',
    clicks: 'clicks',
    cost: 'cost',
    ctr: 'ctr',
    'ctr (%)': 'ctr',
    url: 'url',
    headline: 'headline',
};

function normalizeHeader(value: string) {
    return value.trim().replace(/^\uFEFF/, '').toLowerCase();
}

function normalizeText(value: string) {
    return value.trim().replace(/\s+/g, ' ');
}

function normalizeTermKey(value: string) {
    return normalizeText(value).toLowerCase();
}

function stripWrappingQuotes(value: string) {
    return value.replace(/^"+|"+$/g, '');
}

function parseNumber(value: string) {
    const normalized = value.replace(/,/g, '').trim();
    if (!normalized) return 0;
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}

function pickDelimiter(text: string) {
    const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
    const commaCount = (firstLine.match(/,/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    return tabCount > commaCount ? '\t' : ',';
}

function parseDelimitedText(text: string, delimiter: string) {
    const rows: string[][] = [];
    let row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        const next = text[index + 1];

        if (char === '"') {
            if (inQuotes && next === '"') {
                current += '"';
                index += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (!inQuotes && char === delimiter) {
            row.push(current);
            current = '';
            continue;
        }

        if (!inQuotes && (char === '\n' || char === '\r')) {
            if (char === '\r' && next === '\n') {
                index += 1;
            }
            row.push(current);
            current = '';
            if (row.some((cell) => cell.trim() !== '')) {
                rows.push(row);
            }
            row = [];
            continue;
        }

        current += char;
    }

    row.push(current);
    if (row.some((cell) => cell.trim() !== '')) {
        rows.push(row);
    }

    return rows;
}

function resolveCanonicalHeader(value: string) {
    return HEADER_ALIASES[normalizeHeader(value)] ?? '';
}

function normalizeUrl(rawUrl: string, _platform: SearchTermsPlatform) {
    const cleanedInput = stripWrappingQuotes(rawUrl.trim()).replace(/[\u200B-\u200D\uFEFF]/g, '');
    const withProtocol = /^https?:\/\//i.test(cleanedInput)
        ? cleanedInput
        : cleanedInput.startsWith('www.')
            ? `https://${cleanedInput}`
            : cleanedInput;
    const safeInput = withProtocol.replace(/ /g, '%20');
    const parsed = new URL(safeInput);
    const protocol = parsed.protocol.toLowerCase();
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname !== '/' ? parsed.pathname.replace(/\/+$/, '') || '/' : '/';
    return `${protocol}//${host}${pathname}`;
}

export async function readFileText(file: File) {
    return await file.text();
}

export function processSearchTermsCsv(text: string, platform: SearchTermsPlatform): SearchTermsImportResult {
    const delimiter = pickDelimiter(text);
    const parsedRows = parseDelimitedText(text, delimiter);
    if (parsedRows.length === 0) {
        return { rows: [], invalidRows: [], headerColumns: [], missingRequiredHeaders: ['Search Term', 'URL'] };
    }

    const [headerRow, ...dataRows] = parsedRows;
    const canonicalHeaders = headerRow.map(resolveCanonicalHeader);
    const headerColumns = headerRow.map((header) => header.trim());

    const headerIndex = canonicalHeaders.reduce<Record<string, number>>((accumulator, header, index) => {
        if (header && accumulator[header] === undefined) {
            accumulator[header] = index;
        }
        return accumulator;
    }, {});

    const result: SearchTermsImportResult = {
        rows: [],
        invalidRows: [],
        headerColumns,
        missingRequiredHeaders: [],
    };

    if (headerIndex.searchTerm === undefined) {
        result.missingRequiredHeaders.push('Search Term');
    }
    if (headerIndex.url === undefined) {
        result.missingRequiredHeaders.push('URL');
    }

    if (result.missingRequiredHeaders.length > 0) {
        return result;
    }

    dataRows.forEach((cells, rowIndex) => {
        const rowNumber = rowIndex + 2;
        const readValue = (key: string) => normalizeText(cells[headerIndex[key]] ?? '');

        const searchTerm = readValue('searchTerm');
        const translatedTerm = readValue('translatedTerm');
        const headline = readValue('headline');
        const rawUrl = readValue('url');

        if (!searchTerm) {
            result.invalidRows.push({ rowNumber, reason: 'Missing Search Term', searchTerm: '', translatedTerm, clicks: parseNumber(readValue('clicks')), url: rawUrl });
            return;
        }

        if (!rawUrl) {
            result.invalidRows.push({ rowNumber, reason: 'Missing URL', searchTerm, translatedTerm, clicks: parseNumber(readValue('clicks')), url: '' });
            return;
        }

        let urlNormalized = '';
        try {
            urlNormalized = normalizeUrl(rawUrl, platform);
        } catch {
            result.invalidRows.push({ rowNumber, reason: 'Invalid URL', searchTerm, translatedTerm, clicks: parseNumber(readValue('clicks')), url: rawUrl });
            return;
        }

        result.rows.push({
            id: result.rows.length + 1,
            rowNumber,
            searchTerm,
            translatedTerm,
            headline,
            impressions: parseNumber(readValue('impressions')),
            clicks: parseNumber(readValue('clicks')),
            cost: parseNumber(readValue('cost')),
            ctr: parseNumber(readValue('ctr')),
            urlOriginal: rawUrl,
            urlNormalized,
            });
    });

    return result;
}

function getDisplayTerm(row: ImportedSearchTermRow, copyMode: CopyMode) {
    if (copyMode === 'original-only') return row.searchTerm;
    if (copyMode === 'translated-only') return row.translatedTerm;
    return row.translatedTerm || row.searchTerm;
}

function buildGroupHeadline(rows: ImportedSearchTermRow[]) {
    const sortedRows = [...rows].sort((left, right) => {
        if (right.clicks !== left.clicks) return right.clicks - left.clicks;
        return right.impressions - left.impressions;
    });
    return sortedRows.find((row) => row.headline)?.headline || rows[0]?.urlNormalized || '';
}

function buildTermId(groupId: string, normalizedKey: string, sourceIndex: number) {
    return `${groupId}::${normalizedKey}::${sourceIndex}`;
}

function compareTermStrength(left: Pick<SearchTermItem, 'clicks' | 'impressions' | 'cost' | 'displayTerm'>, right: Pick<SearchTermItem, 'clicks' | 'impressions' | 'cost' | 'displayTerm'>) {
    if (left.clicks !== right.clicks) return left.clicks - right.clicks;
    if (left.impressions !== right.impressions) return left.impressions - right.impressions;
    if (left.cost !== right.cost) return left.cost - right.cost;
    return right.displayTerm.localeCompare(left.displayTerm);
}

export function buildSearchTermsGroups(rows: ImportedSearchTermRow[], filters: SearchTermsFilters) {
    const groupedRows = new Map<string, ImportedSearchTermRow[]>();
    const searchNeedle = normalizeTermKey(filters.search);
    const urlNeedle = normalizeTermKey(filters.urlContains);
    const excludeNeedle = normalizeTermKey(filters.excludeText);
    const minClicks = Number.parseFloat(filters.minClicks || '0') || 0;
    const minImpressions = Number.parseFloat(filters.minImpressions || '0') || 0;

    rows.forEach((row) => {
        const existing = groupedRows.get(row.urlNormalized);
        if (existing) {
            existing.push(row);
        } else {
            groupedRows.set(row.urlNormalized, [row]);
        }
    });

    const groups: SearchTermsGroup[] = [];

    groupedRows.forEach((groupRows, groupId) => {
        const totalClicks = groupRows.reduce((sum, row) => sum + row.clicks, 0);
        const totalImpressions = groupRows.reduce((sum, row) => sum + row.impressions, 0);
        const totalCost = groupRows.reduce((sum, row) => sum + row.cost, 0);
        const avgCtr = totalImpressions > 0
            ? groupRows.reduce((sum, row) => sum + (row.ctr * row.impressions), 0) / totalImpressions
            : groupRows.reduce((sum, row) => sum + row.ctr, 0) / Math.max(groupRows.length, 1);
        const headline = buildGroupHeadline(groupRows);

        const terms: SearchTermItem[] = [];

        groupRows.forEach((row, sourceIndex) => {
            const displayTerm = normalizeText(getDisplayTerm(row, filters.copyMode));
            if (!displayTerm) return;

            const originalTerm = normalizeText(row.searchTerm);
            const translatedTerm = normalizeText(row.translatedTerm);
            const normalizedKey = normalizeTermKey(displayTerm);
            const haystack = normalizeTermKey([displayTerm, originalTerm, translatedTerm].join(' '));

            if (excludeNeedle && haystack.includes(excludeNeedle)) return;
            if (row.clicks < minClicks) return;
            if (row.impressions < minImpressions) return;

            terms.push({
                termId: buildTermId(groupId, normalizedKey, sourceIndex),
                displayTerm,
                originalTerm,
                translatedTerm,
                normalizedKey,
                clicks: row.clicks,
                impressions: row.impressions,
                cost: row.cost,
                ctr: row.ctr,
                sourceRowCount: 1,
                sourceRowIds: [row.id],
            });
        });

        const visibleTerms = filters.dedupeTerms
            ? Array.from(terms.reduce((accumulator, term) => {
                const existing = accumulator.get(term.normalizedKey);
                if (!existing) {
                    accumulator.set(term.normalizedKey, term);
                    return accumulator;
                }

                const preferred = compareTermStrength(term, existing) > 0 ? term : existing;
                const merged: SearchTermItem = {
                    ...preferred,
                    sourceRowCount: existing.sourceRowCount + term.sourceRowCount,
                    sourceRowIds: Array.from(new Set([...existing.sourceRowIds, ...term.sourceRowIds])),
                };
                accumulator.set(term.normalizedKey, merged);
                return accumulator;
            }, new Map<string, SearchTermItem>()).values())
            : terms;

        const filteredTerms = visibleTerms
            .filter((term) => {
                if (!searchNeedle) return true;

                const groupHaystack = normalizeTermKey([groupId, headline].join(' '));
                if (groupHaystack.includes(searchNeedle)) return true;

                const termHaystack = normalizeTermKey([term.displayTerm, term.originalTerm, term.translatedTerm].join(' '));
                return termHaystack.includes(searchNeedle);
            })
            .sort((left, right) => {
                if (right.clicks !== left.clicks) return right.clicks - left.clicks;
                if (right.impressions !== left.impressions) return right.impressions - left.impressions;
                if (right.cost !== left.cost) return right.cost - left.cost;
                return left.displayTerm.localeCompare(right.displayTerm);
            });

        if (urlNeedle && !normalizeTermKey(groupId).includes(urlNeedle)) {
            return;
        }

        groups.push({
            groupId,
            urlNormalized: groupId,
            urlOriginal: groupRows[0]?.urlOriginal || groupId,
            headline,
            totalClicks: filters.dedupeTerms ? visibleTerms.reduce((sum, term) => sum + term.clicks, 0) : totalClicks,
            totalImpressions: filters.dedupeTerms ? visibleTerms.reduce((sum, term) => sum + term.impressions, 0) : totalImpressions,
            totalCost: filters.dedupeTerms ? visibleTerms.reduce((sum, term) => sum + term.cost, 0) : totalCost,
            avgCtr: filters.dedupeTerms
                ? (() => {
                    const impressions = visibleTerms.reduce((sum, term) => sum + term.impressions, 0);
                    if (impressions > 0) {
                        return visibleTerms.reduce((sum, term) => sum + (term.ctr * term.impressions), 0) / impressions;
                    }
                    return visibleTerms.reduce((sum, term) => sum + term.ctr, 0) / Math.max(visibleTerms.length, 1);
                })()
                : avgCtr,
            terms: filteredTerms,
        });
    });

    groups.sort((left, right) => {
        if (filters.sortBy === 'url') {
            return left.urlNormalized.localeCompare(right.urlNormalized);
        }
        if (filters.sortBy === 'cost') {
            if (right.totalCost !== left.totalCost) return right.totalCost - left.totalCost;
            return right.totalClicks - left.totalClicks;
        }
        if (filters.sortBy === 'terms') {
            if (right.terms.length !== left.terms.length) return right.terms.length - left.terms.length;
            return right.totalClicks - left.totalClicks;
        }
        if (right.totalClicks !== left.totalClicks) return right.totalClicks - left.totalClicks;
        return right.terms.length - left.terms.length;
    });

    return groups;
}

export function createTemplateCsv() {
    return [
        ['Search Term', 'Translated Term', 'Impressions', 'Clicks', 'Cost', 'CTR (%)', 'URL', 'Headline'].join(','),
        ['由布院 之 森', 'Yufuin no Mori', '96', '13', '13096.46', '25.65', 'https://www.klook.com/zh-HK/japan-rail/yufuin-no-mori/', 'Ve tau Yufuin no Mori va lich trinh | Klook'].join(','),
        ['由布院 之 森 列車', 'Tau Yufuin no Mori', '79', '11', '13101', '23.97', 'https://www.klook.com/zh-HK/japan-rail/yufuin-no-mori/', 'Ve tau Yufuin no Mori va lich trinh | Klook'].join(','),
    ].join('\n');
}

export const INITIAL_SEARCH_TERMS_FILTERS: SearchTermsFilters = {
    search: '',
    urlContains: '',
    excludeText: '',
    minClicks: '',
    minImpressions: '',
    copyMode: 'original-only',
    sortBy: 'clicks',
    dedupeTerms: true,
};
