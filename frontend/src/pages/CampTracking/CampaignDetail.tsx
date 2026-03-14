import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ChevronLeft,
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
    Info,
    Trash2
} from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { Campaign, CampaignPlatform } from '../../types/campaign';
import { formatDate } from '../../lib/utils';
import { sanitizeNoteHtml } from '../../lib/noteHtml';
import CampaignHistory from '../../components/campaign/CampaignHistory';
import CampaignReminders from '../../components/campaign/CampaignReminders';
import AddReminderModal from '../../components/campaign/AddReminderModal';
import EditCampaignModal from '../../components/campaign/EditCampaignModal';
import { SafeButton, SectionHeader, SurfaceCard } from '../../components/common/ui';

const TOP_BAR_STYLE = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    marginTop: '0.5rem',
} as const;

const TOP_ACTIONS_STYLE = {
    display: 'flex',
    gap: '0.75rem',
} as const;

const HEADER_CARD_STYLE = {
    borderLeftWidth: '4px',
    marginBottom: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
} as const;

const DETAIL_GRID_STYLE = {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gap: '1.5rem',
    alignItems: 'stretch',
} as const;

const INFO_COLUMN_STYLE = {
    gridColumn: 'span 5',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
} as const;

const UNIFIED_INFO_CARD_STYLE = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.75rem',
} as const;

const SIDE_PANEL_CARD_STYLE = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
} as const;

const SECTION_ICON_STYLE = {
    padding: '0.5rem',
    borderRadius: '10px',
} as const;

