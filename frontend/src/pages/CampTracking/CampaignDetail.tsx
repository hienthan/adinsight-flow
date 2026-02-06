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
    ExternalLink,
    ShieldCheck,
    Lock,
    Plus
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

    if (isLoading) return (
        <div className="page-container" style={{ textAlign: 'center', padding: '10rem' }}>
            <div className="animate-pulse" style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Loading campaign details...</div>
        </div>
    );
    if (!campaign) return <div className="page-container">Campaign not found.</div>;

    const platform = campaign.expand?.platform;
    const platformColor = platform?.color || 'var(--accent)';

    const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
        <button
            onClick={() => { setActiveTab(id); setIsEditing(false); }}
            className={`hero-tab ${activeTab === id ? 'active' : ''}`}
        >
            <Icon size={16} />
            {label}
        </button>
    );

    return (
        <div className="page-container">
            {/* Top Navigation Bar / Breadcrumb */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', marginTop: '0.5rem' }}>
                <button
                    onClick={() => navigate(-1)}
                    className="hero-btn hero-btn-ghost"
                    style={{ padding: '0.4rem 0.75rem', marginLeft: '-0.75rem' }}
                >
                    <ChevronLeft size={18} />
                    <span>Back</span>
                </button>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        onClick={() => setIsReminderModalOpen(true)}
                        className="hero-btn hero-btn-secondary"
                        style={{ borderStyle: 'dashed' }}
                    >
                        <Bell size={16} />
                        Add Checkpoint
                    </button>
                    <button
                        className="hero-btn hero-btn-primary"
                        onClick={() => { setActiveTab('overview'); setIsEditing(true); }}
                    >
                        <Edit3 size={16} />
                        Edit Campaign
                    </button>
                </div>
            </div>

            {/* Campaign Header Card - More Compact & Premium */}
            <div
                className="hero-card"
                style={{
                    borderLeft: `4px solid ${platformColor}`,
                    marginBottom: '1.5rem',
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                            <span className="hero-badge" style={{ background: platformColor + '15', color: platformColor, fontWeight: 800 }}>
                                {platform?.display_name || 'Platform'}
                            </span>
                            <span className="hero-badge" style={{
                                background: campaign.status === 'active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                color: campaign.status === 'active' ? '#22c55e' : '#f59e0b',
                                fontWeight: 800
                            }}>
                                {campaign.status}
                            </span>
                            {campaign.is_dsa === false ? (
                                <span className="hero-badge" style={{ background: 'var(--bg-overlay)', color: 'var(--text-dim)', border: '1px solid var(--border-subtle)' }}>
                                    <Lock size={12} style={{ marginRight: '4px' }} /> Manual
                                </span>
                            ) : (
                                <span className="hero-badge" style={{ background: 'hsla(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }}>
                                    <ShieldCheck size={12} style={{ marginRight: '4px' }} /> DSA Ready
                                </span>
                            )}
                        </div>
                        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                            {campaign.name}
                        </h1>
                    </div>
                    <div style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                        ID: {campaign.id}
                    </div>
                </div>

                <div style={{
                    display: 'flex',
                    gap: '2rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--border-subtle)',
                    color: 'var(--text-dim)',
                    fontSize: '0.85rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={14} className="text-primary" />
                        <span>Started <strong>{formatDate(campaign.created_date)}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <DollarSign size={14} className="text-primary" />
                        <span>Budget <strong>${campaign.max_daily_budget}</strong>/day</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Tag size={14} className="text-primary" />
                        <span>Target CPC <strong>${campaign.cpc}</strong></span>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="hero-tabs" style={{ marginBottom: '1.5rem' }}>
                <TabButton id="overview" label="Strategy Overview" icon={Settings} />
                <TabButton id="history" label="Auto Log" icon={History} />
                <TabButton id="reminders" label="Performance Reminders" icon={Bell} />
            </div>

            {/* Tab Content */}
            <div className="animate-fade">
                {activeTab === 'overview' && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isEditing ? '1fr' : 'repeat(12, 1fr)',
                        gap: '1.5rem',
                        alignItems: 'stretch' // Ensure columns have same height
                    }}>
                        {isEditing ? (
                            <div className="hero-card" style={{ padding: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                    <h2 className="hero-section-title" style={{ marginBottom: 0 }}>Update Campaign Config</h2>
                                    <button onClick={() => setIsEditing(false)} className="hero-btn hero-btn-ghost">Cancel</button>
                                </div>
                                <CampaignForm
                                    campaignId={campaignId}
                                    onCancel={() => setIsEditing(false)}
                                    onSuccess={() => { setIsEditing(false); refetch(); }}
                                />
                            </div>
                        ) : (
                            <>
                                {/* Strategy & Notes Col */}
                                <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <h3 className="hero-section-title">Strategy & Objective</h3>
                                        <div className="hero-card" style={{ flex: 1, whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.9rem' }}>
                                            {campaign.description || 'Define your strategy here...'}
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <h3 className="hero-section-title">Internal Notes</h3>
                                        <div className="hero-card" style={{ flex: 1, whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.9rem' }}>
                                            {campaign.general_notes || 'Add internal observations or technical notes...'}
                                        </div>
                                    </div>
                                </div>

                                {/* Sidebar Stats & Quick Actions Col */}
                                <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div className="hero-card">
                                        <h3 className="hero-section-title" style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Financial Guardrails</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: '0.85rem', border: '1px solid var(--border-subtle)' }}>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>DAILY CAP</div>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'hsl(var(--primary))' }}>${campaign.max_daily_budget}</div>
                                            </div>
                                            <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: '0.85rem', border: '1px solid var(--border-subtle)' }}>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>CPC TARGET</div>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)' }}>${campaign.cpc}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="hero-card">
                                        <h3 className="hero-section-title" style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Semantic Context</h3>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {Array.isArray(campaign.keywords) && campaign.keywords.length > 0 ? (
                                                campaign.keywords.map((kw: string) => (
                                                    <span key={kw} className="hero-badge" style={{ background: 'var(--secondary)', color: 'var(--text-main)', fontSize: '0.75rem' }}>{kw}</span>
                                                ))
                                            ) : (
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>No semantic tags added.</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Inline Reminders Section - NEW */}
                                    <div className="hero-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <h3 className="hero-section-title" style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 0 }}>Active Checkpoints</h3>
                                            <button onClick={() => setIsReminderModalOpen(true)} className="hero-btn-ghost" style={{ padding: '0.25rem', borderRadius: '50%' }}>
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                        <div style={{ flex: 1, overflowY: 'auto', maxHeight: '300px' }}>
                                            {campaignId && <CampaignReminders campaignId={campaignId} compact={true} />}
                                        </div>
                                    </div>

                                    <button
                                        className="hero-btn hero-btn-secondary"
                                        style={{ width: '100%', justifyContent: 'center', gap: '0.75rem', padding: '0.85rem' }}
                                    >
                                        <ExternalLink size={16} />
                                        Launch Ads Manager
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'history' && campaignId && (
                    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                        <CampaignHistory campaignId={campaignId} />
                    </div>
                )}

                {activeTab === 'reminders' && campaignId && (
                    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
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
