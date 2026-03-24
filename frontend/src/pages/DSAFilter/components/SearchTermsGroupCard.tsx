import { memo } from 'react';
import { ChevronDown, ChevronUp, Copy, Link2 } from 'lucide-react';
import { SafeButton, SurfaceCard } from '../../../components/common/ui';
import type { SearchTermsGroup } from '../searchTermsUtils';
import { formatCurrency, formatNumber, formatPercent } from '../searchTermsViewUtils';

const TABLE_CELL_STYLE = {
    padding: '0.72rem 0.68rem',
    borderBottom: '1px solid var(--border-subtle)',
    verticalAlign: 'top',
} as const;

interface SearchTermsGroupCardProps {
    group: SearchTermsGroup;
    isExpanded: boolean;
    selectedIds: string[];
    copyWithClicks: boolean;
    onCopy: (group: SearchTermsGroup, mode: 'selected' | 'all') => void;
    onToggleExpanded: (groupId: string) => void;
    onSelectAll: (group: SearchTermsGroup) => void;
    onClearSelection: (groupId: string) => void;
    onToggleTermSelection: (groupId: string, termId: string) => void;
}

export const SearchTermsGroupCard = memo(function SearchTermsGroupCard({
    group,
    isExpanded,
    selectedIds,
    copyWithClicks,
    onCopy,
    onToggleExpanded,
    onSelectAll,
    onClearSelection,
    onToggleTermSelection,
}: SearchTermsGroupCardProps) {
    const selectedSet = new Set(selectedIds);
    const selectedCount = selectedSet.size;

    return (
        <SurfaceCard
            padding="0"
            radius="1.1rem"
            style={{
                overflow: 'hidden',
                border: '1px solid color-mix(in srgb, var(--border-subtle) 82%, rgba(14, 165, 233, 0.18) 18%)',
                background: [
                    'radial-gradient(circle at top right, rgba(14, 165, 233, 0.12) 0%, transparent 28%)',
                    'radial-gradient(circle at left bottom, rgba(20, 184, 166, 0.08) 0%, transparent 32%)',
                    'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 98%, white 2%) 0%, color-mix(in srgb, var(--bg-content) 92%, var(--bg-main) 8%) 100%)',
                ].join(', '),
                boxShadow: '0 24px 40px -34px rgba(15, 23, 42, 0.56)',
            }}
        >
            <div style={{ padding: '0.95rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.9rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                            <span className="hero-badge" style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0369a1', border: '1px solid rgba(3, 105, 161, 0.16)' }}>
                                {group.terms.length} terms
                            </span>
                            <span className="hero-badge" style={{ background: 'rgba(20, 184, 166, 0.1)', color: '#0f766e', border: '1px solid rgba(15, 118, 110, 0.16)' }}>
                                {selectedCount} selected
                            </span>
                            <span className="hero-badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#4338ca', border: '1px solid rgba(67, 56, 202, 0.16)' }}>
                                {formatNumber(group.totalClicks)} clicks
                            </span>
                            {copyWithClicks ? (
                                <span className="hero-badge" style={{ background: 'rgba(15, 23, 42, 0.06)', color: 'var(--text-dim)', border: '1px solid rgba(148, 163, 184, 0.14)' }}>
                                    Copy includes clicks
                                </span>
                            ) : null}
                        </div>

                        <a
                            href={group.urlNormalized}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: 'var(--text-main)', fontWeight: 750, textDecoration: 'none', lineHeight: 1.45, overflowWrap: 'anywhere' }}
                        >
                            <Link2 size={15} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem', color: 'var(--text-dim)' }} />
                            {group.urlNormalized}
                        </a>

                        <div style={{ color: 'var(--text-dim)', fontSize: '0.84rem', fontWeight: 600 }}>
                            {group.headline}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        <SafeButton
                            onClick={() => onCopy(group, 'selected')}
                            className="hero-btn hero-btn-primary"
                            style={{
                                padding: '0.62rem 0.8rem',
                                gap: '0.42rem',
                                borderRadius: '999px',
                                background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                                boxShadow: '0 14px 24px -18px rgba(37, 99, 235, 0.72)',
                            }}
                        >
                            <Copy size={15} />
                            <span>Copy Selected</span>
                        </SafeButton>
                        <SafeButton
                            onClick={() => onCopy(group, 'all')}
                            className="hero-btn hero-btn-secondary"
                            style={{
                                padding: '0.62rem 0.8rem',
                                borderRadius: '999px',
                                background: 'rgba(255,255,255,0.78)',
                                border: '1px solid rgba(14, 165, 233, 0.12)',
                                boxShadow: '0 10px 18px -18px rgba(15, 23, 42, 0.42)',
                            }}
                        >
                            Copy All
                        </SafeButton>
                        <SafeButton
                            onClick={() => onToggleExpanded(group.groupId)}
                            className="hero-btn hero-btn-secondary"
                            style={{
                                padding: '0.62rem 0.78rem',
                                gap: '0.35rem',
                                borderRadius: '999px',
                                background: 'rgba(255,255,255,0.7)',
                                border: '1px solid rgba(148, 163, 184, 0.18)',
                            }}
                        >
                            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                            <span>{isExpanded ? 'Hide' : 'Terms'}</span>
                        </SafeButton>
                    </div>
                </div>

                <div style={{ display: 'grid', gap: '0.65rem', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                    <div style={{ padding: '0.72rem 0.8rem', borderRadius: '0.95rem', background: 'var(--bg-overlay)' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Impressions</div>
                        <div style={{ marginTop: '0.25rem', fontSize: '1rem', fontWeight: 760 }}>{formatNumber(group.totalImpressions)}</div>
                    </div>
                    <div style={{ padding: '0.72rem 0.8rem', borderRadius: '0.95rem', background: 'var(--bg-overlay)' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cost</div>
                        <div style={{ marginTop: '0.25rem', fontSize: '1rem', fontWeight: 760 }}>{formatCurrency(group.totalCost)}</div>
                    </div>
                    <div style={{ padding: '0.72rem 0.8rem', borderRadius: '0.95rem', background: 'var(--bg-overlay)' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>CTR</div>
                        <div style={{ marginTop: '0.25rem', fontSize: '1rem', fontWeight: 760 }}>{formatPercent(group.avgCtr)}</div>
                    </div>
                </div>
            </div>

            {isExpanded ? (
                <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', padding: '0.8rem 1rem', background: 'var(--bg-overlay)', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 700 }}>
                            {selectedCount.toLocaleString()} of {group.terms.length.toLocaleString()} terms selected
                        </div>
                        <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
                            <SafeButton onClick={() => onSelectAll(group)} className="hero-btn hero-btn-secondary" style={{ padding: '0.6rem 0.78rem' }}>
                                Select All
                            </SafeButton>
                            <SafeButton onClick={() => onClearSelection(group.groupId)} className="hero-btn hero-btn-secondary" style={{ padding: '0.6rem 0.78rem' }}>
                                Clear
                            </SafeButton>
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '880px' }}>
                            <thead style={{ background: 'var(--bg-content)' }}>
                                <tr>
                                    {['Pick', 'Original', 'Translated', 'Clicks', 'Impr.', 'Cost', 'Rows'].map((header) => (
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
                                {group.terms.map((term) => {
                                    const checked = selectedSet.has(term.termId);
                                    return (
                                        <tr key={term.termId} style={{ background: checked ? 'transparent' : 'rgba(148, 163, 184, 0.05)' }}>
                                            <td style={TABLE_CELL_STYLE}>
                                                <input type="checkbox" checked={checked} onChange={() => onToggleTermSelection(group.groupId, term.termId)} style={{ width: '17px', height: '17px', cursor: 'pointer', accentColor: '#0f766e' }} />
                                            </td>
                                            <td style={{ ...TABLE_CELL_STYLE, fontWeight: 700, color: 'var(--text-main)' }}>{term.originalTerm || '-'}</td>
                                            <td style={TABLE_CELL_STYLE}>{term.translatedTerm || '-'}</td>
                                            <td style={TABLE_CELL_STYLE}>{formatNumber(term.clicks)}</td>
                                            <td style={TABLE_CELL_STYLE}>{formatNumber(term.impressions)}</td>
                                            <td style={TABLE_CELL_STYLE}>{formatCurrency(term.cost)}</td>
                                            <td style={TABLE_CELL_STYLE}>{formatNumber(term.sourceRowCount)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : null}
        </SurfaceCard>
    );
});
