import { memo } from 'react';
import { Download } from 'lucide-react';
import { SafeButton, SurfaceCard } from '../../../components/common/ui';
import type { ParsedUploadRow } from '../urlFilterUtils';
import {
    formatUrlFilterCurrency,
    formatUrlFilterNumber,
    formatUrlFilterPercent,
    URL_FILTER_CLASSIFICATION_ACCENTS,
    URL_FILTER_TABLE_CELL_STYLE,
} from '../urlFilterViewUtils';

interface UrlFilterResultsTableProps {
    sessionId: string;
    displayedRows: ParsedUploadRow[];
    isFetchingRows: boolean;
    includedCount: number;
    onOpenExport: () => void;
    onToggleInclude: (rowId: number, include: boolean) => void;
}

export const UrlFilterResultsTable = memo(function UrlFilterResultsTable({
    sessionId,
    displayedRows,
    isFetchingRows,
    includedCount,
    onOpenExport,
    onToggleInclude,
}: UrlFilterResultsTableProps) {
    return (
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
                    onClick={onOpenExport}
                    className="hero-btn hero-btn-primary"
                    style={{ padding: '0.75rem 0.9rem', gap: '0.5rem' }}
                    disabled={includedCount === 0}
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
                                            ...URL_FILTER_TABLE_CELL_STYLE,
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
                                const accent = URL_FILTER_CLASSIFICATION_ACCENTS[row.classification];
                                return (
                                    <tr
                                        key={row.rowId}
                                        style={{
                                            background: row.include ? 'transparent' : 'rgba(148, 163, 184, 0.06)',
                                        }}
                                    >
                                        <td style={URL_FILTER_TABLE_CELL_STYLE}>
                                            <input
                                                type="checkbox"
                                                checked={row.include}
                                                onChange={() => onToggleInclude(row.rowId, !row.include)}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0f766e' }}
                                            />
                                        </td>
                                        <td style={URL_FILTER_TABLE_CELL_STYLE}>
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
                                        <td style={{ ...URL_FILTER_TABLE_CELL_STYLE, maxWidth: '540px' }}>
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
                                        <td style={URL_FILTER_TABLE_CELL_STYLE}>{formatUrlFilterNumber(row.clicks)}</td>
                                        <td style={URL_FILTER_TABLE_CELL_STYLE}>{formatUrlFilterNumber(row.impressions)}</td>
                                        <td style={URL_FILTER_TABLE_CELL_STYLE}>{formatUrlFilterCurrency(row.cost)}</td>
                                        <td style={URL_FILTER_TABLE_CELL_STYLE}>{formatUrlFilterPercent(row.ctr)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </SurfaceCard>
    );
});
