import type { CSSProperties, ReactNode } from 'react';
import { Link2 } from 'lucide-react';
import { SafeButton, SurfaceCard, createAmbientSurface, toAlphaColor } from '../../components/common/ui';
import type { Campaign, CampaignTestTrack } from '../../types/campaign';
import {
    formatDestination,
    formatPlatform,
    formatSlug,
    RESULT_STYLES,
    STATUS_STYLES,
    TEST_TYPE_LABELS,
} from './campaignTestTrackingShared';

const FALLBACK_ACCENT = '#3b82f6';

export const getTrackAccent = (track?: Pick<CampaignTestTrack, 'expand'> | null) =>
    track?.expand?.platform?.color || FALLBACK_ACCENT;

export function MiniBadge({
    children,
    accent,
}: {
    children: ReactNode;
    accent?: string;
}) {
    const color = accent || 'var(--text-dim)';
    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.3rem 0.58rem',
            borderRadius: '999px',
            border: `1px solid ${accent ? toAlphaColor(accent, 0.18) : 'var(--border-subtle)'}`,
            background: accent ? toAlphaColor(accent, 0.08) : 'var(--bg-overlay)',
            color,
            fontSize: '0.72rem',
            fontWeight: 800,
        }}>
            {children}
        </span>
    );
}

export function StatusBadge({
    label,
    styleDef,
}: {
    label: string;
    styleDef: { bg: string; border: string; color: string };
}) {
    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.3rem 0.6rem',
            borderRadius: '999px',
            background: styleDef.bg,
            border: `1px solid ${styleDef.border}`,
            color: styleDef.color,
            fontSize: '0.72rem',
            fontWeight: 800,
            whiteSpace: 'nowrap',
        }}>
            {label}
        </span>
    );
}

export function MiniCountBadge({ label, color }: { label: string; color: string }) {
    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.26rem 0.5rem',
            borderRadius: '999px',
            background: toAlphaColor(color, 0.1),
            border: `1px solid ${toAlphaColor(color, 0.18)}`,
            color,
            fontSize: '0.7rem',
            fontWeight: 800,
        }}>
            {label}
        </span>
    );
}

export function TrackIdentityPills({ track }: { track: CampaignTestTrack }) {
    const accent = getTrackAccent(track);
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.55rem' }}>
            <MiniBadge accent={accent}>{formatPlatform(track)}</MiniBadge>
            <MiniBadge>{track.source_market}</MiniBadge>
            <MiniBadge accent={track.lane_scope === 'market_only' ? '#7c3aed' : '#0f766e'}>
                {formatDestination(track)}
            </MiniBadge>
            <MiniBadge accent="#2563eb">{formatSlug(track.pattern_topic)}</MiniBadge>
            {track.category ? <MiniBadge accent="#b45309">{formatSlug(track.category)}</MiniBadge> : null}
        </div>
    );
}

