import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Edit2, Key, AlertCircle, History, BellRing, Calendar } from 'lucide-react';
import { Campaign, CampaignPlatform, CampaignChange, CampaignReminder } from '../../types/campaign';
import { pb } from '../../lib/pocketbase';
import { formatDate } from '../../lib/utils';
import AddReminderModal from './AddReminderModal';

type ReminderState = 'none' | 'upcoming' | 'today' | 'overdue';
type ViewMode = 'comfortable' | 'compact' | 'alert';

const REMINDER_STYLES: Record<ReminderState, {
    cardBackground: string;
    cardBorder: string;
    badgeColor: string;
    badgeBackground: string;
    badgeBorder: string;
    alertColor: string;
}> = {
    none: {
        cardBackground: 'var(--bg-content)',
        cardBorder: 'var(--border-subtle)',
        badgeColor: 'hsl(var(--primary))',
        badgeBackground: 'hsla(var(--primary) / 0.08)',
        badgeBorder: 'hsla(var(--primary) / 0.2)',
        alertColor: 'hsl(var(--primary))',
    },
    upcoming: {
        cardBackground: 'hsla(var(--primary) / 0.07)',
        cardBorder: 'hsla(var(--primary) / 0.3)',
        badgeColor: 'hsl(var(--primary))',
        badgeBackground: 'hsla(var(--primary) / 0.14)',
        badgeBorder: 'hsla(var(--primary) / 0.3)',
        alertColor: 'hsl(var(--primary))',
    },
    today: {
        cardBackground: 'hsla(38 95% 55% / 0.13)',
        cardBorder: 'hsla(38 95% 55% / 0.45)',
        badgeColor: 'hsl(38 95% 35%)',
        badgeBackground: 'hsla(38 95% 55% / 0.23)',
        badgeBorder: 'hsla(38 95% 45% / 0.45)',
        alertColor: 'hsl(38 95% 40%)',
    },
    overdue: {
        cardBackground: 'hsla(3 85% 58% / 0.16)',
        cardBorder: 'hsla(3 85% 58% / 0.5)',
        badgeColor: 'hsl(3 85% 38%)',
        badgeBackground: 'hsla(3 85% 58% / 0.24)',
        badgeBorder: 'hsla(3 85% 48% / 0.45)',
        alertColor: 'hsl(3 85% 42%)',
    },
};

interface CampaignCardProps {
    campaign: Campaign;
    platform?: CampaignPlatform;
    hasPendingReminders?: boolean;
    highestPriority?: 'low' | 'medium' | 'high';
    reminderState?: ReminderState;
    viewMode?: ViewMode;
    onEdit?: (id: string) => void;
}

