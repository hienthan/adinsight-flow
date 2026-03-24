import { memo } from 'react';
import { Copy } from 'lucide-react';
import { SafeButton, SurfaceCard } from '../../../components/common/ui';
import type { InvalidSearchTermRow } from '../searchTermsUtils';
import { getInvalidKeywordKey } from '../searchTermsViewUtils';

const TABLE_CELL_STYLE = {
    padding: '0.72rem 0.68rem',
    borderBottom: '1px solid var(--border-subtle)',
    verticalAlign: 'top',
} as const;

interface InvalidKeywordsPanelProps {
    invalidRows: InvalidSearchTermRow[];
    invalidReasonSummary: string[];
    invalidTranslatedSearch: string;
    onInvalidTranslatedSearchChange: (value: string) => void;
    copyInvalidWithClicks: boolean;
    onCopyInvalidWithClicksChange: (checked: boolean) => void;
    invalidSelection: string[];
    onToggleInvalidSelection: (key: string) => void;
    onSelectAllInvalidKeywords: () => void;
    onClearInvalidKeywordSelection: () => void;
    onCopyInvalidKeywords: (mode: 'selected' | 'filtered') => void;
}

export const InvalidKeywordsPanel = memo(function InvalidKeywordsPanel({
    invalidRows,
    invalidReasonSummary,
    invalidTranslatedSearch,
    onInvalidTranslatedSearchChange,
    copyInvalidWithClicks,
    onCopyInvalidWithClicksChange,
    invalidSelection,
    onToggleInvalidSelection,
    onSelectAllInvalidKeywords,
    onClearInvalidKeywordSelection,
    onCopyInvalidKeywords,
}: InvalidKeywordsPanelProps) {
    if (invalidRows.length === 0) return null;

    const seen = new Set<string>();
    const filteredKeywords = invalidRows.filter((row) => {
        const needle = invalidTranslatedSearch.trim().toLowerCase();
        if (needle && !row.translatedTerm.toLowerCase().includes(needle)) return false;
        const key = getInvalidKeywordKey(row);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    return (
        <SurfaceCard padding="0.8rem 0.95rem" radius="1.1rem" style={{ border: '1px solid rgba(217, 119, 6, 0.16)', background: 'rgba(245, 158, 11, 0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.85rem', flexWrap: 'wrap' }}>
                <div>
                    <div style={{ fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#b45309' }}>
                        Invalid Rows
                    </div>
                    <div style={{ marginTop: '0.25rem', fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: 600 }}>
                        {invalidRows.length.toLocaleString()} rows were skipped during import.
                    </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', maxWidth: '760px' }}>
                    {invalidReasonSummary.slice(0, 3).join(' | ')}
                    {invalidReasonSummary.length > 3 ? ` | +${invalidReasonSummary.length - 3} more reasons` : ''}
                </div>
            </div>

            <div style={{ marginTop: '0.85rem', overflowX: 'auto', maxHeight: '260px', overflowY: 'auto', borderRadius: '0.9rem', border: '1px solid rgba(217, 119, 6, 0.12)', background: 'rgba(255,255,255,0.72)' }}>
                <div style={{ padding: '0.8rem 0.9rem', borderBottom: '1px solid rgba(217, 119, 6, 0.12)', background: 'rgba(255,255,255,0.82)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <label style={{ fontSize: '0.74rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#92400e' }}>
                            Search Invalid By Translated Term
                        </label>
                        <input
                            type="text"
                            value={invalidTranslatedSearch}
                            onChange={(event) => onInvalidTranslatedSearchChange(event.target.value)}
                            placeholder="Find invalid translated terms..."
                            style={{
                                width: '260px',
                                height: '36px',
                                borderRadius: '10px',
                                border: '1px solid rgba(217, 119, 6, 0.18)',
                                background: 'rgba(255,255,255,0.94)',
                                padding: '0.55rem 0.75rem',
                                color: 'var(--text-main)',
                            }}
                        />
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 700 }}>
                            {filteredKeywords.length.toLocaleString()} filtered keywords
                        </div>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 700 }}>
                            <input
                                type="checkbox"
                                checked={copyInvalidWithClicks}
                                onChange={(event) => onCopyInvalidWithClicksChange(event.target.checked)}
                                style={{ accentColor: '#0f766e' }}
                            />
                            <span>Copy with clicks</span>
                        </label>
                        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginLeft: 'auto' }}>
                            <SafeButton onClick={onSelectAllInvalidKeywords} className="hero-btn hero-btn-secondary" style={{ padding: '0.55rem 0.74rem' }}>
                                Select All
                            </SafeButton>
                            <SafeButton onClick={onClearInvalidKeywordSelection} className="hero-btn hero-btn-secondary" style={{ padding: '0.55rem 0.74rem' }}>
                                Clear
                            </SafeButton>
                            <SafeButton onClick={() => onCopyInvalidKeywords('selected')} className="hero-btn hero-btn-primary" style={{ padding: '0.55rem 0.8rem', gap: '0.4rem' }}>
                                <Copy size={14} />
                                <span>Copy Selected</span>
                            </SafeButton>
                            <SafeButton onClick={() => onCopyInvalidKeywords('filtered')} className="hero-btn hero-btn-secondary" style={{ padding: '0.55rem 0.74rem' }}>
                                Copy Filtered
                            </SafeButton>
                        </div>
                    </div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'rgba(255,255,255,0.94)', zIndex: 1 }}>
                        <tr>
                            {['Pick', 'Search Term', 'Translated Term'].map((header) => (
                                <th
                                    key={header}
                                    style={{
                                        ...TABLE_CELL_STYLE,
                                        textAlign: 'left',
                                        fontSize: '0.68rem',
                                        letterSpacing: '0.08em',
                                        textTransform: 'uppercase',
                                        color: '#92400e',
                                        background: 'rgba(255,255,255,0.94)',
                                    }}
                                >
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredKeywords.map((row) => {
                            const key = getInvalidKeywordKey(row);
                            const checked = invalidSelection.includes(key);
                            return (
                                <tr key={key} style={{ background: checked ? 'rgba(14, 165, 233, 0.05)' : 'transparent' }}>
                                    <td style={TABLE_CELL_STYLE}>
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => onToggleInvalidSelection(key)}
                                            style={{ width: '17px', height: '17px', cursor: 'pointer', accentColor: '#0f766e' }}
                                        />
                                    </td>
                                    <td style={{ ...TABLE_CELL_STYLE, fontWeight: 700, color: 'var(--text-main)' }}>{row.searchTerm || '-'}</td>
                                    <td style={{ ...TABLE_CELL_STYLE, overflowWrap: 'anywhere', maxWidth: '420px' }}>{row.translatedTerm || '-'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </SurfaceCard>
    );
});
