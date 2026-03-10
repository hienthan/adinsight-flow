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

    const findSmartDiff = (oldStr: string, newStr: string) => {
        if (oldStr === newStr) return { oldDisplay: oldStr, newDisplay: newStr };

        let start = 0;
        while (start < oldStr.length && start < newStr.length && oldStr[start] === newStr[start]) {
            start++;
        }

        let endOld = oldStr.length - 1;
        let endNew = newStr.length - 1;
        while (endOld >= start && endNew >= start && oldStr[endOld] === newStr[endNew]) {
            endOld--;
            endNew--;
        }

        const contextLen = 8;
        const prefixStart = Math.max(0, start - contextLen);
        const prefix = (prefixStart > 0 ? '...' : '') + oldStr.substring(prefixStart, start);

        const oldDiff = oldStr.substring(start, endOld + 1);
        const newDiff = newStr.substring(start, endNew + 1);

        const suffixEnd = Math.min(oldStr.length, endOld + 1 + contextLen);
        const suffix = oldStr.substring(endOld + 1, suffixEnd) + (suffixEnd < oldStr.length ? '...' : '');

        return {
            oldDisplay: `${prefix}${oldDiff}${suffix}`,
            newDisplay: `${prefix}${newDiff}${suffix}`
        };
    };

    const isLongTextField = ['description', 'keywords', 'general_notes'].includes(change.field_changed.toLowerCase());
    const oldRaw = formatValue(change.old_value);
    const newRaw = formatValue(change.new_value);

    let oldDisplay = oldRaw;
    let newDisplay = newRaw;

    // Threshold lowered to 12
    if (isLongTextField && oldRaw.length > 12) {
        const diff = findSmartDiff(oldRaw, newRaw);
        if (diff.oldDisplay.length < oldRaw.length || diff.newDisplay.length < newRaw.length) {
            oldDisplay = diff.oldDisplay;
            newDisplay = diff.newDisplay;
        }
    }

    const hasChanged = oldRaw !== newRaw;

    return (
        <div className="hero-card animate-fade" style={{
            padding: '0.45rem 0.65rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            borderLeft: `3px solid ${platformColor || 'hsl(var(--primary))'}`,
            fontSize: '0.7rem',
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
                            textTransform: 'none',
                            color: 'var(--text-main)',
                            fontSize: '0.68rem',
                            fontWeight: 700,
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

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'hsla(var(--primary) / 0.03)',
                    padding: '0.3rem 0.5rem',
                    borderRadius: '4px',
                    border: '1px solid var(--border-subtle)',
                    marginTop: '0.05rem',
                    fontSize: '0.68rem',
                    cursor: hasChanged ? 'help' : 'default'
                }}
                title={hasChanged ? `Full Change:\nFrom: ${oldRaw}\nTo: ${newRaw}` : undefined}
            >
                <span style={{
                    color: '#ef4444',
                    fontWeight: 500,
                    textDecoration: 'line-through',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '45%'
                }}>
                    {oldDisplay}
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
                    {newDisplay}
                </span>
            </div>
        </div>
    );
}
