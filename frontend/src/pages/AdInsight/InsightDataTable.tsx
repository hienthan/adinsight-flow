import React from 'react';
import { ExternalLink, MapPin, ArrowUp, ArrowDown } from 'lucide-react';
import { PageRecord, ColumnDef } from '../../types/adinsight';
import { getTierStyle, getFunnelStyle } from './styles';
import { SurfaceCard } from '../../components/common/ui';

interface InsightDataTableProps {
    records: PageRecord[];
    columns: ColumnDef[];
    loading: boolean;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    onSort?: (field: string) => void;
    selectedIds?: string[];
    onSelect?: (id: string) => void;
    onSelectAll?: (ids: string[], isSelected: boolean) => void;
}

const formatLocationValue = (val: string | undefined, fullFormatting = false) => {
    if (!val) return val || '';
    let result = val.toLowerCase();

    // 1. Shorthand replacement (always done)
    result = result.replace(/daerah-istimewa-yogyakarta/g, 'DIY');

    if (!fullFormatting) {
        // For Campaign/Geo Entity, we just want the replacement if it occurs
        return val.replace(/daerah-istimewa-yogyakarta/gi, 'DIY');
    }

    // 2. For Location specifically: Title Case and remove dashes
    return result
        .split(/[-\s]+/)
        .map(part => {
            if (part === 'diy') return 'DIY';
            if (part === 'jakarta') return 'Jakarta';
            return part.charAt(0).toUpperCase() + part.slice(1);
        })
        .join(' ');
};

