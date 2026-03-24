import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Key, History, CheckCircle2, FileText } from 'lucide-react';
import { Campaign, CampaignPlatform, CampaignChange } from '../../types/campaign';
import { pb } from '../../lib/pocketbase';
import { formatDate } from '../../lib/utils';
import { htmlToPlainText } from '../../lib/noteHtml';
import MetadataModal from './MetadataModal';

type ReminderState = 'none' | 'upcoming' | 'today' | 'overdue';
type ViewMode = 'comfortable' | 'compact' | 'alert';
type FreshnessState = 'fresh' | 'watch' | 'stale';
type CampaignPriority = 'low' | 'medium' | 'high' | 'critical';

const hexToRgba = (input: string | undefined, alpha: number) => {
    if (!input) return `rgba(59, 130, 246, ${alpha})`;
    const normalized = input.trim();

    if (normalized.startsWith('#')) {
        const hex = normalized.slice(1);
        const safeHex = hex.length === 3
            ? hex.split('').map((char) => char + char).join('')
            : hex;
        if (safeHex.length === 6) {
            const int = Number.parseInt(safeHex, 16);
            const r = (int >> 16) & 255;
            const g = (int >> 8) & 255;
            const b = int & 255;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
    }

    return normalized;
};

const getLocalDateInputValue = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

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
        badgeBackground: 'var(--accent-glow)',
        badgeBorder: 'hsla(var(--primary) / 0.15)',
        alertColor: 'hsl(var(--primary))',
    },
    upcoming: {
        cardBackground: 'hsla(var(--primary) / 0.05)',
        cardBorder: 'hsla(var(--primary) / 0.25)',
        badgeColor: 'hsl(var(--primary))',
        badgeBackground: 'var(--accent-glow-strong)',
        badgeBorder: 'hsla(var(--primary) / 0.3)',
        alertColor: 'hsl(var(--primary))',
    },
    today: {
        cardBackground: 'hsla(38 95% 55% / 0.1)',
        cardBorder: 'hsla(38 95% 55% / 0.4)',
        badgeColor: 'hsl(38 95% 35%)',
        badgeBackground: 'rgba(245, 158, 11, 0.15)',
        badgeBorder: 'rgba(245, 158, 11, 0.3)',
        alertColor: 'hsl(38 95% 40%)',
    },
    overdue: {
        cardBackground: 'hsla(3 85% 58% / 0.1)',
        cardBorder: 'hsla(3 85% 58% / 0.45)',
        badgeColor: '#ef4444',
        badgeBackground: 'rgba(239, 68, 68, 0.12)',
        badgeBorder: 'rgba(239, 68, 68, 0.25)',
        alertColor: '#ef4444',
    },
};

const PRIORITY_ACCENTS: Record<CampaignPriority, {
    orb: string;
    rail: string;
    glow: string;
}> = {
    low: {
        orb: 'linear-gradient(135deg, #86efac 0%, #22c55e 100%)',
        rail: 'linear-gradient(90deg, rgba(134, 239, 172, 0.95) 0%, rgba(34, 197, 94, 0.55) 100%)',
        glow: 'rgba(34, 197, 94, 0.28)',
    },
    medium: {
        orb: 'linear-gradient(135deg, #fde68a 0%, #f59e0b 100%)',
        rail: 'linear-gradient(90deg, rgba(253, 230, 138, 0.96) 0%, rgba(245, 158, 11, 0.58) 100%)',
        glow: 'rgba(245, 158, 11, 0.28)',
    },
    high: {
        orb: 'linear-gradient(135deg, #fb7185 0%, #ef4444 100%)',
        rail: 'linear-gradient(90deg, rgba(251, 113, 133, 0.96) 0%, rgba(239, 68, 68, 0.58) 100%)',
        glow: 'rgba(239, 68, 68, 0.3)',
    },
    critical: {
        orb: 'linear-gradient(135deg, #f472b6 0%, #a855f7 100%)',
        rail: 'linear-gradient(90deg, rgba(244, 114, 182, 0.98) 0%, rgba(168, 85, 247, 0.62) 100%)',
        glow: 'rgba(168, 85, 247, 0.34)',
    },
};

