import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pb } from '../../lib/pocketbase';
import { htmlToPlainText } from '../../lib/noteHtml';
import type { CampaignPlatform, CampaignTestTrack, CampaignTestUpdate } from '../../types/campaign';

export const TEST_TYPE_LABELS: Record<CampaignTestTrack['test_type'], string> = {
    cookie: 'Cookie',
    country_launch: 'Country Launch',
    topic_validation: 'Topic Validation',
    landing_page: 'Landing Page',
    campaign_structure: 'Campaign Structure',
    creative_angle: 'Creative Angle',
    bidding: 'Bidding',
    scaling: 'Scaling',
    other: 'Other',
};

export const STATUS_STYLES: Record<CampaignTestTrack['status'], { bg: string; border: string; color: string }> = {
    planned: { bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.22)', color: '#64748b' },
    testing: { bg: 'rgba(37, 99, 235, 0.12)', border: 'rgba(37, 99, 235, 0.22)', color: '#2563eb' },
    live: { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.22)', color: '#047857' },
    watching: { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.22)', color: '#b45309' },
    failed: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.22)', color: '#b91c1c' },
    paused: { bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.22)', color: '#7c3aed' },
    archived: { bg: 'rgba(71, 85, 105, 0.12)', border: 'rgba(71, 85, 105, 0.2)', color: '#475569' },
};

export const RESULT_STYLES: Record<NonNullable<CampaignTestTrack['result']>, { bg: string; border: string; color: string }> = {
    positive: { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.22)', color: '#047857' },
    neutral: { bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.22)', color: '#64748b' },
    negative: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.22)', color: '#b91c1c' },
    mixed: { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.22)', color: '#b45309' },
};

export const formatSlug = (value?: string | null) => {
    if (!value) return '-';
    return value.replace(/_/g, ' ').replace(/\b\w/g, (x) => x.toUpperCase());
};

export const formatPlatform = (track: CampaignTestTrack) =>
    track.expand?.platform?.display_name || track.expand?.platform?.platform_name || 'Unknown Platform';

export const formatPlatformLabel = (platform?: Pick<CampaignPlatform, 'display_name' | 'platform_name'> | null) =>
    platform?.display_name || platform?.platform_name || 'Unknown Platform';

export const formatDestination = (track: Pick<CampaignTestTrack, 'lane_scope' | 'destination_country' | 'destination_city'>) => {
    if (track.lane_scope === 'market_only') return 'Market Only';
    const country = formatSlug(track.destination_country);
    if (!track.destination_city) return country;
    return `${formatSlug(track.destination_city)}, ${country}`;
};

export const buildTrackKey = ({
    laneScope,
    platformId,
    sourceMarket,
    destinationCountry,
    destinationCity,
    patternTopic,
}: {
    laneScope: CampaignTestTrack['lane_scope'];
    platformId: string;
    sourceMarket: string;
    destinationCountry?: string;
    destinationCity?: string;
    patternTopic: string;
}) => {
    if (laneScope === 'market_only') {
        return [platformId, sourceMarket.trim(), 'no_destination', 'all', patternTopic.trim()].join('|');
    }
    const cityPart = (destinationCity || 'all').trim() || 'all';
    return [platformId, sourceMarket.trim(), (destinationCountry || '').trim(), cityPart, patternTopic.trim()].join('|');
};

export const buildTrackTitle = ({
    laneScope,
    platformLabel,
    sourceMarket,
    destinationCountry,
    destinationCity,
    patternTopic,
}: {
    laneScope: CampaignTestTrack['lane_scope'];
    platformLabel: string;
    sourceMarket: string;
    destinationCountry?: string;
    destinationCity?: string;
    patternTopic: string;
}) => {
    if (laneScope === 'market_only') {
        return `${platformLabel} ${sourceMarket} | ${formatSlug(patternTopic)}`;
    }
    const country = formatSlug(destinationCountry);
    const destination = destinationCity ? `${formatSlug(destinationCity)}, ${country}` : country;
    return `${platformLabel} ${sourceMarket} -> ${destination} | ${formatSlug(patternTopic)}`;
};

const priorityRank = { critical: 0, high: 1, medium: 2, normal: 3, undefined: 4 } as Record<string, number>;
const statusRank = { testing: 0, live: 1, watching: 2, planned: 3, failed: 4, paused: 5, archived: 6 } as Record<string, number>;

export const sortTracks = (tracks: CampaignTestTrack[]) =>
    [...tracks].sort((left, right) => {
        const priorityDiff = (priorityRank[left.priority || 'undefined'] ?? 99) - (priorityRank[right.priority || 'undefined'] ?? 99);
        if (priorityDiff !== 0) return priorityDiff;

        const statusDiff = (statusRank[left.status] ?? 99) - (statusRank[right.status] ?? 99);
        if (statusDiff !== 0) return statusDiff;

        const reviewedDiff = (right.last_reviewed_at || right.updated || '').localeCompare(left.last_reviewed_at || left.updated || '');
        if (reviewedDiff !== 0) return reviewedDiff;

        return left.title.localeCompare(right.title);
    });

