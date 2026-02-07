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
    Plus,
    BrainCircuit,
    Hash,
    Info
} from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { Campaign, CampaignPlatform } from '../../types/campaign';
import { formatDate } from '../../lib/utils';
import CampaignHistory from '../../components/campaign/CampaignHistory';
import CampaignReminders from '../../components/campaign/CampaignReminders';
import AddReminderModal from '../../components/campaign/AddReminderModal';
import EditCampaignModal from '../../components/campaign/EditCampaignModal';

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
                        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: platformColor, letterSpacing: '-0.02em' }}>
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
                        <span>Budget <strong>${campaign.max_daily_budget?.toFixed(0)}</strong>/day</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Tag size={14} className="text-primary" />
                        <span>Target CPC <strong>${campaign.cpc?.toFixed(0)}</strong></span>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="hero-tabs" style={{ marginBottom: '1.5rem' }}>
                <TabButton id="overview" label="Strategy Overview" icon={Settings} />
                <TabButton id="history" label="Auto Log" icon={History} />
            </div>

            {/* Tab Content */}
            <div className="animate-fade">
                {activeTab === 'overview' && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(12, 1fr)',
                        gap: '2rem',
                        alignItems: 'stretch'
                    }}>
                        {/* Info & Config Column (Mirrors Edit Modal Layout exactly) */}
                        <div style={{ gridColumn: 'span 7', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                            {/* Unified Info Card */}
                            <div className="hero-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

                                {/* Header: Identity & Platform */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Campaign Identity</div>
                                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0 }}>
                                            {campaign.name}
                                        </h2>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Platform</div>
                                        <span className="hero-badge" style={{ background: platformColor + '15', color: platformColor, fontWeight: 900, fontSize: '0.8rem', padding: '0.4rem 0.75rem', borderRadius: '8px' }}>
                                            {platform?.display_name || 'Generic Platform'}
                                        </span>
                                    </div>
                                </div>

                                {/* Operational Meta Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', background: 'var(--bg-overlay)', padding: '1.25rem', borderRadius: '12px' }}>
                                    <div className="filter-group">
                                        <label>Current Status</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.4rem' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: campaign.status === 'active' ? '#22c55e' : '#f59e0b', boxShadow: campaign.status === 'active' ? '0 0 8px #22c55e60' : 'none' }} />
                                            <span style={{ fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', fontSize: '0.75rem' }}>{campaign.status}</span>
                                        </div>
                                    </div>
                                    <div className="filter-group">
                                        <label>Initial Start</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 700 }}>
                                            {formatDate(campaign.created_date)}
                                        </div>
                                    </div>
                                    <div className="filter-group">
                                        <label>DSA Mode</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                                            {campaign.is_dsa ? (
                                                <><ShieldCheck size={14} color="hsl(var(--primary))" /><span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'hsl(var(--primary))' }}>ACTIVE</span></>
                                            ) : (
                                                <><Lock size={14} color="var(--text-dim)" /><span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-dim)' }}>MANUAL</span></>
                                            )}
                                        </div>
                                    </div>
                                    <div className="filter-group">
                                        <label>Target CPC</label>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                                            ${campaign.cpc?.toFixed(0) || '0'}
                                        </div>
                                    </div>
                                </div>

                                {/* Financial Performance Highlight */}
                                <div style={{ borderLeft: `4px solid ${platformColor}`, paddingLeft: '1.25rem' }}>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Maximum Daily Budget Allocation</label>
                                    <div style={{ fontSize: '2rem', fontWeight: 900, color: platformColor, letterSpacing: '-0.04em', lineHeight: 1 }}>
                                        ${campaign.max_daily_budget?.toLocaleString() || '0'}
                                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: '0.5rem', verticalAlign: 'middle' }}>USD / DAY</span>
                                    </div>
                                </div>

                                {/* Row 3.5: Active Keywords (Full Width Text) */}
                                <div className="filter-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Hash size={14} className="text-secondary" />
                                        Active Tracking Keywords
                                    </label>
                                    <div style={{
                                        marginTop: '0.6rem',
                                        padding: '1rem',
                                        background: 'var(--bg-overlay)',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border-subtle)',
                                        fontSize: '0.85rem',
                                        lineHeight: 1.6,
                                        color: 'var(--text-main)',
                                        minHeight: '80px',
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        whiteSpace: 'pre-wrap',
                                        fontFamily: 'monospace'
                                    }}>
                                        {campaign.keywords || 'No keywords tracked for this campaign.'}
                                    </div>
                                </div>

                                {/* Row 4: Strategy & Internal Notes */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                    <div className="filter-group">
                                        <label>Strategy & Objective</label>
                                        <div style={{
                                            marginTop: '0.6rem',
                                            padding: '1rem',
                                            background: 'var(--bg-overlay)',
                                            borderRadius: '10px',
                                            border: '1px solid var(--border-subtle)',
                                            fontSize: '0.85rem',
                                            lineHeight: 1.6,
                                            color: 'var(--text-main)',
                                            minHeight: '100px',
                                            whiteSpace: 'pre-wrap'
                                        }}>
                                            {campaign.description || 'Define your strategy...'}
                                        </div>
                                    </div>
                                    <div className="filter-group">
                                        <label>Internal Notes</label>
                                        <div style={{
                                            marginTop: '0.6rem',
                                            padding: '1rem',
                                            background: 'var(--bg-overlay)',
                                            borderRadius: '10px',
                                            border: '1px solid var(--border-subtle)',
                                            fontSize: '0.85rem',
                                            lineHeight: 1.6,
                                            color: 'var(--text-dim)',
                                            minHeight: '100px',
                                            whiteSpace: 'pre-wrap'
                                        }}>
                                            {campaign.general_notes || 'Add internal observations...'}
                                        </div>
                                    </div>
                                </div>

                                {/* Row 5: AI Insights (Conditional) */}
                                {campaign.chatgpt_metadata && (
                                    <div className="filter-group">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--primary))' }}>
                                            <BrainCircuit size={14} />
                                            AI Strategic Insights
                                        </label>
                                        <div style={{
                                            marginTop: '0.6rem',
                                            padding: '1rem',
                                            background: 'hsla(var(--primary) / 0.05)',
                                            borderRadius: '10px',
                                            border: '1px solid hsla(var(--primary) / 0.1)',
                                            fontSize: '0.85rem',
                                            lineHeight: 1.6,
                                            color: 'var(--text-main)',
                                            whiteSpace: 'pre-wrap'
                                        }}>
                                            {campaign.chatgpt_metadata}
                                        </div>
                                    </div>
                                )}

                                {/* Row 6: Platform Global Notes (Institutional Context) */}
                                {platform?.metadata && (
                                    <div className="filter-group" style={{ marginTop: '0.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: platformColor }}>
                                            <Info size={14} />
                                            Platform Global Governance & Notes
                                        </label>
                                        <div style={{
                                            marginTop: '0.6rem',
                                            padding: '1rem',
                                            background: 'var(--bg-main)',
                                            borderRadius: '10px',
                                            border: `1px solid ${platformColor}20`,
                                            fontSize: '0.85rem',
                                            lineHeight: 1.6,
                                            color: 'var(--text-dim)',
                                            whiteSpace: 'pre-wrap'
                                        }}>
                                            {platform.metadata}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Reminders Column */}
                        <div style={{ gridColumn: 'span 5' }}>
                            <div className="hero-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                        <div style={{ padding: '0.5rem', background: 'hsla(var(--primary) / 0.1)', borderRadius: '10px', color: 'hsl(var(--primary))' }}>
                                            <Bell size={20} />
                                        </div>
                                        <div>
                                            <h3 className="hero-section-title" style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: 0 }}>Active Checkpoints</h3>
                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>Performance monitors & actions</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsReminderModalOpen(true)}
                                        className="hero-btn-ghost"
                                        style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>

                                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem' }}>
                                    {campaignId && <CampaignReminders campaignId={campaignId} compact={true} />}
                                </div>

                                <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                                    <button
                                        className="hero-btn hero-btn-secondary"
                                        style={{ width: '100%', justifyContent: 'center', gap: '0.75rem', padding: '0.85rem', fontSize: '0.85rem' }}
                                    >
                                        <ExternalLink size={16} />
                                        Access Platform Manager
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'history' && campaignId && (
                    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                        <CampaignHistory campaignId={campaignId} />
                    </div>
                )}
            </div>

            {campaignId && (
                <EditCampaignModal
                    campaignId={campaignId}
                    isOpen={isEditing}
                    onClose={() => setIsEditing(false)}
                    onSuccess={() => refetch()}
                />
            )}

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
