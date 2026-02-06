import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Trash2, Calendar, AlertCircle } from 'lucide-react';
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
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            return await pb.collection('campaign_reminders').update(id, { status });
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
        if (p === 'high') return { color: '#ef4444' };
        if (p === 'medium') return { color: '#fbbf24' };
        return { color: 'hsl(var(--primary))' };
    };

    const ReminderItem = ({ reminder }: { reminder: CampaignReminder }) => (
        <div
            className={`hero-card ${compact ? 'compact' : ''}`}
            style={{
                padding: compact ? '0.75rem' : '1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: compact ? '0.6rem' : '1rem',
                opacity: reminder.status === 'completed' ? 0.6 : 1,
                borderLeft: reminder.status === 'pending' ? `3px solid ${getPriorityStyle(reminder.priority).color}` : '1px solid var(--border-subtle)',
                marginBottom: '0.5rem',
                background: reminder.status === 'completed' ? 'var(--bg-main)' : 'var(--bg-content)'
            }}
        >
            <div
                onClick={() => reminder.status === 'pending' && updateStatusMutation.mutate({ id: reminder.id, status: 'completed' })}
                style={{
                    cursor: reminder.status === 'pending' ? 'pointer' : 'default',
                    color: reminder.status === 'completed' ? '#22c55e' : 'var(--text-dim)',
                    marginTop: '0.15rem'
                }}
            >
                {reminder.status === 'completed' ?
                    <CheckCircle size={compact ? 18 : 22} /> :
                    <div style={{
                        width: compact ? '18px' : '22px',
                        height: compact ? '18px' : '22px',
                        border: '2px solid var(--border-subtle)',
                        borderRadius: '50%'
                    }} />
                }
            </div>

            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span style={{
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        fontSize: compact ? '0.8rem' : '0.9rem',
                        lineHeight: 1.3
                    }}>
                        {reminder.message}
                    </span>
                    {reminder.priority === 'high' && <AlertCircle size={14} color="#ef4444" />}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 600 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={12} />
                        {formatDate(reminder.reminder_date)}
                    </span>
                    {!compact && reminder.check_metrics && Array.isArray(reminder.check_metrics) && reminder.check_metrics.length > 0 && (
                        <span style={{ background: 'var(--bg-main)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                            CHECK: {reminder.check_metrics.join(', ')}
                        </span>
                    )}
                </div>
            </div>

            {!compact && (
                <button
                    onClick={() => { if (confirm('Remove this checkpoint?')) deleteMutation.mutate(reminder.id); }}
                    className="hero-btn-ghost"
                    style={{ padding: '0.4rem', borderRadius: '8px', color: '#ef4444' }}
                >
                    <Trash2 size={14} />
                </button>
            )}
        </div>
    );

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