export function TrackLaneCard({
    track,
    selected = false,
    mode = 'summary',
    onClick,
    action,
}: {
    track: CampaignTestTrack;
    selected?: boolean;
    mode?: 'summary' | 'next_action';
    onClick: () => void;
    action?: ReactNode;
}) {
    const accent = getTrackAccent(track);
    const preview = mode === 'next_action'
        ? (track.next_action || 'No next action yet.')
        : (track.summary_note || track.failure_note || 'No summary yet.');
    const statusStyle = STATUS_STYLES[track.status];
    const resultStyle = track.result ? RESULT_STYLES[track.result] : null;

    return (
        <SafeButton
            onClick={onClick}
            style={{
                ...createAmbientSurface(accent, selected ? 0.54 : 0.28),
                width: '100%',
                textAlign: 'left',
                padding: '1rem 1rem 0.95rem',
                borderRadius: '18px',
                border: `1px solid ${selected ? toAlphaColor(accent, 0.34) : toAlphaColor(accent, 0.16)}`,
                boxShadow: selected
                    ? `0 24px 38px -28px ${toAlphaColor(accent, 0.38)}`
                    : `0 16px 28px -28px ${toAlphaColor(accent, 0.24)}`,
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            <div style={{
                position: 'absolute',
                left: 0,
                top: '16%',
                bottom: '16%',
                width: '4px',
                borderRadius: '0 999px 999px 0',
                background: `linear-gradient(180deg, ${toAlphaColor(accent, 0.95)} 0%, ${toAlphaColor(accent, 0.55)} 100%)`,
            }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.98rem', fontWeight: 850, color: 'var(--text-main)', lineHeight: 1.35 }}>
                        {track.title}
                    </div>
                    <TrackIdentityPills track={track} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem', flex: '0 0 auto' }}>
                    <StatusBadge label={formatSlug(track.status)} styleDef={statusStyle} />
                    {resultStyle ? <StatusBadge label={formatSlug(track.result)} styleDef={resultStyle} /> : null}
                    {action}
                </div>
            </div>
            <div style={{ marginTop: '0.8rem', color: 'var(--text-dim)', fontSize: '0.84rem', lineHeight: 1.55 }}>
                {preview}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.7rem', marginTop: '0.8rem', fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                <span>Cookie: {formatSlug(track.cookie_test_state || 'not_applicable')}</span>
                <span>Type: {TEST_TYPE_LABELS[track.test_type] || formatSlug(track.test_type)}</span>
                <span>Linked: {track.expand?.linked_campaigns?.length || track.linked_campaigns?.length || 0}</span>
                <span>Reviewed: {(track.last_reviewed_at || track.updated || '').slice(0, 10)}</span>
                {track.do_not_retest ? <span style={{ color: '#b91c1c' }}>Do not retest</span> : null}
            </div>
        </SafeButton>
    );
}

export function TrackDetailHero({
    track,
    action,
}: {
    track: CampaignTestTrack;
    action?: ReactNode;
}) {
    const accent = getTrackAccent(track);
    return (
        <SurfaceCard
            radius="1.2rem"
            style={{
                ...createAmbientSurface(accent, 0.5),
                border: `1px solid ${toAlphaColor(accent, 0.18)}`,
                boxShadow: `0 22px 36px -30px ${toAlphaColor(accent, 0.28)}`,
                padding: '1.1rem',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ minWidth: 0 }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 850, color: 'var(--text-main)', lineHeight: 1.25 }}>
                        {track.title}
                    </h2>
                    <TrackIdentityPills track={track} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.55rem', flex: '0 0 auto' }}>
                    {track.priority ? (
                        <StatusBadge
                            label={formatSlug(track.priority)}
                            styleDef={track.priority === 'critical' ? STATUS_STYLES.failed : STATUS_STYLES.watching}
                        />
                    ) : null}
                    {action}
                </div>
            </div>
        </SurfaceCard>
    );
}

export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {title}
            </div>
            {children}
        </div>
    );
}

export function DetailStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
    return (
        <SurfaceCard
            variant="inset"
            padding="0.8rem 0.9rem"
            radius="14px"
            style={{
                border: `1px solid ${accent ? toAlphaColor(accent, 0.14) : 'var(--border-subtle)'}`,
                background: accent ? createAmbientSurface(accent, 0.16).background : undefined,
            }}
        >
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {label}
            </div>
            <div style={{ marginTop: '0.35rem', fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {value}
            </div>
        </SurfaceCard>
    );
}

export function LinkedCampaignButton({
    campaign,
    onClick,
    accent,
}: {
    campaign: Campaign;
    onClick: () => void;
    accent?: string;
}) {
    return (
        <SafeButton
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                width: '100%',
                textAlign: 'left',
                padding: '0.7rem 0.85rem',
                borderRadius: '12px',
                border: `1px solid ${accent ? toAlphaColor(accent, 0.14) : 'var(--border-subtle)'}`,
                background: accent ? toAlphaColor(accent, 0.05) : 'var(--bg-overlay)',
                color: 'var(--text-main)',
                fontWeight: 700,
            }}
        >
            <Link2 size={14} />
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {campaign.name}
            </span>
        </SafeButton>
    );
}

export const headerCellStyle: CSSProperties = {
    fontSize: '0.72rem',
    fontWeight: 800,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    padding: '0 0 0.15rem',
    textAlign: 'left',
    whiteSpace: 'nowrap',
};

export const sourceCellStyle: CSSProperties = {
    fontSize: '0.82rem',
    fontWeight: 800,
    color: 'var(--text-main)',
    paddingRight: '0.5rem',
    whiteSpace: 'nowrap',
};
