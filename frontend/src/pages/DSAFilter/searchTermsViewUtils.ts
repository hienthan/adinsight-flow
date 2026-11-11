import type { InvalidSearchTermRow } from './searchTermsUtils';

export function formatNumber(value: number) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function formatCurrency(value: number) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatPercent(value: number) {
    const normalized = value >= 0 && value <= 1 ? value * 100 : value;
    return `${normalized.toFixed(2)}%`;
}

export function getInvalidKeywordKey(row: Pick<InvalidSearchTermRow, 'searchTerm' | 'translatedTerm'>) {
    return `${row.searchTerm}__${row.translatedTerm}`;
}
