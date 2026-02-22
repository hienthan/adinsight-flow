import React from 'react';
import { ExternalLink, MapPin, ArrowUp, ArrowDown } from 'lucide-react';
import { PageRecord, ColumnDef } from '../../types/adinsight';
import { getTierStyle, getFunnelStyle } from './styles';

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
        <div className="data-table-container hero-card" style={{ padding: 0 }}>
            <table className="data-table">
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
                        return (
                            <tr key={record.id} style={{
                                opacity: isActive ? 1 : 0.45,
                                background: isSelected ? 'hsla(var(--primary)/0.05)' : (isActive ? 'inherit' : 'var(--bg-overlay)'),
                                borderLeft: isSelected ? '3px solid hsl(var(--primary))' : '3px solid transparent'
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
                                    if (col.key === 'canonical_id') {
                                        return (
                                            <td key={idx} style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', width: col.width }}>
                                                {record.canonical_id === "0" ? "-" : `#${record.canonical_id}`}
                                            </td>
                                        );
                                    }
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
                                    if (col.key === 'tier') {
                                        return (
                                            <td key={idx} style={{ width: col.width }}>
                                                <div className="hero-badge" style={{
                                                    textTransform: 'none', padding: '0.2rem 0.5rem', fontSize: '0.75rem',
                                                    fontWeight: 800, borderRadius: '6px', minWidth: '24px', justifyContent: 'center',
                                                    ...getTierStyle(record.tier)
                                                }}>
                                                    {record.tier}
                                                </div>
                                            </td>
                                        );
                                    }
                                    if (col.key === 'location') {
                                        return (
                                            <td key={idx} style={{ minWidth: '150px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <MapPin size={12} style={{ color: 'hsl(var(--primary))', opacity: 0.8 }} />
                                                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-dim)', fontWeight: 500 }}>
                                                        {record.city}, {record.country}
                                                    </span>
                                                </div>
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
                                            <td key={idx} style={{ width: col.width }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                                    {displayCType}
                                                </span>
                                            </td>
                                        );
                                    }
                                    // Default text rendering for other keys (like title_en, translated_title_vi)
                                    return (
                                        <td key={idx} style={{ fontWeight: 600, color: 'var(--text-main)', minWidth: '200px' }}>
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
        </div>
    );
};
