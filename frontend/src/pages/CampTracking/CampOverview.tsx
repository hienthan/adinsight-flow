import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { Campaign, CampaignPlatform, CampaignReminder } from '../../types/campaign';
import CampaignCard from '../../components/campaign/CampaignCard';

export default function CampOverview() {
    const navigate = useNavigate();
    const [filterPlatform, setFilterPlatform] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterReminders, setFilterReminders] = useState<boolean>(false);

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
    const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
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
            const today = new Date().toISOString().split('T')[0];
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

    return (
        <div className="page-container">
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '2rem',
                }}
            >
                <div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>Campaign Overview</h2>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                        {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? 's' : ''} total
                    </p>
                </div>

                <button
                    className="primary-btn"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.25rem',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                    }}
                    onClick={() => navigate('/camp-tracking/new')}
                >
                    <Plus size={18} />
                    New Campaign
                </button>
            </div>

            {/* Filters */}
            <div className="filter-bar">
                <div className="filter-group">
                    <label>Platform</label>
                    <select
                        value={filterPlatform}
                        onChange={(e) => setFilterPlatform(e.target.value)}
                        style={{ minWidth: '160px' }}
                    >
                        <option value="all">All Platforms</option>
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
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="testing">Testing</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>

                <div
                    className="filter-group"
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.5rem 1rem',
                        background: 'var(--secondary)',
                        borderRadius: '10px',
                        cursor: 'pointer'
                    }}
                    onClick={() => setFilterReminders(!filterReminders)}
                >
                    <input
                        type="checkbox"
                        checked={filterReminders}
                        onChange={(e) => setFilterReminders(e.target.checked)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        Pending Reminders
                    </span>
                </div>

                {(filterPlatform !== 'all' || filterStatus !== 'all' || filterReminders) && (
                    <button
                        onClick={() => {
                            setFilterPlatform('all');
                            setFilterStatus('all');
                            setFilterReminders(false);
                        }}
                        style={{
                            marginLeft: 'auto',
                            padding: '0.65rem 1rem',
                            background: 'transparent',
                            border: '1px solid var(--border-color)',
                            borderRadius: '10px',
                            color: 'var(--text-dim)',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 600,
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
                        Reset Filters
                    </button>
                )}
            </div>

            {/* Campaign Cards Grid */}
            {isLoading ? (
                <div
                    style={{
                        padding: '4rem',
                        textAlign: 'center',
                        color: 'var(--text-dim)',
                    }}
                >
                    Loading campaigns...
                </div>
            ) : filteredCampaigns.length === 0 ? (
                <div
                    style={{
                        padding: '4rem',
                        textAlign: 'center',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                    }}
                >
                    <p style={{ color: 'var(--text-dim)', marginBottom: '1rem' }}>
                        {campaigns.length === 0
                            ? 'No campaigns yet. Create your first campaign to get started!'
                            : 'No campaigns match the current filters.'}
                    </p>
                    {campaigns.length === 0 && (
                        <button
                            style={{
                                padding: '0.75rem 1.25rem',
                                background: 'var(--accent)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                            onClick={() => navigate('/camp-tracking/new')}
                        >
                            Create First Campaign
                        </button>
                    )}
                </div>
            ) : (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: '1.5rem',
                    }}
                >
                    {filteredCampaigns.map((campaign: any) => (
                        <CampaignCard
                            key={campaign.id}
                            campaign={campaign}
                            platform={campaign.platform_data}
                            hasRecentChanges={campaign.hasRecentChanges}
                            hasPendingReminders={campaign.hasPendingReminders}
                            highestPriority={campaign.highestPriority}
                            onEdit={(id) => navigate(`/camp-tracking/edit/${id}`)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
