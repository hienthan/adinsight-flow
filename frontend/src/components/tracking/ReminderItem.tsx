import { useState } from 'react';
import { Trash2, Calendar, CheckCircle, AlertCircle, Send } from 'lucide-react';
import { CampaignReminder } from '../../types/campaign';
import { formatDate } from '../../lib/utils';

interface ReminderItemProps {
    reminder: CampaignReminder;
    onToggle?: (id: string, status: string, note?: string) => void;
    onDelete?: (id: string) => void;
    showCampaignName?: boolean;
    onCampaignClick?: (id: string) => void;
    platformColor?: string;
    compact?: boolean;
}

export default function ReminderItem({
    reminder,
    onToggle,
    onDelete,
    showCampaignName = false,
    onCampaignClick,
    platformColor
}: ReminderItemProps) {
    const [isCompleting, setIsCompleting] = useState(false);
    const [note, setNote] = useState('');

    const getPriorityStyle = (p?: string) => {
        if (p === 'high') return { color: '#ef4444' };
        if (p === 'medium') return { color: '#fbbf24' };
        return { color: platformColor || 'hsl(var(--primary))' };
    };

    const style = getPriorityStyle(reminder.priority);
    const isOverdue = reminder.status === 'pending' && new Date(reminder.reminder_date) < new Date();

    return (
        <div
            className="hero-card animate-fade"
            style={{
                padding: '0.45rem 0.65rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                borderLeft: reminder.status === 'pending'
                    ? `3px solid ${isOverdue ? '#ef4444' : style.color}`
                    : '1px solid var(--border-subtle)',
                background: reminder.status === 'completed'
                    ? 'var(--bg-main)'
                    : isOverdue ? 'hsla(0, 84%, 60%, 0.05)' : 'var(--bg-content)',
                opacity: reminder.status === 'completed' ? 0.8 : 1,
                fontSize: '0.7rem',
                boxShadow: 'var(--shadow-sm)',
                transform: 'translateZ(0)', // GPU Layer Promotion to prevent flicker
            }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div
                    onClick={() => {
                        if (reminder.status === 'pending') {
                            setIsCompleting(!isCompleting);
                        }
                    }}
                    style={{
                        cursor: reminder.status === 'pending' ? 'pointer' : 'default',
                        color: reminder.status === 'completed' ? '#22c55e' : 'var(--text-dim)',
                        marginTop: '0.1rem',
                        flexShrink: 0
                    }}
                >
                    {reminder.status === 'completed' ?
                        <CheckCircle size={16} /> :
                        <div style={{
                            width: '16px',
                            height: '16px',
                            border: `2px solid ${isCompleting ? 'hsl(var(--primary))' : 'var(--border-subtle)'}`,
                            borderRadius: '50%',
                            background: isCompleting ? 'var(--accent-glow)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {isCompleting && <div style={{ width: '6px', height: '6px', background: 'hsl(var(--primary))', borderRadius: '50%' }} />}
                        </div>
                    }
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    {showCampaignName && reminder.expand?.campaign && (
                        <div
                            onClick={() => onCampaignClick?.(reminder.campaign || '')}
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
                            {reminder.expand.campaign.name}
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 0 }}>
                            <span style={{
                                fontWeight: 700,
                                color: 'var(--text-main)',
                                fontSize: '0.8rem',
                                lineHeight: 1.2,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {reminder.message}
                            </span>
                            {reminder.priority === 'high' && <AlertCircle size={10} color="#ef4444" />}
                        </div>
                        <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            color: isOverdue ? '#ef4444' : 'var(--text-dim)',
                            fontSize: '0.6rem',
                            fontWeight: isOverdue ? 800 : 600,
                            flexShrink: 0,
                            marginTop: '0.1rem'
                        }}>
                            {isOverdue && <span style={{ textTransform: 'uppercase' }}>Overdue</span>}
                            <Calendar size={10} />
                            {formatDate(reminder.reminder_date)}
                        </span>
                    </div>

                    {isCompleting && (
                        <div className="animate-fade" style={{ marginTop: '0.5rem', display: 'flex', gap: '0.4rem' }}>
                            <input
                                id={`note-input-${reminder.id}`}
                                autoFocus
                                className="hero-input"
                                placeholder="Add notes..."
                                aria-label="Completion notes"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem', height: 'auto' }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        onToggle?.(reminder.id, 'completed', note);
                                        setIsCompleting(false);
                                    }
                                }}
                            />
                            <button
                                className="hero-btn hero-btn-primary"
                                style={{ padding: '0.2rem 0.6rem', height: 'auto' }}
                                aria-label="Send notes"
                                onClick={() => {
                                    onToggle?.(reminder.id, 'completed', note);
                                    setIsCompleting(false);
                                }}
                            >
                                <Send size={12} />
                            </button>
                        </div>
                    )}
                </div>

                {onDelete && (
                    <button
                        onClick={() => { if (confirm('Remove this log entry?')) onDelete(reminder.id); }}
                        className="hero-btn-ghost text-destructive"
                        style={{ padding: '0.15rem', borderRadius: '4px', height: 'auto', flexShrink: 0 }}
                    >
                        <Trash2 size={12} />
                    </button>
                )}
            </div>
        </div>
    );
}
