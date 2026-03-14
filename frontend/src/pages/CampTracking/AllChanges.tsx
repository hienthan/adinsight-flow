import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { History, ChevronDown, ChevronRight } from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { useNavigate } from 'react-router-dom';

import { useSearchParams } from 'react-router-dom';

import AutoLogItem from '../../components/tracking/AutoLogItem';
import { SurfaceCard } from '../../components/common/ui';

const PAGE_HEADER_STYLE = {
    marginBottom: '1.5rem',
} as const;

const PAGE_STACK_STYLE = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
} as const;

const SECTION_TOGGLE_STYLE = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    cursor: 'pointer',
    padding: '0.5rem',
    borderRadius: '8px',
    transition: 'background-color 0.2s ease',
    userSelect: 'none',
} as const;

const GROUP_GRID_STYLE = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '0.75rem',
    padding: '0 0.5rem',
} as const;

export default function AllChanges() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const platformId = searchParams.get('platform');
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

    const { data: changes, isLoading } = useQuery<any[]>({
        queryKey: ['all-changes', platformId],
        queryFn: async () => {
            let filter = '';
            if (platformId && platformId !== 'all') {
                filter = `campaign.platform = "${platformId}"`;
            }
            return await pb.collection('campaign_changes').getFullList({
                filter,
                sort: '-change_date',
                expand: 'campaign,campaign.platform',
                limit: 200
            });
        }
    });

    // Grouping logic
    const groupedChanges = platforms.reduce((acc, p) => {
        const platformChanges = (changes || []).filter(c => c.expand?.campaign?.platform === p.id);
        if (platformChanges.length > 0) {
            acc.push({
                platform: p,
                items: platformChanges
            });
        }
        return acc;
    }, [] as { platform: any, items: any[] }[]);

    // Handle items with unknown platforms if any (e.g. if platform was deleted or data is inconsistent)
    const orphans = (changes || []).filter(c => !platforms.find(p => p.id === c.expand?.campaign?.platform));
    if (orphans.length > 0) {
        groupedChanges.push({
            platform: { id: 'unknown', display_name: 'Others', color: '#666' },
            items: orphans
        });
    }

    const setFilterPlatform = (val: string) => {
        navigate(val === 'all' ? '/camp-tracking/changes' : `/camp-tracking/changes?platform=${val}`);
    };

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return await pb.collection('campaign_changes').delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-changes'] });
            queryClient.invalidateQueries({ queryKey: ['campaign-changes'] });
        },
    });

    if (isLoading) return <div className="page-container" style={{ textAlign: 'center', padding: '5rem' }}>Loading change logs...</div>;

    return (
        <div className="page-container">
            <div style={PAGE_HEADER_STYLE}>
                <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: platform?.color || 'hsl(var(--primary))', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                    {platform ? `${platform.display_name} Audit Logs` : 'Global Change Logs'}
                </h1>
                <p style={{ color: 'var(--text-dim)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                    {platform ? `Historical modifications for ${platform.display_name} campaigns` : 'Monitor modifications across all tracking campaigns'}
                </p>
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

            {groupedChanges.length === 0 ? (
                <SurfaceCard style={{ textAlign: 'center', padding: '5rem' }}>
                    <History size={48} style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', opacity: 0.5 }} />
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>No changes logged yet</h3>
                    <p style={{ color: 'var(--text-dim)' }}>Campaign modifications will appear here.</p>
                </SurfaceCard>
            ) : (
                <div style={PAGE_STACK_STYLE}>
                    {groupedChanges.map((group: any) => {
                        const isCollapsed = collapsedSections[group.platform.id];
                        return (
                            <div key={group.platform.id} className="animate-fade">
                                <div
                                    onClick={() => toggleSection(group.platform.id)}
                                    style={{
                                        ...SECTION_TOGGLE_STYLE,
                                        marginBottom: isCollapsed ? '0' : '1.25rem',
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
                                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>{group.items.length} logs</span>
                                </div>

                                {!isCollapsed && (
                                    <div style={GROUP_GRID_STYLE}>
                                        {group.items.map((change: any) => (
                                            <AutoLogItem
                                                key={change.id}
                                                change={change}
                                                showCampaignName={true}
                                                onCampaignClick={(id) => navigate(`/camp-tracking/campaign/${id}`)}
                                                onDelete={(id) => deleteMutation.mutate(id)}
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
