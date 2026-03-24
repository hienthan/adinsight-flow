import type { ParsedUploadRow } from './urlFilterUtils';

export const URL_FILTER_PAGE_STYLE = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
} as const;

export const URL_FILTER_ROW_STYLE = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
} as const;

export const URL_FILTER_SHELL_STYLE = {
    position: 'relative',
    zIndex: 60,
    overflow: 'visible',
} as const;

export const URL_FILTER_TABLE_CELL_STYLE = {
    padding: '0.75rem 0.7rem',
    borderBottom: '1px solid var(--border-subtle)',
    verticalAlign: 'top',
} as const;

export const URL_FILTER_CLASSIFICATION_ACCENTS: Record<ParsedUploadRow['classification'], { bg: string; text: string; border: string }> = {
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

export function formatUrlFilterNumber(value: number | null) {
    if (value === null || Number.isNaN(value)) return '-';
    return value.toLocaleString();
}

export function formatUrlFilterCurrency(value: number | null) {
    if (value === null || Number.isNaN(value)) return '-';
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatUrlFilterPercent(value: number | null) {
    if (value === null || Number.isNaN(value)) return '-';
    const normalized = value >= 0 && value <= 1 ? value * 100 : value;
    return `${normalized.toFixed(2)}%`;
}
