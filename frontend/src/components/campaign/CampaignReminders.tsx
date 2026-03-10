import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '../../lib/pocketbase';
import { CampaignReminder } from '../../types/campaign';
import ReminderItem from '../tracking/ReminderItem';

interface CampaignRemindersProps {
    campaignId: string;
    compact?: boolean;
    platformColor?: string;
}

export default function CampaignReminders({ campaignId, compact = false, platformColor }: CampaignRemindersProps) {
    const queryClient = useQueryClient();

    // Fetch reminders
    const { data: reminders = [], isLoading } = useQuery<CampaignReminder[]>({
        queryKey: ['campaign-reminders', campaignId],
        queryFn: async () => {
            return await pb.collection('campaign_reminders').getFullList<CampaignReminder>({
                filter: `campaign = "${campaignId}"`,
                sort: '-reminder_date',
                expand: 'campaign,campaign.platform'
            });
        },
        staleTime: 1000 * 60 * 60 * 4, // 4 hours
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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '0.5rem' : '1.5rem' }}>
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

            <div style={{
                display: 'grid',
                gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '0.75rem'
            }}>
                {pendingReminders.map(r => (
                    <ReminderItem
                        key={r.id}
                        reminder={r}
                        onToggle={(id, status, note) => updateStatusMutation.mutate({ id, status, completion_notes: note })}
                        onDelete={(id) => deleteMutation.mutate(id)}
                        platformColor={platformColor}
                    />
                ))}
            </div>

            {!compact && pastReminders.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                    <h4 style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Completed History</h4>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '0.75rem'
                    }}>
                        {pastReminders.map(r => (
                            <ReminderItem
                                key={r.id}
                                reminder={r}
                                onToggle={(id, status, note) => updateStatusMutation.mutate({ id, status, completion_notes: note })}
                                onDelete={(id) => deleteMutation.mutate(id)}
                                platformColor={platformColor}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
