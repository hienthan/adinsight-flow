import { Trash2, Calendar, ArrowRight } from 'lucide-react';
import { formatDate } from '../../lib/utils';

interface AutoLogItemProps {
    change: any;
    onDelete?: (id: string) => void;
    showCampaignName?: boolean;
    onCampaignClick?: (id: string) => void;
    platformColor?: string;
}

export default function AutoLogItem({
    change,
    onDelete,
    showCampaignName = false,
    onCampaignClick,
    platformColor
}: AutoLogItemProps) {

    const formatValue = (val: any) => {
        if (val === null || val === undefined) return 'None';
        if (Array.isArray(val)) return val.length > 0 ? val.join(', ') : 'Empty list';
        return String(val);
    };

    const getFieldLabel = (field: string) => {
        return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <div className="hero-card animate-fade" style={{
            padding: '0.65rem 0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            borderLeft: `3px solid ${platformColor || 'hsl(var(--primary))'}`,
            fontSize: '0.75rem',
            background: 'var(--bg-content)',
            boxShadow: 'var(--shadow-sm)',
            height: '100%'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                    {showCampaignName && change.expand?.campaign && (
                        <div
                            onClick={() => onCampaignClick?.(change.campaign)}
                            style={{
                                fontWeight: 800,
                                color: platformColor || 'hsl(var(--primary))',
                                cursor: 'pointer',
                                fontSize: '0.7rem',
                                marginBottom: '0.1rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}
                        >
                            {change.expand.campaign.name}
                        </div>
                    )}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.4rem'
                    }}>
                        <span style={{
                            textTransform: 'uppercase',
                            color: 'var(--text-main)',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {getFieldLabel(change.field_changed)}
                        </span>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            color: 'var(--text-dim)',
                            fontSize: '0.6rem',
                            fontWeight: 600,
                            flexShrink: 0
                        }}>
                            <Calendar size={10} />
                            {formatDate(change.change_date)}
                        </div>
                    </div>
                </div>
                {onDelete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Remove this log entry?')) onDelete(change.id);
                        }}
                        className="hero-btn-ghost text-destructive"
                        style={{ padding: '0.15rem', borderRadius: '4px', height: 'auto', flexShrink: 0 }}
                    >
                        <Trash2 size={12} />
                    </button>
                )}
            </div>

            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'hsla(var(--primary) / 0.03)',
                padding: '0.4rem 0.6rem',
                borderRadius: '4px',
                border: '1px solid var(--border-subtle)',
                marginTop: '0.1rem'
            }}>
                <span style={{
                    color: '#ef4444',
                    fontWeight: 500,
                    textDecoration: 'line-through',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '45%'
                }}>
                    {formatValue(change.old_value)}
                </span>
                <ArrowRight size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{
                    color: '#22c55e',
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '45%'
                }}>
                    {formatValue(change.new_value)}
                </span>
            </div>
        </div>
    );
}
