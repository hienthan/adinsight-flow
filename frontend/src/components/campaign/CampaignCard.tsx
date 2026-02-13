import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Key, History, CheckCircle2 } from 'lucide-react';
import { Campaign, CampaignPlatform, CampaignChange } from '../../types/campaign';
import { pb } from '../../lib/pocketbase';
import { formatDate } from '../../lib/utils';
import { htmlToPlainText } from '../../lib/noteHtml';

type ReminderState = 'none' | 'upcoming' | 'today' | 'overdue';
type ViewMode = 'comfortable' | 'compact' | 'alert';
type FreshnessState = 'fresh' | 'watch' | 'stale';

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
    freshnessState?: FreshnessState;
    hasReviewed?: boolean;
    reviewStatusLabel?: string;
    viewMode?: ViewMode;
    onEdit?: (id: string) => void;
}

export default function CampaignCard({
    campaign,
    platform,
    reminderState = 'none',
    freshnessState = 'watch',
    reviewStatusLabel,
    viewMode = 'comfortable',
    onEdit,
}: CampaignCardProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const [showCPCTooltip, setShowCPCTooltip] = React.useState(false);

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
            <div
                onClick={() => {
                    if (onEdit) {
                        onEdit(campaign.id);
                        return;
                    }
                    navigate(`/camp-tracking/campaign/${campaign.id}`, { state: { from: location.pathname + location.search } });
                }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
                {/* Header: Name & Minimalist Metrics */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: compactView ? '0.5rem' : '0.75rem', gap: compactView ? '0.45rem' : '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0, position: 'relative' }}>
                        <h3
                            title={campaign.name}
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
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: compactView ? '0.4rem' : '0.6rem', flexShrink: 0, position: 'relative' }}>
                        {/* Compact Metric: CPC only */}
                        <div
                            onMouseEnter={() => setShowCPCTooltip(true)}
                            onMouseLeave={() => setShowCPCTooltip(false)}
                            style={{
                                fontSize: compactView ? '0.68rem' : '0.75rem',
                                fontWeight: 800,
                                color: platform?.color || 'hsl(var(--primary))',
                                background: 'var(--bg-overlay)',
                                padding: compactView ? '0.15rem 0.38rem' : '0.2rem 0.5rem',
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
                            <CheckCircle2 size={compactView ? 12 : 13} style={{ opacity: 0.85 }} />
                        </button>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/camp-tracking/campaign/${campaign.id}`, { state: { from: location.pathname + location.search } });
                            }}
                            className="hero-btn-ghost"
                            style={{ padding: compactView ? '0.15rem' : '0.2rem', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Open campaign detail"
                        >
                            <Edit2 size={compactView ? 12 : 13} style={{ opacity: 0.7 }} />
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
                    {notesPreview || 'Define optimization notes...'}
                </div>
            </div>
        </div>
    );
}
