import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Edit, Eye, Bell, Key, AlertCircle } from 'lucide-react';
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
            <div onClick={() => navigate(`/camp-tracking/campaign/${campaign.id}`)} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', gap: '1rem' }}>
                    {platform && (
                        <div
                            style={{
                                border: `1px solid ${platform.color}30`,
                                color: platform.color,
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                                fontSize: '0.55rem',
                                fontWeight: 900,
                                textTransform: 'uppercase'
                            }}
                        >
                            {platform.display_name}
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'flex-end', minWidth: 0 }}>
                        {hasPendingReminders && (
                            <AlertCircle size={12} style={{ color: highestPriority === 'high' ? '#ef4444' : '#f59e0b', flexShrink: 0 }} />
                        )}
                        <h3
                            style={{
                                fontSize: '0.85rem',
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
                            <Key size={12} style={{ color: '#f59e0b', flexShrink: 0 }} />
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowActions(!showActions);
                            }}
                            className="hero-btn-ghost"
                            style={{ padding: '0.15rem', borderRadius: '4px' }}
                        >
                            <MoreVertical size={14} />
                        </button>
                        {showActions && (
                            <div
                                style={{
                                    position: 'absolute',
                                    right: '1rem',
                                    top: '2.5rem',
                                    background: 'var(--bg-content)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: '0.5rem',
                                    boxShadow: 'var(--shadow-medium)',
                                    minWidth: '150px',
                                    zIndex: 50,
                                    padding: '0.2rem'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button className="hero-tab" style={{ width: '100%', fontSize: '0.75rem', padding: '0.5rem' }} onClick={(e) => { e.stopPropagation(); navigate(`/camp-tracking/campaign/${campaign.id}`); }}>
                                    <Eye size={12} /> View Details
                                </button>
                                <button className="hero-tab" style={{ width: '100%', fontSize: '0.75rem', padding: '0.5rem' }} onClick={(e) => { e.stopPropagation(); onEdit?.(campaign.id); }}>
                                    <Edit size={12} /> Edit
                                </button>
                                <button className="hero-tab" style={{ width: '100%', fontSize: '0.75rem', padding: '0.5rem' }} onClick={(e) => { e.stopPropagation(); setIsReminderModalOpen(true); }}>
                                    <Bell size={12} /> Reminder
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Efficiency Bar: Metrics & Date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 700 }}>
                        <span style={{ color: 'var(--text-main)' }}>${campaign.cpc?.toFixed(0) || '0'}</span>
                        <span style={{ color: 'var(--text-dim)', opacity: 0.3 }}>—</span>
                        <span style={{ color: platform?.color || 'hsl(var(--primary))' }}>
                            ${campaign.max_daily_budget ? (campaign.max_daily_budget >= 1000 ? `${(campaign.max_daily_budget / 1000).toFixed(0)}k` : campaign.max_daily_budget) : '0'}
                        </span>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {formatDate(campaign.created_date)}
                    </div>
                </div>

                {/* Fixed-Height Notes Section */}
                <div
                    title={campaign.general_notes || 'No notes available'}
                    style={{
                        padding: '0.6rem 0.75rem',
                        background: 'var(--bg-overlay)',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.75rem',
                        lineHeight: 1.4,
                        color: campaign.general_notes ? 'var(--text-main)' : 'var(--text-muted)',
                        height: '75px',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
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
