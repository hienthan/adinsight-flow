import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Plus, Loader2 } from 'lucide-react';
import { pb, formatDateForInput } from '../../lib/pocketbase';
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
                sort: 'name',
                expand: 'platform',
            });
        },
        enabled: !!platformId,
    });

    // Fetch reminders to check pending status
    const { data: reminders = [] } = useQuery<CampaignReminder[]>({
        queryKey: ['reminders', 'pending'],
        queryFn: async () => {
            const today = formatDateForInput(new Date().toISOString());
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
            <div style={{ marginBottom: '1.5rem' }}>
                <button
                    onClick={() => navigate('/camp-tracking')}
                    className="hero-btn hero-btn-ghost"
                    style={{ padding: '0.4rem 0.75rem', marginLeft: '-0.75rem', marginBottom: '1rem' }}
                >
                    <ChevronLeft size={18} />
                    <span>Back to Tracking</span>
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'hsl(var(--primary))', letterSpacing: '-0.03em' }}>
                            {platform?.display_name || 'Platform Campaigns'}
                        </h1>
                        <p style={{ color: 'var(--text-dim)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                            {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} total
                        </p>
                    </div>
                    <button
                        className="hero-btn hero-btn-primary"
                        onClick={() => navigate(`/camp-tracking/new?platformId=${platformId}`)}
                    >
                        <Plus size={18} />
                        New Campaign
                    </button>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div style={{ padding: '10rem 0', textAlign: 'center', color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                    <Loader2 size={40} className="animate-spin" style={{ color: 'hsl(var(--primary))' }} />
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, letterSpacing: '-0.01em' }}>Loading optimized campaigns...</div>
                </div>
            ) : campaigns.length === 0 ? (
                <div className="hero-card" style={{
                    padding: '6rem 4rem',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1.5rem'
                }}>
                    <div style={{ padding: '2rem', background: 'var(--accent-glow)', borderRadius: '50%', color: 'hsl(var(--primary))' }}>
                        <Plus size={48} />
                    </div>
                    <div style={{ maxWidth: '400px' }}>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>No campaigns found</h3>
                        <p style={{ color: 'var(--text-dim)', fontSize: '1rem', lineHeight: '1.6' }}>
                            No campaigns have been created for this platform yet. Start optimization by creating your first one.
                        </p>
                    </div>
                    <button
                        className="hero-btn hero-btn-primary"
                        style={{ padding: '1rem 2.5rem' }}
                        onClick={() => navigate(`/camp-tracking/new?platformId=${platformId}`)}
                    >
                        Create First Campaign
                    </button>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', // More compact grid
                    gap: '1.5rem',
                }}>
                    {enrichedCampaigns.map((campaign) => (
                        <CampaignCard
                            key={campaign.id}
                            campaign={campaign}
                            platform={platform}
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
