import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Edit, Eye, Bell, Calendar, DollarSign, TrendingUp } from 'lucide-react';
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return '#4ade80';
            case 'paused':
                return '#fbbf24';
            case 'testing':
                return '#60a5fa';
            case 'archived':
                return '#9ca3af';
            default:
                return '#6b7280';
        }
    };



    return (
        <div
            className="animate-fade"
            style={{
                background: 'var(--glass)',
                backdropFilter: 'blur(12px)',
                borderRadius: '16px',
                padding: '1.5rem',
                border: '1px solid var(--glass-border)',
                position: 'relative',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-md)',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg), var(--blue-glow)';
                e.currentTarget.style.borderColor = 'hsla(var(--primary) / 0.3)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                e.currentTarget.style.borderColor = 'var(--glass-border)';
            }}
        >
            <div onClick={() => navigate(`/camp-tracking/campaign/${campaign.id}`)}>
                {/* Header - Platform Badge & Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    {platform && (
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.25rem 0.75rem',
                                background: `${platform.color}20`,
                                border: `1px solid ${platform.color}`,
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                            }}
                        >
                            <div
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: platform.color,
                                }}
                            />
                            {platform.display_name}
                        </div>
                    )}

                    {/* Actions Dropdown */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowActions(!showActions);
                            }}
                            style={{
                                background: 'var(--accent-glow)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '6px',
                                padding: '0.25rem',
                                cursor: 'pointer',
                                color: 'var(--text-main)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <MoreVertical size={16} />
                        </button>

                        {showActions && (
                            <div
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: '100%',
                                    marginTop: '0.5rem',
                                    background: 'var(--dropdown-bg)',
                                    backdropFilter: 'blur(16px)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '10px',
                                    boxShadow: 'var(--shadow-lg)',
                                    minWidth: '180px',
                                    zIndex: 10,
                                    overflow: 'hidden',
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.75rem 1rem',
                                        color: 'var(--text-main)',
                                        fontSize: '0.875rem',
                                        borderBottom: '1px solid var(--border-color)',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => navigate(`/camp-tracking/campaign/${campaign.id}`)}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--dropdown-hover)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <Eye size={16} color="var(--accent)" />
                                    View Details
                                </div>

                                <button
                                    onClick={() => {
                                        onEdit?.(campaign.id);
                                        setShowActions(false);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.75rem 1rem',
                                        color: 'var(--text-main)',
                                        background: 'transparent',
                                        border: 'none',
                                        width: '100%',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        borderBottom: '1px solid var(--border-color)',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--dropdown-hover)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <Edit size={16} color="var(--accent)" />
                                    Edit Campaign
                                </button>

                                <button
                                    onClick={() => {
                                        setIsReminderModalOpen(true);
                                        setShowActions(false);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.75rem 1rem',
                                        color: 'var(--text-main)',
                                        background: 'transparent',
                                        border: 'none',
                                        width: '100%',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--dropdown-hover)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <Bell size={16} color="var(--accent)" />
                                    Add Reminder
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Campaign Name */}
                <h3
                    style={{
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        marginBottom: '0.5rem',
                        color: 'var(--text-main)',
                    }}
                >
                    {campaign.name}
                </h3>

                {/* Status & Badges */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span
                        style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.75rem',
                            background: getStatusColor(campaign.status),
                            color: '#fff',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                        }}
                    >
                        {campaign.status}
                    </span>
                    {hasPendingReminders && (
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.25rem 0.5rem',
                                background: highestPriority === 'high' ? '#ef444420' : highestPriority === 'medium' ? '#f59e0b20' : '#3b82f620',
                                color: highestPriority === 'high' ? '#ef4444' : highestPriority === 'medium' ? '#f59e0b' : '#3b82f6',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                            }}
                        >
                            <Bell size={12} />
                            {highestPriority === 'high' ? 'High Priority' : highestPriority === 'medium' ? 'Pending' : 'Reminder'}
                        </span>
                    )}

                    {hasRecentChanges && (
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.25rem 0.5rem',
                                background: '#fbbf2420',
                                color: '#fbbf24',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                            }}
                        >
                            📝 Recently Changed
                        </span>
                    )}
                </div>

                {/* Metrics Grid */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '0.75rem',
                        marginBottom: '1rem',
                    }}
                >
                    {campaign.cpc !== null && campaign.cpc !== undefined && (
                        <div
                            style={{
                                background: 'hsla(var(--primary) / 0.05)',
                                padding: '1rem',
                                borderRadius: '12px',
                                border: '1px solid hsla(var(--primary) / 0.1)',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <DollarSign size={14} color="hsl(var(--primary))" />
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>CPC</span>
                            </div>
                            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                ${campaign.cpc.toFixed(2)}
                            </div>
                        </div>
                    )}

                    {campaign.max_daily_budget !== null && campaign.max_daily_budget !== undefined && (
                        <div
                            style={{
                                background: 'rgba(255, 255, 255, 0.02)',
                                padding: '1rem',
                                borderRadius: '12px',
                                border: '1px solid var(--glass-border)',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <TrendingUp size={14} color="var(--text-dim)" />
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Daily Budget</span>
                            </div>
                            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                ${campaign.max_daily_budget.toFixed(0)}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer - created date */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: 'var(--text-dim)',
                        fontSize: '0.75rem',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid var(--border-color)',
                    }}
                >
                    <Calendar size={12} />
                    Created {formatDate(campaign.created_date)}
                </div>
                {/* End click area wrapper */}
            </div>

            <AddReminderModal
                campaignId={campaign.id}
                isOpen={isReminderModalOpen}
                onClose={() => setIsReminderModalOpen(false)}
            />
        </div >
    );
}
