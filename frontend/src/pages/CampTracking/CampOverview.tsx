import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Check, ChevronDown, ChevronRight, LayoutGrid } from 'lucide-react';
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
    const enrichedCampaigns: EnrichedCampaign[] = campaigns.map((campaign: any) => {
        const platform = platforms.find((p) => p.id === campaign.platform);
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
            platform_data: platform,
            reminderState,
            nearestDueInDays,
            hasPendingReminders: hasActionableReminder,
            highestPriority: hasActionableReminder ? priority : undefined,
            freshnessState,
            hasReviewed: reviewedAgeDays !== null,
            reviewStatusLabel,
        };
    });

    // 1. Base list for filtering (Scoped by Search Name and Status)
    const nameKeyword = filterName.trim().toLowerCase();
    const baseFilteredCampaigns = enrichedCampaigns.filter((campaign) => {
        if (nameKeyword && !campaign.name.toLowerCase().includes(nameKeyword)) return false;
        if (!filterShowAll && campaign.status === 'paused') return false;
        return true;
    });

    // 2. Summary stats calculated from base list (Interactive Dashboard counts)
    const summary = baseFilteredCampaigns.reduce(
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
    );

    // 3. Final display list (Applies all interactive filters)
    const filteredCampaigns = baseFilteredCampaigns.filter((campaign) => {
        if (alertsOnlyEnabled && !campaign.hasPendingReminders) return false;
        if (reminderQuickFilter !== 'all' && campaign.reminderState !== reminderQuickFilter) return false;
        if (filterPriority !== 'all' && campaign.priority !== filterPriority) return false;
        if (filterMetadata && htmlToPlainText(campaign.metadata || '').trim().length === 0) return false;
        return true;
    });

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
    const groupedCampaigns = platforms.reduce((acc, platform) => {
        const platformCampaigns = sortCampaignsByReminder(filteredCampaigns.filter(c => c.platform === platform.id));
        if (platformCampaigns.length > 0) {
            acc.push({
                platform,
                campaigns: platformCampaigns
            });
        }
        return acc;
    }, [] as { platform: CampaignPlatform, campaigns: EnrichedCampaign[] }[]);

    // Handle campaigns with no platform (fallback)
    const orphans = sortCampaignsByReminder(filteredCampaigns.filter(c => !platforms.find(p => p.id === c.platform)));
    if (orphans.length > 0) {
        groupedCampaigns.push({
            platform: { id: 'unknown', display_name: 'Unassigned', color: '#64748b' } as any,
            campaigns: orphans
        });
    }

    const openEdit = (id: string) => {
        setEditingId(id);
        setIsEditModalOpen(true);
    };

    return (
        <div className="page-container camp-overview-page">
            <style>{`
                ${createSafeInteractionScopeCss('.camp-overview-page', [...SAFE_BUTTON_SELECTORS, ...SAFE_CARD_SELECTORS])}
            `}</style>
            {/* Header Area */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2.5rem',
                marginTop: '1rem',
                padding: '0 0.5rem'
            }}>
                <div>
                    <h1 style={{
                        fontSize: 'var(--text-3xl)',
                        fontWeight: 800,
                        color: 'hsl(var(--primary))',
                        letterSpacing: '-0.03em',
                        margin: 0,
                        lineHeight: 1.2
                    }}>
                        Campaign Tracking
                    </h1>
                    <p style={{
                        color: 'var(--text-dim)',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        marginTop: '0.4rem',
                        opacity: 0.8
                    }}>
                        Monitoring {filteredCampaigns.length} active monitors across all channels
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <SafeButton
                        onClick={() => {
                            setSearchParams({});
                        }}
                        className="hero-btn"
                        style={{
                            padding: '0.65rem 1.25rem',
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            background: hasActiveFilters ? 'hsl(var(--primary))' : 'var(--bg-content)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '12px',
                            visibility: hasActiveFilters ? 'visible' : 'hidden',
                            pointerEvents: hasActiveFilters ? 'auto' : 'none',
                            color: hasActiveFilters ? 'white' : 'var(--text-dim)',
                            boxShadow: hasActiveFilters ? '0 4px 12px hsla(var(--primary) / 0.3)' : 'var(--shadow-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        Reset Filters
                    </SafeButton>

                    <button
                        onClick={() => openEdit(null as any)}
                        className="hero-btn hero-btn-primary"
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: '14px',
                            fontSize: '0.95rem'
                        }}
                    >
                        <Plus size={20} strokeWidth={3} />
                        New Campaign
                    </button>
                </div>
            </div>
            {/* Filters Cluster */}
            <div style={{ marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '1rem' }}>
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    padding: '0.85rem',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '1.25rem',
                    background: 'var(--bg-overlay)',
                    boxShadow: 'var(--shadow-subtle)',
                }}>
                    <div className="filter-group">
                        <label>Search Camp</label>
                        <input
                            type="text"
                            value={filterName}
                            onChange={(e) => setFilterName(e.target.value)}
                            placeholder="Search by campaign name..."
                            style={{ minWidth: '320px', borderRadius: '12px' }}
                        />
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
                            <option value="all">Any</option>
                            <option value="normal">Normal</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </select>
                    </div>
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.5rem 0.85rem',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '1.1rem',
                    background: 'var(--bg-overlay)',
                    boxShadow: 'var(--shadow-subtle)',
                }}>
                    <div className="filter-group">
                        <label style={{ fontSize: '0.65rem', marginBottom: '0.15rem' }}>View Mode</label>
                        <div
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
                                    <button
                                        key={mode.id}
                                        onClick={() => setViewMode(mode.id)}
                                        className="hero-btn"
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
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)', margin: '0 0.25rem' }} />

                    <div className="filter-group">
                        <label style={{ fontSize: '0.65rem', marginBottom: '0.15rem' }}>Quick Filters</label>
                        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                            {[
                                { id: 'alerts', label: 'Alerts', active: alertsOnlyEnabled, toggle: setToggleReminders },
                                { id: 'all', label: 'All', active: filterShowAll, toggle: setToggleShowAll },
                                { id: 'meta', label: 'Metadata', active: filterMetadata, toggle: setToggleMetadata }
                            ].map((item) => (
                                <div
                                    key={item.id}
                                    onClick={item.toggle}
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
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ flex: 1 }} />
            </div>

            {/* Status Dashboard Row */}
            <div style={{
                marginBottom: '1.5rem',
                padding: '0.65rem 1.25rem',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '0.6rem',
                background: 'var(--bg-content)',
                border: '1px solid hsla(var(--primary) / 0.1)',
                boxShadow: 'var(--shadow-glass)',
                borderRadius: '1.25rem'
            }}>
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
                        activeBackground="#ef4444"
                        inactiveBackground="rgba(239, 68, 68, 0.05)"
                        activeBorder="#ef4444"
                        inactiveBorder="rgba(239, 68, 68, 0.12)"
                        activeColor="#fff"
                        inactiveColor="#ef4444"
                        activeShadow="0 0 15px rgba(239, 68, 68, 0.4)"
                        dimmed={reminderQuickFilter !== 'all' && reminderQuickFilter !== 'overdue'}
                        indicator={<span style={{ width: '6px', height: '6px', borderRadius: '50%', background: reminderQuickFilter === 'overdue' ? '#fff' : '#ef4444', boxShadow: reminderQuickFilter === 'overdue' ? '0 0 8px #fff' : '0 0 8px #ef4444' }} />}
                    >
                        Overdue: {summary.overdue}
                    </FilterChip>

                    <FilterChip
                        active={reminderQuickFilter === 'today'}
                        onClick={() => setReminderQuickFilter(reminderQuickFilter === 'today' ? 'all' : 'today')}
                        activeBackground="#f59e0b"
                        inactiveBackground="rgba(245, 158, 11, 0.05)"
                        activeBorder="#f59e0b"
                        inactiveBorder="rgba(245, 158, 11, 0.12)"
                        activeColor="#fff"
                        inactiveColor="#f59e0b"
                        activeShadow="0 0 15px rgba(245, 158, 11, 0.4)"
                        dimmed={reminderQuickFilter !== 'all' && reminderQuickFilter !== 'today'}
                        indicator={<span style={{ width: '6px', height: '6px', borderRadius: '50%', background: reminderQuickFilter === 'today' ? '#fff' : '#f59e0b', boxShadow: reminderQuickFilter === 'today' ? '0 0 8px #fff' : '0 0 8px #f59e0b' }} />}
                    >
                        Today: {summary.today}
                    </FilterChip>

                    <FilterChip
                        active={reminderQuickFilter === 'upcoming'}
                        onClick={() => setReminderQuickFilter(reminderQuickFilter === 'upcoming' ? 'all' : 'upcoming')}
                        activeBackground="hsl(var(--primary))"
                        inactiveBackground="var(--bg-main)"
                        activeBorder="hsl(var(--primary))"
                        inactiveBorder="var(--border-subtle)"
                        activeColor="#fff"
                        inactiveColor="var(--text-dim)"
                        activeShadow="0 0 15px hsla(var(--primary) / 0.4)"
                        dimmed={reminderQuickFilter !== 'all' && reminderQuickFilter !== 'upcoming'}
                        indicator={<span style={{ width: '6px', height: '6px', borderRadius: '50%', background: reminderQuickFilter === 'upcoming' ? '#fff' : 'var(--text-muted)', boxShadow: reminderQuickFilter === 'upcoming' ? '0 0 8px #fff' : 'none' }} />}
                    >
                        Next 3 days: {summary.upcoming}
                    </FilterChip>
                </div>
            </div >

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
                                background: 'var(--bg-content)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '1rem',
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
                    <div style={{
                        padding: '4rem 2rem',
                        textAlign: 'center',
                        background: 'var(--bg-content)',
                        borderRadius: '2rem',
                        border: '1px dashed var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1.5rem'
                    }}>
                        <div style={{ fontSize: '3rem' }}>🔍</div>
                        <div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>No campaigns found</h3>
                            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Try adjusting your filters or search keywords.</p>
                        </div>
                        <button
                            onClick={() => setSearchParams({})}
                            className="hero-btn hero-btn-primary"
                            style={{ padding: '0.75rem 1.75rem', borderRadius: '12px' }}
                        >
                            Clear All Filters
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {groupedCampaigns.map((group) => {
                            const isCollapsed = collapsedSections[group.platform.id];
                            return (
                                <div key={group.platform.id} className="animate-fade">
                                    <div
                                        onClick={() => toggleSection(group.platform.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            marginBottom: isCollapsed ? '0' : '1.25rem',
                                            cursor: 'pointer',
                                            padding: '0.5rem',
                                            borderRadius: '8px',
                                            transition: SAFE_INTERACTIVE_TRANSITION,
                                            userSelect: 'none'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'var(--bg-overlay)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        {isCollapsed ? (
                                            <ChevronRight size={18} className="text-muted" />
                                        ) : (
                                            <ChevronDown size={18} className="text-muted" />
                                        )}
                                        <div style={{ width: '8px', height: '24px', background: group.platform.color, borderRadius: '4px' }} />
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', textTransform: 'uppercase', margin: 0 }}>
                                            {group.platform.display_name}
                                        </h3>
                                        <div style={{ height: '1px', flex: 1, background: 'var(--border-subtle)', marginLeft: '0.5rem', opacity: 0.5 }} />
                                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>{group.campaigns.length} campaigns</span>
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
                                                padding: '0 0.5rem'
                                            }}
                                        >
                                            {group.campaigns.map((campaign: any) => (
                                                <CampaignCard
                                                    key={campaign.id}
                                                    campaign={campaign}
                                                    platform={campaign.platform_data}
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
                                </div>
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
