import { useDeferredValue, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Plus,
    Check,
    ChevronDown,
    ChevronRight,
    LayoutGrid,
    RefreshCw,
    Search,
    ShieldCheck,
    AlertTriangle,
    Clock3,
    Layers3,
} from 'lucide-react';
import CampaignCard from '../../components/campaign/CampaignCard';
import EditCampaignModal from '../../components/campaign/EditCampaignModal';
import { Campaign, CampaignPlatform, CampaignReminder } from '../../types/campaign';
import { pb } from '../../lib/pocketbase';
import { htmlToPlainText } from '../../lib/noteHtml';
import {
    SAFE_BUTTON_SELECTORS,
    SAFE_CARD_SELECTORS,
    SAFE_INTERACTIVE_TRANSITION,
    createSafeInteractionScopeCss,
} from '../../lib/uiMotion';
import { FilterChip } from '../../components/common/ui/FilterChip';
import { SafeButton } from '../../components/common/ui/SafeButton';
import { SurfaceCard } from '../../components/common/ui/SurfaceCard';
import { ToolbarGroup } from '../../components/common/ui/ToolbarGroup';
import { createAmbientSurface, createPremiumBadgeStyle, toAlphaColor } from '../../components/common/ui';

type ReminderState = 'none' | 'upcoming' | 'today' | 'overdue';
type OverviewMode = 'comfortable' | 'compact';
type ReminderQuickFilter = 'all' | 'overdue' | 'today' | 'upcoming';
type FreshnessState = 'fresh' | 'watch' | 'stale';
type ReminderPriority = 'low' | 'medium' | 'high' | 'critical';
type EnrichedCampaign = Campaign & {
    platformData?: CampaignPlatform;
    reminderState: ReminderState;
    nearestDueInDays: number | null;
    hasPendingReminders: boolean;
    highestPriority?: ReminderPriority;
    freshnessState: FreshnessState;
    hasReviewed: boolean;
    reviewStatusLabel?: string;
};

const VIEW_MODES: Array<{ id: OverviewMode; label: string; icon: typeof LayoutGrid }> = [
    { id: 'comfortable', label: 'Comfortable', icon: LayoutGrid },
    { id: 'compact', label: 'Compact', icon: LayoutGrid },
];

const FILTER_CLUSTER_STYLE = {
    marginBottom: '2rem',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: '1rem',
} as const;

const FILTER_CARD_STYLE = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    borderRadius: '1.25rem',
    boxShadow: 'var(--shadow-subtle)',
} as const;

const VIEW_CONTROL_CARD_STYLE = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    borderRadius: '1.1rem',
    boxShadow: 'var(--shadow-subtle)',
} as const;

const STATUS_CARD_STYLE = {
    marginBottom: '1.5rem',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '0.6rem',
    border: '1px solid hsla(var(--primary) / 0.1)',
    boxShadow: 'var(--shadow-glass)',
    borderRadius: '1.25rem',
} as const;

const PRIORITY_OPTIONS = [
    { value: 'all', label: 'Any' },
    { value: 'normal', label: 'Normal' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
] as const;

const REMINDER_CHIP_CONFIG = {
    overdue: {
        activeBackground: '#ef4444',
        inactiveBackground: 'rgba(239, 68, 68, 0.05)',
        activeBorder: '#ef4444',
        inactiveBorder: 'rgba(239, 68, 68, 0.12)',
        activeColor: '#fff',
        inactiveColor: '#ef4444',
        activeShadow: '0 0 15px rgba(239, 68, 68, 0.4)',
    },
    today: {
        activeBackground: '#f59e0b',
        inactiveBackground: 'rgba(245, 158, 11, 0.05)',
        activeBorder: '#f59e0b',
        inactiveBorder: 'rgba(245, 158, 11, 0.12)',
        activeColor: '#fff',
        inactiveColor: '#f59e0b',
        activeShadow: '0 0 15px rgba(245, 158, 11, 0.4)',
    },
    upcoming: {
        activeBackground: 'hsl(var(--primary))',
        inactiveBackground: 'var(--bg-main)',
        activeBorder: 'hsl(var(--primary))',
        inactiveBorder: 'var(--border-subtle)',
        activeColor: '#fff',
        inactiveColor: 'var(--text-dim)',
        activeShadow: '0 0 15px hsla(var(--primary) / 0.4)',
    },
} as const;


const PRIORITY_RANK: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    normal: 3,
    low: 4,
};

const REMINDER_STATE_RANK: Record<ReminderState, number> = {
    overdue: 0,
    today: 1,
    upcoming: 2,
    none: 3,
};

const parseDateOnly = (input?: string | null): Date | null => {
    if (!input || typeof input !== 'string') return null;
    const normalized = input.trim();
    if (!normalized || normalized.toLowerCase() === 'n/a') return null;

    // Keep YYYY-MM-DD as local date to avoid timezone drift.
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        const [year, month, day] = normalized.split('-').map(Number);
        const parsedLocal = new Date(year, month - 1, day);
        return Number.isNaN(parsedLocal.getTime()) ? null : parsedLocal;
    }

    // For timestamp strings from PocketBase (UTC), parse full datetime first.
    const normalizedTimestamp = normalized.includes(' ') ? normalized.replace(' ', 'T') : normalized;
    const parsedTimestamp = new Date(normalizedTimestamp);
    if (!Number.isNaN(parsedTimestamp.getTime())) {
        return parsedTimestamp;
    }

    const isoDate = normalized.slice(0, 10);
    const [year, month, day] = isoDate.split('-').map(Number);
    if (!year || !month || !day) {
        const fallback = new Date(normalized);
        return Number.isNaN(fallback.getTime()) ? null : fallback;
    }
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getStartOfDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getDayDiff = (targetDate: Date, baseDate: Date): number => {
    const msInDay = 24 * 60 * 60 * 1000;
    return Math.round((getStartOfDay(targetDate).getTime() - getStartOfDay(baseDate).getTime()) / msInDay);
};