export default function CampaignDetail() {
    const { campaignId } = useParams<{ campaignId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const returnPath = (location.state as any)?.from || '/camp-tracking';
    const [isEditing, setIsEditing] = useState(false);
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);

    // Fetch platforms as fallback and for color/naming consistency
    const { data: platforms = [] } = useQuery<CampaignPlatform[]>({
        queryKey: ['platforms'],
        queryFn: async () => {
            return await pb.collection('campaign_platforms').getFullList<CampaignPlatform>();
        },
    });

    // Fetch campaign details
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

    // Use expanded platform or find in fetched platforms
    const platform = campaign.expand?.platform || platforms.find(p => p.id === campaign.platform);
    const platformColor = platform?.color || 'var(--accent)';
    const campaignMetrics = [
        {
            icon: Calendar,
            label: 'Started',
            value: formatDate(campaign.created_date),
        },
        {
            icon: DollarSign,
            label: 'Budget',
            value: `$${campaign.max_daily_budget?.toLocaleString()}`,
        },
        {
            icon: Tag,
            label: 'Target CPC',
            value: `$${campaign.cpc?.toFixed(0)}`,
        },
    ];

    const handleDelete = async () => {
        if (!campaignId) return;

        if (window.confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
            try {
                await pb.collection('campaigns').delete(campaignId);
                queryClient.invalidateQueries({ queryKey: ['campaigns'] });
                navigate(returnPath);
            } catch (error) {
                console.error('Error deleting campaign:', error);
                alert('Failed to delete campaign. Please try again.');
            }
        }
    };

    return (
        <div className="page-container">
            {/* Top Navigation Bar / Breadcrumb */}
            <div style={TOP_BAR_STYLE}>
                <SafeButton
                    onClick={() => navigate(returnPath)}
                    className="hero-btn hero-btn-ghost"
                    style={{ padding: '0.4rem 0.75rem', marginLeft: '-0.75rem' }}
                >
                    <ChevronLeft size={18} />
                    <span>Back</span>
                </SafeButton>

                <div style={TOP_ACTIONS_STYLE}>
                    <SafeButton
                        onClick={() => setIsReminderModalOpen(true)}
                        className="hero-btn hero-btn-secondary"
                        style={{ borderStyle: 'dashed' }}
                    >
                        <Bell size={16} />
                        Add Checkpoint
                    </SafeButton>
                    <SafeButton
                        className="hero-btn hero-btn-primary"
                        onClick={() => setIsEditing(true)}
                    >
                        <Edit3 size={16} />
                        Edit Campaign
                    </SafeButton>
                    <SafeButton
                        className="hero-btn hero-btn-danger"
                        onClick={handleDelete}
                        style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
                    >
                        <Trash2 size={16} />
                        Delete
                    </SafeButton>
                </div>
            </div>

            {/* Campaign Header Card - More Compact & Premium */}
            <SurfaceCard
                style={{
                    ...HEADER_CARD_STYLE,
                    borderLeftColor: platformColor,
                    padding: '1.25rem 1.5rem',
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

                <div style={{ display: 'flex', gap: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                    {campaignMetrics.map((metric) => {
                        const Icon = metric.icon;
                        return (
                            <div key={metric.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Icon size={14} className="text-primary" />
                                <span>{metric.label} <strong>{metric.value}</strong></span>
                            </div>
                        );
                    })}
                </div>
            </SurfaceCard>


            {/* Main Content Grid */}
            <div className="animate-fade">
                <div style={{
                    ...DETAIL_GRID_STYLE
                }}>
                    {/* Full Info & Config Column */}
                    <div style={INFO_COLUMN_STYLE}>

                        {/* Unified Info Card */}
                        <SurfaceCard style={UNIFIED_INFO_CARD_STYLE}>

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
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.25rem', background: 'var(--bg-overlay)', padding: '1.25rem', borderRadius: '12px' }}>
                                <div className="filter-group">
                                    <label>Current Status</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.4rem' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: campaign.status === 'active' ? '#22c55e' : '#f59e0b', boxShadow: campaign.status === 'active' ? '0 0 8px #22c55e60' : 'none' }} />
                                        <span style={{ fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', fontSize: '0.75rem' }}>{campaign.status}</span>
                                    </div>
                                </div>
                                <div className="filter-group">
                                    <label>Initial Start</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem', color: 'var(--text-main)', fontSize: '0.8125rem', fontWeight: 700 }}>
                                        {formatDate(campaign.created_date)}
                                    </div>
                                </div>
                                <div className="filter-group">
                                    <label>Target CPC</label>
                                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                                        ${campaign.cpc?.toFixed(0) || '0'}
                                    </div>
                                </div>
                                <div className="filter-group">
                                    <label>Budget</label>
                                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: platformColor, marginTop: '0.2rem' }}>
                                        ${campaign.max_daily_budget?.toLocaleString() || '0'}
                                    </div>
                                </div>
                                <div className="filter-group">
                                    <label>DSA Mode</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                                        {campaign.is_dsa ? (
                                            <><ShieldCheck size={14} color="hsl(var(--primary))" /><span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'hsl(var(--primary))' }}>ACTIVE</span></>
                                        ) : (
                                            <><Lock size={14} color="var(--text-dim)" /><span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)' }}>MANUAL</span></>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Row 3.5: Active Keywords (Full Width Text) - Only shown if NOT DSA */}
                            {campaign.is_dsa === false && (
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
                            )}

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
                                    }}>
                                        {campaign.general_notes ? (
                                            <div dangerouslySetInnerHTML={{ __html: sanitizeNoteHtml(campaign.general_notes) }} />
                                        ) : (
                                            'Add internal observations...'
                                        )}
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
                                        color: 'var(--text-dim)'
                                    }}>
                                        <div dangerouslySetInnerHTML={{ __html: sanitizeNoteHtml(platform.metadata) }} />
                                    </div>
                                </div>
                            )}
                        </SurfaceCard>
                    </div>

                    {/* Audit Log Column (Center) */}
                    <div style={{ gridColumn: 'span 4' }}>
                        <SurfaceCard style={SIDE_PANEL_CARD_STYLE}>
                            <SectionHeader
                                style={{ marginBottom: '1.5rem' }}
                                title={<span className="hero-section-title" style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Auto Log</span>}
                                subtitle="Recent system-detected changes"
                                titleStyle={{ marginBottom: 0 }}
                                eyebrow={
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', color: 'hsl(var(--primary))' }}>
                                        <span style={{ ...SECTION_ICON_STYLE, background: 'var(--accent-glow)' }}>
                                            <History size={20} />
                                        </span>
                                    </span>
                                }
                            />
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                {campaignId && <CampaignHistory campaignId={campaignId} />}
                            </div>
                        </SurfaceCard>
                    </div>

                    {/* Reminders Column (Right) */}
                    <div style={{ gridColumn: 'span 3' }}>
                        <SurfaceCard style={SIDE_PANEL_CARD_STYLE}>
                            <SectionHeader
                                style={{ marginBottom: '1.5rem' }}
                                title={<span className="hero-section-title" style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Active Checkpoints</span>}
                                subtitle="Performance monitors & actions"
                                titleStyle={{ marginBottom: 0 }}
                                eyebrow={
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', color: 'hsl(var(--primary))' }}>
                                        <span style={{ ...SECTION_ICON_STYLE, background: 'hsla(var(--primary) / 0.1)' }}>
                                            <Bell size={20} />
                                        </span>
                                    </span>
                                }
                                actions={
                                    <SafeButton
                                        onClick={() => setIsReminderModalOpen(true)}
                                        className="hero-btn-ghost"
                                        style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
                                    >
                                        <Plus size={18} />
                                    </SafeButton>
                                }
                            />
                            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem' }}>
                                {campaignId && <CampaignReminders campaignId={campaignId} compact={true} />}
                            </div>

                            <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                                <SafeButton
                                    className="hero-btn hero-btn-secondary"
                                    style={{ width: '100%', justifyContent: 'center', gap: '0.75rem', padding: '0.85rem', fontSize: '0.85rem' }}
                                >
                                    <ExternalLink size={16} />
                                    Access Platform Manager
                                </SafeButton>
                            </div>
                        </SurfaceCard>
                    </div>
                </div>
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
