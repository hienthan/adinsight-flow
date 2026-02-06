import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Edit, Eye, Bell, Calendar, DollarSign, TrendingUp, Key } from 'lucide-react';
import { Campaign, CampaignPlatform } from '../../types/campaign';
import { formatDate } from '../../lib/utils';
import AddReminderModal from './AddReminderModal';

interface CampaignCardProps {
    campaign: Campaign;
    platform?: CampaignPlatform;
    hasRecentChanges?: boolean;
    hasPendingReminders?: boolean;
    highestPriority?: 'low' | 'medium' | 'high';
    onEdit?: (id: string) => void;
}

export default function CampaignCard({
    campaign,
    platform,
    hasRecentChanges = false,
    hasPendingReminders,
    highestPriority,
    onEdit,
}: CampaignCardProps) {
    const navigate = useNavigate();
    const [showActions, setShowActions] = React.useState(false);
    const [isReminderModalOpen, setIsReminderModalOpen] = React.useState(false);

    return (
        <div
            className="animate-fade hero-card"
            style={{
                position: 'relative',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                padding: '1rem',
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
            <div onClick={() => navigate(`/camp-tracking/campaign/${campaign.id}`)} style={{ flex: 1 }}>
                {/* Header - Platform on Left, Name & Actions on Right */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '1rem' }}>
                    {platform && (
                        <div
                            className="hero-badge"
                            style={{
                                background: 'transparent',
                                border: `1px solid ${platform.color}40`,
                                color: platform.color,
                                padding: '0.15rem 0.4rem',
                                borderRadius: '4px',
                                height: 'fit-content',
                                flexShrink: 0
                            }}
                        >
                            <span style={{ fontWeight: 900, fontSize: '0.55rem' }}>{platform.display_name}</span>
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, justifyContent: 'flex-end', overflow: 'hidden' }}>
                        <h3
                            style={{
                                fontSize: '0.875rem',
                                fontWeight: 800,
                                lineHeight: 1.2,
                                color: 'var(--text-main)',
                                letterSpacing: '-0.01em',
                                margin: 0,
                                textAlign: 'right',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {campaign.name}
                        </h3>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                            {campaign.is_dsa === false && (
                                <div title="Non-DSA Campaign (Key Required)" style={{ color: 'var(--text-dim)', opacity: 0.7 }}>
                                    <Key size={14} />
                                </div>
                            )}
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowActions(!showActions);
                                    }}
                                    className="hero-btn-ghost"
                                    style={{ padding: '0.2rem', borderRadius: '6px' }}
                                >
                                    <MoreVertical size={14} />
                                </button>
                                {showActions && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            right: 0,
                                            top: '110%',
                                            background: 'var(--bg-content)',
                                            border: '1px solid var(--border-subtle)',
                                            borderRadius: '0.65rem',
                                            boxShadow: 'var(--shadow-medium)',
                                            minWidth: '160px',
                                            zIndex: 20,
                                            padding: '0.25rem'
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button
                                            className="hero-tab"
                                            style={{ width: '100%', justifyContent: 'flex-start', padding: '0.5rem' }}
                                            onClick={() => navigate(`/camp-tracking/campaign/${campaign.id}`)}
                                        >
                                            <Eye size={14} /> View Details
                                        </button>
                                        <button
                                            className="hero-tab"
                                            style={{ width: '100%', justifyContent: 'flex-start', padding: '0.5rem' }}
                                            onClick={() => { onEdit?.(campaign.id); setShowActions(false); }}
                                        >
                                            <Edit size={14} /> Edit Campaign
                                        </button>
                                        <button
                                            className="hero-tab"
                                            style={{ width: '100%', justifyContent: 'flex-start', padding: '0.5rem' }}
                                            onClick={() => { setIsReminderModalOpen(true); setShowActions(false); }}
                                        >
                                            <Bell size={14} /> Add Reminder
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Badges */}
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    {hasPendingReminders && (
                        <span
                            className="hero-badge"
                            style={{
                                background: highestPriority === 'high' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                                color: highestPriority === 'high' ? '#ef4444' : '#f59e0b',
                                gap: '0.3rem',
                                textTransform: 'none',
                                fontWeight: 700
                            }}
                        >
                            <Bell size={10} fill="currentColor" />
                            {highestPriority === 'high' ? 'Urgent' : 'Reminders'}
                        </span>
                    )}

                    {hasRecentChanges && (
                        <span
                            className="hero-badge"
                            style={{
                                background: 'var(--accent-glow)',
                                color: 'hsl(var(--primary))',
                                fontWeight: 800,
                                textTransform: 'none'
                            }}
                        >
                            Recent Audit
                        </span>
                    )}
                </div>

                {/* Metrics Grid */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '0.6rem',
                        marginBottom: '1rem',
                    }}
                >
                    <div style={{ background: 'hsla(var(--primary) / 0.04)', padding: '0.5rem 0.75rem', borderRadius: '0.75rem', border: '1px solid hsla(var(--primary) / 0.08)' }}>
                        <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <DollarSign size={10} /> CPC
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            ${campaign.cpc?.toFixed(2) || '0.00'}
                        </div>
                    </div>

                    <div style={{ background: 'var(--bg-overlay)', padding: '0.5rem 0.75rem', borderRadius: '0.75rem', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <TrendingUp size={10} /> Daily
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            ${campaign.max_daily_budget?.toFixed(0) || '0'}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        color: 'var(--text-muted)',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        paddingTop: '0.75rem',
                        borderTop: '1px solid var(--border-subtle)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar size={12} />
                        {formatDate(campaign.created_date)}
                    </div>
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
