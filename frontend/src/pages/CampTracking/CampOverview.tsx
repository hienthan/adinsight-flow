import { useDeferredValue, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Plus,
    Check,
    ChevronDown,
    ChevronRight,
    LayoutGrid,
    RefreshCw,
    Search,
    Pause,
    Play,
    FlaskConical,
    Archive,
    X,
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
import { createAmbientSurface, toAlphaColor, extractBaseColor, isGradientColor } from '../../components/common/ui';
import { MultiSelectDropdown } from '../../components/common/MultiSelectDropdown';

type ReminderState = 'none' | 'upcoming' | 'today' | 'overdue';
type OverviewMode = 'comfortable' | 'compact';
type ReminderQuickFilter = 'all' | 'overdue' | 'today' | 'upcoming';
type ReminderPriority = 'low' | 'medium' | 'high' | 'critical';
type CampaignSortMode = 'smart' | 'created_desc' | 'created_asc' | 'name_asc' | 'name_desc';
type ReviewSource = 'review' | 'campaign' | 'reminder' | 'none';
type EnrichedCampaign = Campaign & {
    platformData?: CampaignPlatform;
    reminderState: ReminderState;
    nearestDueInDays: number | null;
    hasPendingReminders: boolean;
    specialReminderSignals: string[];
    hasCriticalRLinkAlert: boolean;
    highestPriority?: ReminderPriority;
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

const SORT_OPTIONS: Array<{ value: CampaignSortMode; label: string }> = [
    { value: 'name_asc', label: 'A-Z' },
    { value: 'smart', label: 'Smart' },
    { value: 'name_desc', label: 'Z-A' },
    { value: 'created_desc', label: 'New' },
    { value: 'created_asc', label: 'Old' },
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

const getCampaignCreatedDateTimestamp = (campaign: Campaign): number => {
    const createdDate = parseDateOnly(campaign.created_date);
    if (createdDate) return createdDate.getTime();

    const pocketBaseCreated = campaign.created ? new Date(campaign.created).getTime() : Number.NaN;
    return Number.isNaN(pocketBaseCreated) ? 0 : pocketBaseCreated;
};

const parseTimestamp = (input?: string | null): Date | null => {
    if (!input || typeof input !== 'string') return null;
    const normalized = input.trim();
    if (!normalized) return null;

    const normalizedTimestamp = normalized.includes(' ') ? normalized.replace(' ', 'T') : normalized;
    const parsedTimestamp = new Date(normalizedTimestamp);
    return Number.isNaN(parsedTimestamp.getTime()) ? null : parsedTimestamp;
};

const STATUS_RANK: Record<string, number> = {
    active: 0,
    testing: 1,
    archived: 2,
    paused: 3,
};

const isTROASCampaign = (campaign: any) =>
    campaign.bidding_strategy === 'target_roas' || campaign.specialReminderSignals?.includes('tROAS');

const isTCPACampaign = (campaign: any) =>
    campaign.bidding_strategy === 'target_cpa' || campaign.specialReminderSignals?.includes('tCPA');

const isMaxConvCampaign = (campaign: any) =>
    campaign.bidding_strategy === 'max_conversions' || campaign.specialReminderSignals?.includes('maxConv');

const isMaxValueCampaign = (campaign: any) =>
    campaign.bidding_strategy === 'max_conversion_value' || campaign.specialReminderSignals?.includes('maxV') || campaign.specialReminderSignals?.includes('maxValue');

export default function CampOverview() {
    const [searchParams, setSearchParams] = useSearchParams();

    const filterPlatformParam = searchParams.get('platform') || '';
    const selectedPlatformIds = useMemo(
        () => filterPlatformParam.split('|').map((value) => value.trim()).filter((value) => value && value !== 'all'),
        [filterPlatformParam],
    );
    const hasPlatformFilter = selectedPlatformIds.length > 0;
    const filterPriority = searchParams.get('priority') || 'all';
    const filterName = searchParams.get('q') || '';
    const filterIsTesting = searchParams.get('is_testing') === 'true';
    const filterCaseStudy = searchParams.get('case_study') === 'true';
    const filterReminders = searchParams.get('reminders') === 'true';
    const filterRLink = searchParams.get('rlink') === 'true';
    const filterMaxValue = searchParams.get('max_value') === 'true' || searchParams.get('maxv') === 'true';
    const filterMaxConv = searchParams.get('max_conv') === 'true';
    const filterTROAS = searchParams.get('troas') === 'true';
    const filterTCPA = searchParams.get('tcpa') === 'true';
    const filterNoTraffic = searchParams.get('no_traffic') === 'true';
    const filterStop = searchParams.get('stop') === 'true';
    const filterCriticalRLink = searchParams.get('rlink_critical') === 'true';
    const filterShowAll = searchParams.get('all') === 'true';
    const filterMetadata = searchParams.get('has_meta') === 'true';
    const filterLeads = searchParams.get('leads') || '';
    const viewMode = (searchParams.get('view') as OverviewMode) || 'compact';
    const reminderQuickFilter = (searchParams.get('due') as ReminderQuickFilter) || 'all';
    const sortMode = (searchParams.get('sort') as CampaignSortMode) || 'name_asc';
    const compactCards = viewMode === 'compact';
    const [showCompactSearch, setShowCompactSearch] = useState(false);
    const alertsOnlyEnabled = filterReminders;
    const deferredFilterName = useDeferredValue(filterName);

    const setFilterPlatform = (val: string) => {
        setSearchParams((prev: URLSearchParams) => {
            const normalized = val
                .split('|')
                .map((value) => value.trim())
                .filter((value, index, values) => value && value !== 'all' && values.indexOf(value) === index)
                .join('|');
            if (!normalized) prev.delete('platform');
            else prev.set('platform', normalized);
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

    const setFilterLeads = (val: string) => {
        setSearchParams((prev: URLSearchParams) => {
            if (!val) prev.delete('leads');
            else prev.set('leads', val);
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

    const setToggleIsTesting = () => {
        setSearchParams((prev: URLSearchParams) => {
            if (filterIsTesting) prev.delete('is_testing');
            else prev.set('is_testing', 'true');
            return prev;
        });
    };

    const setToggleCaseStudy = () => {
        setSearchParams((prev: URLSearchParams) => {
            if (filterCaseStudy) prev.delete('case_study');
            else prev.set('case_study', 'true');
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

    const setToggleRLink = () => {
        setSearchParams((prev: URLSearchParams) => {
            if (filterRLink) prev.delete('rlink');
            else prev.set('rlink', 'true');
            return prev;
        });
    };

    const setToggleMaxValue = () => {
        setSearchParams((prev: URLSearchParams) => {
            if (filterMaxValue) {
                prev.delete('max_value');
                prev.delete('maxv');
            } else {
                prev.set('max_value', 'true');
            }
            return prev;
        });
    };

    const setToggleMaxConv = () => {
        setSearchParams((prev: URLSearchParams) => {
            if (filterMaxConv) prev.delete('max_conv');
            else prev.set('max_conv', 'true');
            return prev;
        });
    };

    const setToggleTROAS = () => {
        setSearchParams((prev: URLSearchParams) => {
            if (filterTROAS) prev.delete('troas');
            else prev.set('troas', 'true');
            return prev;
        });
    };

    const setToggleTCPA = () => {
        setSearchParams((prev: URLSearchParams) => {
            if (filterTCPA) prev.delete('tcpa');
            else prev.set('tcpa', 'true');
            return prev;
        });
    };

    const setToggleNoTraffic = () => {
        setSearchParams((prev: URLSearchParams) => {
            if (filterNoTraffic) prev.delete('no_traffic');
            else prev.set('no_traffic', 'true');
            return prev;
        });
    };

    const setToggleStop = () => {
        setSearchParams((prev: URLSearchParams) => {
            if (filterStop) prev.delete('stop');
            else prev.set('stop', 'true');
            return prev;
        });
    };



    const setToggleCriticalRLink = () => {
        setSearchParams((prev: URLSearchParams) => {
            if (filterCriticalRLink) prev.delete('rlink_critical');
            else prev.set('rlink_critical', 'true');
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
            if (mode === 'compact') prev.delete('view');
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

    const setSortMode = (val: CampaignSortMode) => {
        setSearchParams((prev: URLSearchParams) => {
            if (val === 'name_asc') prev.delete('sort');
            else prev.set('sort', val);
            return prev;
        });
    };

    const queryClient = useQueryClient();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
    const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
    const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);

    const toggleSelectCampaign = (id: string) => {
        setSelectedCampaignIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectPlatformGroup = (campaignIds: string[]) => {
        setSelectedCampaignIds((prev) => {
            const next = new Set(prev);
            const allSelected = campaignIds.length > 0 && campaignIds.every((id) => next.has(id));
            if (allSelected) {
                campaignIds.forEach((id) => next.delete(id));
            } else {
                campaignIds.forEach((id) => next.add(id));
            }
            return next;
        });
    };

    const clearSelection = () => {
        setSelectedCampaignIds(new Set());
    };

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

    const hasTripDirectSelected = useMemo(() => {
        if (selectedPlatformIds.length === 0) return true;
        const leadsPlats = platforms.filter(p => p.platform_name === 'tripdirect' || p.platform_name === 'huytrip');
        return leadsPlats.some(p => selectedPlatformIds.includes(p.id));
    }, [selectedPlatformIds, platforms]);

    // Fetch campaigns with platform expand
    const { data: campaigns = [], isLoading, refetch } = useQuery<Campaign[]>({
        queryKey: ['campaigns', selectedPlatformIds.join('|')],
        queryFn: async () => {
            let filter = '';
            const filters: string[] = [];

            if (selectedPlatformIds.length === 1) {
                filters.push(`platform = "${selectedPlatformIds[0]}"`);
            } else if (selectedPlatformIds.length > 1) {
                filters.push(`(${selectedPlatformIds.map((platformId) => `platform = "${platformId}"`).join(' || ')})`);
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
    const { data: pendingReminders = [] } = useQuery<CampaignReminder[]>({
        queryKey: ['reminders', 'pending'],
        queryFn: async () => {
            return await pb.collection('campaign_reminders').getFullList<CampaignReminder>({
                filter: 'status = "pending"',
                sort: 'reminder_date',
            });
        },
        staleTime: 1000 * 60 * 60 * 4, // 4 hours
    });

    const { data: reminderActivity = [] } = useQuery<CampaignReminder[]>({
        queryKey: ['reminders', 'activity'],
        queryFn: async () => {
            return await pb.collection('campaign_reminders').getFullList<CampaignReminder>({
                sort: '-updated,-created',
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

    const pendingReminderByCampaign = useMemo(() => {
        const bucket = new Map<string, CampaignReminder[]>();
        pendingReminders.forEach((reminder) => {
            if (reminder.campaign) {
                if (!bucket.has(reminder.campaign)) {
                    bucket.set(reminder.campaign, []);
                }
                bucket.get(reminder.campaign)!.push(reminder);
            }
        });
        return bucket;
    }, [pendingReminders]);

    const reminderActivityByCampaign = useMemo(() => {
        const bucket = new Map<string, CampaignReminder[]>();
        reminderActivity.forEach((reminder) => {
            if (reminder.campaign) {
                if (!bucket.has(reminder.campaign)) {
                    bucket.set(reminder.campaign, []);
                }
                bucket.get(reminder.campaign)!.push(reminder);
            }
        });
        return bucket;
    }, [reminderActivity]);

    // Get enriched campaigns with platform data and reminder state
    const enrichedCampaigns: EnrichedCampaign[] = useMemo(() => campaigns.map((campaign) => {
        const platform = platformMap.get(campaign.platform);
        const pendingCampaignReminders = pendingReminderByCampaign.get(campaign.id) || [];
        const activityReminders = reminderActivityByCampaign.get(campaign.id) || [];

        let reminderState: ReminderState = 'none';
        let nearestDueInDays: number | null = null;
        let priority: ReminderPriority = 'low';
        let hasActionableReminder = false;
        const specialReminderSignals = new Set<string>();
        const campaignCreatedAt = parseDateOnly(campaign.created_date) ?? parseTimestamp(campaign.created);

        for (const reminder of pendingCampaignReminders) {
            const metricSignals = reminder.check_metrics || [];
            const reminderText = `${reminder.message || ''} ${metricSignals.join(' ')}`.toLowerCase();
            if (reminderText.includes('rlink')) specialReminderSignals.add('rLink');
            if (reminderText.includes('rsa')) specialReminderSignals.add('RSA');
            if (reminderText.includes('maxv') || reminderText.includes('max conversion value') || reminderText.includes('max value')) specialReminderSignals.add('maxV');
            if (reminderText.includes('maxconv') || reminderText.includes('max conversions') || reminderText.includes('max conv')) specialReminderSignals.add('maxConv');
            if (reminderText.includes('troas') || reminderText.includes('target roas')) specialReminderSignals.add('tROAS');
            if (reminderText.includes('tcpa') || reminderText.includes('target cpa')) specialReminderSignals.add('tCPA');
            if (reminderText.includes('notraffic') || reminderText.includes('no traffic')) specialReminderSignals.add('noTraffic');
            if (reminderText.includes('stop') || reminderText.includes(' pause ')) specialReminderSignals.add('Stop');
            if (reminderText.includes('!url')) specialReminderSignals.add('!URL');

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

        const campaignAgeDays = campaignCreatedAt ? Math.max(0, -getDayDiff(campaignCreatedAt, now)) : 0;
        const hasCriticalRLinkAlert = specialReminderSignals.has('rLink') && campaignAgeDays >= 7;

        const manualReviewAt = campaign.last_reviewed_date ? parseDateOnly(campaign.last_reviewed_date) : null;
        const campaignCreatedTimestamp = parseTimestamp(campaign.created);
        const campaignUpdatedAt = parseTimestamp(campaign.updated);
        const latestReminderUpdateAt = activityReminders.reduce<Date | null>((latest, reminder) => {
            const reminderUpdatedAt = parseTimestamp(reminder.updated) ?? parseTimestamp(reminder.created);
            if (!reminderUpdatedAt) return latest;
            if (!latest || reminderUpdatedAt.getTime() > latest.getTime()) return reminderUpdatedAt;
            return latest;
        }, null);

        let latestActivityAt: Date | null = manualReviewAt;
        let reviewSource: ReviewSource = manualReviewAt ? 'review' : 'none';

        if (
            campaignUpdatedAt
            && campaignCreatedTimestamp
            && campaignUpdatedAt.getTime() - campaignCreatedTimestamp.getTime() > 1000
            && (!latestActivityAt || campaignUpdatedAt.getTime() > latestActivityAt.getTime())
        ) {
            latestActivityAt = campaignUpdatedAt;
            reviewSource = 'campaign';
        }

        if (latestReminderUpdateAt && (!latestActivityAt || latestReminderUpdateAt.getTime() > latestActivityAt.getTime())) {
            latestActivityAt = latestReminderUpdateAt;
            reviewSource = 'reminder';
        }

        const reviewOutcomeLabel = reviewSource === 'review'
            ? (
                campaign.last_review_outcome === 'cpc_increase'
                    ? (campaign.bidding_strategy === 'target_cpa' ? 'tCPA ↑' : campaign.bidding_strategy === 'target_roas' ? 'tROAS ↑' : 'CPC ↑')
                    : campaign.last_review_outcome === 'cpc_reduce'
                        ? (campaign.bidding_strategy === 'target_cpa' ? 'tCPA ↓' : campaign.bidding_strategy === 'target_roas' ? 'tROAS ↓' : 'CPC ↓')
                        : campaign.last_review_outcome === 'updated'
                            ? 'Updated'
                            : campaign.last_review_outcome === 'no_change'
                                ? 'No change'
                                : 'Reviewed'
            )
            : reviewSource === 'campaign'
                ? 'Campaign updated'
                : reviewSource === 'reminder'
                    ? 'Reminder updated'
                    : undefined;

        const reviewStatusLabel = reviewOutcomeLabel || 'Never reviewed';

        return {
            ...campaign,
            platformData: platform,
            reminderState,
            nearestDueInDays,
            hasPendingReminders: hasActionableReminder,
            specialReminderSignals: Array.from(specialReminderSignals),
            hasCriticalRLinkAlert,
            highestPriority: hasActionableReminder ? priority : undefined,
            hasReviewed: manualReviewAt !== null,
            reviewStatusLabel,
        };
    }), [campaigns, now, pendingReminderByCampaign, platformMap, reminderActivityByCampaign]);

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
            if (campaign.specialReminderSignals.includes('rLink')) acc.rLink += 1;
            if (isMaxValueCampaign(campaign)) acc.maxValue += 1;
            if (isMaxConvCampaign(campaign)) acc.maxConv += 1;
            if (isTROASCampaign(campaign)) acc.tROAS += 1;
            if (isTCPACampaign(campaign)) acc.tCPA += 1;
            if (campaign.specialReminderSignals.includes('noTraffic')) acc.noTraffic += 1;
            if (campaign.specialReminderSignals.includes('Stop')) acc.stop += 1;
            if (campaign.hasCriticalRLinkAlert) acc.criticalRLink += 1;
            if (campaign.is_testing) acc.testing += 1;
            if (campaign.is_case_study) acc.caseStudy += 1;

            // Priorities
            if (campaign.priority === 'critical') acc.critical += 1;
            if (campaign.priority === 'high') acc.high += 1;

            return acc;
        },
        { overdue: 0, today: 0, upcoming: 0, critical: 0, high: 0, rLink: 0, maxValue: 0, maxConv: 0, tROAS: 0, tCPA: 0, noTraffic: 0, stop: 0, criticalRLink: 0, testing: 0, caseStudy: 0 },
    ), [baseFilteredCampaigns]);

    // 3. Final display list (Applies all interactive filters)
    const filteredCampaigns = useMemo(() => baseFilteredCampaigns.filter((campaign) => {
        if (alertsOnlyEnabled && !campaign.hasPendingReminders) return false;
        if (filterIsTesting && !campaign.is_testing) return false;
        if (filterCaseStudy && !campaign.is_case_study) return false;
        if (filterRLink && !campaign.specialReminderSignals.includes('rLink')) return false;

        const hasBiddingFilter = filterTROAS || filterTCPA || filterMaxConv || filterMaxValue;
        if (hasBiddingFilter) {
            const matchesBidding =
                (filterTROAS && isTROASCampaign(campaign)) ||
                (filterTCPA && isTCPACampaign(campaign)) ||
                (filterMaxConv && isMaxConvCampaign(campaign)) ||
                (filterMaxValue && isMaxValueCampaign(campaign));
            if (!matchesBidding) return false;
        }

        if (filterNoTraffic && !campaign.specialReminderSignals.includes('noTraffic')) return false;
        if (filterStop && !campaign.specialReminderSignals.includes('Stop')) return false;
        if (filterCriticalRLink && !campaign.hasCriticalRLinkAlert) return false;
        if (reminderQuickFilter !== 'all' && campaign.reminderState !== reminderQuickFilter) return false;
        if (filterPriority !== 'all' && campaign.priority !== filterPriority) return false;
        if (filterLeads) {
            const platName = campaign.expand?.platform?.platform_name;
            const isSupported = platName === 'tripdirect' || platName === 'huytrip';
            if (!isSupported || campaign.leads !== filterLeads) return false;
        }
        if (filterMetadata && htmlToPlainText(campaign.metadata || '').trim().length === 0) return false;
        return true;
    }), [alertsOnlyEnabled, baseFilteredCampaigns, filterCriticalRLink, filterIsTesting, filterCaseStudy, filterMetadata, filterNoTraffic, filterPriority, filterLeads, filterRLink, filterStop, filterMaxValue, filterMaxConv, filterTROAS, filterTCPA, reminderQuickFilter]);

    const hasActiveFilters = hasPlatformFilter
        || filterPriority !== 'all'
        || !!filterLeads
        || filterName !== ''
        || filterIsTesting
        || filterCaseStudy
        || alertsOnlyEnabled
        || filterRLink
        || filterMaxValue
        || filterMaxConv
        || filterTROAS
        || filterTCPA
        || filterNoTraffic
        || filterStop
        || filterCriticalRLink
        || filterShowAll
        || filterMetadata
        || sortMode !== 'name_asc';

    const toggleSelectAllVisible = () => {
        setSelectedCampaignIds((prev) => {
            const visibleIds = filteredCampaigns.map((c) => c.id);
            const allSelected = visibleIds.length > 0 && visibleIds.every((id) => prev.has(id));
            if (allSelected) {
                return new Set();
            } else {
                return new Set(visibleIds);
            }
        });
    };

    const handleBatchStatusUpdate = async (newStatus: 'active' | 'paused' | 'testing' | 'archived') => {
        if (selectedCampaignIds.size === 0 || isBatchSubmitting) return;
        setIsBatchSubmitting(true);
        try {
            const ids = Array.from(selectedCampaignIds);
            const updates = ids.map((id) =>
                pb.collection('campaigns').update(id, {
                    status: newStatus,
                    is_testing: newStatus === 'testing' ? true : undefined,
                })
            );
            await Promise.all(updates);
            await refetch();
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            clearSelection();
        } catch (err: any) {
            console.error('Batch status update error:', err);
        } finally {
            setIsBatchSubmitting(false);
        }
    };

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
        { id: 'meta', label: 'Metadata', active: filterMetadata, toggle: setToggleMetadata },
        { id: 'case_study', label: 'Case Study', active: filterCaseStudy, toggle: setToggleCaseStudy }
    ] as const;
    const reminderChipConfig = {
        overdue: REMINDER_CHIP_CONFIG.overdue,
        today: REMINDER_CHIP_CONFIG.today,
        upcoming: REMINDER_CHIP_CONFIG.upcoming,
    };

    const sortCampaigns = (items: EnrichedCampaign[]) =>
        [...items].sort((a, b) => {
            if (sortMode === 'name_asc' || sortMode === 'name_desc') {
                const nameDiff = a.name.localeCompare(b.name);
                if (nameDiff !== 0) {
                    return sortMode === 'name_asc' ? nameDiff : -nameDiff;
                }
                return getCampaignCreatedDateTimestamp(b) - getCampaignCreatedDateTimestamp(a);
            }

            if (sortMode === 'created_desc' || sortMode === 'created_asc') {
                const createdA = getCampaignCreatedDateTimestamp(a);
                const createdB = getCampaignCreatedDateTimestamp(b);
                if (createdA !== createdB) {
                    return sortMode === 'created_desc' ? createdB - createdA : createdA - createdB;
                }
                return a.name.localeCompare(b.name);
            }

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
            const platformCampaigns = sortCampaigns(filteredCampaigns.filter(c => c.platform === platform.id));
            if (platformCampaigns.length > 0) {
                acc.push({
                    platform,
                    campaigns: platformCampaigns
                });
            }
            return acc;
        }, [] as { platform: CampaignPlatform, campaigns: EnrichedCampaign[] }[]);

        const orphans = sortCampaigns(filteredCampaigns.filter(c => !platformMap.has(c.platform)));
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
    }, [filteredCampaigns, platformMap, platforms, sortMode]);

    const openEdit = (id: string | null) => {
        setEditingId(id);
        setIsEditModalOpen(true);
    };

    const shellBackground = {
        background: [
            `radial-gradient(circle at top left, ${toAlphaColor('#3b82f6', 0.1)} 0%, transparent 26%)`,
            `radial-gradient(circle at top right, ${toAlphaColor('#14b8a6', 0.08)} 0%, transparent 24%)`,
            'linear-gradient(180deg, transparent 0%, transparent 100%)',
        ].join(', '),
    };

    return (
        <div className={`page-container camp-overview-page ${compactCards ? 'is-compact-view' : ''}`} style={shellBackground}>
            <style>{`
                ${createSafeInteractionScopeCss('.camp-overview-page', [...SAFE_BUTTON_SELECTORS, ...SAFE_CARD_SELECTORS])}

                .camp-overview-page.is-compact-view .filter-group {
                    gap: 0.2rem;
                }

                .camp-overview-page.is-compact-view .filter-group label {
                    display: none;
                }

                .camp-overview-page.is-compact-view .camp-filter-control {
                    height: 30px;
                    border-radius: 8px;
                    font-size: 0.74rem;
                    padding: 0 0.5rem;
                }

                .camp-overview-page.is-compact-view .camp-filter-segment {
                    padding: 0.16rem;
                    gap: 0.16rem;
                    border-radius: 8px;
                }

                .camp-overview-page.is-compact-view .camp-filter-segment-btn {
                    padding: 0.22rem 0.55rem;
                    font-size: 0.65rem;
                    border-radius: 6px;
                }

                .camp-overview-page.is-compact-view .camp-filter-pill {
                    padding: 0.2rem 0.48rem;
                    border-radius: 8px;
                    gap: 0.35rem;
                }

                .camp-overview-page.is-compact-view .camp-filter-pill-box {
                    width: 11px;
                    height: 11px;
                    border-radius: 3px;
                }

                .camp-overview-page.is-compact-view .camp-filter-pill-label {
                    font-size: 0.68rem;
                }

                .camp-overview-page.is-compact-view .camp-status-filter-chip {
                    padding: 0.22rem 0.52rem !important;
                    font-size: 0.7rem !important;
                    border-radius: 7px !important;
                    gap: 0.35rem !important;
                }

                .camp-overview-page.is-compact-view .camp-status-filter-chip span {
                    width: 5px !important;
                    height: 5px !important;
                }

                .camp-overview-page .filter-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.48rem;
                }

                .camp-overview-page .filter-group label {
                    font-size: 0.68rem;
                    font-weight: 800;
                    color: var(--text-dim);
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    opacity: 0.92;
                }

                .camp-overview-page .camp-filter-control {
                    height: 42px;
                    border-radius: 12px;
                    border: 1px solid color-mix(in srgb, var(--border-subtle) 80%, rgba(59, 130, 246, 0.16) 20%);
                    background: linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 97%, white 3%) 0%, color-mix(in srgb, var(--bg-content) 92%, var(--bg-main) 8%) 100%);
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.62), 0 10px 22px -22px rgba(15, 23, 42, 0.42);
                    color: var(--text-main);
                    transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
                }

                .camp-overview-page .camp-filter-control::placeholder {
                    color: var(--text-muted);
                }

                .camp-overview-page .camp-filter-control:focus {
                    outline: none;
                    border-color: rgba(59, 130, 246, 0.42);
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.08), inset 0 1px 0 rgba(255,255,255,0.72);
                }

                .camp-overview-page .camp-filter-segment {
                    display: inline-flex;
                    align-items: center;
                    background: linear-gradient(180deg, color-mix(in srgb, var(--bg-overlay) 92%, white 8%) 0%, color-mix(in srgb, var(--bg-overlay) 84%, var(--bg-main) 16%) 100%);
                    border: 1px solid color-mix(in srgb, var(--border-subtle) 80%, rgba(59, 130, 246, 0.14) 20%);
                    border-radius: 12px;
                    padding: 0.24rem;
                    gap: 0.24rem;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.44);
                }

                .camp-overview-page .camp-filter-segment-btn {
                    padding: 0.42rem 0.82rem;
                    border-radius: 10px;
                    font-size: 0.7rem;
                    font-weight: 800;
                    border: none;
                    color: var(--text-dim);
                    background: transparent;
                }

                .camp-overview-page .camp-filter-segment-btn.is-active {
                    background: linear-gradient(135deg, hsl(var(--primary)) 0%, color-mix(in srgb, hsl(var(--primary)) 78%, #60a5fa 22%) 100%);
                    color: var(--text-on-accent);
                    box-shadow: 0 14px 24px -18px hsla(var(--primary) / 0.55);
                }

                .camp-overview-page .camp-filter-pill {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.45rem 0.78rem;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: ${SAFE_INTERACTIVE_TRANSITION};
                    user-select: none;
                    background: linear-gradient(180deg, color-mix(in srgb, var(--bg-overlay) 94%, white 6%) 0%, color-mix(in srgb, var(--bg-overlay) 88%, var(--bg-main) 12%) 100%);
                    border: 1px solid color-mix(in srgb, var(--border-subtle) 82%, rgba(59, 130, 246, 0.08) 18%);
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.36);
                }

                .camp-overview-page .camp-filter-pill.is-active {
                    background: linear-gradient(135deg, hsla(var(--primary) / 0.18) 0%, hsla(var(--primary) / 0.08) 100%);
                    border-color: hsla(var(--primary) / 0.3);
                    box-shadow: 0 14px 26px -20px hsla(var(--primary) / 0.38);
                }

                .camp-overview-page .camp-filter-pill-box {
                    width: 14px;
                    height: 14px;
                    border-radius: 4px;
                    border: 1px solid var(--border-subtle);
                    background: var(--bg-overlay);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: ${SAFE_INTERACTIVE_TRANSITION};
                }

                .camp-overview-page .camp-filter-pill.is-active .camp-filter-pill-box {
                    border-color: hsla(var(--primary) / 0.4);
                    background: hsl(var(--primary));
                    box-shadow: 0 0 0 3px hsla(var(--primary) / 0.1);
                }

                .camp-overview-page .camp-filter-pill-label {
                    font-size: 0.75rem;
                    font-weight: 800;
                    color: var(--text-dim);
                }

                .camp-overview-page .camp-filter-pill.is-active .camp-filter-pill-label {
                    color: hsl(var(--primary));
                }

                .dark .camp-overview-page .camp-filter-control {
                    background: linear-gradient(180deg, rgba(15, 23, 42, 0.82) 0%, rgba(2, 6, 23, 0.92) 100%);
                    border-color: rgba(148, 163, 184, 0.18);
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 12px 24px -20px rgba(0,0,0,0.5);
                    color: #f8fafc;
                }

                .dark .camp-overview-page .camp-filter-control::placeholder {
                    color: rgba(248, 250, 252, 0.5);
                }

                .dark .camp-overview-page .camp-filter-control:focus {
                    border-color: rgba(96, 165, 250, 0.4);
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.14), inset 0 1px 0 rgba(255,255,255,0.05);
                }

                .dark .camp-overview-page .camp-filter-segment {
                    background: linear-gradient(180deg, rgba(15,23,42,0.88) 0%, rgba(2,6,23,0.96) 100%);
                    border-color: rgba(148, 163, 184, 0.18);
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
                }

                .dark .camp-overview-page .camp-filter-pill {
                    background: linear-gradient(180deg, rgba(15,23,42,0.76) 0%, rgba(2,6,23,0.92) 100%);
                    border-color: rgba(148, 163, 184, 0.18);
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
                }

                .dark .camp-overview-page .camp-filter-pill.is-active {
                    background: linear-gradient(135deg, hsla(var(--primary) / 0.26) 0%, hsla(var(--primary) / 0.14) 100%);
                    border-color: hsla(var(--primary) / 0.38);
                    box-shadow: 0 14px 26px -20px hsla(var(--primary) / 0.42);
                }

                .dark .camp-overview-page .camp-filter-pill-box {
                    background: rgba(15,23,42,0.92);
                    border-color: rgba(148, 163, 184, 0.22);
                }

                .dark .camp-overview-page .camp-filter-panel {
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 30px -28px rgba(0,0,0,0.5);
                }

                .dark .camp-overview-page .camp-filter-divider {
                    background: linear-gradient(180deg, transparent 0%, rgba(148, 163, 184, 0.2) 20%, rgba(148, 163, 184, 0.2) 80%, transparent 100%);
                }

                .dark .camp-overview-page .camp-filter-control option {
                    background-color: #020617;
                    color: #f8fafc;
                }
            `}</style>
            <SurfaceCard
                padding={compactCards ? '0.4rem 0.85rem' : '1.1rem 1.2rem'}
                radius={compactCards ? '0.95rem' : '1.6rem'}
                style={{
                    ...createAmbientSurface('#3b82f6', 1),
                    marginTop: compactCards ? '0.25rem' : '0.8rem',
                    marginBottom: compactCards ? '0.45rem' : '1rem',
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: compactCards ? '0.5rem' : '1rem',
                    alignItems: 'center',
                }}
            >
                <div style={{ minWidth: 0 }}>
                    <h1 style={{
                        fontSize: compactCards ? '1.15rem' : 'clamp(1.65rem, 2.5vw, 2.2rem)',
                        fontWeight: 850,
                        color: 'var(--text-main)',
                        letterSpacing: '-0.04em',
                        margin: 0,
                        lineHeight: 1.05,
                    }}>
                        Campaign Overview
                    </h1>
                </div>

                <div
                    style={{
                        ...createAmbientSurface('#14b8a6', 0.8),
                        borderRadius: compactCards ? '0.75rem' : '1.25rem',
                        padding: compactCards ? '0.25rem 0.45rem' : '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: compactCards ? '0.35rem' : '0.5rem',
                        flexWrap: 'wrap',
                        minWidth: 0,
                    }}
                >
                    <SafeButton
                        onClick={() => refetch()}
                        className="hero-btn hero-btn-ghost"
                        style={{
                            padding: compactCards ? '0.3rem 0.55rem' : '0.6rem 0.85rem',
                            borderRadius: compactCards ? '0.55rem' : '0.9rem',
                            fontSize: compactCards ? '0.75rem' : undefined,
                            background: 'var(--bg-overlay)',
                            border: '1px solid var(--border-subtle)',
                        }}
                    >
                        <RefreshCw size={compactCards ? 13 : 16} />
                        Refresh
                    </SafeButton>
                    <SafeButton
                        onClick={() => setSearchParams({})}
                        className="hero-btn"
                        style={{
                            padding: compactCards ? '0.3rem 0.55rem' : '0.6rem 0.85rem',
                            borderRadius: compactCards ? '0.55rem' : '0.9rem',
                            fontSize: compactCards ? '0.75rem' : undefined,
                            background: hasActiveFilters ? toAlphaColor('#3b82f6', 0.14) : 'var(--bg-overlay)',
                            border: `1px solid ${hasActiveFilters ? toAlphaColor('#3b82f6', 0.26) : 'var(--border-subtle)'}`,
                            color: hasActiveFilters ? '#7fb3ff' : 'var(--text-dim)',
                        }}
                    >
                        Reset
                    </SafeButton>

                    <SafeButton
                        onClick={() => openEdit(null)}
                        className="hero-btn hero-btn-primary"
                        style={{
                            padding: compactCards ? '0.32rem 0.65rem' : '0.65rem 1rem',
                            borderRadius: compactCards ? '0.55rem' : '0.9rem',
                            fontSize: compactCards ? '0.75rem' : '0.85rem',
                        }}
                    >
                        <Plus size={compactCards ? 14 : 18} strokeWidth={2.5} />
                        New Campaign
                    </SafeButton>
                </div>
            </SurfaceCard>

            {/* Filters Cluster */}
            <SurfaceCard
                padding={compactCards ? '0.4rem 0.6rem' : '1.05rem'}
                radius={compactCards ? '0.9rem' : '1.55rem'}
                style={{
                    ...createAmbientSurface('#2563eb', 0.62),
                    marginBottom: compactCards ? '0.45rem' : '1.25rem',
                    background: [
                        'radial-gradient(circle at top right, rgba(59, 130, 246, 0.14) 0%, transparent 22%)',
                        'radial-gradient(circle at left bottom, rgba(20, 184, 166, 0.1) 0%, transparent 24%)',
                        'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 96%, white 4%) 0%, color-mix(in srgb, var(--bg-content) 90%, var(--bg-main) 10%) 100%)',
                    ].join(', '),
                    border: '1px solid color-mix(in srgb, var(--border-subtle) 74%, rgba(59, 130, 246, 0.24) 26%)',
                    boxShadow: '0 28px 48px -36px rgba(15, 23, 42, 0.78)',
                }}
            >
                <div style={{ ...FILTER_CLUSTER_STYLE, gap: compactCards ? '0.45rem' : '1rem', marginBottom: 0, alignItems: 'stretch' }}>
                <SurfaceCard
                    className="camp-filter-panel"
                    variant="inset"
                    padding={compactCards ? '0.3rem 0.5rem' : '0.95rem 1rem'}
                    style={{
                        ...FILTER_CARD_STYLE,
                        gap: compactCards ? '0.45rem' : '1rem',
                        alignItems: 'center',
                        flex: compactCards ? '1 1 auto' : '1 1 42rem',
                        background: [
                            'radial-gradient(circle at top left, rgba(59, 130, 246, 0.08) 0%, transparent 22%)',
                            'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 98%, white 2%) 0%, color-mix(in srgb, var(--bg-content) 91%, var(--bg-main) 9%) 100%)',
                        ].join(', '),
                        border: '1px solid color-mix(in srgb, var(--border-subtle) 78%, rgba(59, 130, 246, 0.18) 22%)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.42), 0 18px 30px -28px rgba(15, 23, 42, 0.36)',
                    }}
                >
                    {compactCards ? (
                        (showCompactSearch || filterName) ? (
                            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                                <Search size={13} style={{ position: 'absolute', left: '0.65rem', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                <input
                                    className="camp-filter-control"
                                    type="text"
                                    autoFocus
                                    value={filterName}
                                    onChange={(e) => setFilterName(e.target.value)}
                                    placeholder="Search camp..."
                                    style={{
                                        width: '150px',
                                        height: '30px',
                                        fontSize: '0.74rem',
                                        borderRadius: '8px',
                                        paddingLeft: '1.8rem',
                                        paddingRight: '1.4rem',
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFilterName('');
                                        setShowCompactSearch(false);
                                    }}
                                    style={{
                                        position: 'absolute',
                                        right: '0.35rem',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--text-muted)',
                                        padding: '2px',
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                    title="Close search"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ) : (
                            <SafeButton
                                onClick={() => setShowCompactSearch(true)}
                                title="Search campaign"
                                className="hero-btn hero-btn-ghost"
                                style={{
                                    height: '30px',
                                    padding: '0 0.55rem',
                                    borderRadius: '8px',
                                    fontSize: '0.72rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    background: 'var(--bg-overlay)',
                                    border: '1px solid var(--border-subtle)',
                                    color: 'var(--text-dim)',
                                }}
                            >
                                <Search size={13} />
                                <span>Search</span>
                            </SafeButton>
                        )
                    ) : (
                        <div className="filter-group">
                            <label>Search Camp</label>
                            <div style={{ position: 'relative', minWidth: '320px' }}>
                                <Search size={16} style={{ position: 'absolute', left: '0.95rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                <input
                                    className="camp-filter-control"
                                    type="text"
                                    value={filterName}
                                    onChange={(e) => setFilterName(e.target.value)}
                                    placeholder="Search by campaign name..."
                                    style={{
                                        minWidth: '320px',
                                        borderRadius: '12px',
                                        paddingLeft: '2.7rem',
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="filter-group">
                        <label>Platform</label>
                        <div style={{ minWidth: compactCards ? '145px' : '220px' }}>
                            <MultiSelectDropdown
                                options={platforms.map((platform) => ({ label: platform.display_name, value: platform.id, color: platform.color }))}
                                value={selectedPlatformIds.join('|')}
                                onChange={setFilterPlatform}
                                placeholder="All Channels"
                                width={compactCards ? '145px' : '220px'}
                                showSearch
                                variant="premium"
                            />
                        </div>
                    </div>

                    <div className="filter-group">
                        <label>Priority</label>
                        <select
                            className="camp-filter-control"
                            value={filterPriority}
                            onChange={(e) => setFilterPriority(e.target.value)}
                            style={{
                                minWidth: compactCards ? '100px' : '140px',
                                borderRadius: compactCards ? '8px' : '12px',
                                color: filterPriority === 'critical' ? '#d946ef' : (filterPriority === 'high' ? '#ef4444' : (filterPriority === 'medium' ? '#f59e0b' : 'inherit')),
                                fontWeight: filterPriority !== 'all' && filterPriority !== 'normal' ? 700 : 500,
                            }}
                        >
                            {PRIORITY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Sort</label>
                        <select
                            className="camp-filter-control"
                            value={sortMode}
                            onChange={(e) => setSortMode(e.target.value as CampaignSortMode)}
                            style={{
                                minWidth: compactCards ? '80px' : '110px',
                                borderRadius: compactCards ? '8px' : '12px',
                            }}
                        >
                            {SORT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </SurfaceCard>

                <SurfaceCard
                    className="camp-filter-panel"
                    variant="inset"
                    padding={compactCards ? '0.3rem 0.55rem' : '0.8rem 0.95rem'}
                    style={{
                        ...VIEW_CONTROL_CARD_STYLE,
                        gap: compactCards ? '0.45rem' : '1rem',
                        flex: '0 1 auto',
                        justifyContent: 'space-between',
                        background: [
                            'radial-gradient(circle at top right, rgba(20, 184, 166, 0.1) 0%, transparent 26%)',
                            'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 98%, white 2%) 0%, color-mix(in srgb, var(--bg-content) 91%, var(--bg-main) 9%) 100%)',
                        ].join(', '),
                        border: '1px solid color-mix(in srgb, var(--border-subtle) 78%, rgba(20, 184, 166, 0.18) 22%)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.42), 0 18px 30px -28px rgba(15, 23, 42, 0.36)',
                    }}
                >
                    <div className="filter-group">
                        <label style={{ fontSize: '0.65rem', marginBottom: '0.2rem' }}>View Mode</label>
                        <ToolbarGroup
                            className="camp-filter-segment"
                            compact
                            role="group"
                            aria-label="Toggle campaign overview view mode"
                            style={{}}
                        >
                            {VIEW_MODES.map((mode) => {
                                const isActive = viewMode === mode.id;
                                const Icon = mode.icon;
                                return (
                                    <SafeButton
                                        key={mode.id}
                                        onClick={() => setViewMode(mode.id)}
                                        className={`hero-btn camp-filter-segment-btn ${isActive ? 'is-active' : ''}`}
                                        aria-pressed={isActive}
                                        style={{}}
                                    >
                                        <Icon size={12} />
                                        {mode.label}
                                    </SafeButton>
                                );
                            })}
                        </ToolbarGroup>
                    </div>

                    <div style={{
                        width: '1px',
                        alignSelf: 'stretch',
                        background: 'linear-gradient(180deg, transparent 0%, var(--border-subtle) 20%, var(--border-subtle) 80%, transparent 100%)',
                        margin: '0 0.15rem'
                    }} className="camp-filter-divider" />

                    <div className="filter-group">
                        <label style={{ fontSize: '0.65rem', marginBottom: '0.2rem' }}>Quick Filters</label>
                        <div style={{ display: 'flex', gap: compactCards ? '0.35rem' : '0.55rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            {quickFilters.map((item) => (
                                <SafeButton
                                    key={item.id}
                                    onClick={item.toggle}
                                    aria-pressed={item.active}
                                    className={`camp-filter-pill ${item.active ? 'is-active' : ''}`}
                                    style={{}}
                                >
                                    <div className="camp-filter-pill-box">
                                        {item.active && <Check size={10} strokeWidth={4} color="white" />}
                                    </div>
                                    <span className="camp-filter-pill-label">
                                        {item.label}
                                    </span>
                                </SafeButton>
                            ))}

                            {filteredCampaigns.length > 0 && (
                                <SafeButton
                                    onClick={toggleSelectAllVisible}
                                    className={`camp-filter-pill ${filteredCampaigns.every((c) => selectedCampaignIds.has(c.id)) ? 'is-active' : ''}`}
                                    title="Toggle selection of all visible campaigns"
                                >
                                    <div className="camp-filter-pill-box">
                                        {filteredCampaigns.every((c) => selectedCampaignIds.has(c.id)) && <Check size={10} strokeWidth={4} color="white" />}
                                    </div>
                                    <span className="camp-filter-pill-label">
                                        {filteredCampaigns.every((c) => selectedCampaignIds.has(c.id)) ? 'Deselect All' : 'Select All'}
                                    </span>
                                </SafeButton>
                            )}

                            {hasTripDirectSelected && (
                                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                                    <select
                                        className={`camp-filter-pill ${filterLeads ? 'is-active' : ''}`}
                                        value={filterLeads}
                                        onChange={(e) => setFilterLeads(e.target.value)}
                                        style={{
                                            fontSize: compactCards ? '0.7rem' : '0.75rem',
                                            fontWeight: 800,
                                            outline: 'none',
                                            cursor: 'pointer',
                                            padding: compactCards ? '0.2rem 1.4rem 0.2rem 0.5rem' : '0.35rem 1.6rem 0.35rem 0.6rem',
                                            appearance: 'none',
                                            WebkitAppearance: 'none',
                                            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${filterLeads ? '%233b82f6' : '%2364748b'}' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: 'right 0.5rem center',
                                            backgroundSize: '0.7rem',
                                            color: filterLeads ? 'hsl(var(--primary))' : 'var(--text-dim)',
                                        }}
                                    >
                                        <option value="">Leads: Any</option>
                                        <option value="all">Leads: All</option>
                                        <option value="t1">Leads: T1: 3</option>
                                        <option value="t2">Leads: T2: 2</option>
                                        <option value="p1">Leads: P1: 4</option>
                                        <option value="p2">Leads: P2: 2.5</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                </SurfaceCard>
                </div>
            </SurfaceCard>

            {/* Status Dashboard Row */}
            <SurfaceCard
                padding={compactCards ? '0.35rem 0.65rem' : '0.85rem 1.15rem'}
                radius={compactCards ? '0.85rem' : '1.45rem'}
                style={{
                    ...STATUS_CARD_STYLE,
                    ...createAmbientSurface('#8b5cf6', 0.4),
                    marginBottom: compactCards ? '0.45rem' : '1.5rem',
                }}
            >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: compactCards ? '0.35rem' : '0.6rem', alignItems: 'center' }}>
                    {/* Review Rate */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: compactCards ? '0.4rem' : '0.75rem',
                        padding: compactCards ? '0.2rem 0.5rem' : '0.4rem 0.85rem',
                        background: 'var(--bg-overlay)',
                        borderRadius: compactCards ? '6px' : '10px',
                        border: '1px solid var(--border-subtle)',
                        marginRight: compactCards ? '0.25rem' : '0.5rem'
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: compactCards ? '0.52rem' : '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', lineHeight: 1 }}>Review</span>
                            <span style={{ fontSize: compactCards ? '0.74rem' : '0.85rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1.2 }}>{pulseMetrics.reviewRate}%</span>
                        </div>
                        <div style={{ width: compactCards ? '24px' : '40px', height: compactCards ? '3px' : '4px', background: 'var(--bg-overlay)', borderRadius: '2px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ width: `${pulseMetrics.reviewRate}%`, height: '100%', background: 'hsl(var(--primary))' }} />
                        </div>
                    </div>

                    <div style={{ width: '1px', height: compactCards ? '14px' : '20px', background: 'var(--border-subtle)', marginRight: compactCards ? '0.25rem' : '0.5rem' }} />

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

                    <FilterChip
                        active={filterIsTesting}
                        onClick={setToggleIsTesting}
                        activeBackground="#0891b2"
                        inactiveBackground="rgba(8, 145, 178, 0.06)"
                        activeBorder="#0891b2"
                        inactiveBorder="rgba(8, 145, 178, 0.14)"
                        activeColor="#fff"
                        inactiveColor="#0891b2"
                        activeShadow="0 0 15px rgba(8, 145, 178, 0.35)"
                        dimmed={filterPriority !== 'all' || reminderQuickFilter !== 'all' ? !filterIsTesting : false}
                        indicator={<span style={{ width: '6px', height: '6px', borderRadius: '50%', background: filterIsTesting ? '#fff' : '#0891b2', boxShadow: filterIsTesting ? '0 0 8px #fff' : '0 0 8px rgba(8, 145, 178, 0.65)' }} />}
                        title="Campaigns marked as testing"
                    >
                        Testing: {summary.testing}
                    </FilterChip>

                    <FilterChip
                        active={filterCaseStudy}
                        onClick={setToggleCaseStudy}
                        activeBackground="#e0824c"
                        inactiveBackground="rgba(224, 130, 76, 0.06)"
                        activeBorder="#e0824c"
                        inactiveBorder="rgba(224, 130, 76, 0.14)"
                        activeColor="#fff"
                        inactiveColor="#e0824c"
                        activeShadow="0 0 15px rgba(224, 130, 76, 0.35)"
                        dimmed={filterPriority !== 'all' || reminderQuickFilter !== 'all' ? !filterCaseStudy : false}
                        indicator={<span style={{ width: '6px', height: '6px', borderRadius: '50%', background: filterCaseStudy ? '#fff' : '#e0824c', boxShadow: filterCaseStudy ? '0 0 8px #fff' : '0 0 8px rgba(224, 130, 76, 0.65)' }} />}
                        title="Campaigns marked as Case Studies"
                    >
                        Case Study: {summary.caseStudy}
                    </FilterChip>

                    <FilterChip
                        active={filterRLink}
                        onClick={setToggleRLink}
                        activeBackground="#0f766e"
                        inactiveBackground="rgba(15, 118, 110, 0.05)"
                        activeBorder="#0f766e"
                        inactiveBorder="rgba(15, 118, 110, 0.12)"
                        activeColor="#fff"
                        inactiveColor="#0f766e"
                        activeShadow="0 0 15px rgba(15, 118, 110, 0.35)"
                        dimmed={filterPriority !== 'all' || reminderQuickFilter !== 'all' ? !filterRLink : false}
                        indicator={<span style={{ width: '6px', height: '6px', borderRadius: '50%', background: filterRLink ? '#fff' : '#0f766e', boxShadow: filterRLink ? '0 0 8px #fff' : '0 0 8px rgba(15, 118, 110, 0.65)' }} />}
                    >
                        rLink: {summary.rLink}
                    </FilterChip>

                    <FilterChip
                        active={filterTROAS}
                        onClick={setToggleTROAS}
                        activeBackground="#6366f1"
                        inactiveBackground="rgba(99, 102, 241, 0.05)"
                        activeBorder="#6366f1"
                        inactiveBorder="rgba(99, 102, 241, 0.12)"
                        activeColor="#fff"
                        inactiveColor="#6366f1"
                        activeShadow="0 0 15px rgba(99, 102, 241, 0.35)"
                        dimmed={filterPriority !== 'all' || reminderQuickFilter !== 'all' ? !filterTROAS : false}
                        indicator={<span style={{ width: '6px', height: '6px', borderRadius: '50%', background: filterTROAS ? '#fff' : '#6366f1', boxShadow: filterTROAS ? '0 0 8px #fff' : '0 0 8px rgba(99, 102, 241, 0.65)' }} />}
                        title="Campaigns with Target ROAS bidding strategy"
                    >
                        tROAS: {summary.tROAS}
                    </FilterChip>

                    <FilterChip
                        active={filterTCPA}
                        onClick={setToggleTCPA}
                        activeBackground="#06b6d4"
                        inactiveBackground="rgba(6, 182, 212, 0.05)"
                        activeBorder="#06b6d4"
                        inactiveBorder="rgba(6, 182, 212, 0.12)"
                        activeColor="#fff"
                        inactiveColor="#06b6d4"
                        activeShadow="0 0 15px rgba(6, 182, 212, 0.35)"
                        dimmed={filterPriority !== 'all' || reminderQuickFilter !== 'all' ? !filterTCPA : false}
                        indicator={<span style={{ width: '6px', height: '6px', borderRadius: '50%', background: filterTCPA ? '#fff' : '#06b6d4', boxShadow: filterTCPA ? '0 0 8px #fff' : '0 0 8px rgba(6, 182, 212, 0.65)' }} />}
                        title="Campaigns with Target CPA bidding strategy"
                    >
                        tCPA: {summary.tCPA}
                    </FilterChip>

                    <FilterChip
                        active={filterMaxConv}
                        onClick={setToggleMaxConv}
                        activeBackground="#10b981"
                        inactiveBackground="rgba(16, 185, 129, 0.05)"
                        activeBorder="#10b981"
                        inactiveBorder="rgba(16, 185, 129, 0.12)"
                        activeColor="#fff"
                        inactiveColor="#10b981"
                        activeShadow="0 0 15px rgba(16, 185, 129, 0.35)"
                        dimmed={filterPriority !== 'all' || reminderQuickFilter !== 'all' ? !filterMaxConv : false}
                        indicator={<span style={{ width: '6px', height: '6px', borderRadius: '50%', background: filterMaxConv ? '#fff' : '#10b981', boxShadow: filterMaxConv ? '0 0 8px #fff' : '0 0 8px rgba(16, 185, 129, 0.65)' }} />}
                        title="Campaigns with Maximize Conversions bidding strategy"
                    >
                        maxConv: {summary.maxConv}
                    </FilterChip>

                    <FilterChip
                        active={filterMaxValue}
                        onClick={setToggleMaxValue}
                        activeBackground="#a855f7"
                        inactiveBackground="rgba(168, 85, 247, 0.05)"
                        activeBorder="#a855f7"
                        inactiveBorder="rgba(168, 85, 247, 0.12)"
                        activeColor="#fff"
                        inactiveColor="#a855f7"
                        activeShadow="0 0 15px rgba(168, 85, 247, 0.35)"
                        dimmed={filterPriority !== 'all' || reminderQuickFilter !== 'all' ? !filterMaxValue : false}
                        indicator={<span style={{ width: '6px', height: '6px', borderRadius: '50%', background: filterMaxValue ? '#fff' : '#a855f7', boxShadow: filterMaxValue ? '0 0 8px #fff' : '0 0 8px rgba(168, 85, 247, 0.65)' }} />}
                        title="Campaigns with Maximize Conversion Value bidding strategy"
                    >
                        maxValue: {summary.maxValue}
                    </FilterChip>

                    <FilterChip
                        active={filterNoTraffic}
                        onClick={setToggleNoTraffic}
                        activeBackground="#ea580c"
                        inactiveBackground="rgba(234, 88, 12, 0.06)"
                        activeBorder="#ea580c"
                        inactiveBorder="rgba(234, 88, 12, 0.14)"
                        activeColor="#fff"
                        inactiveColor="#ea580c"
                        activeShadow="0 0 15px rgba(234, 88, 12, 0.35)"
                        dimmed={filterPriority !== 'all' || reminderQuickFilter !== 'all' ? !filterNoTraffic : false}
                        indicator={<span style={{ width: '6px', height: '6px', borderRadius: '50%', background: filterNoTraffic ? '#fff' : '#ea580c', boxShadow: filterNoTraffic ? '0 0 8px #fff' : '0 0 8px rgba(234, 88, 12, 0.65)' }} />}
                        title="Campaigns with reminders for no-traffic situations"
                    >
                        noTraffic: {summary.noTraffic}
                    </FilterChip>

                    <FilterChip
                        active={filterStop}
                        onClick={setToggleStop}
                        activeBackground="#334155"
                        inactiveBackground="rgba(51, 65, 85, 0.06)"
                        activeBorder="#334155"
                        inactiveBorder="rgba(51, 65, 85, 0.14)"
                        activeColor="#fff"
                        inactiveColor="#334155"
                        activeShadow="0 0 15px rgba(51, 65, 85, 0.35)"
                        dimmed={filterPriority !== 'all' || reminderQuickFilter !== 'all' ? !filterStop : false}
                        indicator={<span style={{ width: '6px', height: '6px', borderRadius: '50%', background: filterStop ? '#fff' : '#334155', boxShadow: filterStop ? '0 0 8px #fff' : '0 0 8px rgba(51, 65, 85, 0.65)' }} />}
                        title="Campaigns with stop reminders"
                    >
                        Stop: {summary.stop}
                    </FilterChip>



                    <FilterChip
                        active={filterCriticalRLink}
                        onClick={setToggleCriticalRLink}
                        activeBackground="#b91c1c"
                        inactiveBackground="rgba(185, 28, 28, 0.08)"
                        activeBorder="#ef4444"
                        inactiveBorder="rgba(239, 68, 68, 0.22)"
                        activeColor="#fff"
                        inactiveColor="#b91c1c"
                        activeShadow="0 0 18px rgba(239, 68, 68, 0.45)"
                        inactiveShadow={summary.criticalRLink > 0 ? '0 0 18px rgba(239, 68, 68, 0.18)' : 'none'}
                        dimmed={(filterPriority !== 'all' || reminderQuickFilter !== 'all' || filterRLink) ? !filterCriticalRLink : false}
                        indicator={<span style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: filterCriticalRLink ? '#fff' : '#ef4444',
                            boxShadow: filterCriticalRLink ? '0 0 8px #fff' : '0 0 10px #ef4444',
                            animation: summary.criticalRLink > 0 ? 'campOverviewCriticalPulse 1.35s ease-in-out infinite' : 'none',
                        }} />}
                        style={summary.criticalRLink > 0 ? {
                            animation: filterCriticalRLink ? 'none' : 'campOverviewCriticalPulse 1.35s ease-in-out infinite',
                        } : undefined}
                        title="Campaigns with rLink reminders that are already 7+ days old"
                    >
                        rLink 7d+: {summary.criticalRLink}
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
                                        ...createAmbientSurface(group.platform.color || '#64748b', 0.58),
                                        overflow: 'hidden',
                                        position: 'relative',
                                    }}
                                >
                                    {/* Glowing top accent strip */}
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: '3px',
                                        background: group.platform.color || '#64748b',
                                        boxShadow: `0 0 16px ${toAlphaColor(group.platform.color || '#64748b', 0.8)}`,
                                        zIndex: 1
                                    }} />

                                    <div
                                        onClick={() => toggleSection(group.platform.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            marginBottom: isCollapsed ? '0' : '1rem',
                                            cursor: 'pointer',
                                            padding: '0.75rem 0.9rem',
                                            borderRadius: '1.1rem',
                                            transition: SAFE_INTERACTIVE_TRANSITION,
                                            userSelect: 'none',
                                            background: toAlphaColor(group.platform.color || '#64748b', 0.1),
                                            border: `1px solid ${toAlphaColor(group.platform.color || '#64748b', 0.22)}`,
                                            boxShadow: `0 4px 18px -8px ${toAlphaColor(group.platform.color || '#64748b', 0.3)}`
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = toAlphaColor(group.platform.color || '#64748b', 0.16);
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = toAlphaColor(group.platform.color || '#64748b', 0.1);
                                        }}
                                    >
                                        {isCollapsed ? (
                                            <ChevronRight size={18} className="text-muted" />
                                        ) : (
                                            <ChevronDown size={18} className="text-muted" />
                                        )}
                                        <div style={{
                                            width: '10px',
                                            height: '28px',
                                            background: group.platform.color,
                                            borderRadius: '999px',
                                            boxShadow: `0 0 18px ${toAlphaColor(group.platform.color || '#64748b', 0.75)}`,
                                            flexShrink: 0
                                        }} />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', minWidth: 0 }}>
                                            <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', textTransform: 'uppercase', margin: 0 }}>
                                                {group.platform.display_name}
                                            </h3>
                                            <span style={{
                                                fontSize: '0.68rem',
                                                fontWeight: 800,
                                                letterSpacing: '0.06em',
                                                textTransform: 'uppercase',
                                                padding: '0.2rem 0.65rem',
                                                borderRadius: '999px',
                                                background: isGradientColor(group.platform.color)
                                                    ? group.platform.color
                                                    : toAlphaColor(group.platform.color, 0.16),
                                                color: isGradientColor(group.platform.color)
                                                    ? '#ffffff'
                                                    : extractBaseColor(group.platform.color),
                                                border: `1px solid ${toAlphaColor(group.platform.color, 0.35)}`,
                                                boxShadow: `0 0 10px ${toAlphaColor(group.platform.color, 0.3)}`
                                            }}>
                                                Platform Lane
                                            </span>
                                        </div>
                                        <div style={{ height: '1px', flex: 1, background: 'var(--border-subtle)', marginLeft: '0.5rem', opacity: 0.5 }} />
                                        {(() => {
                                            const groupCampaignIds = group.campaigns.map((c) => c.id);
                                            const isGroupAllSelected = groupCampaignIds.length > 0 && groupCampaignIds.every((id) => selectedCampaignIds.has(id));
                                            const isGroupSomeSelected = groupCampaignIds.some((id) => selectedCampaignIds.has(id));
                                            return (
                                                <SafeButton
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleSelectPlatformGroup(groupCampaignIds);
                                                    }}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.4rem',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 700,
                                                        padding: '0.3rem 0.65rem',
                                                        borderRadius: '999px',
                                                        background: isGroupAllSelected || isGroupSomeSelected ? 'hsla(var(--primary) / 0.18)' : 'var(--bg-overlay)',
                                                        color: isGroupAllSelected || isGroupSomeSelected ? 'hsl(var(--primary))' : 'var(--text-muted)',
                                                        border: isGroupAllSelected || isGroupSomeSelected ? '1px solid hsla(var(--primary) / 0.35)' : '1px solid var(--border-subtle)',
                                                        cursor: 'pointer',
                                                    }}
                                                    title={isGroupAllSelected ? 'Deselect all in channel' : 'Select all in channel'}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isGroupAllSelected}
                                                        onChange={() => {}}
                                                        style={{ accentColor: 'hsl(var(--primary))', cursor: 'pointer', margin: 0, width: '13px', height: '13px' }}
                                                    />
                                                    <span>{isGroupAllSelected ? 'Selected' : (isGroupSomeSelected ? `${groupCampaignIds.filter((id) => selectedCampaignIds.has(id)).length}/${groupCampaignIds.length}` : 'Select All')}</span>
                                                </SafeButton>
                                            );
                                        })()}
                                        <span style={{
                                            fontSize: 'var(--text-xs)',
                                            color: 'var(--text-main)',
                                            fontWeight: 700,
                                            padding: '0.35rem 0.65rem',
                                            borderRadius: '999px',
                                            background: toAlphaColor(group.platform.color || '#64748b', 0.08),
                                            border: `1px solid ${toAlphaColor(group.platform.color || '#64748b', 0.22)}`
                                        }}>
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
                                                    specialReminderSignals={campaign.specialReminderSignals}
                                                    reminderState={campaign.reminderState}
                                                    hasReviewed={campaign.hasReviewed}
                                                    reviewStatusLabel={campaign.reviewStatusLabel}
                                                    viewMode={viewMode}
                                                    onEdit={openEdit}
                                                    isSelected={selectedCampaignIds.has(campaign.id)}
                                                    onToggleSelect={() => toggleSelectCampaign(campaign.id)}
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

            {selectedCampaignIds.size > 0 && (
                <div
                    className="animate-fade"
                    style={{
                        position: 'fixed',
                        bottom: '1.75rem',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.85rem',
                        padding: '0.65rem 1.15rem',
                        borderRadius: '1.25rem',
                        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.92) 0%, rgba(2, 6, 23, 0.96) 100%)',
                        border: '1px solid rgba(59, 130, 246, 0.35)',
                        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.6), 0 0 25px rgba(59, 130, 246, 0.25)',
                        backdropFilter: 'blur(16px)',
                        color: '#f8fafc',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingRight: '0.5rem', borderRight: '1px solid rgba(255, 255, 255, 0.12)' }}>
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: '22px',
                                height: '22px',
                                padding: '0 0.4rem',
                                borderRadius: '999px',
                                background: 'hsl(var(--primary))',
                                color: '#fff',
                                fontSize: '0.72rem',
                                fontWeight: 900,
                            }}
                        >
                            {selectedCampaignIds.size}
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            Selected
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <SafeButton
                            onClick={() => handleBatchStatusUpdate('paused')}
                            disabled={isBatchSubmitting}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.4rem 0.75rem',
                                borderRadius: '10px',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.35)',
                                cursor: 'pointer',
                            }}
                        >
                            <Pause size={13} />
                            Pause
                        </SafeButton>

                        <SafeButton
                            onClick={() => handleBatchStatusUpdate('active')}
                            disabled={isBatchSubmitting}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.4rem 0.75rem',
                                borderRadius: '10px',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                background: 'rgba(34, 197, 94, 0.15)',
                                color: '#22c55e',
                                border: '1px solid rgba(34, 197, 94, 0.35)',
                                cursor: 'pointer',
                            }}
                        >
                            <Play size={13} />
                            Activate
                        </SafeButton>

                        <SafeButton
                            onClick={() => handleBatchStatusUpdate('testing')}
                            disabled={isBatchSubmitting}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.4rem 0.75rem',
                                borderRadius: '10px',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                background: 'rgba(245, 158, 11, 0.15)',
                                color: '#f59e0b',
                                border: '1px solid rgba(245, 158, 11, 0.35)',
                                cursor: 'pointer',
                            }}
                        >
                            <FlaskConical size={13} />
                            Test
                        </SafeButton>

                        <SafeButton
                            onClick={() => handleBatchStatusUpdate('archived')}
                            disabled={isBatchSubmitting}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.4rem 0.75rem',
                                borderRadius: '10px',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                background: 'rgba(100, 116, 139, 0.15)',
                                color: '#94a3b8',
                                border: '1px solid rgba(100, 116, 139, 0.35)',
                                cursor: 'pointer',
                            }}
                        >
                            <Archive size={13} />
                            Archive
                        </SafeButton>
                    </div>

                    <div style={{ width: '1px', height: '20px', background: 'rgba(255, 255, 255, 0.15)', margin: '0 0.1rem' }} />

                    <SafeButton
                        onClick={clearSelection}
                        disabled={isBatchSubmitting}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.4rem 0.6rem',
                            borderRadius: '10px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: 'var(--text-muted)',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                        }}
                        title="Cancel selection"
                    >
                        <X size={14} />
                        Cancel
                    </SafeButton>
                </div>
            )}

            <EditCampaignModal
                campaignId={editingId || undefined}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={() => refetch()}
            />
            <style>
                {`
                    @keyframes campOverviewCriticalPulse {
                        0%, 100% {
                            transform: translateY(0);
                            box-shadow: 0 0 0 rgba(239, 68, 68, 0);
                        }
                        50% {
                            transform: translateY(-1px);
                            box-shadow: 0 0 0 8px rgba(239, 68, 68, 0.08);
                        }
                    }
                `}
            </style>
        </div >
    );
}
