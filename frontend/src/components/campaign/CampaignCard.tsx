import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Key, History, Briefcase } from 'lucide-react';
import { Campaign, CampaignPlatform, CampaignChange } from '../../types/campaign';
import { pb } from '../../lib/pocketbase';
import { formatDate } from '../../lib/utils';
import { htmlToPlainText } from '../../lib/noteHtml';
import { extractBaseColor, toAlphaColor } from '../common/ui/premium';

type ReminderState = 'none' | 'upcoming' | 'today' | 'overdue';
type ViewMode = 'comfortable' | 'compact' | 'alert';
type CampaignPriority = 'low' | 'medium' | 'high' | 'critical';

const hexToRgba = (input: string | undefined, alpha: number) => toAlphaColor(input, alpha);



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

const PRIORITY_TITLE_STYLES: Record<CampaignPriority, {
    textColor: string;
    background: string;
    border: string;
    borderLeft: string;
    boxShadow?: string;
}> = {
    critical: {
        // Critical Priority: Fuchsia / Purple
        textColor: '#7e22ce',
        background: 'linear-gradient(90deg, rgba(217, 70, 239, 0.12) 0%, rgba(217, 70, 239, 0.04) 100%)',
        border: '1px solid rgba(217, 70, 239, 0.32)',
        borderLeft: '3px solid #d946ef',
        boxShadow: '0 1px 3px rgba(217, 70, 239, 0.1)',
    },
    high: {
        // High Priority: Red
        textColor: '#b91c1c',
        background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.04) 100%)',
        border: '1px solid rgba(239, 68, 68, 0.28)',
        borderLeft: '3px solid #dc2626',
        boxShadow: '0 1px 3px rgba(239, 68, 68, 0.08)',
    },
    medium: {
        // Medium Priority: Amber
        textColor: '#b45309',
        background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.04) 100%)',
        border: '1px solid rgba(245, 158, 11, 0.28)',
        borderLeft: '3px solid #f59e0b',
        boxShadow: '0 1px 3px rgba(245, 158, 11, 0.08)',
    },
    low: {
        // Low Priority: Emerald
        textColor: '#047857',
        background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.03) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderLeft: '3px solid #10b981',
        boxShadow: '0 1px 3px rgba(16, 185, 129, 0.08)',
    },
};

interface CampaignCardProps {
    campaign: Campaign;
    platform?: CampaignPlatform;
    hasPendingReminders?: boolean;
    highestPriority?: 'low' | 'medium' | 'high' | 'critical';
    reminderState?: ReminderState;
    hasReviewed?: boolean;
    reviewStatusLabel?: string;
    viewMode?: ViewMode;
    onEdit?: (id: string) => void;
    specialReminderSignals?: string[];
    isSelected?: boolean;
    onToggleSelect?: () => void;
}