const STATUS_RANK: Record<string, number> = {
    active: 0,
    testing: 1,
    archived: 2,
    paused: 3,
};

const METRIC_CARD_THEMES = {
    active: { accent: '#14b8a6', icon: ShieldCheck, label: 'Live Coverage' },
    review: { accent: '#3b82f6', icon: Layers3, label: 'Review Rate' },
    overdue: { accent: '#f97316', icon: Clock3, label: 'Overdue Follow-ups' },
    critical: { accent: '#ef4444', icon: AlertTriangle, label: 'Critical Priority' },
} as const;

export default function CampOverview() {
    const [searchParams, setSearchParams] = useSearchParams();

    const filterPlatform = searchParams.get('platform') || 'all';
    const filterPriority = searchParams.get('priority') || 'all';
    const filterName = searchParams.get('q') || '';
    const filterReminders = searchParams.get('reminders') === 'true';
    const filterShowAll = searchParams.get('all') === 'true';
    const filterMetadata = searchParams.get('has_meta') === 'true';
    const viewMode = (searchParams.get('view') as OverviewMode) || 'comfortable';
    const reminderQuickFilter = (searchParams.get('due') as ReminderQuickFilter) || 'all';
    const compactCards = viewMode === 'compact';
    const alertsOnlyEnabled = filterReminders;
    const deferredFilterName = useDeferredValue(filterName);

    const setFilterPlatform = (val: string) => {
        setSearchParams((prev: URLSearchParams) => {
            if (val === 'all') prev.delete('platform');
            else prev.set('platform', val);
            return prev;
        });
    };

    const setFilterPriority = (val: string) => {
        setSearchParams((prev: URLSearchParams) => {
            if (val === 'all') prev.delete('priority');
            else prev.set('priority', val);
            return prev;
        });
    };

    const setFilterName = (val: string) => {
        setSearchParams((prev: URLSearchParams) => {
            const normalized = val.trim();
            if (!normalized) prev.delete('q');
            else prev.set('q', normalized);
            return prev;
        });
    };

    const setToggleReminders = () => {
        setSearchParams((prev: URLSearchParams) => {
            if (filterReminders) prev.delete('reminders');
            else prev.set('reminders', 'true');
            return prev;
        });
    };

    const setToggleShowAll = () => {
        setSearchParams((prev: URLSearchParams) => {
            if (filterShowAll) prev.delete('all');
            else prev.set('all', 'true');
            return prev;
        });
    };

    const setToggleMetadata = () => {
        setSearchParams((prev: URLSearchParams) => {
            if (filterMetadata) prev.delete('has_meta');
            else prev.set('has_meta', 'true');
            return prev;
        });
    };

    const setViewMode = (mode: OverviewMode) => {
        setSearchParams((prev: URLSearchParams) => {
            if (mode === 'comfortable') prev.delete('view');
            else prev.set('view', mode);
            return prev;
        });
    };

    const setReminderQuickFilter = (val: ReminderQuickFilter) => {
        setSearchParams((prev: URLSearchParams) => {
            if (val === 'all') prev.delete('due');
            else prev.set('due', val);
            return prev;
        });
    };

    const [editingId, setEditingId] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

    const toggleSection = (platformId: string) => {
        setCollapsedSections(prev => ({
            ...prev,
            [platformId]: !prev[platformId]
        }));
    };

    // Fetch platforms
    const { data: platforms = [] } = useQuery<CampaignPlatform[]>({
        queryKey: ['platforms'],
        queryFn: async () => {
            return await pb.collection('campaign_platforms').getFullList<CampaignPlatform>({
                sort: 'order,display_name',
            });
        },
    });

    // Fetch campaigns with platform expand
    const { data: campaigns = [], isLoading, refetch } = useQuery<Campaign[]>({
        queryKey: ['campaigns', filterPlatform],
        queryFn: async () => {
            let filter = '';
            const filters: string[] = [];

            if (filterPlatform !== 'all') {
                filters.push(`platform = "${filterPlatform}"`);
            }

            filter = filters.join(' && ');

            return await pb.collection('campaigns').getFullList<Campaign>({
                sort: 'name',
                filter: filter || undefined,
                expand: 'platform',
            });
        },
    });

    // Fetch reminders to check which campaigns have pending ones
    const { data: reminders = [] } = useQuery<CampaignReminder[]>({
        queryKey: ['reminders', 'pending'],
        queryFn: async () => {
            return await pb.collection('campaign_reminders').getFullList<CampaignReminder>({
                filter: 'status = "pending"',
                sort: 'reminder_date',
            });
        },
        staleTime: 1000 * 60 * 60 * 4, // 4 hours
    });

    const now = useMemo(() => getStartOfDay(new Date()), []);
    const platformMap = useMemo(() => {
        const map = new Map<string, CampaignPlatform>();
        platforms.forEach((platform) => map.set(platform.id, platform));
        return map;
    }, [platforms]);

    const reminderByCampaign = useMemo(() => {
        const bucket = new Map<string, CampaignReminder[]>();
        reminders.forEach((reminder) => {
            if (reminder.campaign) {
                if (!bucket.has(reminder.campaign)) {
                    bucket.set(reminder.campaign, []);
                }
                bucket.get(reminder.campaign)!.push(reminder);
            }
        });
        return bucket;
    }, [reminders]);

    // Get enriched campaigns with platform data and reminder state
    const enrichedCampaigns: EnrichedCampaign[] = useMemo(() => campaigns.map((campaign) => {
        const platform = platformMap.get(campaign.platform);
        const campaignReminders = reminderByCampaign.get(campaign.id) || [];

        let reminderState: ReminderState = 'none';
        let nearestDueInDays: number | null = null;
        let priority: ReminderPriority = 'low';
        let hasActionableReminder = false;

        for (const reminder of campaignReminders) {
            const reminderDate = parseDateOnly(reminder.reminder_date);
            if (!reminderDate) continue;
            const dayDiff = getDayDiff(reminderDate, now);
            const nextState: ReminderState =
                dayDiff < 0 ? 'overdue' : dayDiff === 0 ? 'today' : dayDiff <= 3 ? 'upcoming' : 'none';

            if (REMINDER_STATE_RANK[nextState] < REMINDER_STATE_RANK[reminderState]) {
                reminderState = nextState;
            }

            if (dayDiff <= 0) {
                hasActionableReminder = true;
                const normalizedPriority = reminder.priority || 'low';
                if (PRIORITY_RANK[normalizedPriority] < PRIORITY_RANK[priority]) {
                    priority = normalizedPriority;
                }
            }

            if (nearestDueInDays === null || dayDiff < nearestDueInDays) {
                nearestDueInDays = dayDiff;
            }
        }

        const reviewedAt = campaign.last_reviewed_date ? parseDateOnly(campaign.last_reviewed_date) : null;
        const reviewedAgeDays = reviewedAt ? Math.max(0, -getDayDiff(reviewedAt, now)) : null;
        const freshnessState: FreshnessState = reviewedAgeDays === null
            ? 'stale'
            : (reviewedAgeDays <= 3 ? 'fresh' : reviewedAgeDays <= 7 ? 'watch' : 'stale');
        const reviewOutcomeLabel = campaign.last_review_outcome === 'cpc_increase'
            ? 'CPC ↑'
            : campaign.last_review_outcome === 'cpc_reduce'
                ? 'CPC ↓'
                : campaign.last_review_outcome === 'updated'
                    ? 'Updated'
                    : campaign.last_review_outcome === 'no_change'
                        ? 'No change'
                        : undefined;
        const reviewedText = reviewedAgeDays === 0 ? 'Reviewed today' : `Reviewed ${reviewedAgeDays}d ago`;
        const reviewStatusLabel = reviewedAgeDays === null
            ? 'Never reviewed'
            : reviewOutcomeLabel
                ? `${reviewedText} • ${reviewOutcomeLabel}`
                : reviewedText;

        return {
            ...campaign,
            platformData: platform,
            reminderState,
            nearestDueInDays,
            hasPendingReminders: hasActionableReminder,
            highestPriority: hasActionableReminder ? priority : undefined,
            freshnessState,
            hasReviewed: reviewedAgeDays !== null,
            reviewStatusLabel,
        };
    }), [campaigns, now, platformMap, reminderByCampaign]);

    // 1. Base list for filtering (Scoped by Search Name and Status)
    const nameKeyword = deferredFilterName.trim().toLowerCase();
    const baseFilteredCampaigns = useMemo(() => enrichedCampaigns.filter((campaign) => {
        if (nameKeyword && !campaign.name.toLowerCase().includes(nameKeyword)) return false;
        if (!filterShowAll && campaign.status === 'paused') return false;
        return true;
    }), [enrichedCampaigns, filterShowAll, nameKeyword]);

    // 2. Summary stats calculated from base list (Interactive Dashboard counts)
    const summary = useMemo(() => baseFilteredCampaigns.reduce(
        (acc, campaign) => {
            // Reminder States
            if (campaign.reminderState === 'overdue') acc.overdue += 1;
            if (campaign.reminderState === 'today') acc.today += 1;
            if (campaign.reminderState === 'upcoming') acc.upcoming += 1;

            // Priorities
            if (campaign.priority === 'critical') acc.critical += 1;
            if (campaign.priority === 'high') acc.high += 1;

            return acc;
        },
        { overdue: 0, today: 0, upcoming: 0, critical: 0, high: 0 },
    ), [baseFilteredCampaigns]);

    // 3. Final display list (Applies all interactive filters)
    const filteredCampaigns = useMemo(() => baseFilteredCampaigns.filter((campaign) => {
        if (alertsOnlyEnabled && !campaign.hasPendingReminders) return false;
        if (reminderQuickFilter !== 'all' && campaign.reminderState !== reminderQuickFilter) return false;
        if (filterPriority !== 'all' && campaign.priority !== filterPriority) return false;
        if (filterMetadata && htmlToPlainText(campaign.metadata || '').trim().length === 0) return false;
        return true;
    }), [alertsOnlyEnabled, baseFilteredCampaigns, filterMetadata, filterPriority, reminderQuickFilter]);

    const hasActiveFilters = filterPlatform !== 'all'
        || filterPriority !== 'all'
        || filterName !== ''
        || alertsOnlyEnabled
        || filterShowAll
        || reminderQuickFilter !== 'all'
        || filterMetadata;

    // Pulse Metrics (Calculated from base list)
    const reviewedCount = baseFilteredCampaigns.filter(c => c.hasReviewed).length;
    const reviewRate = baseFilteredCampaigns.length > 0 ? Math.round((reviewedCount / baseFilteredCampaigns.length) * 100) : 0;
    const pulseMetrics = {
        reviewRate,
        criticalCount: summary.critical,
        overdueCount: summary.overdue
    };

    const quickFilters = [
        { id: 'alerts', label: 'Alerts', active: alertsOnlyEnabled, toggle: setToggleReminders },
        { id: 'all', label: 'All', active: filterShowAll, toggle: setToggleShowAll },
        { id: 'meta', label: 'Metadata', active: filterMetadata, toggle: setToggleMetadata }
    ] as const;
    const reminderChipConfig = {
        overdue: REMINDER_CHIP_CONFIG.overdue,
        today: REMINDER_CHIP_CONFIG.today,
        upcoming: REMINDER_CHIP_CONFIG.upcoming,
    };

    const sortCampaignsByReminder = (items: EnrichedCampaign[]) =>
        [...items].sort((a, b) => {
            // 1. Status (Active/Testing -> Archived -> Paused)
            const statusRankA = STATUS_RANK[a.status] ?? 0;
            const statusRankB = STATUS_RANK[b.status] ?? 0;
            if (statusRankA !== statusRankB) return statusRankA - statusRankB;

            // 2. Campaign Priority (Critical first)
            const campPriorityA = PRIORITY_RANK[a.priority || 'normal'];
            const campPriorityB = PRIORITY_RANK[b.priority || 'normal'];
            if (campPriorityA !== campPriorityB) return campPriorityA - campPriorityB;

            // 3. Reminder State (Overdue first)
            const reminderRankDiff = REMINDER_STATE_RANK[a.reminderState] - REMINDER_STATE_RANK[b.reminderState];
            if (reminderRankDiff !== 0) return reminderRankDiff;

            // 4. Nearness
            const dueDiffA = a.nearestDueInDays ?? Number.MAX_SAFE_INTEGER;
            const dueDiffB = b.nearestDueInDays ?? Number.MAX_SAFE_INTEGER;
            if (dueDiffA !== dueDiffB) return dueDiffA - dueDiffB;

            // 5. Highst Priority from Reminders
            const hPriorityA = PRIORITY_RANK[a.highestPriority || 'low'];
            const hPriorityB = PRIORITY_RANK[b.highestPriority || 'low'];
            if (hPriorityA !== hPriorityB) return hPriorityA - hPriorityB;

            // 6. Alphabetical
            return a.name.localeCompare(b.name);
        });

    // Group by platform
    const groupedCampaigns = useMemo(() => {
        const groups = platforms.reduce((acc, platform) => {
            const platformCampaigns = sortCampaignsByReminder(filteredCampaigns.filter(c => c.platform === platform.id));
            if (platformCampaigns.length > 0) {
                acc.push({
                    platform,
                    campaigns: platformCampaigns
                });
            }
            return acc;
        }, [] as { platform: CampaignPlatform, campaigns: EnrichedCampaign[] }[]);

        const orphans = sortCampaignsByReminder(filteredCampaigns.filter(c => !platformMap.has(c.platform)));
        if (orphans.length > 0) {
            groups.push({
                platform: {
                    id: 'unknown',
                    platform_name: 'unknown',
                    display_name: 'Unassigned',
                    color: '#64748b',
                    created: '',
                    updated: '',
                },
                campaigns: orphans
            });
        }

        return groups;
    }, [filteredCampaigns, platformMap, platforms]);

    const openEdit = (id: string | null) => {
        setEditingId(id);
        setIsEditModalOpen(true);
    };

    const overviewMetrics = [
        {
            key: 'active',
            value: filteredCampaigns.length,
            helper: `${groupedCampaigns.length} platform groups`,
            progress: Math.min(100, filteredCampaigns.length * 8),
            ...METRIC_CARD_THEMES.active,
        },
        {
            key: 'review',
            value: `${pulseMetrics.reviewRate}%`,
            helper: `${reviewedCount}/${baseFilteredCampaigns.length || 0} recently reviewed`,
            progress: pulseMetrics.reviewRate,
            ...METRIC_CARD_THEMES.review,
        },
        {
            key: 'overdue',
            value: pulseMetrics.overdueCount,
            helper: pulseMetrics.overdueCount > 0 ? 'Needs operator action' : 'No overdue reminder',
            progress: Math.min(100, pulseMetrics.overdueCount * 18),
            ...METRIC_CARD_THEMES.overdue,
        },
        {
            key: 'critical',
            value: pulseMetrics.criticalCount,
            helper: pulseMetrics.criticalCount > 0 ? 'High-pressure campaigns' : 'No critical campaign',
            progress: Math.min(100, pulseMetrics.criticalCount * 22),
            ...METRIC_CARD_THEMES.critical,
        },
    ] as const;

    const shellBackground = {
        background: [
            `radial-gradient(circle at top left, ${toAlphaColor('#3b82f6', 0.1)} 0%, transparent 26%)`,
            `radial-gradient(circle at top right, ${toAlphaColor('#14b8a6', 0.08)} 0%, transparent 24%)`,
            'linear-gradient(180deg, transparent 0%, transparent 100%)',
        ].join(', '),
    };

    return (
        <div className="page-container camp-overview-page" style={shellBackground}>
            <style>{`
                ${createSafeInteractionScopeCss('.camp-overview-page', [...SAFE_BUTTON_SELECTORS, ...SAFE_CARD_SELECTORS])}
            `}</style>
            <SurfaceCard
                padding="1.75rem"
                radius="1.9rem"
                style={{
                    ...createAmbientSurface('#3b82f6', 1),
                    marginTop: '1rem',
                    marginBottom: '1.35rem',
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1.6fr) minmax(280px, 0.95fr)',
                    gap: '1rem',
                    alignItems: 'stretch',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem', minWidth: 0 }}>
                    <div>
                        <div
                            className="hero-badge"
                            style={{
                                marginBottom: '0.85rem',
                                ...createPremiumBadgeStyle('#3b82f6', { textColor: '#7fb3ff' }),
                            }}
                        >
                            Camp Tracking
                        </div>
                        <h1 style={{
                            fontSize: 'clamp(2rem, 3vw, 2.8rem)',
                            fontWeight: 850,
                            color: 'var(--text-main)',
                            letterSpacing: '-0.04em',
                            margin: 0,
                            lineHeight: 1.05,
                        }}>
                            Campaign Overview
                        </h1>
                        <p style={{
                            color: 'var(--text-dim)',
                            fontSize: '0.98rem',
                            fontWeight: 500,
                            marginTop: '0.7rem',
                            maxWidth: '54rem',
                            lineHeight: 1.6,
                        }}>
                            Scan live campaign pressure, review freshness, and reminder load across every channel without losing the operator-first workflow.
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                        <div className="hero-badge" style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}>
                            {filteredCampaigns.length} visible campaigns
                        </div>
                        <div className="hero-badge" style={createPremiumBadgeStyle('#14b8a6', { textColor: '#5eead4' })}>
                            {platforms.length} channels connected
                        </div>
                        <div className="hero-badge" style={createPremiumBadgeStyle('#f97316', { textColor: '#fdba74' })}>
                            {summary.overdue + summary.today} urgent reminders
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        ...createAmbientSurface('#14b8a6', 0.8),
                        borderRadius: '1.5rem',
                        padding: '1.1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        minWidth: 0,
                    }}
                >
                    <div>
                        <div style={{ fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                            Operator Actions
                        </div>
                        <div style={{ marginTop: '0.45rem', fontSize: '1.05rem', fontWeight: 750, color: 'var(--text-main)', lineHeight: 1.35 }}>
                            Keep filters stable, clear pressure fast, and jump into edits without leaving this surface.
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <SafeButton
                            onClick={() => refetch()}
                            className="hero-btn hero-btn-ghost"
                            style={{ padding: '0.75rem 1rem', borderRadius: '1rem', background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)' }}
                        >
                            <RefreshCw size={16} />
                            Refresh
                        </SafeButton>
                        <SafeButton
                            onClick={() => setSearchParams({})}
                            className="hero-btn"
                            style={{
                                padding: '0.75rem 1rem',
                                borderRadius: '1rem',
                                background: hasActiveFilters ? toAlphaColor('#3b82f6', 0.14) : 'var(--bg-overlay)',
                                border: `1px solid ${hasActiveFilters ? toAlphaColor('#3b82f6', 0.26) : 'var(--border-subtle)'}`,
                                color: hasActiveFilters ? '#7fb3ff' : 'var(--text-dim)',
                            }}
                        >
                            Reset Filters
                        </SafeButton>

                        <SafeButton
                            onClick={() => openEdit(null)}
                            className="hero-btn hero-btn-primary"
                            style={{ padding: '0.78rem 1.2rem', borderRadius: '1rem', fontSize: '0.92rem' }}
                        >
                            <Plus size={18} strokeWidth={2.5} />
                            New Campaign
                        </SafeButton>
                    </div>
                </div>
            </SurfaceCard>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                    marginBottom: '1.35rem',
                }}
            >
                {overviewMetrics.map((metric) => {
                    const Icon = metric.icon;
                    return (
                        <SurfaceCard
                            key={metric.key}
                            padding="1.1rem 1.15rem"
                            radius="1.35rem"
                            style={{
                                ...createAmbientSurface(metric.accent, 0.7),
                                overflow: 'hidden',
                                position: 'relative',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)' }}>
                                        {metric.label}
                                    </div>
                                    <div style={{ marginTop: '0.7rem', fontSize: '2rem', fontWeight: 850, letterSpacing: '-0.05em', color: 'var(--text-main)', lineHeight: 1 }}>
                                        {metric.value}
                                    </div>
                                </div>
                                <div
                                    style={{
                                        width: '2.5rem',
                                        height: '2.5rem',
                                        borderRadius: '0.95rem',
                                        display: 'grid',
                                        placeItems: 'center',
                                        background: toAlphaColor(metric.accent, 0.14),
                                        border: `1px solid ${toAlphaColor(metric.accent, 0.22)}`,
                                        color: metric.accent,
                                        flexShrink: 0,
                                    }}
                                >
                                    <Icon size={18} />
                                </div>
                            </div>
                            <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                                {metric.helper}
                            </div>
                            <div style={{ marginTop: '0.85rem', height: '6px', borderRadius: '999px', background: 'var(--bg-overlay)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                                <div style={{ width: `${Math.max(metric.progress, 6)}%`, height: '100%', borderRadius: 'inherit', background: `linear-gradient(90deg, ${metric.accent} 0%, ${toAlphaColor(metric.accent, 0.6)} 100%)` }} />
                            </div>
                        </SurfaceCard>
                    );
                })}
            </div>

            {/* Filters Cluster */}
            <SurfaceCard
                padding="1rem"
                radius="1.6rem"
                style={{
                    ...createAmbientSurface('#2563eb', 0.45),
                    marginBottom: '1.25rem',
                }}
            >
                <div style={{ ...FILTER_CLUSTER_STYLE, marginBottom: 0, alignItems: 'stretch' }}>
                <SurfaceCard
                    variant="inset"
                    padding="0.95rem"
                    style={{
                        ...FILTER_CARD_STYLE,
                        flex: '1 1 42rem',
                        background: 'linear-gradient(180deg, var(--bg-overlay) 0%, color-mix(in srgb, var(--bg-overlay) 86%, var(--bg-main) 14%) 100%)',
                    }}
                >
                    <div className="filter-group">
                        <label>Search Camp</label>
                        <div style={{ position: 'relative', minWidth: '320px' }}>
                            <Search size={16} style={{ position: 'absolute', left: '0.95rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                            <input
                                type="text"
                                value={filterName}
                                onChange={(e) => setFilterName(e.target.value)}
                                placeholder="Search by campaign name..."
                                style={{ minWidth: '320px', borderRadius: '12px', paddingLeft: '2.7rem' }}
                            />
                        </div>
                    </div>

                    <div className="filter-group">
                        <label>Platform</label>
                        <select
                            value={filterPlatform}
                            onChange={(e) => setFilterPlatform(e.target.value)}
                            style={{ minWidth: '160px', borderRadius: '12px' }}
                        >
                            <option value="all">All Channels</option>
                            {platforms.map((platform) => (
                                <option key={platform.id} value={platform.id}>
                                    {platform.display_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Priority</label>
                        <select
                            value={filterPriority}
                            onChange={(e) => setFilterPriority(e.target.value)}
                            style={{
                                minWidth: '140px',
                                borderRadius: '12px',
                                color: filterPriority === 'critical' ? '#d946ef' : (filterPriority === 'high' ? '#ef4444' : (filterPriority === 'medium' ? '#f59e0b' : 'inherit')),
                                fontWeight: filterPriority !== 'all' && filterPriority !== 'normal' ? 700 : 500
                            }}
                        >
                            {PRIORITY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </SurfaceCard>

                <SurfaceCard
                    variant="inset"
                    padding="0.75rem 0.95rem"
                    style={{
                        ...VIEW_CONTROL_CARD_STYLE,
                        flex: '0 1 auto',
                        justifyContent: 'space-between',
                    }}
                >
                    <div className="filter-group">
                        <label style={{ fontSize: '0.65rem', marginBottom: '0.15rem' }}>View Mode</label>
                        <ToolbarGroup
                            compact
                            role="group"
                            aria-label="Toggle campaign overview view mode"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                background: 'var(--bg-overlay)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '10px',
                                padding: '0.2rem',
                                gap: '0.2rem',
                            }}
                        >
                            {VIEW_MODES.map((mode) => {
                                const isActive = viewMode === mode.id;
                                const Icon = mode.icon;
                                return (
                                    <SafeButton
                                        key={mode.id}
                                        onClick={() => setViewMode(mode.id)}
                                        className="hero-btn"
                                        aria-pressed={isActive}
                                        style={{
                                            padding: '0.35rem 0.75rem',
                                            borderRadius: '8px',
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            background: isActive ? 'hsl(var(--primary))' : 'transparent',
                                            color: isActive ? 'var(--text-on-accent)' : 'var(--text-dim)',
                                            border: 'none',
                                            boxShadow: isActive ? 'var(--shadow-medium)' : 'none'
                                        }}
                                    >
                                        <Icon size={12} />
                                        {mode.label}
                                    </SafeButton>
                                );
                            })}
                        </ToolbarGroup>
                    </div>

                    <div style={{ width: '1px', height: '36px', background: 'var(--border-subtle)', margin: '0 0.25rem' }} />

                    <div className="filter-group">
                        <label style={{ fontSize: '0.65rem', marginBottom: '0.15rem' }}>Quick Filters</label>
                        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                            {quickFilters.map((item) => (
                                <SafeButton
                                    key={item.id}
                                    onClick={item.toggle}
                                    aria-pressed={item.active}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.4rem 0.75rem',
                                        background: item.active ? 'var(--accent-glow-strong)' : 'transparent',
                                        border: `1px solid ${item.active ? 'hsl(var(--primary))' : 'var(--border-subtle)'}`,
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        transition: SAFE_INTERACTIVE_TRANSITION,
                                        userSelect: 'none',
                                    }}
                                >
                                    <div style={{
                                        width: '14px',
                                        height: '14px',
                                        borderRadius: '4px',
                                        border: '1px solid var(--border-subtle)',
                                        background: item.active ? 'hsl(var(--primary))' : 'var(--bg-overlay)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: SAFE_INTERACTIVE_TRANSITION
                                    }}>
                                        {item.active && <Check size={10} strokeWidth={4} color="white" />}
                                    </div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: item.active ? 'hsl(var(--primary))' : 'var(--text-dim)' }}>
                                        {item.label}
                                    </span>
                                </SafeButton>
                            ))}
                        </div>
                    </div>
                </SurfaceCard>
                </div>
            </SurfaceCard>

            {/* Status Dashboard Row */}
            <SurfaceCard
                padding="0.85rem 1.15rem"
                radius="1.45rem"
                style={{
                    ...STATUS_CARD_STYLE,
                    ...createAmbientSurface('#8b5cf6', 0.4),
                }}
            >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
                    {/* Review Rate */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.4rem 0.85rem',
                        background: 'var(--bg-overlay)',
                        borderRadius: '10px',
                        border: '1px solid var(--border-subtle)',
                        marginRight: '0.5rem'
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', lineHeight: 1 }}>Review</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1.2 }}>{pulseMetrics.reviewRate}%</span>
                        </div>
                        <div style={{ width: '40px', height: '4px', background: 'var(--bg-overlay)', borderRadius: '2px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ width: `${pulseMetrics.reviewRate}%`, height: '100%', background: 'hsl(var(--primary))' }} />
                        </div>
                    </div>

                    <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', marginRight: '0.5rem' }} />

                    <FilterChip
                        active={filterPriority === 'critical'}
                        onClick={() => setFilterPriority(filterPriority === 'critical' ? 'all' : 'critical')}
                        activeBackground="#d946ef"
                        inactiveBackground="rgba(217, 70, 239, 0.05)"
                        activeBorder="#d946ef"
                        inactiveBorder="rgba(217, 70, 239, 0.12)"
                        activeColor="#fff"
                        inactiveColor="#d946ef"
                        activeShadow="0 0 15px rgba(217, 70, 239, 0.4)"
                        dimmed={filterPriority !== 'all' && filterPriority !== 'critical'}
                        indicator={<span style={{ width: '6px', height: '6px', borderRadius: '50%', background: filterPriority === 'critical' ? '#fff' : '#d946ef', boxShadow: filterPriority === 'critical' ? '0 0 8px #fff' : '0 0 8px #d946ef' }} />}
                    >
                        Critical: {summary.critical}
                    </FilterChip>

                    <FilterChip
                        active={filterPriority === 'high'}
                        onClick={() => setFilterPriority(filterPriority === 'high' ? 'all' : 'high')}
                        activeBackground="#ef4444"
                        inactiveBackground="rgba(239, 68, 68, 0.05)"
                        activeBorder="#ef4444"
                        inactiveBorder="rgba(239, 68, 68, 0.12)"
                        activeColor="#fff"
                        inactiveColor="#ef4444"
                        activeShadow="0 0 15px rgba(239, 68, 68, 0.4)"
                        dimmed={filterPriority !== 'all' && filterPriority !== 'high'}
                        indicator={<span style={{ width: '6px', height: '6px', borderRadius: '50%', background: filterPriority === 'high' ? '#fff' : '#ef4444', boxShadow: filterPriority === 'high' ? '0 0 8px #fff' : '0 0 8px #ef4444' }} />}
                    >
                        High: {summary.high}
                    </FilterChip>

                    <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)', margin: '0 0.25rem', opacity: (filterPriority !== 'all' || reminderQuickFilter !== 'all') ? 0.3 : 1 }} />

                    <FilterChip
                        active={reminderQuickFilter === 'overdue'}
                        onClick={() => setReminderQuickFilter(reminderQuickFilter === 'overdue' ? 'all' : 'overdue')}
                        activeBackground={reminderChipConfig.overdue.activeBackground}
                        inactiveBackground={reminderChipConfig.overdue.inactiveBackground}
                        activeBorder={reminderChipConfig.overdue.activeBorder}
                        inactiveBorder={reminderChipConfig.overdue.inactiveBorder}
                        activeColor={reminderChipConfig.overdue.activeColor}
                        inactiveColor={reminderChipConfig.overdue.inactiveColor}
                        activeShadow={reminderChipConfig.overdue.activeShadow}
                        dimmed={reminderQuickFilter !== 'all' && reminderQuickFilter !== 'overdue'}
                        indicator={<span style={{ width: '6px', height: '6px', borderRadius: '50%', background: reminderQuickFilter === 'overdue' ? '#fff' : '#ef4444', boxShadow: reminderQuickFilter === 'overdue' ? '0 0 8px #fff' : '0 0 8px #ef4444' }} />}
                    >
                        Overdue: {summary.overdue}
                    </FilterChip>

                    <FilterChip
                        active={reminderQuickFilter === 'today'}
                        onClick={() => setReminderQuickFilter(reminderQuickFilter === 'today' ? 'all' : 'today')}
                        activeBackground={reminderChipConfig.today.activeBackground}
                        inactiveBackground={reminderChipConfig.today.inactiveBackground}
                        activeBorder={reminderChipConfig.today.activeBorder}
                        inactiveBorder={reminderChipConfig.today.inactiveBorder}
                        activeColor={reminderChipConfig.today.activeColor}
                        inactiveColor={reminderChipConfig.today.inactiveColor}
                        activeShadow={reminderChipConfig.today.activeShadow}
                        dimmed={reminderQuickFilter !== 'all' && reminderQuickFilter !== 'today'}
                        indicator={<span style={{ width: '6px', height: '6px', borderRadius: '50%', background: reminderQuickFilter === 'today' ? '#fff' : '#f59e0b', boxShadow: reminderQuickFilter === 'today' ? '0 0 8px #fff' : '0 0 8px #f59e0b' }} />}
                    >
                        Today: {summary.today}
                    </FilterChip>

                    <FilterChip
                        active={reminderQuickFilter === 'upcoming'}
                        onClick={() => setReminderQuickFilter(reminderQuickFilter === 'upcoming' ? 'all' : 'upcoming')}
                        activeBackground={reminderChipConfig.upcoming.activeBackground}
                        inactiveBackground={reminderChipConfig.upcoming.inactiveBackground}
                        activeBorder={reminderChipConfig.upcoming.activeBorder}
                        inactiveBorder={reminderChipConfig.upcoming.inactiveBorder}
                        activeColor={reminderChipConfig.upcoming.activeColor}
                        inactiveColor={reminderChipConfig.upcoming.inactiveColor}
                        activeShadow={reminderChipConfig.upcoming.activeShadow}
                        dimmed={reminderQuickFilter !== 'all' && reminderQuickFilter !== 'upcoming'}
                        indicator={<span style={{ width: '6px', height: '6px', borderRadius: '50%', background: reminderQuickFilter === 'upcoming' ? '#fff' : 'var(--text-muted)', boxShadow: reminderQuickFilter === 'upcoming' ? '0 0 8px #fff' : 'none' }} />}
                    >
                        Next 3 days: {summary.upcoming}
                    </FilterChip>
                </div>
            </SurfaceCard>

            {/* Campaign Cards Grid */}
            {
                isLoading ? (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: '1.25rem'
                    }}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className=" hero-card" style={{
                                height: compactCards ? '180px' : '260px',
                                ...createAmbientSurface('#3b82f6', 0.35),
                                borderRadius: '1.25rem',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                <div className="shimmer" style={{
                                    position: 'absolute',
                                    top: 0, left: 0, width: '100%', height: '100%',
                                }} />
                                <div style={{ padding: '1.25rem' }}>
                                    <div style={{ width: '60%', height: '14px', background: 'var(--bg-overlay)', borderRadius: '4px', marginBottom: '1rem' }} />
                                    <div style={{ width: '40%', height: '10px', background: 'var(--bg-overlay)', borderRadius: '4px', marginBottom: '2rem' }} />
                                    <div style={{ width: '100%', height: '60px', background: 'var(--bg-overlay)', borderRadius: '8px' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredCampaigns.length === 0 ? (
                    <SurfaceCard
                        padding="4rem 2rem"
                        style={{
                            ...createAmbientSurface('#64748b', 0.3),
                            textAlign: 'center',
                            borderRadius: '2rem',
                            border: '1px dashed var(--border-subtle)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1.5rem'
                        }}
                    >
                        <div style={{ fontSize: '3rem' }}>🔍</div>
                        <div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>No campaigns found</h3>
                            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Try adjusting your filters or search keywords.</p>
                        </div>
                        <SafeButton
                            onClick={() => setSearchParams({})}
                            className="hero-btn hero-btn-primary"
                            style={{ padding: '0.75rem 1.75rem', borderRadius: '12px' }}
                        >
                            Clear All Filters
                        </SafeButton>
                    </SurfaceCard>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {groupedCampaigns.map((group) => {
                            const isCollapsed = collapsedSections[group.platform.id];
                            return (
                                <SurfaceCard
                                    key={group.platform.id}
                                    className="animate-fade"
                                    padding="1rem"
                                    radius="1.55rem"
                                    style={{
                                        ...createAmbientSurface(group.platform.color || '#64748b', 0.45),
                                        overflow: 'hidden',
                                    }}
                                >
                                    <div
                                        onClick={() => toggleSection(group.platform.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            marginBottom: isCollapsed ? '0' : '1rem',
                                            cursor: 'pointer',
                                            padding: '0.7rem 0.8rem',
                                            borderRadius: '1rem',
                                            transition: SAFE_INTERACTIVE_TRANSITION,
                                            userSelect: 'none',
                                            background: toAlphaColor(group.platform.color || '#64748b', 0.08),
                                            border: `1px solid ${toAlphaColor(group.platform.color || '#64748b', 0.18)}`,
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = toAlphaColor(group.platform.color || '#64748b', 0.13);
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = toAlphaColor(group.platform.color || '#64748b', 0.08);
                                        }}
                                    >
                                        {isCollapsed ? (
                                            <ChevronRight size={18} className="text-muted" />
                                        ) : (
                                            <ChevronDown size={18} className="text-muted" />
                                        )}
                                        <div style={{ width: '8px', height: '26px', background: group.platform.color, borderRadius: '999px', boxShadow: `0 0 18px ${toAlphaColor(group.platform.color || '#64748b', 0.45)}` }} />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0 }}>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', textTransform: 'uppercase', margin: 0 }}>
                                            {group.platform.display_name}
                                        </h3>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                            Campaign lane
                                        </span>
                                        </div>
                                        <div style={{ height: '1px', flex: 1, background: 'var(--border-subtle)', marginLeft: '0.5rem', opacity: 0.5 }} />
                                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 700, padding: '0.35rem 0.6rem', borderRadius: '999px', background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)' }}>
                                            {group.campaigns.length} campaigns
                                        </span>
                                    </div>

                                    {!isCollapsed && (
                                        <div
                                            className="animate-fade"
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: compactCards
                                                    ? 'repeat(auto-fill, minmax(220px, 1fr))'
                                                    : 'repeat(auto-fill, minmax(300px, 1fr))',
                                                gap: compactCards ? '0.8rem' : '1.5rem',
                                                padding: '0.1rem 0'
                                            }}
                                        >
                                            {group.campaigns.map((campaign) => (
                                                <CampaignCard
                                                    key={campaign.id}
                                                    campaign={campaign}
                                                    platform={campaign.platformData}
                                                    hasPendingReminders={campaign.hasPendingReminders}
                                                    highestPriority={campaign.highestPriority}
                                                    reminderState={campaign.reminderState}
                                                    freshnessState={campaign.freshnessState}
                                                    hasReviewed={campaign.hasReviewed}
                                                    reviewStatusLabel={campaign.reviewStatusLabel}
                                                    viewMode={viewMode}
                                                    onEdit={openEdit}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </SurfaceCard>
                            );
                        })}
                    </div>
                )
            }

            <EditCampaignModal
                campaignId={editingId || undefined}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={() => refetch()}
            />
        </div >
    );
}
