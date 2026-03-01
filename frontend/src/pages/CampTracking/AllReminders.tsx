import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, ChevronDown, ChevronRight } from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ReminderItem from '../../components/tracking/ReminderItem';

export default function AllReminders() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const platformId = searchParams.get('platform');
    const [filterStatus, setFilterStatus] = useState<'pending' | 'completed' | 'all'>('pending');
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

    const toggleSection = (pid: string) => {
        setCollapsedSections(prev => ({
            ...prev,
            [pid]: !prev[pid]
        }));
    };

    const { data: platforms = [] } = useQuery<any[]>({
        queryKey: ['platforms'],
        queryFn: async () => {
            return await pb.collection('campaign_platforms').getFullList({
                sort: 'display_name',
            });
        }
    });

    const { data: platform } = useQuery<any>({
        queryKey: ['platform', platformId],
        queryFn: async () => {
            if (!platformId || platformId === 'all') return null;
            return await pb.collection('campaign_platforms').getOne(platformId);
        },
        enabled: !!platformId && platformId !== 'all'
    });

    const { data: reminders, isLoading } = useQuery<any[]>({
        queryKey: ['all-reminders', filterStatus, platformId],
        queryFn: async () => {
            let filter = filterStatus === 'all' ? '' : `status = "${filterStatus}"`;
            if (platformId && platformId !== 'all') {
                const platformFilter = `campaign.platform = "${platformId}"`;
                filter = filter ? `(${filter}) && ${platformFilter}` : platformFilter;
            }
            return await pb.collection('campaign_reminders').getFullList({
                filter,
                sort: 'reminder_date',
                expand: 'campaign,campaign.platform'
            });
        },
        staleTime: 1000 * 60 * 60 * 4, // 4 hours
    });

    // Grouping logic
    const groupedReminders = platforms.reduce((acc, p) => {
        const platformReminders = (reminders || []).filter(r => r.expand?.campaign?.platform === p.id);
        if (platformReminders.length > 0) {
            acc.push({
                platform: p,
                items: platformReminders
            });
        }
        return acc;
    }, [] as { platform: any, items: any[] }[]);

    // Handle orphans
    const orphans = (reminders || []).filter(r => !platforms.find(p => p.id === r.expand?.campaign?.platform));
    if (orphans.length > 0) {
        groupedReminders.push({
            platform: { id: 'unknown', display_name: 'Others', color: '#666' },
            items: orphans
        });
    }

    const setFilterPlatform = (val: string) => {
        navigate(val === 'all' ? '/camp-tracking/reminders' : `/camp-tracking/reminders?platform=${val}`);
    };

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status, completion_notes }: { id: string, status: string, completion_notes?: string }) => {
            return await pb.collection('campaign_reminders').update(id, {
                status,
                completion_date: status === 'completed' ? new Date().toISOString() : null,
                completion_notes
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-reminders'] });
            queryClient.invalidateQueries({ queryKey: ['campaign-reminders'] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return await pb.collection('campaign_reminders').delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-reminders'] });
            queryClient.invalidateQueries({ queryKey: ['campaign-reminders'] });
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

            {/* Platform Filter */}
            <div className="filter-bar" style={{ marginBottom: '1.5rem' }}>
                <div className="filter-group">
                    <label>Filter by Platform</label>
                    <select
                        value={platformId || 'all'}
                        onChange={(e) => setFilterPlatform(e.target.value)}
                        style={{ minWidth: '200px' }}
                    >
                        <option value="all">All Channels</option>
                        {platforms.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.display_name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {groupedReminders.length === 0 ? (
                <div className="hero-card" style={{ textAlign: 'center', padding: '5rem' }}>
                    <Bell size={48} style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', opacity: 0.5 }} />
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>All caught up!</h3>
                    <p style={{ color: 'var(--text-dim)' }}>No pending checkpoints found for the selected filters.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {groupedReminders.map((group: any) => {
                        const isCollapsed = collapsedSections[group.platform.id];
                        return (
                            <div key={group.platform.id} className="animate-fade">
                                <div
                                    onClick={() => toggleSection(group.platform.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        marginBottom: isCollapsed ? '0' : '1.25rem',
                                        cursor: 'pointer',
                                        padding: '0.5rem',
                                        borderRadius: '8px',
                                        transition: 'all 0.2s',
                                        userSelect: 'none'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-overlay)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                    {isCollapsed ? <ChevronRight size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
                                    <div style={{ width: '8px', height: '24px', background: group.platform.color, borderRadius: '4px' }} />
                                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', textTransform: 'uppercase', margin: 0 }}>
                                        {group.platform.display_name}
                                    </h3>
                                    <div style={{ height: '1px', flex: 1, background: 'var(--border-subtle)', marginLeft: '0.5rem', opacity: 0.5 }} />
                                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>{group.items.length} updates</span>
                                </div>

                                {!isCollapsed && (
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                                        gap: '0.75rem',
                                        padding: '0 0.5rem'
                                    }}>
                                        {group.items.map((reminder: any) => (
                                            <ReminderItem
                                                key={reminder.id}
                                                reminder={reminder}
                                                showCampaignName={true}
                                                onCampaignClick={(id) => navigate(`/camp-tracking/campaign/${id}`)}
                                                onDelete={(id) => deleteMutation.mutate(id)}
                                                onToggle={(id, status, note) => updateStatusMutation.mutate({ id, status, completion_notes: note })}
                                                platformColor={group.platform.color}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
