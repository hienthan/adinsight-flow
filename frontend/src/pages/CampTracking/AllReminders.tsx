import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle, Clock, Calendar, ExternalLink } from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { formatDate } from '../../lib/utils';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function AllReminders() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const platformId = searchParams.get('platform');
    const [filterStatus, setFilterStatus] = useState<'pending' | 'completed' | 'all'>('pending');

    const { data: platform } = useQuery<any>({
        queryKey: ['platform', platformId],
        queryFn: async () => {
            if (!platformId) return null;
            return await pb.collection('campaign_platforms').getOne(platformId);
        },
        enabled: !!platformId
    });

    const { data: reminders, isLoading } = useQuery<any[]>({
        queryKey: ['all-reminders', filterStatus, platformId],
        queryFn: async () => {
            let filter = filterStatus === 'all' ? '' : `status = "${filterStatus}"`;
            if (platformId) {
                const platformFilter = `campaign.platform = "${platformId}"`;
                filter = filter ? `(${filter}) && ${platformFilter}` : platformFilter;
            }
            return await pb.collection('campaign_reminders').getFullList({
                filter,
                sort: 'reminder_date',
                expand: 'campaign,campaign.platform'
            });
        }
    });

    const toggleStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            return await pb.collection('campaign_reminders').update(id, {
                status: status === 'pending' ? 'completed' : 'pending',
                completion_date: status === 'pending' ? new Date().toISOString() : null
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-reminders'] });
        }
    });

    if (isLoading) return <div className="page-container" style={{ textAlign: 'center', padding: '5rem' }}>Loading all reminders...</div>;

    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: platform?.color || 'hsl(var(--primary))', letterSpacing: '-0.03em' }}>
                        {platform ? `${platform.display_name} Checkpoints` : 'Reminders Dashboard'}
                    </h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                        {platform ? `Strategic tasks for ${platform.display_name}` : 'Track tasks and performance checks across all campaigns'}
                    </p>
                </div>

                <div className="hero-tabs">
                    <button
                        onClick={() => setFilterStatus('pending')}
                        className={`hero-tab ${filterStatus === 'pending' ? 'active' : ''}`}
                    >
                        Pending
                    </button>
                    <button
                        onClick={() => setFilterStatus('completed')}
                        className={`hero-tab ${filterStatus === 'completed' ? 'active' : ''}`}
                    >
                        Completed
                    </button>
                    <button
                        onClick={() => setFilterStatus('all')}
                        className={`hero-tab ${filterStatus === 'all' ? 'active' : ''}`}
                    >
                        All
                    </button>
                </div>
            </div>

            {reminders?.length === 0 ? (
                <div className="hero-card" style={{ textAlign: 'center', padding: '5rem' }}>
                    <Bell size={48} style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', opacity: 0.5 }} />
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>No reminders found</h3>
                    <p style={{ color: 'var(--text-dim)' }}>You're all caught up!</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {reminders?.map((reminder) => (
                        <div
                            key={reminder.id}
                            className="hero-card animate-fade"
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'auto 1fr auto',
                                gap: '2rem',
                                alignItems: 'center',
                                padding: '1.5rem 2rem',
                                borderLeft: reminder.status === 'pending' ? `4px solid ${reminder.priority === 'high' ? '#ef4444' : reminder.priority === 'medium' ? '#f59e0b' : '#3b82f6'}` : '4px solid #22c55e',
                                opacity: reminder.status === 'completed' ? 0.6 : 1
                            }}
                        >
                            <button
                                onClick={() => toggleStatusMutation.mutate({ id: reminder.id, status: reminder.status })}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: reminder.status === 'completed' ? '#22c55e' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex'
                                }}
                            >
                                <CheckCircle size={28} fill={reminder.status === 'completed' ? '#22c55e' : 'transparent'} />
                            </button>

                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                                    <span
                                        onClick={() => navigate(`/camp-tracking/campaign/${reminder.campaign}`)}
                                        style={{ color: 'hsl(var(--primary))', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.02em' }}
                                    >
                                        {reminder.expand?.campaign?.name || 'Unknown Campaign'}
                                    </span>
                                    <span className="hero-badge" style={{
                                        fontSize: '0.65rem',
                                        background: reminder.priority === 'high' ? 'rgba(239, 68, 68, 0.1)' : reminder.priority === 'medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                        color: reminder.priority === 'high' ? '#ef4444' : reminder.priority === 'medium' ? '#f59e0b' : '#3b82f6'
                                    }}>
                                        {reminder.priority.toUpperCase()}
                                    </span>
                                </div>
                                <div style={{
                                    fontSize: '1.15rem',
                                    fontWeight: 700,
                                    color: reminder.status === 'completed' ? 'var(--text-dim)' : 'var(--text-main)',
                                    textDecoration: reminder.status === 'completed' ? 'line-through' : 'none',
                                    marginBottom: '0.5rem'
                                }}>
                                    {reminder.message}
                                </div>
                                <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-dim)', fontSize: '0.85rem', fontWeight: 500 }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Calendar size={14} />
                                        Due: {formatDate(reminder.reminder_date)}
                                    </span>
                                    {reminder.check_metrics?.length > 0 && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <Clock size={14} />
                                            {reminder.check_metrics.length} metrics to check
                                        </span>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => navigate(`/camp-tracking/campaign/${reminder.campaign}`)}
                                className="hero-btn-ghost"
                                style={{ padding: '0.75rem', borderRadius: '12px' }}
                                title="Go to campaign"
                            >
                                <ExternalLink size={20} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
