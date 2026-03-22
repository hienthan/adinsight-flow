import { AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';
import { SafeButton, SurfaceCard } from '../../components/common/ui';
import type { CampaignRouteRecord, RouteGapSignal } from './types';
import { ROUTE_HEALTH_META, getRouteHealthState, getSourceMarketMeta } from './utils';

interface OutboundMapSignalsProps {
    gapSignals: RouteGapSignal[];
    attentionRoutes: CampaignRouteRecord[];
    onCreateGap: (signal: RouteGapSignal) => void;
    onSelectRoute: (route: CampaignRouteRecord) => void;
}

export default function OutboundMapSignals({
    gapSignals,
    attentionRoutes,
    onCreateGap,
    onSelectRoute,
}: OutboundMapSignalsProps) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            <SurfaceCard
                variant="default"
                radius="22px"
                style={{
                    background: 'linear-gradient(180deg, var(--bg-content) 0%, rgba(59,130,246,0.05) 100%)',
                    border: '1px solid rgba(59,130,246,0.18)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '14px',
                        display: 'grid',
                        placeItems: 'center',
                        background: 'hsla(var(--primary) / 0.1)',
                        color: 'hsl(var(--primary))',
                    }}>
                        <Sparkles size={18} />
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Gap Signals
                        </div>
                        <div style={{ marginTop: '0.2rem', fontSize: '1.15rem', fontWeight: 800 }}>
                            Suggested missing routes
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '1rem', display: 'grid', gap: '0.7rem' }}>
                    {gapSignals.length === 0 ? (
                        <EmptyMessage message="No obvious gap detected from the current route network." />
                    ) : (
                        gapSignals.slice(0, 6).map((signal) => (
                            <SignalRow
                                key={`${signal.sourceMarket}|${signal.destinationCode}`}
                                title={`${signal.sourceMarket} -> ${signal.destinationLabel}`}
                                subtitle={`Missing coverage for ${signal.destinationCode}`}
                                actionLabel="Create"
                                onAction={() => onCreateGap(signal)}
                                accentColor={getSourceMarketMeta(signal.sourceMarket).color}
                            />
                        ))
                    )}
                </div>
            </SurfaceCard>

            <SurfaceCard
                variant="default"
                radius="22px"
                style={{
                    background: 'linear-gradient(180deg, var(--bg-content) 0%, rgba(245,158,11,0.05) 100%)',
                    border: '1px solid rgba(245,158,11,0.18)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '14px',
                        display: 'grid',
                        placeItems: 'center',
                        background: 'rgba(245, 158, 11, 0.12)',
                        color: '#f59e0b',
                    }}>
                        <AlertTriangle size={18} />
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Attention Routes
                        </div>
                        <div style={{ marginTop: '0.2rem', fontSize: '1.15rem', fontWeight: 800 }}>
                            Stale, paused, or unmapped
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '1rem', display: 'grid', gap: '0.7rem' }}>
                    {attentionRoutes.length === 0 ? (
                        <EmptyMessage message="No urgent route health issue from the current filtered view." />
                    ) : (
                        attentionRoutes.slice(0, 6).map((route) => (
                            <SignalRow
                                key={route.id}
                                title={route.route_name}
                                subtitle={`${route.status} | ${getRouteHealthState(route)}`}
                                actionLabel="Open"
                                onAction={() => onSelectRoute(route)}
                                accentColor={ROUTE_HEALTH_META[getRouteHealthState(route)].color}
                            />
                        ))
                    )}
                </div>
            </SurfaceCard>
        </div>
    );
}

function SignalRow({
    title,
    subtitle,
    actionLabel,
    onAction,
    accentColor,
}: {
    title: string;
    subtitle: string;
    actionLabel: string;
    onAction: () => void;
    accentColor: string;
}) {
    return (
        <div style={{
            border: `1px solid ${accentColor}28`,
            borderRadius: '18px',
            padding: '0.9rem 1rem',
            background: `linear-gradient(135deg, ${accentColor}10 0%, var(--bg-content) 58%, var(--bg-main) 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            boxShadow: 'var(--shadow-subtle)',
            position: 'relative',
            overflow: 'hidden',
        }}>
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: '4px',
                background: accentColor,
            }} />
            <div>
                <div style={{ fontWeight: 800, letterSpacing: '-0.02em' }}>{title}</div>
                <div style={{ marginTop: '0.3rem', color: 'var(--text-dim)', fontSize: '0.82rem', fontWeight: 600 }}>
                    {subtitle}
                </div>
            </div>
            <SafeButton
                onClick={onAction}
                style={{
                    borderRadius: '12px',
                    border: `1px solid ${accentColor}26`,
                    background: `linear-gradient(135deg, ${accentColor}14 0%, var(--bg-content) 100%)`,
                    color: accentColor,
                    fontWeight: 800,
                    padding: '0.7rem 0.9rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    flexShrink: 0,
                }}
            >
                {actionLabel}
                <ArrowRight size={14} />
            </SafeButton>
        </div>
    );
}

function EmptyMessage({ message }: { message: string }) {
    return (
        <div style={{
            border: '1px dashed var(--border-subtle)',
            borderRadius: '18px',
            padding: '1rem',
            color: 'var(--text-dim)',
            fontWeight: 600,
            lineHeight: 1.6,
            background: 'linear-gradient(180deg, var(--bg-main) 0%, var(--bg-content) 100%)',
        }}>
            {message}
        </div>
    );
}