export default function CampaignCard({
    campaign,
    platform,
    reminderState = 'none',
    viewMode = 'comfortable',
    onEdit,
    specialReminderSignals = [],
    isSelected = false,
    onToggleSelect,
}: CampaignCardProps) {
    const [showCPCTooltip, setShowCPCTooltip] = React.useState(false);

    const activeTargetField = React.useMemo(() => {
        const strategy = campaign.bidding_strategy;
        if (strategy === 'target_cpa') return 'target_cpa';
        if (strategy === 'target_roas') return 'target_roas';
        return 'cpc';
    }, [campaign.bidding_strategy]);

    const { data: targetChanges = [] } = useQuery<CampaignChange[]>({
        queryKey: ['campaign-target-changes', campaign.id, activeTargetField],
        queryFn: async () => {
            if (!campaign.id) return [];
            return await pb.collection('campaign_changes').getFullList<CampaignChange>({
                filter: `campaign = "${campaign.id}" && field_changed = "${activeTargetField}"`,
                sort: '-change_date',
                limit: 3
            });
        },
    });

    const targetInfo = React.useMemo(() => {
        const strategy = campaign.bidding_strategy;
        const prefix = campaign.is_portfolio ? 'Portfolio ' : '';
        if (strategy === 'target_roas') {
            return {
                label: 'ROAS',
                value: `${campaign.target_roas || 0}%`,
                tooltipTitle: `${prefix}ROAS Evolution`,
                formatValue: (val: any) => `${val || 0}%`
            };
        }
        if (strategy === 'target_cpa') {
            return {
                label: 'tCPA',
                value: `${campaign.target_cpa || 0}`,
                tooltipTitle: `${prefix}tCPA Evolution`,
                formatValue: (val: any) => `${val || 0}`
            };
        }
        if (strategy === 'max_conversions') {
            return {
                label: 'Max Conv',
                value: 'Max Conv',
                tooltipTitle: `${prefix}Strategy: Max Conversions`,
                formatValue: (val: any) => val || 'Max Conv'
            };
        }
        if (strategy === 'max_conversion_value') {
            return {
                label: 'Max Value',
                value: 'Max Value',
                tooltipTitle: `${prefix}Strategy: Max Conv Value`,
                formatValue: (val: any) => val || 'Max Value'
            };
        }
        return {
            label: 'CPC',
            value: campaign.cpc ? `${campaign.cpc.toFixed(0)}` : '0',
            tooltipTitle: `${prefix}CPC Evolution`,
            formatValue: (val: any) => val ? `${Number(val).toFixed(0)}` : '0'
        };
    }, [campaign.bidding_strategy, campaign.target_roas, campaign.target_cpa, campaign.cpc, campaign.is_portfolio]);

    const budgetFormatted = React.useMemo(() => {
        if (campaign.max_daily_budget === undefined || campaign.max_daily_budget === null) return '0';
        return `${campaign.max_daily_budget.toLocaleString()}`;
    }, [campaign.max_daily_budget]);

    const latestUpdateFormatted = React.useMemo(() => {
        const dates: number[] = [];
        if (campaign.last_reviewed_date) {
            const t = new Date(campaign.last_reviewed_date).getTime();
            if (!isNaN(t)) dates.push(t);
        }
        if (targetChanges.length > 0 && targetChanges[0].change_date) {
            const t = new Date(targetChanges[0].change_date).getTime();
            if (!isNaN(t)) dates.push(t);
        }
        if (campaign.updated) {
            const t = new Date(campaign.updated).getTime();
            if (!isNaN(t)) dates.push(t);
        }
        if (dates.length === 0 && campaign.created_date) {
            const t = new Date(campaign.created_date).getTime();
            if (!isNaN(t)) dates.push(t);
        }
        if (dates.length === 0 && campaign.created) {
            const t = new Date(campaign.created).getTime();
            if (!isNaN(t)) dates.push(t);
        }
        if (dates.length === 0) return '';
        const latest = new Date(Math.max(...dates));
        return latest.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }, [campaign.last_reviewed_date, campaign.updated, campaign.created_date, campaign.created, targetChanges]);

    const biddingStrategyName = React.useMemo(() => {
        const strategy = campaign.bidding_strategy;
        if (strategy === 'target_cpa') return 'tCPA';
        if (strategy === 'target_roas') return 'tROAS';
        if (strategy === 'manual_cpc') return 'mCPC';
        if (strategy === 'max_conversions') return 'Max Conv';
        if (strategy === 'max_conversion_value') return 'Max Value';
        return 'CPC';
    }, [campaign.bidding_strategy]);

    const leadStyle = React.useMemo(() => {
        const platName = platform?.platform_name?.toLowerCase();
        const isLeadsSupported = platName === 'tripdirect' || platName === 'huytrip';
        // Only TripDirect, Huy-Trip or campaigns that explicitly have a lead specified
        if (!isLeadsSupported && (!campaign.leads || campaign.leads === 'all')) {
            return null;
        }

        const lead = (campaign.leads || 'all').toLowerCase();

        const config: Record<string, { label: string; color: string; border: string; bg: string }> = {
            all: {
                label: 'All',
                color: 'var(--text-dim)',
                border: 'rgba(148, 163, 184, 0.22)',
                bg: 'rgba(148, 163, 184, 0.06)'
            },
            t1: {
                label: 'T1: 3',
                color: '#10b981',
                border: 'rgba(16, 185, 129, 0.3)',
                bg: 'rgba(16, 185, 129, 0.06)'
            },
            t2: {
                label: 'T2: 2',
                color: '#14b8a6',
                border: 'rgba(20, 184, 166, 0.3)',
                bg: 'rgba(20, 184, 166, 0.06)'
            },
            p1: {
                label: 'P1: 4',
                color: '#3b82f6',
                border: 'rgba(59, 130, 246, 0.3)',
                bg: 'rgba(59, 130, 246, 0.06)'
            },
            p2: {
                label: 'P2: 2.5',
                color: '#8b5cf6',
                border: 'rgba(139, 92, 246, 0.3)',
                bg: 'rgba(139, 92, 246, 0.06)'
            },
        };

        return config[lead] || (isLeadsSupported ? config.all : null);
    }, [campaign.leads, platform?.platform_name]);

    const compactView = viewMode === 'compact' || viewMode === 'alert';
    const notesPreview = htmlToPlainText(campaign.general_notes || '');
    const reminderStyle = REMINDER_STYLES[reminderState];

    const isPaused = campaign.status === 'paused';
    const platformColor = platform?.color;
    const platformAccent = extractBaseColor(platformColor, 'hsl(var(--primary))');
    const isTesting = campaign.is_testing === true;

    const biddingGroupStyles = React.useMemo(() => {
        const strategy = campaign.bidding_strategy;
        const isPortfolio = campaign.is_portfolio === true;

        // Dedicated badge styling per strategy with clear visual hierarchy:
        // Tier 1 (High Attention): tROAS & maxValue are solid vibrant pills with crisp white text
        // Tier 2 (Standard): tCPA, maxConv, CPC are soft tinted chips with dark readable text (no visual clutter)
        let badgeStyle: React.CSSProperties;
        if (strategy === 'target_roas') {
            // tROAS: Key focus strategy - Solid Electric Indigo with crisp white text
            badgeStyle = {
                background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 2px 6px -1px rgba(79, 70, 229, 0.4)',
                textShadow: 'none'
            };
        } else if (strategy === 'max_conversion_value') {
            // Max Value: Key focus strategy - Solid Orchid/Purple with crisp white text
            badgeStyle = {
                background: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 2px 6px -1px rgba(147, 51, 234, 0.4)',
                textShadow: 'none'
            };
        } else if (strategy === 'target_cpa') {
            // tCPA: Standard strategy - Subdued soft Cyan tint with crisp dark cyan text
            badgeStyle = {
                background: 'rgba(6, 182, 212, 0.08)',
                color: '#0891b2',
                border: '1px solid rgba(6, 182, 212, 0.25)',
                boxShadow: 'none',
                textShadow: 'none'
            };
        } else if (strategy === 'max_conversions') {
            // Max Conv: Standard strategy - Subdued soft Emerald tint with crisp dark emerald text
            badgeStyle = {
                background: 'rgba(16, 185, 129, 0.08)',
                color: '#059669',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                boxShadow: 'none',
                textShadow: 'none'
            };
        } else if (isPortfolio) {
            // Fallback portfolio badge: Subdued Royal Blue tint with briefcase
            badgeStyle = {
                background: 'rgba(37, 99, 235, 0.08)',
                color: '#1d4ed8',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                boxShadow: 'none',
                textShadow: 'none'
            };
        } else {
            // CPC / mCPC: Neutral glass chip with readable text (zero clutter)
            badgeStyle = {
                background: 'rgba(148, 163, 184, 0.1)',
                color: 'var(--text-dim)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'none',
                textShadow: 'none'
            };
        }

        // If portfolio, card structure gets royal blue identity while badge displays distinct strategy color
        if (isPortfolio) {
            return {
                group: 'portfolio',
                ambientColor: '#2563eb', // Royal Blue
                borderColor: 'rgba(37, 99, 235, 0.25)',
                borderColorHover: 'rgba(59, 130, 246, 0.5)',
                glowShadow: '0 10px 24px -15px rgba(37, 99, 235, 0.2)',
                badgeStyle
            };
        }

        if (strategy === 'target_cpa') {
            return {
                group: 'volume',
                ambientColor: '#06b6d4',
                borderColor: 'var(--border-subtle)',
                borderColorHover: 'rgba(6, 182, 212, 0.35)',
                glowShadow: 'none',
                badgeStyle
            };
        }

        if (strategy === 'max_conversions') {
            return {
                group: 'volume',
                ambientColor: '#10b981',
                borderColor: 'var(--border-subtle)',
                borderColorHover: 'rgba(16, 185, 129, 0.35)',
                glowShadow: 'none',
                badgeStyle
            };
        }

        if (strategy === 'target_roas') {
            return {
                group: 'value',
                ambientColor: '#6366f1',
                borderColor: 'rgba(99, 102, 241, 0.26)',
                borderColorHover: 'rgba(99, 102, 241, 0.55)',
                glowShadow: '0 10px 24px -15px rgba(99, 102, 241, 0.22)',
                badgeStyle
            };
        }

        if (strategy === 'max_conversion_value') {
            return {
                group: 'value',
                ambientColor: '#a855f7',
                borderColor: 'rgba(168, 85, 247, 0.26)',
                borderColorHover: 'rgba(168, 85, 247, 0.55)',
                glowShadow: '0 10px 24px -15px rgba(168, 85, 247, 0.22)',
                badgeStyle
            };
        }

        return {
            group: 'traffic',
            ambientColor: platform?.color || 'hsl(var(--primary))',
            borderColor: 'var(--border-subtle)',
            borderColorHover: 'hsla(var(--primary) / 0.25)',
            glowShadow: 'none',
            badgeStyle
        };
    }, [campaign.bidding_strategy, campaign.is_portfolio, platform?.color, platformAccent]);

    const hasSpecialTrackingReminder = specialReminderSignals.length > 0;
    const specialReminderTitle = `Tracking reminder: ${specialReminderSignals.join(', ')}`;
    const priorityAccent = campaign.priority && campaign.priority !== 'normal'
        ? PRIORITY_ACCENTS[campaign.priority as CampaignPriority] || PRIORITY_ACCENTS.medium
        : null;
    const isCaseStudy = campaign.is_case_study === true;
    const activePriority = campaign.priority && campaign.priority !== 'normal'
        ? (campaign.priority as CampaignPriority)
        : null;
    const priorityTitleStyle = activePriority ? PRIORITY_TITLE_STYLES[activePriority] : null;
    const priorityLabel = activePriority
        ? ` • ${activePriority.charAt(0).toUpperCase() + activePriority.slice(1)} Priority`
        : '';

    const cardSurface = [
        `radial-gradient(circle at top right, ${hexToRgba(biddingGroupStyles.ambientColor, 0.12)} 0%, transparent 40%)`,
        `radial-gradient(circle at bottom left, ${hexToRgba(platform?.color, 0.04)} 0%, transparent 46%)`,
        'linear-gradient(180deg, var(--bg-content) 0%, color-mix(in srgb, var(--bg-content) 88%, var(--bg-main) 12%) 100%)'
    ].filter(Boolean).join(', ');

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
                border: isSelected
                    ? '1.5px solid hsl(var(--primary))'
                    : `1px solid ${biddingGroupStyles.borderColor}`,
                boxShadow: isSelected
                    ? '0 0 0 3px hsla(var(--primary) / 0.2), 0 12px 30px -15px hsla(var(--primary) / 0.35)'
                    : biddingGroupStyles.glowShadow,
                filter: isPaused ? 'grayscale(0.9) opacity(0.7)' : 'none',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = biddingGroupStyles.group !== 'traffic' 
                    ? `0 15px 30px -10px ${hexToRgba(biddingGroupStyles.ambientColor, 0.35)}`
                    : 'var(--shadow-medium)';
                e.currentTarget.style.borderColor = biddingGroupStyles.borderColorHover;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = biddingGroupStyles.group !== 'traffic' 
                    ? biddingGroupStyles.glowShadow 
                    : 'var(--shadow-subtle)';
                e.currentTarget.style.borderColor = biddingGroupStyles.borderColor;
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
                style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 3 }}
            >
                {/* Header: Name & Minimalist Metrics */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: compactView ? '0.45rem' : '0.7rem', gap: compactView ? '0.45rem' : '0.75rem' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        flex: 1,
                        minWidth: 0,
                        position: 'relative',
                        paddingLeft: priorityAccent ? (compactView ? '0.65rem' : '0.85rem') : 0,
                    }}>
                        {!compactView && onToggleSelect && (
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    onToggleSelect();
                                }}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    width: '16px',
                                    height: '16px',
                                    cursor: 'pointer',
                                    accentColor: 'hsl(var(--primary))',
                                    flexShrink: 0,
                                    marginRight: '0.1rem',
                                    borderRadius: '4px',
                                }}
                                title={isSelected ? 'Deselect campaign' : 'Select campaign'}
                            />
                        )}
                        {reminderState !== 'none' && (
                            <span
                                style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: reminderStyle.badgeColor,
                                    boxShadow: `0 0 8px ${reminderStyle.badgeColor}`,
                                    flexShrink: 0,
                                }}
                                title={`Active reminder: ${reminderState}`}
                            />
                        )}
                        <h3
                            title={`${campaign.name}${isCaseStudy ? ' • Case Study' : ''}${isTesting ? ' • Testing' : ''}${priorityLabel}`}
                            style={{
                                position: 'relative',
                                zIndex: 4,
                                fontSize: compactView ? '0.8rem' : '0.95rem',
                                fontWeight: 800,
                                color: priorityTitleStyle ? (isCaseStudy ? '#b45309' : priorityTitleStyle.textColor) : (isCaseStudy ? '#d97706' : platformAccent),
                                background: priorityTitleStyle ? priorityTitleStyle.background : 'transparent',
                                border: priorityTitleStyle ? priorityTitleStyle.border : 'none',
                                borderLeft: priorityTitleStyle ? priorityTitleStyle.borderLeft : undefined,
                                borderRadius: priorityTitleStyle ? '4px' : undefined,
                                padding: priorityTitleStyle ? (compactView ? '0.08rem 0.38rem' : '0.12rem 0.48rem') : 0,
                                boxShadow: priorityTitleStyle ? priorityTitleStyle.boxShadow : undefined,
                                textDecoration: isTesting ? 'underline' : 'none',
                                textDecorationColor: isTesting ? '#f59e0b' : undefined,
                                textDecorationThickness: isTesting ? '2px' : undefined,
                                textUnderlineOffset: isTesting ? '3px' : undefined,
                                margin: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: priorityTitleStyle ? '0 1 auto' : 1,
                                maxWidth: '100%',
                            }}
                        >
                            {campaign.name}
                        </h3>

                        {campaign.is_dsa === false && (
                            <Key size={compactView ? 11 : 12} style={{ color: '#facc15', flexShrink: 0 }} />
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: compactView ? '0.4rem' : '0.6rem', flexShrink: 0, position: 'relative' }}>
                        {/* Compact Metric: Strategy Target Badge */}
                        <div
                            onMouseEnter={() => setShowCPCTooltip(true)}
                            onMouseLeave={() => setShowCPCTooltip(false)}
                            style={{
                                fontSize: compactView ? '0.66rem' : '0.72rem',
                                fontWeight: 800,
                                background: biddingGroupStyles.badgeStyle.background,
                                color: biddingGroupStyles.badgeStyle.color,
                                border: biddingGroupStyles.badgeStyle.border,
                                boxShadow: biddingGroupStyles.badgeStyle.boxShadow,
                                textShadow: biddingGroupStyles.badgeStyle.textShadow,
                                padding: compactView ? '0.1rem 0.36rem' : '0.14rem 0.44rem',
                                borderRadius: '5px',
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.24rem',
                                letterSpacing: '0.02em',
                            }}
                            title={campaign.is_portfolio
                                ? `Portfolio Bidding (${biddingStrategyName})`
                                : `Bidding Strategy: ${biddingStrategyName}`}
                        >
                            {campaign.is_portfolio && (
                                <Briefcase
                                    size={compactView ? 10 : 11}
                                    strokeWidth={2.4}
                                    style={{ display: 'inline-flex', flexShrink: 0, opacity: 0.95 }}
                                />
                            )}
                            <span>{biddingStrategyName}</span>
                        </div>

                        {/* Tooltip for Strategy Target Changes */}
                        {showCPCTooltip && targetChanges.length > 0 && (
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
                                    <History size={10} /> {targetInfo.tooltipTitle}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    {targetChanges.map(change => (
                                        <div key={change.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                                            <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>{formatDate(change.change_date)}</span>
                                            <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                                                {targetInfo.formatValue(change.old_value)} → <span style={{ color: 'hsl(var(--primary))' }}>{targetInfo.formatValue(change.new_value)}</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Row 2: Campaign Financial Overview (left), Latest Update (center), & Lead Badge (right) */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.35rem',
                        marginBottom: compactView ? '0.35rem' : '0.5rem',
                        minHeight: compactView ? '18px' : '20px',
                    }}
                >
                    {/* Left: Overview (Target / Daily Budget) */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: compactView ? '0.66rem' : '0.74rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            flexShrink: 0,
                        }}
                        title={`Target: ${targetInfo.value} | Daily Budget: ${budgetFormatted}`}
                    >
                        <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                            {targetInfo.value}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>/</span>
                        <span style={{ fontWeight: 700, color: 'var(--text-dim)' }}>
                            {budgetFormatted}
                        </span>
                        {isPaused && (
                            <span
                                style={{
                                    marginLeft: '0.2rem',
                                    fontSize: compactView ? '0.52rem' : '0.58rem',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    padding: '0.04rem 0.22rem',
                                    borderRadius: '3px',
                                    background: 'var(--bg-overlay)',
                                    color: 'var(--text-muted)',
                                    border: '1px solid var(--border-subtle)',
                                }}
                            >
                                Paused
                            </span>
                        )}
                    </div>

                    {/* Middle: Latest update date */}
                    {latestUpdateFormatted ? (
                        <span
                            style={{
                                fontSize: compactView ? '0.62rem' : '0.7rem',
                                fontWeight: 600,
                                color: 'var(--text-muted)',
                                whiteSpace: 'nowrap',
                                textAlign: 'center',
                                flex: 1,
                                padding: '0 0.2rem',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                            title={`Latest update: ${latestUpdateFormatted}`}
                        >
                            {latestUpdateFormatted}
                        </span>
                    ) : <span style={{ flex: 1 }} />}

                    {/* Right: Lead Target Badge */}
                    {leadStyle ? (
                        <div
                            style={{
                                fontSize: compactView ? '0.62rem' : '0.72rem',
                                fontWeight: 800,
                                background: leadStyle.bg,
                                color: leadStyle.color,
                                border: `1px solid ${leadStyle.border}`,
                                padding: compactView ? '0.06rem 0.3rem' : '0.1rem 0.4rem',
                                borderRadius: '5px',
                                whiteSpace: 'nowrap',
                                textTransform: 'uppercase',
                                letterSpacing: '0.02em',
                                flexShrink: 0,
                            }}
                            title={`Leads target: ${leadStyle.label}`}
                        >
                            {leadStyle.label}
                        </div>
                    ) : (
                        <div style={{ width: 0, flexShrink: 0 }} />
                    )}
                </div>

                {/* Fixed-Height Notes Section */}
                <div
                    title={notesPreview || 'No notes available'}
                    style={{
                        padding: compactView ? '0.3rem 0.4rem' : '0.4rem 0.55rem',
                        background: `linear-gradient(180deg, ${hexToRgba(platform?.color, 0.05)} 0%, var(--bg-overlay) 100%)`,
                        borderRadius: '0.6rem',
                        border: 'none',
                        fontSize: compactView ? '0.74rem' : '0.82rem',
                        lineHeight: 1.35,
                        color: campaign.general_notes ? 'var(--text-main)' : 'var(--text-muted)',
                        height: compactView ? '56px' : '75px',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: compactView ? 2 : 3,
                        WebkitBoxOrient: 'vertical',
                    }}
                >
                    {notesPreview || 'Define optimization notes...'}
                </div>
            </div>

        </div>
    );
}
