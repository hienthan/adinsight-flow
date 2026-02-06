import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle, Clock, Plus, Trash2, Calendar } from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { CampaignReminder } from '../../types/campaign';
import { formatDate } from '../../lib/utils';

interface CampaignRemindersProps {
    campaignId: string;
}

export default function CampaignReminders({ campaignId }: CampaignRemindersProps) {
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

    // Mutation for status update
    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            return await pb.collection('campaign_reminders').update(id, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campaign-reminders', campaignId] });
            queryClient.invalidateQueries({ queryKey: ['reminders'] }); // global reminders
        },
    });

    // Mutation for delete
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return await pb.collection('campaign_reminders').delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campaign-reminders', campaignId] });
            queryClient.invalidateQueries({ queryKey: ['reminders'] });
        },
    });

    if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>Loading reminders...</div>;

    const pendingReminders = reminders.filter(r => r.status === 'pending');
    const pastReminders = reminders.filter(r => r.status !== 'pending');

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'high': return '#ef4444';
            case 'medium': return '#fbbf24';
            default: return '#60a5fa';
        }
    };

    const ReminderItem = ({ reminder }: { reminder: CampaignReminder }) => (
        <div
            style={{
                background: 'var(--bg-card)',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                opacity: reminder.status === 'completed' ? 0.6 : 1
            }}
        >
            <div
                onClick={() => reminder.status === 'pending' && updateStatusMutation.mutate({ id: reminder.id, status: 'completed' })}
                style={{ cursor: reminder.status === 'pending' ? 'pointer' : 'default', color: reminder.status === 'completed' ? '#22c55e' : 'var(--text-dim)' }}
            >
                {reminder.status === 'completed' ? <CheckCircle size={24} /> : <div style={{ width: '24px', height: '24px', border: '2px solid var(--border-color)', borderRadius: '50%' }} />}
            </div>

            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>{reminder.message}</span>
                    {reminder.priority && (
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: getPriorityColor(reminder.priority) }} title={`${reminder.priority} priority`} />
                    )}
                </div>

                <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={12} />
                        Due {formatDate(reminder.reminder_date)}
                    </span>
                    {reminder.check_metrics && Array.isArray(reminder.check_metrics) && reminder.check_metrics.length > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={12} />
                            Metrics: {reminder.check_metrics.join(', ')}
                        </span>
                    )}
                </div>
            </div>

            <button
                onClick={() => { if (confirm('Delete this reminder?')) deleteMutation.mutate(reminder.id); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '0.5rem' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
            >
                <Trash2 size={16} />
            </button>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Pending Section */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Bell size={18} color="var(--accent)" /> Pending Reminders
                    </h3>
                    <button
                        onClick={() => alert('Add reminder modal coming soon!')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', background: 'var(--secondary)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer' }}
                    >
                        <Plus size={14} /> Add New
                    </button>
                </div>

                {pendingReminders.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)', background: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                        No pending reminders.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {pendingReminders.map(r => <ReminderItem key={r.id} reminder={r} />)}
                    </div>
                )}
            </div>

            {/* Past Section */}
            {pastReminders.length > 0 && (
                <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '1rem' }}>Completed & Dismissed</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {pastReminders.map(r => <ReminderItem key={r.id} reminder={r} />)}
                    </div>
                </div>
            )}
        </div>
    );
}
