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

const formatCompactLabel = (val: string | undefined) => {
    if (!val) return '-';
    return val
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatSignedMetric = (value: number) => {
    const rounded = Math.round(value);
    if (rounded > 0) return `+${rounded.toLocaleString()}`;
    if (rounded < 0) return rounded.toLocaleString();
    return '0';
};

const getTripReadinessStyle = (value: string) => {
    switch (value) {
        case 'high':
            return { background: 'rgba(16, 185, 129, 0.14)', color: '#047857' };
        case 'medium_high':
            return { background: 'rgba(59, 130, 246, 0.14)', color: '#1d4ed8' };
        case 'medium':
            return { background: 'rgba(245, 158, 11, 0.14)', color: '#b45309' };
        default:
            return { background: 'rgba(148, 163, 184, 0.16)', color: 'var(--text-muted)' };
    }
};

const getTripMarketFitStyle = (value: string) => {
    switch (value) {
        case 'high':
            return { background: 'rgba(16, 185, 129, 0.14)', color: '#047857' };
        case 'medium':
            return { background: 'rgba(99, 102, 241, 0.14)', color: '#4338ca' };
        default:
            return { background: 'rgba(239, 68, 68, 0.12)', color: '#b91c1c' };
    }
};

const getTransportScopeStyle = (value: string) => {
    switch (value) {
        case 'airport_transfer':
        case 'airport_to_city':
            return { background: 'rgba(16, 185, 129, 0.14)', color: '#047857' };
        case 'intercity_route':
        case 'cross_border_route':
            return { background: 'rgba(59, 130, 246, 0.14)', color: '#1d4ed8' };
        case 'airport_general':
        case 'station_guide':
        case 'rail_pass':
        case 'ferry_route':
            return { background: 'rgba(245, 158, 11, 0.14)', color: '#b45309' };
        case 'city_transit':
        case 'metro_map':
        case 'timetable':
        case 'parking':
        case 'unknown':
            return { background: 'rgba(148, 163, 184, 0.16)', color: 'var(--text-muted)' };
        default:
            return { background: 'rgba(148, 163, 184, 0.16)', color: 'var(--text-muted)' };
    }
};

const getTransportFitStyle = (value: string) => {
    switch (value) {
        case 'high':
            return { background: 'rgba(16, 185, 129, 0.14)', color: '#047857' };
        case 'medium':
            return { background: 'rgba(245, 158, 11, 0.14)', color: '#b45309' };
        case 'low':
            return { background: 'rgba(148, 163, 184, 0.16)', color: 'var(--text-muted)' };
        default:
            return { background: 'rgba(148, 163, 184, 0.16)', color: 'var(--text-muted)' };
    }
};

const getTransportGeoScopeStyle = (value: string) => {
    switch (value) {
        case 'top_outbound_geo':
            return { background: 'rgba(16, 185, 129, 0.14)', color: '#047857' };
        case 'destination_city':
            return { background: 'rgba(59, 130, 246, 0.14)', color: '#1d4ed8' };
        case 'domestic_tw':
        case 'cross_border_short_haul':
            return { background: 'rgba(245, 158, 11, 0.14)', color: '#b45309' };
        case 'local_city':
        case 'unknown':
            return { background: 'rgba(148, 163, 184, 0.16)', color: 'var(--text-muted)' };
        default:
            return { background: 'rgba(148, 163, 184, 0.16)', color: 'var(--text-muted)' };
    }
};

const getTransportTripStageStyle = (value: string) => {
    switch (value) {
        case 'pre_trip':
            return { background: 'rgba(16, 185, 129, 0.14)', color: '#047857' };
        case 'arrival_immediate':
            return { background: 'rgba(59, 130, 246, 0.14)', color: '#1d4ed8' };
        case 'in_trip':
            return { background: 'rgba(245, 158, 11, 0.14)', color: '#b45309' };
        case 'local_utility':
        case 'unknown':
            return { background: 'rgba(148, 163, 184, 0.16)', color: 'var(--text-muted)' };
        default:
            return { background: 'rgba(148, 163, 184, 0.16)', color: 'var(--text-muted)' };
    }
};

const getPatternBadgeStyle = (value: string) => {
    switch (value) {
        case 'guide/transport':
            return { background: 'rgba(5, 150, 105, 0.14)', color: '#047857' };
        case 'travel-guide/destination':
            return { background: 'rgba(37, 99, 235, 0.14)', color: '#1d4ed8' };
        case 'guide/destination':
            return { background: 'rgba(124, 58, 237, 0.14)', color: '#6d28d9' };
        case 'guide/info':
            return { background: 'rgba(14, 165, 233, 0.14)', color: '#0369a1' };
        case 'blog':
            return { background: 'rgba(245, 158, 11, 0.14)', color: '#b45309' };
        default:
            return { background: 'rgba(148, 163, 184, 0.16)', color: 'var(--text-muted)' };
    }
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
        <SurfaceCard
            className="data-table-container"
            padding={0}
            style={{
                borderRadius: '1.55rem',
                overflow: 'hidden',
                background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 96%, var(--bg-main) 4%) 0%, color-mix(in srgb, var(--bg-content) 90%, var(--bg-main) 10%) 100%)',
                boxShadow: '0 24px 42px -34px rgba(15, 23, 42, 0.7)',
            }}
        >
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
                                    ? 'linear-gradient(90deg, hsla(var(--primary)/0.1) 0%, transparent 100%)'
                                    : (is404 ? 'rgba(245, 158, 11, 0.06)' : (isActive ? 'inherit' : 'var(--bg-overlay)')),
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
                                    if (col.key === 'url') {
                                        const urlValue = String(record.url || '-');
                                        return (
                                            <td key={idx} style={{ maxWidth: col.width, overflow: 'hidden' }}>
                                                <a
                                                    href={record.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="slug-link"
                                                    title={urlValue}
                                                    style={{ maxWidth: '100%' }}
                                                >
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                                                        {urlValue}
                                                    </span>
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
                                        const isTrip = !!record.pattern || !!record.readiness_hint || typeof record.traffic === 'number';
                                        let displayText = '';

                                        if (isTrip) {
                                            const parts = [record.city, record.country]
                                                .filter(p => p && p.toLowerCase() !== 'unknown')
                                                .map(p => formatLocationValue(p, true));
                                            displayText = parts.join(' / ') || '-';
                                        } else if (isTraveloka) {
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
                                    if (col.key === 'pattern') {
                                        const rawValue = String(record.pattern || '-');
                                        return (
                                            <td key={idx} style={{ width: col.width, overflow: 'hidden' }}>
                                                <span className="hero-badge" style={{
                                                    fontSize: '0.72rem',
                                                    fontWeight: 700,
                                                    textTransform: 'none',
                                                    justifyContent: 'center',
                                                    ...getPatternBadgeStyle(rawValue)
                                                }} title={rawValue}>
                                                    {rawValue}
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
                                    if (col.key === 'content_type' || col.key === 'page_type' || col.key === 'intent_primary' || col.key === 'topic_type') {
                                        const rawValue = String(record[col.key as keyof PageRecord] || '-');
                                        const displayValue = formatCompactLabel(rawValue);
                                        const badgeStyles =
                                            col.key === 'page_type'
                                                ? (rawValue === 'ticket'
                                                    ? { background: 'rgba(245, 158, 11, 0.12)', color: '#b45309' }
                                                    : rawValue === 'ttd'
                                                        ? { background: 'rgba(99, 102, 241, 0.12)', color: '#4f46e5' }
                                                        : { background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' })
                                                : col.key === 'intent_primary'
                                                    ? { background: 'rgba(16, 185, 129, 0.12)', color: '#047857' }
                                                    : col.key === 'topic_type'
                                                        ? { background: 'rgba(6, 182, 212, 0.12)', color: '#0f766e' }
                                                    : { background: 'rgba(148, 163, 184, 0.14)', color: 'var(--text-muted)' };
                                        return (
                                            <td key={idx} style={{ width: col.width, overflow: 'hidden' }}>
                                                <span className="hero-badge" style={{
                                                    fontSize: '0.72rem',
                                                    fontWeight: 700,
                                                    textTransform: 'none',
                                                    justifyContent: 'center',
                                                    ...badgeStyles
                                                }} title={displayValue}>
                                                    {displayValue}
                                                </span>
                                            </td>
                                        );
                                    }
                                    if (col.key === 'transport_scope' || col.key === 'transport_affiliate_fit' || col.key === 'transport_geo_scope' || col.key === 'transport_trip_stage') {
                                        const rawValue = String(record[col.key as keyof PageRecord] || '-');
                                        const displayValue = formatCompactLabel(rawValue);
                                        const badgeStyles =
                                            col.key === 'transport_scope'
                                                ? getTransportScopeStyle(rawValue)
                                                : col.key === 'transport_affiliate_fit'
                                                    ? getTransportFitStyle(rawValue)
                                                    : col.key === 'transport_geo_scope'
                                                        ? getTransportGeoScopeStyle(rawValue)
                                                        : getTransportTripStageStyle(rawValue);
                                        return (
                                            <td key={idx} style={{ width: col.width, overflow: 'hidden' }}>
                                                <span className="hero-badge" style={{
                                                    fontSize: '0.72rem',
                                                    fontWeight: 700,
                                                    textTransform: 'none',
                                                    justifyContent: 'center',
                                                    ...badgeStyles
                                                }} title={displayValue}>
                                                    {displayValue}
                                                </span>
                                            </td>
                                        );
                                    }
                                    if (col.key === 'readiness_hint' || col.key === 'market_fit') {
                                        const rawValue = String(record[col.key as keyof PageRecord] || '-');
                                        const displayValue = formatCompactLabel(rawValue);
                                        const badgeStyles = col.key === 'readiness_hint'
                                            ? getTripReadinessStyle(rawValue)
                                            : getTripMarketFitStyle(rawValue);
                                        return (
                                            <td key={idx} style={{ width: col.width }}>
                                                <span className="hero-badge" style={{
                                                    fontSize: '0.72rem',
                                                    fontWeight: 800,
                                                    textTransform: 'none',
                                                    justifyContent: 'center',
                                                    ...badgeStyles
                                                }} title={displayValue}>
                                                    {displayValue}
                                                </span>
                                            </td>
                                        );
                                    }
                                    if (col.key === 'traffic' || col.key === 'keyword_count' || col.key === 'traffic_change' || col.key === 'traffic_pct') {
                                        const rawMetric = record[col.key as keyof PageRecord];
                                        const metric = typeof rawMetric === 'number' ? rawMetric : Number(rawMetric || 0);
                                        const isEmpty = rawMetric === undefined || rawMetric === null || rawMetric === '';
                                        let displayValue = '-';
                                        let textColor = 'var(--text-main)';

                                        if (!isEmpty) {
                                            if (col.key === 'traffic_pct') {
                                                displayValue = `${metric.toFixed(2)}%`;
                                                textColor = 'var(--text-dim)';
                                            } else if (col.key === 'traffic_change') {
                                                displayValue = formatSignedMetric(metric);
                                                textColor = metric > 0 ? '#047857' : (metric < 0 ? '#b91c1c' : 'var(--text-dim)');
                                            } else {
                                                displayValue = Math.round(metric).toLocaleString();
                                            }
                                        }

                                        return (
                                            <td key={idx} style={{ width: col.width }}>
                                                <span style={{
                                                    fontSize: '0.82rem',
                                                    fontWeight: 800,
                                                    color: textColor,
                                                    display: 'block',
                                                    textAlign: col.key === 'traffic_change' ? 'center' : 'right',
                                                    fontVariantNumeric: 'tabular-nums'
                                                }}>
                                                    {displayValue}
                                                </span>
                                            </td>
                                        );
                                    }
                                    if (col.key === 'classification_confidence') {
                                        const confidence = Number(record.classification_confidence || 0);
                                        const badgeStyles = confidence >= 0.85
                                            ? { background: 'rgba(16, 185, 129, 0.12)', color: '#047857' }
                                            : confidence >= 0.70
                                                ? { background: 'rgba(245, 158, 11, 0.12)', color: '#b45309' }
                                                : { background: 'rgba(239, 68, 68, 0.12)', color: '#b91c1c' };
                                        return (
                                            <td key={idx} style={{ width: col.width }}>
                                                <span className="hero-badge" style={{
                                                    fontSize: '0.72rem',
                                                    fontWeight: 800,
                                                    justifyContent: 'center',
                                                    ...badgeStyles
                                                }}>
                                                    {confidence ? confidence.toFixed(2) : '-'}
                                                </span>
                                            </td>
                                        );
                                    }
                                    if (col.key === 'title_en' || col.key === 'translated_title_vi' || col.key === 'title') {
                                        const is404 = record.last_http_status === 404;
                                        const titleValue = String(
                                            record[col.key as keyof PageRecord]
                                            || record.title
                                            || record.title_en
                                            || record.translated_title_vi
                                            || record.slug
                                            || record.url
                                        );
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
                                                        display: 'flex',
                                                        alignItems: 'flex-start',
                                                        gap: '0.45rem'
                                                    }}
                                                    className="title-link"
                                                    title={titleValue}
                                                >
                                                    <span style={{
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical'
                                                    }}>
                                                        {titleValue}
                                                    </span>
                                                    <ExternalLink size={13} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
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
                        <tr><td colSpan={columns.length + (onSelect ? 1 : 0)} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>Loading next batch...</td></tr>
                    )}
                    {records.length === 0 && !loading && (
                        <tr><td colSpan={columns.length + (onSelect ? 1 : 0)} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>No records found for active filters.</td></tr>
                    )}
                </tbody>
            </table>
        </SurfaceCard>
    );
};
