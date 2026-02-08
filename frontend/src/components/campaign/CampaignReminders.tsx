import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Trash2, Calendar, AlertCircle, MessageSquareQuote, Send } from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { CampaignReminder } from '../../types/campaign';
import { formatDate } from '../../lib/utils';

interface CampaignRemindersProps {
    campaignId: string;
    compact?: boolean;
}

export default function CampaignReminders({ campaignId, compact = false }: CampaignRemindersProps) {
    const queryClient = useQueryClient();

    // Fetch reminders
    const { data: reminders = [], isLoading } = useQuery<CampaignReminder[]>({
        queryKey: ['campaign-reminders', campaignId],
        queryFn: async () => {
            return await pb.collection('campaign_reminders').getFullList<CampaignReminder>({
                filter: `campaign = "${campaignId}"`,
                sort: '-reminder_date',
            });
        },
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status, completion_notes }: { id: string; status: string; completion_notes?: string }) => {
            return await pb.collection('campaign_reminders').update(id, { status, completion_notes });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campaign-reminders', campaignId] });
            queryClient.invalidateQueries({ queryKey: ['reminders'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return await pb.collection('campaign_reminders').delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campaign-reminders', campaignId] });
            queryClient.invalidateQueries({ queryKey: ['reminders'] });
        },
    });

    if (isLoading) return (
        <div style={{ padding: '1rem', textAlign: 'center' }}>
            <div className="animate-pulse" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading logs...</div>
        </div>
    );

    const pendingReminders = reminders.filter(r => r.status === 'pending');
    const pastReminders = reminders.filter(r => r.status !== 'pending');

    const getPriorityStyle = (p?: string) => {
        if (p === 'high') return { color: '#ef4444', border: 'rgba(239, 68, 68, 0.4)', bg: 'rgba(239, 68, 68, 0.05)' };
        if (p === 'medium') return { color: '#fbbf24', border: 'rgba(251, 191, 36, 0.4)', bg: 'rgba(251, 191, 36, 0.05)' };
        return { color: 'hsl(var(--primary))', border: 'hsla(var(--primary) / 0.4)', bg: 'hsla(var(--primary) / 0.05)' };
    };

    const ReminderItem = ({ reminder }: { reminder: CampaignReminder }) => {
        const [note, setNote] = useState('');
        const [isCompleting, setIsCompleting] = useState(false);
        const style = getPriorityStyle(reminder.priority);

        return (
            <div
                className={`animate-fade hero-card ${compact ? 'compact' : ''}`}
                style={{
                    padding: compact ? '0.85rem' : '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    opacity: reminder.status === 'completed' ? 0.75 : 1,
                    borderLeft: reminder.status === 'pending' ? `4px solid ${style.color}` : '1px solid var(--border-subtle)',
                    marginBottom: '0.75rem',
                    background: reminder.status === 'completed' ? 'var(--bg-main)' : 'var(--bg-content)',
                    transition: 'all 0.2s ease'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div
                        onClick={() => {
                            if (reminder.status === 'pending') {
                                setIsCompleting(!isCompleting);
                            }
                        }}
                        style={{
                            cursor: reminder.status === 'pending' ? 'pointer' : 'default',
                            color: reminder.status === 'completed' ? '#22c55e' : 'var(--text-dim)',
                            marginTop: '0.15rem',
                            flexShrink: 0
                        }}
                    >
                        {reminder.status === 'completed' ?
                            <CheckCircle size={20} /> :
                            <div style={{
                                width: '20px',
                                height: '20px',
                                border: `2px solid ${isCompleting ? 'hsl(var(--primary))' : 'var(--border-subtle)'}`,
                                borderRadius: '50%',
                                background: isCompleting ? 'var(--accent-glow)' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {isCompleting && <div style={{ width: '8px', height: '8px', background: 'hsl(var(--primary))', borderRadius: '50%' }} />}
                            </div>
                        }
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                            <span style={{
                                fontWeight: 800,
                                color: 'var(--text-main)',
                                fontSize: compact ? '0.85rem' : '0.95rem',
                                lineHeight: 1.3
                            }}>
                                {reminder.message}
                            </span>
                            {reminder.priority === 'high' && <AlertCircle size={14} color="#ef4444" />}
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>
                                <Calendar size={12} />
                                {formatDate(reminder.reminder_date)}
                            </span>
                        </div>

                        {reminder.check_metrics && Array.isArray(reminder.check_metrics) && reminder.check_metrics.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.4rem' }}>
                                {reminder.check_metrics.map(metric => (
                                    <span key={metric} className="hero-badge" style={{
                                        background: style.bg,
                                        color: style.color,
                                        border: `1px solid ${style.border}`,
                                        fontSize: '0.65rem',
                                        padding: '0.15rem 0.5rem',
                                        borderRadius: '6px'
                                    }}>
                                        {metric}
                                    </span>
                                ))}
                            </div>
                        )}

                        {reminder.status === 'completed' && reminder.completion_notes && (
                            <div style={{
                                padding: '0.6rem 0.75rem',
                                background: 'var(--bg-overlay)',
                                borderRadius: '8px',
                                border: '1px solid var(--border-subtle)',
                                fontSize: '0.75rem',
                                color: 'var(--text-dim)',
                                marginTop: '0.5rem',
                                display: 'flex',
                                gap: '0.5rem',
                                alignItems: 'flex-start'
                            }}>
                                <MessageSquareQuote size={14} style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                                <span style={{ fontStyle: 'italic' }}>{reminder.completion_notes}</span>
                            </div>
                        )}

                        {isCompleting && reminder.status === 'pending' && (
                            <div className="animate-fade" style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                                <input
                                    autoFocus
                                    className="hero-input"
                                    placeholder="Results/notes for this checkpoint..."
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            updateStatusMutation.mutate({ id: reminder.id, status: 'completed', completion_notes: note });
                                        }
                                    }}
                                />
                                <button
                                    className="hero-btn hero-btn-primary"
                                    style={{ padding: '0 0.75rem' }}
                                    onClick={() => updateStatusMutation.mutate({ id: reminder.id, status: 'completed', completion_notes: note })}
                                >
                                    <Send size={14} />
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => { if (confirm('Remove this checkpoint?')) deleteMutation.mutate(reminder.id); }}
                        className="hero-btn-ghost text-destructive"
                        style={{ padding: '0.4rem', borderRadius: '8px', flexShrink: 0 }}
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '0.25rem' : '1.5rem' }}>
            {!compact && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="hero-section-title" style={{ marginBottom: 0 }}>Active Checkpoints</h3>
                </div>
            )}

            {pendingReminders.length === 0 && (
                <div style={{
                    padding: compact ? '1rem' : '2rem',
                    textAlign: 'center',
                    color: 'var(--text-dim)',
                    background: 'var(--bg-overlay)',
                    borderRadius: '0.85rem',
                    border: '1px dashed var(--border-subtle)',
                    fontSize: '0.8rem'
                }}>
                    No pending checkpoints.
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {pendingReminders.map(r => <ReminderItem key={r.id} reminder={r} />)}
            </div>

            {!compact && pastReminders.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                    <h4 style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Completed History</h4>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {pastReminders.map(r => <ReminderItem key={r.id} reminder={r} />)}
                    </div>
                </div>
            )}
        </div>
    );
}
