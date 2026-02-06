import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle, Clock, Calendar, ExternalLink } from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { formatDate } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

export default function AllReminders() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [filterStatus, setFilterStatus] = useState<'pending' | 'completed' | 'all'>('pending');

    const { data: reminders, isLoading } = useQuery<any[]>({
        queryKey: ['all-reminders', filterStatus],
        queryFn: async () => {
            const filter = filterStatus === 'all' ? '' : `status = "${filterStatus}"`;
            return await pb.collection('campaign_reminders').getFullList({
                filter,
                sort: 'reminder_date',
                expand: 'campaign'
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Reminders Dashboard</h2>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                        Track tasks and performance checks across all campaigns
                    </p>
                </div>

                <div className="filter-bar" style={{ display: 'flex', gap: '1rem', background: 'var(--bg-card)', padding: '0.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <button
                        onClick={() => setFilterStatus('pending')}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: filterStatus === 'pending' ? 'var(--accent)' : 'transparent',
                            color: filterStatus === 'pending' ? '#fff' : 'var(--text-dim)',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                        }}
                    >
                        Pending
                    </button>
                    <button
                        onClick={() => setFilterStatus('completed')}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: filterStatus === 'completed' ? 'var(--accent)' : 'transparent',
                            color: filterStatus === 'completed' ? '#fff' : 'var(--text-dim)',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                        }}
                    >
                        Completed
                    </button>
                    <button
                        onClick={() => setFilterStatus('all')}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: filterStatus === 'all' ? 'var(--accent)' : 'transparent',
                            color: filterStatus === 'all' ? '#fff' : 'var(--text-dim)',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                        }}
                    >
                        All
                    </button>
                </div>
            </div>

            {reminders?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '5rem', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                    <Bell size={48} style={{ color: 'var(--border-color)', marginBottom: '1rem' }} />
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No reminders found</h3>
                    <p style={{ color: 'var(--text-dim)' }}>You're all caught up!</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {reminders?.map((reminder) => (
                        <div
                            key={reminder.id}
                            className="animate-fade"
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'auto 1fr auto',
                                gap: '1.5rem',
                                alignItems: 'center',
                                background: 'var(--bg-card)',
                                padding: '1.25rem 1.5rem',
                                borderRadius: '12px',
                                border: '1px solid var(--border-color)',
                                borderLeft: reminder.status === 'pending' ? `4px solid ${reminder.priority === 'high' ? '#ef4444' : reminder.priority === 'medium' ? '#f59e0b' : '#3b82f6'}` : '4px solid #22c55e',
                                transition: 'all 0.2s',
                                opacity: reminder.status === 'completed' ? 0.7 : 1
                            }}
                        >
                            <button
                                onClick={() => toggleStatusMutation.mutate({ id: reminder.id, status: reminder.status })}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: reminder.status === 'completed' ? '#22c55e' : 'var(--border-color)',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <CheckCircle size={24} fill={reminder.status === 'completed' ? '#22c55e' : 'transparent'} />
                            </button>

                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                    <span
                                        onClick={() => navigate(`/camp-tracking/campaign/${reminder.campaign}`)}
                                        style={{ color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}
                                    >
                                        {reminder.expand?.campaign?.name || 'Unknown Campaign'}
                                    </span>
                                    <span style={{
                                        fontSize: '0.65rem',
                                        padding: '0.1rem 0.5rem',
                                        borderRadius: '10px',
                                        background: reminder.priority === 'high' ? '#ef444420' : reminder.priority === 'medium' ? '#f59e0b20' : '#3b82f620',
                                        color: reminder.priority === 'high' ? '#ef4444' : reminder.priority === 'medium' ? '#f59e0b' : '#3b82f6',
                                        fontWeight: 700
                                    }}>
                                        {reminder.priority.toUpperCase()}
                                    </span>
                                </div>
                                <div style={{
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    color: reminder.status === 'completed' ? 'var(--text-dim)' : 'var(--text-main)',
                                    textDecoration: reminder.status === 'completed' ? 'line-through' : 'none'
                                }}>
                                    {reminder.message}
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <Calendar size={14} />
                                        Due: {formatDate(reminder.reminder_date)}
                                    </span>
                                    {reminder.check_metrics?.length > 0 && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <Clock size={14} />
                                            {reminder.check_metrics.length} metrics to check
                                        </span>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => navigate(`/camp-tracking/campaign/${reminder.campaign}`)}
                                style={{
                                    padding: '0.6rem',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    background: 'transparent',
                                    color: 'var(--text-dim)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = 'var(--text-main)';
                                    e.currentTarget.style.background = 'var(--secondary)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = 'var(--text-dim)';
                                    e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                <ExternalLink size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
