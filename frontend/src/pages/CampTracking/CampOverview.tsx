import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Loader2, Check, ChevronDown, ChevronRight, LayoutGrid, Siren, ClockAlert } from 'lucide-react';
import CampaignCard from '../../components/campaign/CampaignCard';
import EditCampaignModal from '../../components/campaign/EditCampaignModal';
import { Campaign, CampaignPlatform, CampaignReminder } from '../../types/campaign';
import { pb } from '../../lib/pocketbase';

type ReminderState = 'none' | 'upcoming' | 'today' | 'overdue';
type OverviewMode = 'comfortable' | 'compact' | 'alert';
type ReminderQuickFilter = 'all' | 'overdue' | 'today' | 'upcoming';
type FreshnessState = 'fresh' | 'watch' | 'stale';
type ReminderPriority = 'low' | 'medium' | 'high';
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
    { id: 'alert', label: 'Alert Focus', icon: Siren },
];

const QUICK_FILTERS: Array<{ id: ReminderQuickFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'today', label: 'Today' },
    { id: 'upcoming', label: 'Next 3 days' },
];

const PRIORITY_RANK: Record<'low' | 'medium' | 'high', number> = {
    high: 0,
    medium: 1,
    low: 2,
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

export default function CampOverview() {
    const [searchParams, setSearchParams] = useSearchParams();

    const filterPlatform = searchParams.get('platform') || 'all';
    const filterPriority = searchParams.get('priority') || 'all';
    const filterName = searchParams.get('q') || '';
    const filterReminders = searchParams.get('reminders') === 'true';
    const viewMode = (searchParams.get('view') as OverviewMode) || 'comfortable';
    const reminderQuickFilter = (searchParams.get('due') as ReminderQuickFilter) || 'all';
    const compactCards = viewMode === 'compact' || viewMode === 'alert';
    const alertsOnlyEnabled = filterReminders || viewMode === 'alert';

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
            if (viewMode === 'alert') {
                prev.set('view', 'compact');
                prev.delete('reminders');
                return prev;
            }
            if (filterReminders) prev.delete('reminders');
            else prev.set('reminders', 'true');
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
                sort: 'display_name',
            });
        },
    });

    // Fetch campaigns with platform expand
    const { data: campaigns = [], isLoading, refetch } = useQuery<Campaign[]>({
        queryKey: ['campaigns', filterPlatform, filterPriority],
        queryFn: async () => {
            let filter = '';
            const filters: string[] = [];

            if (filterPlatform !== 'all') {
                filters.push(`platform = "${filterPlatform}"`);
            }

            if (filterPriority !== 'all') {
                filters.push(`priority = "${filterPriority}"`);
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
    });

    const now = useMemo(() => getStartOfDay(new Date()), []);
    const reminderByCampaign = useMemo(() => {
        const bucket = new Map<string, CampaignReminder[]>();
        reminders.forEach((reminder) => {
            if (!bucket.has(reminder.campaign)) {
                bucket.set(reminder.campaign, []);
            }
            bucket.get(reminder.campaign)!.push(reminder);
        });
        return bucket;
    }, [reminders]);

    // Get enriched campaigns with platform data and reminder state
    const enrichedCampaigns: EnrichedCampaign[] = campaigns.map((campaign: any) => {
        const platform = platforms.find((p) => p.id === campaign.platform);
        const campaignReminders = reminderByCampaign.get(campaign.id) || [];

        let reminderState: ReminderState = 'none';
        let nearestDueInDays: number | null = null;
        let priority: 'low' | 'medium' | 'high' = 'low';
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

    // Filter by reminders, alert focus, and quick due filters
    const nameKeyword = filterName.trim().toLowerCase();
    const filteredCampaigns = enrichedCampaigns.filter((campaign) => {
        if (nameKeyword && !campaign.name.toLowerCase().includes(nameKeyword)) return false;
        if (alertsOnlyEnabled && !campaign.hasPendingReminders) return false;
        if (reminderQuickFilter !== 'all' && campaign.reminderState !== reminderQuickFilter) return false;
        return true;
    });

    const summary = filteredCampaigns.reduce(
        (acc, campaign) => {
            if (campaign.reminderState === 'overdue') acc.overdue += 1;
            if (campaign.reminderState === 'today') acc.today += 1;
            if (campaign.reminderState === 'upcoming') acc.upcoming += 1;
            return acc;
        },
        { overdue: 0, today: 0, upcoming: 0 },
    );

    const sortCampaignsByReminder = (items: EnrichedCampaign[]) =>
        [...items].sort((a, b) => {
            const reminderRankDiff = REMINDER_STATE_RANK[a.reminderState] - REMINDER_STATE_RANK[b.reminderState];
            if (reminderRankDiff !== 0) return reminderRankDiff;

            const dueDiffA = a.nearestDueInDays ?? Number.MAX_SAFE_INTEGER;
            const dueDiffB = b.nearestDueInDays ?? Number.MAX_SAFE_INTEGER;
            if (dueDiffA !== dueDiffB) return dueDiffA - dueDiffB;

            const priorityA = PRIORITY_RANK[a.highestPriority || 'low'];
            const priorityB = PRIORITY_RANK[b.highestPriority || 'low'];
            if (priorityA !== priorityB) return priorityA - priorityB;

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
    const hasActiveFilters = filterPlatform !== 'all'
        || filterPriority !== 'all'
        || !!filterName.trim()
        || filterReminders
        || viewMode !== 'comfortable'
        || reminderQuickFilter !== 'all';

    return (
        <div className="page-container">
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '1.5rem',
                    marginTop: '0.5rem'
                }}
            >
                <div>
                    <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'hsl(var(--primary))', letterSpacing: '-0.03em' }}>
                        Campaign Tracking
                    </h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                        {filteredCampaigns.length} active monitors
                    </p>
                </div>

                <button
                    className="hero-btn hero-btn-primary"
                    onClick={() => {
                        setEditingId(null);
                        setIsEditModalOpen(true);
                    }}
                >
                    <Plus size={18} />
                    New Campaign
                </button>
            </div>

            {/* Filters */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '0.9rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', padding: '0.65rem', border: '1px solid var(--border-subtle)', borderRadius: '0.85rem', background: 'var(--bg-overlay)' }}>
                    <div className="filter-group">
                        <label>Search Camp</label>
                        <input
                            type="text"
                            value={filterName}
                            onChange={(e) => setFilterName(e.target.value)}
                            placeholder="Search by campaign name..."
                            style={{ minWidth: '320px' }}
                        />
                    </div>

                    <div className="filter-group">
                        <label>Platform</label>
                        <select
                            value={filterPlatform}
                            onChange={(e) => setFilterPlatform(e.target.value)}
                            style={{ minWidth: '160px' }}
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
                                color: filterPriority === 'high' ? '#ef4444' : (filterPriority === 'medium' ? '#f59e0b' : 'inherit'),
                                fontWeight: filterPriority !== 'all' && filterPriority !== 'normal' ? 700 : 500
                            }}
                        >
                            <option value="all">Any Priority</option>
                            <option value="normal">Nor (Normal)</option>
                            <option value="medium">Med (Watch)</option>
                            <option value="high">Hi (Critical)</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', padding: '0.65rem', border: '1px solid var(--border-subtle)', borderRadius: '0.85rem', background: 'var(--bg-overlay)' }}>
                    <div className="filter-group">
                        <label>Reminder Window</label>
                        <select
                            value={reminderQuickFilter}
                            onChange={(e) => setReminderQuickFilter(e.target.value as ReminderQuickFilter)}
                            style={{ minWidth: '150px' }}
                        >
                            {QUICK_FILTERS.map((filter) => (
                                <option key={filter.id} value={filter.id}>
                                    {filter.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label style={{ opacity: 0 }}>&nbsp;</label>
                        <div
                            onClick={setToggleReminders}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                padding: '0.5rem 0.85rem',
                                background: alertsOnlyEnabled ? 'var(--accent-glow)' : 'var(--bg-content)',
                                border: `1px solid ${alertsOnlyEnabled ? 'hsl(var(--primary))' : 'var(--border-subtle)'}`,
                                borderRadius: '0.65rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                userSelect: 'none',
                                height: '40px'
                            }}
                        >
                            <div style={{
                                width: '14px',
                                height: '14px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-subtle)',
                                background: alertsOnlyEnabled ? 'hsl(var(--primary))' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white'
                            }}>
                                {alertsOnlyEnabled && <Check size={10} strokeWidth={4} />}
                            </div>
                            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: alertsOnlyEnabled ? 'hsl(var(--primary))' : 'var(--text-dim)' }}>
                                Alerts Only
                            </span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', padding: '0.65rem', border: '1px solid var(--border-subtle)', borderRadius: '0.85rem', background: 'var(--bg-overlay)' }}>
                    <div className="filter-group">
                        <label>View Mode</label>
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                background: 'var(--bg-overlay)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '0.7rem',
                                padding: '0.2rem',
                                gap: '0.25rem',
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
                                            padding: '0.4rem 0.7rem',
                                            borderRadius: '0.5rem',
                                            fontSize: 'var(--text-xs)',
                                            fontWeight: 700,
                                            background: isActive ? 'hsl(var(--primary))' : 'transparent',
                                            color: isActive ? 'var(--text-on-accent)' : 'var(--text-dim)',
                                            border: 'none',
                                        }}
                                    >
                                        <Icon size={13} />
                                        {mode.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div style={{ flex: 1 }} />

                <button
                    onClick={() => {
                        setSearchParams({});
                    }}
                    className="hero-btn hero-btn-ghost"
                    style={{
                        alignSelf: 'flex-end',
                        padding: '0.45rem 0.75rem',
                        fontSize: 'var(--text-xs)',
                        visibility: hasActiveFilters ? 'visible' : 'hidden',
                        pointerEvents: hasActiveFilters ? 'auto' : 'none',
                    }}
                >
                    Reset
                </button>
            </div>

            <div
                className="hero-card"
                style={{
                    marginBottom: '1.5rem',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '0.7rem',
                    background: 'var(--bg-overlay)',
                }}
            >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-dim)', fontSize: 'var(--text-sm)', fontWeight: 700 }}>
                    <ClockAlert size={14} />
                    Reminder summary
                </div>
                <div style={{ marginLeft: '0.3rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.3rem 0.55rem', borderRadius: '999px', border: '1px solid var(--border-subtle)', background: 'hsla(var(--primary) / 0.16)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-main)' }}>
                    Overdue: {summary.overdue}
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.3rem 0.55rem', borderRadius: '999px', border: '1px solid var(--border-subtle)', background: 'hsla(var(--primary) / 0.11)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-main)' }}>
                    Today: {summary.today}
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.3rem 0.55rem', borderRadius: '999px', border: '1px solid var(--border-subtle)', background: 'var(--bg-content)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-main)' }}>
                    Next 3 days: {summary.upcoming}
                </div>
                {viewMode === 'alert' && (
                    <span style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', color: 'hsl(var(--primary))', fontWeight: 700 }}>
                        Alert Focus: Alerts Only + Compact are active
                    </span>
                )}
            </div>

            {/* Campaign Cards Grid */}
            {isLoading ? (
                <div style={{ padding: '8rem', textAlign: 'center', color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                    <Loader2 size={40} className="animate-spin" style={{ color: 'hsl(var(--primary))' }} />
                    <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Syncing monitors...</div>
                </div>
            ) : filteredCampaigns.length === 0 ? (
                <div
                    className="hero-card"
                    style={{
                        padding: '6rem 4rem',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1.5rem'
                    }}
                >
                    <div style={{ padding: '2rem', background: 'var(--accent-glow)', borderRadius: '50%', color: 'hsl(var(--primary))' }}>
                        <Plus size={48} />
                    </div>
                    <div style={{ maxWidth: '400px' }}>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>No monitors found</h3>
                        <p style={{ color: 'var(--text-dim)', fontSize: '1rem', lineHeight: '1.6' }}>
                            {campaigns.length === 0
                                ? "You haven't tracked any campaigns yet. Start optimization by creating your first one."
                                : "We couldn't find any campaigns matching your current filters. Try adjusting them."}
                        </p>
                    </div>
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
                                        transition: 'all 0.2s',
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
            )}

            <EditCampaignModal
                campaignId={editingId || undefined}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={() => refetch()}
            />
        </div>
    );
}