export const InsightDataTable: React.FC<InsightDataTableProps> = ({
    records,
    columns,
    loading,
    sortField,
    sortDirection,
    onSort,
    selectedIds = [],
    onSelect,
    onSelectAll
}) => {
    const allSelected = records.length > 0 && records.every(r => selectedIds.includes(r.id));

    return (
        <SurfaceCard className="data-table-container" padding={0}>
            <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead>
                    <tr>
                        {onSelect && onSelectAll && (
                            <th style={{ width: '40px', textAlign: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={(e) => onSelectAll(records.map(r => r.id), e.target.checked)}
                                    style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                                />
                            </th>
                        )}
                        {columns.map((col, idx) => {
                            const sortKey = col.key === 'location' ? 'country' : col.key;
                            return (
                                <th
                                    key={idx}
                                    style={{ width: col.width, cursor: onSort ? 'pointer' : 'default', userSelect: 'none' }}
                                    onClick={() => onSort && onSort(sortKey)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {col.header}
                                        {sortField === sortKey && (
                                            sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                        )}
                                    </div>
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {records.map((record) => {
                        const isActive = record.is_active !== false && record.include_for_dsa !== false;
                        const isSelected = selectedIds.includes(record.id);
                        const is404 = record.last_http_status === 404;

                        return (
                            <tr key={record.id} style={{
                                opacity: isActive ? 1 : 0.45,
                                background: isSelected
                                    ? 'hsla(var(--primary)/0.05)'
                                    : (is404 ? 'rgba(245, 158, 11, 0.05)' : (isActive ? 'inherit' : 'var(--bg-overlay)')),
                                borderLeft: isSelected
                                    ? '4px solid hsl(var(--primary))'
                                    : (is404 ? '4px solid rgba(245, 158, 11, 0.5)' : '4px solid transparent'),
                                transition: 'background-color 0.2s ease, border-color 0.2s ease, opacity 0.2s ease'
                            }}>
                                {onSelect && (
                                    <td style={{ textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => onSelect(record.id)}
                                            style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                                        />
                                    </td>
                                )}
                                {columns.map((col, idx) => {
                                    if (col.key === 'slug') {
                                        return (
                                            <td key={idx} style={{ maxWidth: col.width, overflow: 'hidden' }}>
                                                <a href={record.url} target="_blank" rel="noopener noreferrer" className="slug-link" title="Open original URL" style={{ maxWidth: '100%' }}>
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{record.slug}</span>
                                                    <ExternalLink size={12} style={{ flexShrink: 0 }} />
                                                </a>
                                            </td>
                                        );
                                    }
                                    if (col.key === 'funnel_stage') {
                                        return (
                                            <td key={idx} style={{ width: col.width }}>
                                                <div className="hero-badge" style={{
                                                    textTransform: 'capitalize',
                                                    padding: '0.2rem 0.5rem',
                                                    fontSize: '0.72rem',
                                                    fontWeight: 700,
                                                    borderRadius: '6px',
                                                    justifyContent: 'center',
                                                    ...getFunnelStyle(record.funnel_stage)
                                                }}>
                                                    {record.funnel_stage || 'awareness'}
                                                </div>
                                            </td>
                                        );
                                    }
                                    if (col.key === 'tier' || col.key === 'affiliate_tier') {
                                        const rawTier = String(record[col.key as keyof PageRecord] || '');
                                        let tierVal = rawTier;
                                        if (rawTier === 'excluded') tierVal = '!';
                                        else if (rawTier.startsWith('a') && rawTier.length > 1) {
                                            tierVal = rawTier.slice(1);
                                        }

                                        const scoreSuffix = record.final_score !== undefined && record.final_score !== null
                                            ? ` (${record.final_score})`
                                            : '';
                                        const displayVal = `${tierVal}${scoreSuffix}`;

                                        return (
                                            <td key={idx} style={{ width: col.width }}>
                                                <div className="hero-badge" style={{
                                                    textTransform: 'none', padding: '0.2rem 0.5rem', fontSize: '0.75rem',
                                                    fontWeight: 800, borderRadius: '6px', minWidth: '40px', justifyContent: 'center',
                                                    whiteSpace: 'nowrap',
                                                    ...(rawTier === 'excluded'
                                                        ? { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }
                                                        : getTierStyle(rawTier))
                                                }}>
                                                    {displayVal}
                                                </div>
                                            </td>
                                        );
                                    }
                                    if (col.key === 'score') {
                                        const geo = record.geo_score ?? 0;
                                        const intent = record.intent_score ?? 0;
                                        return (
                                            <td key={idx} style={{ width: col.width }}>
                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                                                    <span style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '2px 6px', borderRadius: '4px' }}>{geo}</span>
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>/</span>
                                                    <span style={{ color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.12)', padding: '2px 6px', borderRadius: '4px' }}>{intent}</span>
                                                </div>
                                            </td>
                                        );
                                    }
                                    if (col.key === 'location') {
                                        const isTraveloka = !!record.title_en;
                                        let displayText = '';

                                        if (isTraveloka) {
                                            const parts = [record.city, record.province]
                                                .filter(p => p && p.toLowerCase() !== 'unknown')
                                                .map(p => formatLocationValue(p, true));
                                            displayText = parts.join(' / ');
                                            if (!displayText) displayText = '-';
                                        } else {
                                            displayText = `${formatLocationValue(record.city, true)}, ${record.country}`;
                                        }

                                        return (
                                            <td key={idx} style={{ minWidth: col.width || '150px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <MapPin size={12} style={{ color: 'hsl(var(--primary))', opacity: 0.8 }} />
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
                                                        {displayText}
                                                    </span>
                                                </div>
                                            </td>
                                        );
                                    }
                                    if (col.key === 'dsa_campaign' || col.key === 'geo_entity') {
                                        const val = String(record[col.key as keyof PageRecord] || '');
                                        const formattedVal = formatLocationValue(val, false);
                                        return (
                                            <td key={idx} style={{ width: col.width }}>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    color: 'var(--text-main)',
                                                    fontWeight: 700,
                                                    display: 'block',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }} title={formattedVal}>
                                                    {formattedVal || '-'}
                                                </span>
                                            </td>
                                        );
                                    }
                                    if (col.key === 'sub_tag') {
                                        return (
                                            <td key={idx} style={{ width: col.width }}>
                                                <div className="hero-badge" style={{
                                                    background: 'hsla(var(--primary) / 0.1)',
                                                    color: 'hsl(var(--primary))',
                                                    fontSize: '0.72rem',
                                                    fontWeight: 700,
                                                    textTransform: 'none'
                                                }}>
                                                    {record.sub_tag || '-'}
                                                </div>
                                            </td>
                                        )
                                    }
                                    if (col.key === 'content_type') {
                                        const rawCType = record.content_type || '-';
                                        const displayCType = rawCType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                        return (
                                            <td key={idx} style={{ width: col.width, overflow: 'hidden' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={displayCType}>
                                                    {displayCType}
                                                </span>
                                            </td>
                                        );
                                    }
                                    if (col.key === 'title_en' || col.key === 'translated_title_vi') {
                                        const is404 = record.last_http_status === 404;
                                        return (
                                            <td key={idx} style={{ minWidth: col.width || '200px' }}>
                                                <a
                                                    href={record.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        fontWeight: 700,
                                                        color: is404 ? '#d97706' : 'hsl(var(--primary))',
                                                        textDecoration: 'none',
                                                        lineHeight: 1.4,
                                                        fontSize: '0.9rem',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical'
                                                    }}
                                                    className="title-link"
                                                    title={String(record[col.key as keyof PageRecord] || '')}
                                                >
                                                    {String(record[col.key as keyof PageRecord] || '')}
                                                </a>
                                            </td>
                                        );
                                    }
                                    // Default text rendering for other keys
                                    return (
                                        <td key={idx} style={{ fontWeight: 600, color: 'var(--text-main)', width: col.width, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={String(record[col.key as keyof PageRecord] || '')}>
                                            {String(record[col.key as keyof PageRecord] || '')}
                                        </td>
                                    );
                                })}
                            </tr>
                        )
                    })}
                    {loading && (
                        <tr><td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>Loading next batch...</td></tr>
                    )}
                    {records.length === 0 && !loading && (
                        <tr><td colSpan={columns.length} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>No records found for active filters.</td></tr>
                    )}
                </tbody>
            </table>
        </SurfaceCard>
    );
};
