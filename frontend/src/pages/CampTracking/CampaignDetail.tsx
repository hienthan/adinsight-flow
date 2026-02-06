import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    ChevronLeft,
    Settings,
    History,
    Bell,
    Edit3,
    Calendar,
    DollarSign,
    Tag,
    ExternalLink
} from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { Campaign, CampaignPlatform } from '../../types/campaign';
import { formatDate } from '../../lib/utils';
import CampaignForm from '../../components/campaign/CampaignForm';
import CampaignHistory from '../../components/campaign/CampaignHistory';
import CampaignReminders from '../../components/campaign/CampaignReminders';
import AddReminderModal from '../../components/campaign/AddReminderModal';

export default function CampaignDetail() {
    const { campaignId } = useParams<{ campaignId: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'reminders'>('overview');
    const [isEditing, setIsEditing] = useState(false);
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);

    // Fetch campaign details with expanded platform
    const { data: campaign, isLoading, refetch } = useQuery<Campaign & { expand?: { platform: CampaignPlatform } }>({
        queryKey: ['campaign', campaignId],
        queryFn: async () => {
            if (!campaignId) throw new Error('No campaign ID provided');
            return await pb.collection('campaigns').getOne<Campaign & { expand?: { platform: CampaignPlatform } }>(campaignId, {
                expand: 'platform',
            });
        },
        enabled: !!campaignId,
    });

    if (isLoading) return <div className="page-container" style={{ textAlign: 'center', padding: '5rem' }}>Loading campaign details...</div>;
    if (!campaign) return <div className="page-container">Campaign not found.</div>;

    const platform = campaign.expand?.platform;
    const platformColor = platform?.color || 'var(--accent)';

    const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
        <button
            onClick={() => { setActiveTab(id); setIsEditing(false); }}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                background: activeTab === id ? 'var(--secondary)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: activeTab === id ? 'var(--text-main)' : 'var(--text-dim)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: activeTab === id ? 600 : 400,
                transition: 'all 0.2s'
            }}
        >
            <Icon size={18} />
            {label}
        </button>
    );

    return (
        <div className="page-container">
            {/* Top Navigation Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                    }}
                >
                    <ChevronLeft size={18} />
                    Back
                </button>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => setIsReminderModalOpen(true)}
                        style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-main)',
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer'
                        }}
                    >
                        <Bell size={16} />
                        Quick Reminder
                    </button>
                </div>
            </div>

            {/* Campaign Header Card */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '16px',
                padding: '2rem',
                border: '1px solid var(--border-color)',
                borderLeft: `6px solid ${platformColor}`,
                marginBottom: '2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <span
                            className="badge"
                            style={{ background: platformColor + '20', color: platformColor, fontWeight: 700, fontSize: '0.7rem' }}
                        >
                            {platform?.display_name || 'Generic Platform'}
                        </span>
                        <span
                            className="badge"
                            style={{ background: campaign.status === 'active' ? '#22c55e20' : '#f59e0b20', color: campaign.status === 'active' ? '#22c55e' : '#f59e0b', fontSize: '0.7rem' }}
                        >
                            {campaign.status.toUpperCase()}
                        </span>
                    </div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>{campaign.name}</h1>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Calendar size={16} />
                            Created {formatDate(campaign.created_date)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <DollarSign size={16} />
                            Budget: ${campaign.max_daily_budget}/day
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Tag size={16} />
                            CPC: ${campaign.cpc}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <button
                        style={{
                            background: 'var(--accent)',
                            color: 'white',
                            border: 'none',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '8px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer'
                        }}
                        onClick={() => { setActiveTab('overview'); setIsEditing(true); }}
                    >
                        <Edit3 size={18} />
                        Edit Campaign
                    </button>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                        ID: {campaign.id}
                    </span>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                borderBottom: '1px solid var(--border-color)',
                marginBottom: '2rem',
                paddingBottom: '0.5rem'
            }}>
                <TabButton id="overview" label="Overview" icon={Settings} />
                <TabButton id="history" label="Change History" icon={History} />
                <TabButton id="reminders" label="Reminders" icon={Bell} />
            </div>

            {/* Tab Content */}
            <div className="animate-fade">
                {activeTab === 'overview' && (
                    <div style={{ maxWidth: '900px' }}>
                        {isEditing ? (
                            <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Editing Campaign</h2>
                                    <button onClick={() => setIsEditing(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                                        Cancel
                                    </button>
                                </div>
                                <CampaignForm
                                    campaignId={campaignId}
                                    onCancel={() => setIsEditing(false)}
                                    onSuccess={() => { setIsEditing(false); refetch(); }}
                                />
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                                {/* Main Info */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    <section>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid var(--secondary)', paddingBottom: '0.5rem', width: 'fit-content' }}>Strategy & Objective</h3>
                                        <div style={{
                                            lineHeight: '1.6',
                                            color: 'var(--text-main)',
                                            whiteSpace: 'pre-wrap',
                                            background: 'var(--bg-card)',
                                            padding: '1.5rem',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border-color)'
                                        }}>
                                            {campaign.description || 'No description provided.'}
                                        </div>
                                    </section>

                                    <section>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '2px solid var(--secondary)', paddingBottom: '0.5rem', width: 'fit-content' }}>General Notes</h3>
                                        <div style={{
                                            lineHeight: '1.6',
                                            color: 'var(--text-main)',
                                            whiteSpace: 'pre-wrap',
                                            background: 'var(--bg-card)',
                                            padding: '1.5rem',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border-color)'
                                        }}>
                                            {campaign.general_notes || 'No notes available.'}
                                        </div>
                                    </section>
                                </div>

                                {/* Sidebar Stats */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                        <h4 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Current Metrics</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Max Daily Budget</div>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)' }}>${campaign.max_daily_budget}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Target CPC</div>
                                                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>${campaign.cpc}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                        <h4 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Keywords ({Array.isArray(campaign.keywords) ? campaign.keywords.length : 0})</h4>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {Array.isArray(campaign.keywords) && campaign.keywords.length > 0 ? (
                                                campaign.keywords.map((kw: string) => (
                                                    <span key={kw} className="badge" style={{ background: 'var(--secondary)', color: 'var(--text-dim)', fontSize: '0.75rem' }}>{kw}</span>
                                                ))
                                            ) : (
                                                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontStyle: 'italic' }}>No keywords added.</span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem',
                                            color: 'var(--text-dim)',
                                            fontSize: '0.8rem',
                                            padding: '0.75rem',
                                            background: 'transparent',
                                            border: '1px dashed var(--border-color)',
                                            borderRadius: '8px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <ExternalLink size={14} />
                                        Open in Ads Manager
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'history' && campaignId && (
                    <div style={{ maxWidth: '800px' }}>
                        <CampaignHistory campaignId={campaignId} />
                    </div>
                )}

                {activeTab === 'reminders' && campaignId && (
                    <div style={{ maxWidth: '800px' }}>
                        <CampaignReminders campaignId={campaignId} />
                    </div>
                )}
            </div>

            {campaignId && (
                <AddReminderModal
                    campaignId={campaignId}
                    isOpen={isReminderModalOpen}
                    onClose={() => setIsReminderModalOpen(false)}
                />
            )}
        </div>
    );
}