export default function CampaignCard({
    campaign,
    platform,
    hasPendingReminders,
    highestPriority,
    reminderState = 'none',
    viewMode = 'comfortable',
    onEdit,
}: CampaignCardProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [isReminderModalOpen, setIsReminderModalOpen] = React.useState(false);
    const [showCPCTooltip, setShowCPCTooltip] = React.useState(false);
    const [showReminderTooltip, setShowReminderTooltip] = React.useState(false);

    const { data: cpcChanges = [] } = useQuery<CampaignChange[]>({
        queryKey: ['campaign-cpc-changes', campaign.id],
        queryFn: async () => {
            return await pb.collection('campaign_changes').getFullList<CampaignChange>({
                filter: `campaign = "${campaign.id}" && field_changed = "cpc"`,
                sort: '-change_date',
                limit: 3
            });
        },
    });

    const { data: latestReminder } = useQuery<CampaignReminder>({
        queryKey: ['campaign-latest-reminder', campaign.id],
        queryFn: async () => {
            const records = await pb.collection('campaign_reminders').getFullList<CampaignReminder>({
                filter: `campaign = "${campaign.id}" && status = "pending"`,
                sort: 'reminder_date', // Earliest pending first
                limit: 1
            });
            return records[0] || null;
        },
    });

    const compactView = viewMode === 'compact' || viewMode === 'alert';
    const reminderStyle = REMINDER_STYLES[reminderState];

    return (
        <div
            className="animate-fade hero-card"
            style={{
                position: 'relative',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                padding: compactView ? '0.65rem' : '1rem',
                background: reminderStyle.cardBackground,
                border: `1px solid ${reminderStyle.cardBorder}`,
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-medium)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-soft)';
            }}
        >
            <div onClick={() => navigate(`/camp-tracking/campaign/${campaign.id}`, { state: { from: location.pathname + location.search } })} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Header: Name & Minimalist Metrics */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: compactView ? '0.5rem' : '0.75rem', gap: compactView ? '0.45rem' : '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0, position: 'relative' }}>
                        <h3
                            onMouseEnter={() => setShowReminderTooltip(true)}
                            onMouseLeave={() => setShowReminderTooltip(false)}
                            style={{
                                fontSize: compactView ? '0.78rem' : '0.9rem',
                                fontWeight: 800,
                                color: platform?.color || 'var(--text-main)',
                                margin: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {campaign.name}
                        </h3>
                        {campaign.is_dsa === false && (
                            <Key size={compactView ? 11 : 12} style={{ color: 'hsl(var(--primary))', flexShrink: 0 }} />
                        )}

                        {reminderState !== 'none' && (
                            <span
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: compactView ? '0.08rem 0.3rem' : '0.12rem 0.4rem',
                                    borderRadius: '999px',
                                    fontSize: compactView ? '0.58rem' : '0.62rem',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.03em',
                                    color: reminderStyle.badgeColor,
                                    background: reminderStyle.badgeBackground,
                                    border: `1px solid ${reminderStyle.badgeBorder}`,
                                    flexShrink: 0,
                                }}
                            >
                                {reminderState === 'overdue' ? 'Overdue' : reminderState === 'today' ? 'Today' : 'Soon'}
                            </span>
                        )}

                        {/* Tooltip for Latest Reminder */}
                        {showReminderTooltip && latestReminder && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                zIndex: 1000,
                                marginTop: '0.4rem',
                                background: 'var(--bg-content)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '10px',
                                padding: '0.85rem',
                                boxShadow: 'var(--shadow-medium)',
                                minWidth: '240px',
                                pointerEvents: 'none'
                            }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.6rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <BellRing size={10} color="hsl(var(--primary))" /> Latest Checkpoint
                                </div>
                                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-main)', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                                    {latestReminder.message}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-dim)', fontSize: '0.7rem', fontWeight: 600 }}>
                                    <Calendar size={10} /> {formatDate(latestReminder.reminder_date)}
                                </div>
                                {latestReminder.check_metrics && latestReminder.check_metrics.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.6rem' }}>
                                        {latestReminder.check_metrics.map(m => (
                                            <span key={m} style={{ fontSize: '0.6rem', background: 'var(--accent-glow)', color: 'hsl(var(--primary))', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700, border: '1px solid hsla(var(--primary) / 0.1)' }}>
                                                {m}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: compactView ? '0.4rem' : '0.6rem', flexShrink: 0, position: 'relative' }}>
                        {/* Compact Metrics: CPC - Budget */}
                        <div
                            onMouseEnter={() => setShowCPCTooltip(true)}
                            onMouseLeave={() => setShowCPCTooltip(false)}
                            style={{
                                fontSize: compactView ? '0.68rem' : '0.75rem',
                                fontWeight: 800,
                                color: 'var(--text-main)',
                                background: 'var(--bg-overlay)',
                                padding: compactView ? '0.15rem 0.38rem' : '0.2rem 0.5rem',
                                borderRadius: '5px',
                                border: '1px solid var(--border-subtle)',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <span>{campaign.cpc?.toFixed(0) || '0'}</span>
                            <span style={{ margin: '0 0.3rem', color: 'var(--text-muted)', opacity: 0.5 }}>—</span>
                            <span style={{ color: platform?.color || 'hsl(var(--primary))' }}>
                                {campaign.max_daily_budget ? (campaign.max_daily_budget >= 1000 ? `${(campaign.max_daily_budget / 1000).toFixed(0)}k` : campaign.max_daily_budget) : '0'}
                            </span>
                        </div>

                        {/* Tooltip for CPC Changes (Moved to Metrics) */}
                        {showCPCTooltip && cpcChanges.length > 0 && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                zIndex: 100,
                                marginTop: '0.5rem',
                                background: 'var(--bg-content)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '8px',
                                padding: '0.75rem',
                                boxShadow: 'var(--shadow-medium)',
                                minWidth: '200px',
                                pointerEvents: 'none'
                            }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <History size={10} /> CPC Evolution
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    {cpcChanges.map(change => (
                                        <div key={change.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                                            <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>{formatDate(change.change_date)}</span>
                                            <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                                                ${change.old_value || '0'} → <span style={{ color: 'hsl(var(--primary))' }}>${change.new_value}</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {reminderState !== 'none' && (
                            <AlertCircle
                                size={compactView ? 11 : 12}
                                style={{
                                    color: reminderStyle.alertColor,
                                    opacity: reminderState === 'upcoming' ? 0.75 : 1,
                                    flexShrink: 0,
                                }}
                            />
                        )}

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onEdit) {
                                    onEdit(campaign.id);
                                } else {
                                    navigate(`/camp-tracking/edit/${campaign.id}`);
                                }
                            }}
                            className="hero-btn-ghost"
                            style={{ padding: compactView ? '0.15rem' : '0.2rem', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Edit Campaign"
                        >
                            <Edit2 size={compactView ? 12 : 13} style={{ opacity: 0.7 }} />
                        </button>
                    </div>
                </div>

                <div style={{ marginBottom: compactView ? '0.5rem' : '0.75rem', borderBottom: '1px solid var(--border-subtle)' }} />

                {/* Fixed-Height Notes Section */}
                <div
                    title={campaign.general_notes || 'No notes available'}
                    style={{
                        padding: compactView ? '0.45rem 0.55rem' : '0.6rem 0.75rem',
                        background: 'var(--bg-overlay)',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border-subtle)',
                        fontSize: compactView ? '0.68rem' : '0.75rem',
                        lineHeight: 1.4,
                        color: campaign.general_notes ? 'var(--text-main)' : 'var(--text-muted)',
                        height: compactView ? '56px' : '75px',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: compactView ? 2 : 3,
                        WebkitBoxOrient: 'vertical',
                        fontStyle: 'italic'
                    }}
                >
                    {campaign.general_notes || 'Define optimization notes...'}
                </div>
            </div>

            <AddReminderModal
                campaignId={campaign.id}
                isOpen={isReminderModalOpen}
                onClose={() => setIsReminderModalOpen(false)}
            />
        </div>
    );
}
