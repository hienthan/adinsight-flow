import React from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import { PageRecord, ColumnDef } from '../../types/adinsight';
import { getTierStyle, getFunnelStyle } from './styles';

interface InsightDataTableProps {
    records: PageRecord[];
    columns: ColumnDef[];
    loading: boolean;
}

export const InsightDataTable: React.FC<InsightDataTableProps> = ({ records, columns, loading }) => {
    return (
        <div className="data-table-container hero-card" style={{ padding: 0 }}>
            <table className="data-table">
                <thead>
                    <tr>
                        {columns.map((col, idx) => (
                            <th key={idx} style={{ width: col.width }}>{col.header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {records.map((record) => (
                        <tr key={record.id}>
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
                                                fontWeight: 700
                                            }}>
                                                {record.sub_tag || '-'}
                                            </div>
                                        </td>
                                    )
                                }
                                // Default text rendering for other keys (like title_en, translated_title_vi)
                                return (
                                    <td key={idx} style={{ fontWeight: 600, color: 'var(--text-main)', minWidth: '200px' }}>
                                        {String(record[col.key as keyof PageRecord] || '')}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
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