interface CampaignCardProps {
    campaign: Campaign;
    platform?: CampaignPlatform;
    hasPendingReminders?: boolean;
    highestPriority?: 'low' | 'medium' | 'high' | 'critical';
    reminderState?: ReminderState;
    freshnessState?: FreshnessState;
    hasReviewed?: boolean;
    reviewStatusLabel?: string;
    viewMode?: ViewMode;
    onEdit?: (id: string) => void;
    specialReminderSignals?: string[];
}

export default function CampaignCard({
    campaign,
    platform,
    reminderState = 'none',
    freshnessState = 'watch',
    reviewStatusLabel,
    viewMode = 'comfortable',
    onEdit,
    specialReminderSignals = [],
}: CampaignCardProps) {
    const queryClient = useQueryClient();
    const [showCPCTooltip, setShowCPCTooltip] = React.useState(false);
    const [isMetadataModalOpen, setIsMetadataModalOpen] = React.useState(false);

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

    const markReviewedMutation = useMutation({
        mutationFn: async () => {
            return await pb.collection('campaigns').update(campaign.id, {
                last_reviewed_date: getLocalDateInputValue(),
                last_review_outcome: 'no_change',
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            queryClient.invalidateQueries({ queryKey: ['campaign', campaign.id] });
        },
    });





    const compactView = viewMode === 'compact' || viewMode === 'alert';
    const notesPreview = htmlToPlainText(campaign.general_notes || '');
    const reminderStyle = REMINDER_STYLES[reminderState];
    const freshnessStyle: Record<FreshnessState, { label: string; color: string; bg: string; border: string }> = {
        fresh: {
            label: 'Fresh',
            color: 'hsl(142 72% 32%)',
            bg: 'hsla(142 72% 45% / 0.14)',
            border: 'hsla(142 72% 40% / 0.34)',
        },
        watch: {
            label: 'Watch',
            color: 'hsl(38 95% 35%)',
            bg: 'hsla(38 95% 55% / 0.18)',
            border: 'hsla(38 95% 45% / 0.34)',
        },
        stale: {
            label: 'Stale',
            color: 'hsl(3 85% 38%)',
            bg: 'hsla(3 85% 58% / 0.2)',
            border: 'hsla(3 85% 48% / 0.38)',
        },
    };

    const isPaused = campaign.status === 'paused';
    const platformAccent = platform?.color || 'hsl(var(--primary))';
    const hasSpecialTrackingReminder = specialReminderSignals.length > 0;
    const specialReminderTitle = `Tracking reminder: ${specialReminderSignals.join(', ')}`;
    const priorityAccent = campaign.priority && campaign.priority !== 'normal'
        ? PRIORITY_ACCENTS[campaign.priority as CampaignPriority] || PRIORITY_ACCENTS.medium
        : null;
    const cardSurface = [
        `radial-gradient(circle at top right, ${hexToRgba(platform?.color, reminderState === 'none' ? 0.08 : 0.16)} 0%, transparent 38%)`,
        `radial-gradient(circle at bottom left, ${hexToRgba(platform?.color, 0.06)} 0%, transparent 46%)`,
        reminderState === 'none'
            ? 'linear-gradient(180deg, var(--bg-content) 0%, color-mix(in srgb, var(--bg-content) 88%, var(--bg-main) 12%) 100%)'
            : `linear-gradient(180deg, ${reminderStyle.cardBackground} 0%, color-mix(in srgb, ${reminderStyle.cardBackground} 86%, var(--bg-content) 14%) 100%)`,
    ].join(', ');

    return (
        <div
            className={`animate-fade hero-card ${isPaused ? 'paused-campaign' : ''}`}
            style={{
                position: 'relative',
                transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                padding: compactView ? '0.75rem' : '1.25rem',
                background: cardSurface,
                border: `1px solid ${reminderStyle.cardBorder}`,
                boxShadow: `0 18px 36px -28px ${hexToRgba(platform?.color, 0.35)}`,
                filter: isPaused ? 'grayscale(0.9) opacity(0.7)' : 'none',
                ...(reminderState !== 'none' && { boxShadow: 'var(--shadow-glass)' })
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-medium)';
                e.currentTarget.style.borderColor = 'hsla(var(--primary) / 0.25)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = reminderState !== 'none' ? 'var(--shadow-glass)' : 'var(--shadow-subtle)';
                e.currentTarget.style.borderColor = reminderStyle.cardBorder;
            }}
        >
            {priorityAccent && (
                <div
                    title={`${campaign.priority} priority`}
                    style={{
                        position: 'absolute',
                        top: '-1px',
                        left: '-1px',
                        width: compactView ? '42px' : '52px',
                        height: compactView ? '42px' : '52px',
                        pointerEvents: 'none',
                        zIndex: 2,
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: compactView ? '30px' : '38px',
                            height: compactView ? '4px' : '5px',
                            borderRadius: '999px',
                            background: priorityAccent.rail,
                            boxShadow: `0 0 18px ${priorityAccent.glow}`,
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: compactView ? '4px' : '5px',
                            height: compactView ? '30px' : '38px',
                            borderRadius: '999px',
                            background: priorityAccent.rail,
                            boxShadow: `0 0 18px ${priorityAccent.glow}`,
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            top: compactView ? '8px' : '9px',
                            left: compactView ? '8px' : '9px',
                            width: compactView ? '9px' : '11px',
                            height: compactView ? '9px' : '11px',
                            borderRadius: '999px',
                            background: priorityAccent.orb,
                            boxShadow: `0 0 0 3px color-mix(in srgb, ${priorityAccent.glow} 45%, transparent), 0 8px 18px -8px ${priorityAccent.glow}`,
                        }}
                    />
                </div>
            )}

            {hasSpecialTrackingReminder && (
                <div
                    title={specialReminderTitle}
                    style={{
                        position: 'absolute',
                        right: '-1px',
                        bottom: '-1px',
                        height: compactView ? '9px' : '11px',
                        width: compactView ? '68px' : '88px',
                        borderRadius: '999px 0 0 0',
                        background: [
                            'repeating-linear-gradient(135deg, #ff5b00 0 10px, #f59e0b 10px 20px, #22c55e 20px 30px, #06b6d4 30px 40px, #3b82f6 40px 50px, #8b5cf6 50px 60px, #ec4899 60px 70px)',
                            'linear-gradient(90deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 100%)',
                        ].join(', '),
                        border: '1px solid rgba(255,255,255,0.16)',
                        borderRight: 'none',
                        borderBottom: 'none',
                        boxShadow: '0 0 0 1px rgba(15,23,42,0.08), 0 10px 22px -12px rgba(59, 130, 246, 0.45), 0 0 18px rgba(236, 72, 153, 0.18)',
                    }}
                />
            )}

            <div
                onClick={() => {
                    if (onEdit) {
                        onEdit(campaign.id);
                    }
                }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
                {/* Header: Name & Minimalist Metrics */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: compactView ? '0.5rem' : '0.75rem', gap: compactView ? '0.45rem' : '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0, position: 'relative' }}>
                        <h3
                            title={campaign.name}
                            style={{
                                fontSize: compactView ? '0.8rem' : '0.95rem',
                                fontWeight: 800,
                                color: platformAccent,
                                margin: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1,
                            }}
                        >
                            {campaign.name}
                        </h3>

                        {campaign.is_dsa === false && (
                            <Key size={compactView ? 11 : 12} style={{ color: '#facc15', flexShrink: 0 }} />
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: compactView ? '0.4rem' : '0.6rem', flexShrink: 0, position: 'relative' }}>
                        {/* Compact Metric: CPC only */}
                        <div
                            onMouseEnter={() => setShowCPCTooltip(true)}
                            onMouseLeave={() => setShowCPCTooltip(false)}
                            style={{
                                fontSize: compactView ? '0.68rem' : '0.75rem',
                                fontWeight: 800,
                                color: platformAccent,
                                background: 'var(--bg-overlay)',
                                padding: compactView ? '0.12rem 0.32rem' : '0.16rem 0.42rem',
                                borderRadius: '5px',
                                border: '1px solid var(--border-subtle)',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <span>{campaign.cpc?.toFixed(0) || '0'}</span>
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

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMetadataModalOpen(true);
                            }}
                            className="hero-btn-ghost"
                            style={{ padding: compactView ? '0.15rem' : '0.2rem', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title={htmlToPlainText(campaign.metadata || '').trim().length > 0 ? "View/Edit Metadata" : "Add Metadata"}
                        >
                            <FileText size={compactView ? 12 : 13} style={{
                                opacity: htmlToPlainText(campaign.metadata || '').trim().length > 0 ? 1 : 0.4,
                                color: htmlToPlainText(campaign.metadata || '').trim().length > 0 ? 'hsl(var(--primary))' : 'inherit'
                            }} />
                        </button>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                markReviewedMutation.mutate();
                            }}
                            disabled={markReviewedMutation.isPending}
                            className="hero-btn-ghost"
                            style={{
                                padding: compactView ? '0.15rem' : '0.2rem',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: markReviewedMutation.isPending ? 0.55 : 0.9,
                            }}
                            title="Mark reviewed (no change)"
                        >
                            <CheckCircle2 size={compactView ? 12 : 13} style={{ opacity: 1, color: '#22c55e' }} />
                        </button>
                    </div>
                </div>

                <div style={{ marginBottom: compactView ? '0.35rem' : '0.55rem', borderBottom: '1px solid var(--border-subtle)' }} />

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.4rem',
                        marginBottom: compactView ? '0.45rem' : '0.65rem',
                        minHeight: compactView ? '18px' : '20px',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0, overflow: 'hidden' }}>
                        {reminderState !== 'none' && (
                            <span
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: compactView ? '0.06rem 0.28rem' : '0.1rem 0.35rem',
                                    borderRadius: '999px',
                                    fontSize: compactView ? '0.54rem' : '0.6rem',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.03em',
                                    color: reminderStyle.badgeColor,
                                    background: reminderStyle.badgeBackground,
                                    border: `1px solid ${reminderStyle.badgeBorder}`,
                                    flexShrink: 0,
                                }}
                                title={reminderState === 'overdue' ? 'Overdue reminder' : reminderState === 'today' ? 'Due today' : 'Upcoming reminder'}
                            >
                                {reminderState === 'overdue' ? 'Overdue' : reminderState === 'today' ? 'Today' : 'Soon'}
                            </span>
                        )}
                        <History size={compactView ? 10 : 11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <span
                            style={{
                                fontSize: compactView ? '0.58rem' : '0.65rem',
                                color: 'var(--text-dim)',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                            title={reviewStatusLabel || 'No review data'}
                        >
                            {reviewStatusLabel || 'No review data'}
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                        {isPaused && (
                            <span
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: compactView ? '0.06rem 0.28rem' : '0.1rem 0.35rem',
                                    borderRadius: '4px',
                                    fontSize: compactView ? '0.54rem' : '0.6rem',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.03em',
                                    color: 'var(--text-muted)',
                                    background: 'var(--bg-overlay)',
                                    border: '1px solid var(--border-subtle)',
                                }}
                            >
                                Paused
                            </span>
                        )}
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: compactView ? '0.06rem 0.28rem' : '0.1rem 0.35rem',
                                borderRadius: '999px',
                                fontSize: compactView ? '0.54rem' : '0.6rem',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.03em',
                                color: freshnessStyle[freshnessState].color,
                                background: freshnessStyle[freshnessState].bg,
                                border: `1px solid ${freshnessStyle[freshnessState].border}`,
                            }}
                        >
                            {freshnessStyle[freshnessState].label}
                        </span>
                    </div>
                </div>

                {/* Fixed-Height Notes Section */}
                <div
                    title={notesPreview || 'No notes available'}
                    style={{
                        padding: compactView ? '0.45rem 0.55rem' : '0.6rem 0.75rem',
                        background: `linear-gradient(180deg, ${hexToRgba(platform?.color, 0.06)} 0%, var(--bg-overlay) 100%)`,
                        borderRadius: '0.8rem',
                        border: `1px solid ${hexToRgba(platform?.color, 0.12)}`,
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
                    {notesPreview || 'Define optimization notes...'}
                </div>
            </div>

            {isMetadataModalOpen && (
                <MetadataModal
                    isOpen={isMetadataModalOpen}
                    onClose={() => setIsMetadataModalOpen(false)}
                    campaignId={campaign.id}
                    campaignName={campaign.name}
                    initialContent={campaign.metadata || ''}
                />
            )}
        </div>
    );
}
