import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Loader2, Check } from 'lucide-react';
import CampaignCard from '../../components/campaign/CampaignCard';
import EditCampaignModal from '../../components/campaign/EditCampaignModal';
import { Campaign, CampaignPlatform, CampaignReminder } from '../../types/campaign';
import { pb, formatDateForInput } from '../../lib/pocketbase';

export default function CampOverview() {
    const [filterPlatform, setFilterPlatform] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterReminders, setFilterReminders] = useState<boolean>(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Fetch platforms
    const { data: platforms = [] } = useQuery<CampaignPlatform[]>({
        queryKey: ['platforms'],
        queryFn: async () => {
            return await pb.collection('campaign_platforms').getFullList<CampaignPlatform>({
                sort: 'display_name',
            });
        },
    });

    // Fetch campaigns with platform expand
    const { data: campaigns = [], isLoading, refetch } = useQuery<Campaign[]>({
        queryKey: ['campaigns', filterPlatform, filterStatus],
        queryFn: async () => {
            let filter = '';
            const filters: string[] = [];

            if (filterPlatform !== 'all') {
                filters.push(`platform = "${filterPlatform}"`);
            }

            if (filterStatus !== 'all') {
                filters.push(`status = "${filterStatus}"`);
            }

            filter = filters.join(' && ');

            return await pb.collection('campaigns').getFullList<Campaign>({
                sort: '-created_date',
                filter: filter || undefined,
                expand: 'platform',
            });
        },
    });

    // Fetch reminders to check which campaigns have pending ones
    const { data: reminders = [] } = useQuery<CampaignReminder[]>({
        queryKey: ['reminders', 'pending'],
        queryFn: async () => {
            const today = formatDateForInput(new Date().toISOString());
            return await pb.collection('campaign_reminders').getFullList<CampaignReminder>({
                filter: `reminder_date <= "${today}" && status = "pending"`,
            });
        },
    });

    // Get enriched campaigns with platform data and badges
    const enrichedCampaigns = campaigns.map((campaign: any) => {
        const platform = platforms.find((p) => p.id === campaign.platform);
        const campaignReminders = reminders.filter((r) => r.campaign === campaign.id);
        const hasPendingReminders = campaignReminders.length > 0;

        // Find highest priority among pending reminders
        let priority: 'low' | 'medium' | 'high' = 'low';
        if (hasPendingReminders) {
            if (campaignReminders.some(r => r.priority === 'high')) priority = 'high';
            else if (campaignReminders.some(r => r.priority === 'medium')) priority = 'medium';
        }

        // Check if changed in last 3 days
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const hasRecentChanges = new Date(campaign.updated) > threeDaysAgo;

        return {
            ...campaign,
            platform_data: platform,
            hasPendingReminders,
            highestPriority: hasPendingReminders ? priority : undefined,
            hasRecentChanges,
        };
    });

    // Filter by reminders if needed
    const filteredCampaigns = filterReminders
        ? enrichedCampaigns.filter((c) => c.hasPendingReminders)
        : enrichedCampaigns;

    // Group by platform
    const groupedCampaigns = platforms.reduce((acc, platform) => {
        const platformCampaigns = filteredCampaigns.filter(c => c.platform === platform.id);
        if (platformCampaigns.length > 0) {
            acc.push({
                platform,
                campaigns: platformCampaigns
            });
        }
        return acc;
    }, [] as { platform: CampaignPlatform, campaigns: any[] }[]);

    // Handle campaigns with no platform (fallback)
    const orphans = filteredCampaigns.filter(c => !platforms.find(p => p.id === c.platform));
    if (orphans.length > 0) {
        groupedCampaigns.push({
            platform: { id: 'unknown', display_name: 'Unassigned', color: '#64748b' } as any,
            campaigns: orphans
        });
    }

    const openEdit = (id: string) => {
        setEditingId(id);
        setIsEditModalOpen(true);
    };

    return (
        <div className="page-container">
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '1.5rem',
                    marginTop: '0.5rem'
                }}
            >
                <div>
                    <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'hsl(var(--primary))', letterSpacing: '-0.03em' }}>
                        Campaign Tracking
                    </h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                        {filteredCampaigns.length} active monitors
                    </p>
                </div>

                <button
                    className="hero-btn hero-btn-primary"
                    onClick={() => {
                        setEditingId(null);
                        setIsEditModalOpen(true);
                    }}
                >
                    <Plus size={18} />
                    New Campaign
                </button>
            </div>

            {/* Filters */}
            <div className="filter-bar" style={{ marginBottom: '1.5rem' }}>
                <div className="filter-group">
                    <label>Platform</label>
                    <select
                        value={filterPlatform}
                        onChange={(e) => setFilterPlatform(e.target.value)}
                        style={{ minWidth: '160px' }}
                    >
                        <option value="all">All Channels</option>
                        {platforms.map((platform) => (
                            <option key={platform.id} value={platform.id}>
                                {platform.display_name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>Status</label>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={{ minWidth: '140px' }}
                    >
                        <option value="all">Any Status</option>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="testing">Testing</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label style={{ opacity: 0 }}>&nbsp;</label>
                    <div
                        onClick={() => setFilterReminders(!filterReminders)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            padding: '0.55rem 0.85rem',
                            background: filterReminders ? 'var(--accent-glow)' : 'var(--bg-content)',
                            border: `1px solid ${filterReminders ? 'hsl(var(--primary))' : 'var(--border-subtle)'}`,
                            borderRadius: '0.65rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            userSelect: 'none',
                            height: '100%',
                            minHeight: '42px'
                        }}
                    >
                        <div style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-subtle)',
                            background: filterReminders ? 'hsl(var(--primary))' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            {filterReminders && <Check size={12} strokeWidth={4} />}
                        </div>
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: filterReminders ? 'hsl(var(--primary))' : 'var(--text-dim)' }}>
                            Alerts Only
                        </span>
                    </div>
                </div>

                {(filterPlatform !== 'all' || filterStatus !== 'all' || filterReminders) && (
                    <button
                        onClick={() => {
                            setFilterPlatform('all');
                            setFilterStatus('all');
                            setFilterReminders(false);
                        }}
                        className="hero-btn hero-btn-ghost"
                        style={{
                            marginLeft: 'auto',
                            alignSelf: 'flex-end',
                            padding: '0.45rem 0.75rem',
                            fontSize: 'var(--text-xs)'
                        }}
                    >
                        Reset
                    </button>
                )}
            </div>

            {/* Campaign Cards Grid */}
            {isLoading ? (
                <div style={{ padding: '8rem', textAlign: 'center', color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                    <Loader2 size={40} className="animate-spin" style={{ color: 'hsl(var(--primary))' }} />
                    <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Syncing monitors...</div>
                </div>
            ) : filteredCampaigns.length === 0 ? (
                <div
                    className="hero-card"
                    style={{
                        padding: '6rem 4rem',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1.5rem'
                    }}
                >
                    <div style={{ padding: '2rem', background: 'var(--accent-glow)', borderRadius: '50%', color: 'hsl(var(--primary))' }}>
                        <Plus size={48} />
                    </div>
                    <div style={{ maxWidth: '400px' }}>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>No monitors found</h3>
                        <p style={{ color: 'var(--text-dim)', fontSize: '1rem', lineHeight: '1.6' }}>
                            {campaigns.length === 0
                                ? "You haven't tracked any campaigns yet. Start optimization by creating your first one."
                                : "We couldn't find any campaigns matching your current filters. Try adjusting them."}
                        </p>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                    {groupedCampaigns.map((group) => (
                        <div key={group.platform.id}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                <div style={{ width: '8px', height: '24px', background: group.platform.color, borderRadius: '4px' }} />
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                                    {group.platform.display_name}
                                </h3>
                                <div style={{ height: '1px', flex: 1, background: 'var(--border-subtle)', marginLeft: '0.5rem', opacity: 0.5 }} />
                                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>{group.campaigns.length} campaigns</span>
                            </div>

                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                    gap: '1.5rem',
                                }}
                            >
                                {group.campaigns.map((campaign: any) => (
                                    <CampaignCard
                                        key={campaign.id}
                                        campaign={campaign}
                                        platform={campaign.platform_data}
                                        hasRecentChanges={campaign.hasRecentChanges}
                                        hasPendingReminders={campaign.hasPendingReminders}
                                        highestPriority={campaign.highestPriority}
                                        onEdit={openEdit}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <EditCampaignModal
                campaignId={editingId || undefined}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={() => refetch()}
            />
        </div>
    );
}