export function useCampaignTestTracks() {
    return useQuery<CampaignTestTrack[]>({
        queryKey: ['campaign-test-tracks'],
        queryFn: async () => {
            return pb.collection('campaign_test_tracks').getFullList<CampaignTestTrack>({
                sort: '-updated',
                expand: 'platform,linked_campaigns',
                fields: 'id,track_key,title,platform,lane_scope,source_market,destination_country,destination_city,pattern_topic,category,test_type,status,result,priority,cookie_test_state,summary_note,failure_note,next_action,do_not_retest,linked_campaigns,main_tags,started_at,last_reviewed_at,last_state_changed_at,owner,metadata,created,updated,expand.platform.id,expand.platform.display_name,expand.platform.platform_name,expand.platform.color,expand.linked_campaigns.id,expand.linked_campaigns.name,expand.linked_campaigns.platform,expand.linked_campaigns.status,expand.linked_campaigns.priority,expand.linked_campaigns.created,expand.linked_campaigns.updated,expand.linked_campaigns.created_date,expand.linked_campaigns.is_dsa',
            });
        },
        retry: false,
    });
}

export function useCampaignTestUpdates() {
    return useQuery<CampaignTestUpdate[]>({
        queryKey: ['campaign-test-updates'],
        queryFn: async () => {
            return pb.collection('campaign_test_updates').getFullList<CampaignTestUpdate>({
                sort: '-created',
                expand: 'test_track',
                fields: 'id,test_track,update_type,status_snapshot,result_snapshot,source_market_snapshot,destination_country_snapshot,destination_city_snapshot,pattern_topic_snapshot,category_snapshot,note,linked_campaigns_snapshot,important_flag,created_by,metadata,created,updated,expand.test_track.id,expand.test_track.title',
            });
        },
        retry: false,
    });
}

export function getQueryErrorMessage(error: unknown, fallback = 'Unable to load data right now.') {
    if (!error) return fallback;
    if (typeof error === 'string') return error;
    if (error instanceof Error && error.message.trim()) return error.message.trim();
    if (
        typeof error === 'object'
        && error !== null
        && 'message' in error
        && typeof (error as { message?: unknown }).message === 'string'
        && (error as { message: string }).message.trim()
    ) {
        return (error as { message: string }).message.trim();
    }
    return fallback;
}

export interface CampaignTestTrackFilters {
    platform: string;
    sourceMarket: string;
    destinationCountry: string;
    destinationCity: string;
    laneScope?: string;
    category: string;
    patternTopic: string;
    status: string;
    result: string;
    cookieState: string;
    search: string;
    failedOnly?: boolean;
    cookieOnOnly?: boolean;
    doNotRetestOnly?: boolean;
}

export const filterTracks = (tracks: CampaignTestTrack[], filters: CampaignTestTrackFilters) => {
    const keyword = filters.search.trim().toLowerCase();
    return tracks.filter((track) => {
        if (filters.platform !== 'all' && track.platform !== filters.platform) return false;
        if (filters.sourceMarket !== 'all' && track.source_market !== filters.sourceMarket) return false;
        if (filters.laneScope && filters.laneScope !== 'all' && track.lane_scope !== filters.laneScope) return false;
        if (filters.destinationCountry !== 'all' && track.destination_country !== filters.destinationCountry) return false;
        if (filters.destinationCity !== 'all' && (track.destination_city || '') !== filters.destinationCity) return false;
        if (filters.category !== 'all' && (track.category || '') !== filters.category) return false;
        if (filters.patternTopic !== 'all' && track.pattern_topic !== filters.patternTopic) return false;
        if (filters.status !== 'all' && track.status !== filters.status) return false;
        if (filters.result !== 'all' && (track.result || '') !== filters.result) return false;
        if (filters.cookieState !== 'all' && (track.cookie_test_state || 'not_applicable') !== filters.cookieState) return false;
        if (filters.failedOnly && track.status !== 'failed') return false;
        if (filters.cookieOnOnly && track.cookie_test_state !== 'on') return false;
        if (filters.doNotRetestOnly && !track.do_not_retest) return false;
        if (!keyword) return true;

        const haystack = [
            track.title,
            track.source_market,
            track.destination_country,
            track.destination_city || '',
            track.pattern_topic,
            track.category || '',
            track.test_type,
            track.status,
            track.result || '',
            formatPlatform(track),
            htmlToPlainText(track.summary_note || ''),
            htmlToPlainText(track.failure_note || ''),
            track.next_action || '',
        ].join(' ').toLowerCase();

        return haystack.includes(keyword);
    });
};

export function useTrackSummary(tracks: CampaignTestTrack[]) {
    return useMemo(() => tracks.reduce((acc, track) => {
        if (track.status === 'live') acc.live += 1;
        if (track.status === 'testing') acc.testing += 1;
        if (track.status === 'failed') acc.failed += 1;
        if (track.cookie_test_state === 'on') acc.cookieOn += 1;
        if (track.do_not_retest) acc.doNotRetest += 1;
        if (!track.last_reviewed_at) {
            acc.needsReview += 1;
        } else {
            const reviewedAt = new Date(track.last_reviewed_at);
            if (!Number.isNaN(reviewedAt.getTime())) {
                const diffDays = (Date.now() - reviewedAt.getTime()) / (1000 * 60 * 60 * 24);
                if (diffDays >= 14) acc.needsReview += 1;
            }
        }
        return acc;
    }, {
        live: 0,
        testing: 0,
        failed: 0,
        cookieOn: 0,
        doNotRetest: 0,
        needsReview: 0,
    }), [tracks]);
}
