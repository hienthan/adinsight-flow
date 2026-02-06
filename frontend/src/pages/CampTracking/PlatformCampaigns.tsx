import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus } from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { Campaign, CampaignPlatform, CampaignReminder } from '../../types/campaign';
import CampaignCard from '../../components/campaign/CampaignCard';

export default function PlatformCampaigns() {
    const { platformId } = useParams();
    const navigate = useNavigate();

    // Fetch platform details
    const { data: platform } = useQuery<CampaignPlatform>({
        queryKey: ['platform', platformId],
        queryFn: async () => {
            return await pb.collection('campaign_platforms').getOne<CampaignPlatform>(platformId!);
        },
        enabled: !!platformId,
    });

    // Fetch campaigns for this platform
    const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
        queryKey: ['campaigns', platformId],
        queryFn: async () => {
            return await pb.collection('campaigns').getFullList<Campaign>({
                filter: `platform = "${platformId}"`,
                sort: '-created_date',
                expand: 'platform',
            });
        },
        enabled: !!platformId,
    });

    // Fetch reminders to check pending status
    const { data: reminders = [] } = useQuery<CampaignReminder[]>({
        queryKey: ['reminders', 'pending'],
        queryFn: async () => {
            const today = new Date().toISOString().split('T')[0];
            return await pb.collection('campaign_reminders').getFullList<CampaignReminder>({
                filter: `reminder_date <= "${today}" && status = "pending"`,
            });
        },
    });

    const enrichedCampaigns = campaigns.map((campaign: any) => {
        const campaignReminders = reminders.filter((r) => r.campaign === campaign.id);
        const hasPendingReminders = campaignReminders.length > 0;

        let priority: 'low' | 'medium' | 'high' = 'low';
        if (hasPendingReminders) {
            if (campaignReminders.some(r => r.priority === 'high')) priority = 'high';
            else if (campaignReminders.some(r => r.priority === 'medium')) priority = 'medium';
        }

        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const hasRecentChanges = new Date(campaign.updated) > threeDaysAgo;

        return {
            ...campaign,
            hasPendingReminders,
            highestPriority: hasPendingReminders ? priority : undefined,
            hasRecentChanges,
        };
    });

    return (
        <div className="page-container">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <button
                    onClick={() => navigate('/camp-tracking')}
                    style={{
                        background: 'var(--accent-glow)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '8px',
                        padding: '0.5rem',
                        cursor: 'pointer',
                        color: 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <ArrowLeft size={18} />
                </button>
                <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem', color: 'var(--text-main)' }}>
                        {platform?.display_name || 'Platform Campaigns'}
                    </h2>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                        {campaigns.length} campaigns active
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
                    onClick={() => navigate(`/camp-tracking/new?platformId=${platformId}`)}
                >
                    <Plus size={18} />
                    New Campaign
                </button>
            </div>

            {/* Content */}
            {isLoading ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                    Loading campaigns...
                </div>
            ) : campaigns.length === 0 ? (
                <div style={{
                    padding: '4rem',
                    textAlign: 'center',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                }}>
                    <p style={{ color: 'var(--text-dim)', marginBottom: '1rem' }}>
                        No campaigns found for this platform.
                    </p>
                    <button
                        className="primary-btn"
                        onClick={() => navigate(`/camp-tracking/new?platformId=${platformId}`)}
                    >
                        Create First Campaign
                    </button>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '1.5rem',
                }}>
                    {enrichedCampaigns.map((campaign) => (
                        <CampaignCard
                            key={campaign.id}
                            campaign={campaign}
                            platform={platform}
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
