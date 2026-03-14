import type { ReactNode } from 'react';
import { SafeButton, SurfaceCard } from '../../components/common/ui';
import type { CampaignRouteRecord } from './types';
import { ROUTE_HEALTH_META, ROUTE_STATUS_META, getRouteHealthState, getSourceMarketMeta } from './utils';

interface OutboundMapMatrixProps {
    sourceMarkets: string[];
    destinations: Array<{ code: string; label: string }>;
    cells: Map<string, { routes: CampaignRouteRecord[]; campaignCount: number }>;
    onSelectRoutes: (routes: CampaignRouteRecord[]) => void;
    onQuickAdd: (seed: { sourceMarket: string; destinationCode: string; destinationLabel: string }) => void;
}

export default function OutboundMapMatrix({
    sourceMarkets,
    destinations,
    cells,
    onSelectRoutes,
    onQuickAdd,
}: OutboundMapMatrixProps) {
    return (
        <SurfaceCard variant="default" radius="20px" style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: `${Math.max(destinations.length * 170 + 220, 720)}px` }}>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `220px repeat(${destinations.length}, minmax(150px, 1fr))`,
                        gap: '0.8rem',
                        alignItems: 'stretch',
                    }}
                >
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Source \ Destination
                    </div>
                    {destinations.map((destination) => (
                        <div key={destination.code} style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                            {destination.code}
                            <div style={{ marginTop: '0.25rem', color: 'var(--text-dim)', fontWeight: 600, fontSize: '0.78rem' }}>
                                {destination.label}
                            </div>
                        </div>
                    ))}

                    {sourceMarkets.map((sourceMarket) => (
                        <MatrixRow
                            key={sourceMarket}
                            sourceMarket={sourceMarket}
                            destinations={destinations}
                            cells={cells}
                            onSelectRoutes={onSelectRoutes}
                            onQuickAdd={onQuickAdd}
                        />
                    ))}
                </div>
            </div>
        </SurfaceCard>
    );
}

interface MatrixRowProps {
    sourceMarket: string;
    destinations: Array<{ code: string; label: string }>;
    cells: Map<string, { routes: CampaignRouteRecord[]; campaignCount: number }>;
    onSelectRoutes: (routes: CampaignRouteRecord[]) => void;
    onQuickAdd: (seed: { sourceMarket: string; destinationCode: string; destinationLabel: string }) => void;
}

function MatrixRow({ sourceMarket, destinations, cells, onSelectRoutes, onQuickAdd }: MatrixRowProps) {
    const sourceMeta = getSourceMarketMeta(sourceMarket);

    return (
        <>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                borderRadius: '18px',
                background: `linear-gradient(135deg, ${sourceMeta.soft} 0%, var(--bg-content) 100%)`,
                border: `1px solid ${sourceMeta.color}2a`,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                boxShadow: `inset 4px 0 0 ${sourceMeta.color}`,
                position: 'relative',
                overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute',
                    right: '-18px',
                    top: '-18px',
                    width: '72px',
                    height: '72px',
                    borderRadius: '999px',
                    background: sourceMeta.glow,
                    filter: 'blur(6px)',
                }} />
                {sourceMarket}
            </div>

            {destinations.map((destination) => {
                const cell = cells.get(`${sourceMarket}|${destination.code}`);
                const route = cell?.routes[0];

                if (!route || !cell) {
                    return (
                        <div
                            key={`${sourceMarket}|${destination.code}`}
                            style={{
                                minHeight: '118px',
                                borderRadius: '20px',
                                border: `1px dashed ${sourceMeta.color}55`,
                                background: `linear-gradient(160deg, ${sourceMeta.soft} 0%, var(--bg-content) 56%, var(--bg-main) 100%)`,
                                padding: '1rem',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                position: 'relative',
                                overflow: 'hidden',
                            }}
                        >
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '4px',
                                background: `linear-gradient(90deg, ${sourceMeta.color} 0%, transparent 100%)`,
                            }} />
                            <div style={{ color: 'var(--text-dim)', fontWeight: 700, fontSize: '0.85rem' }}>
                                No route
                            </div>
                            <SafeButton
                                onClick={() => onQuickAdd({
                                    sourceMarket,
                                    destinationCode: destination.code,
                                    destinationLabel: destination.label,
                                })}
                                style={{
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-subtle)',
                                    background: 'var(--bg-content)',
                                    color: 'var(--text-main)',
                                    fontWeight: 700,
                                    padding: '0.65rem 0.8rem',
                                    width: 'fit-content',
                                }}
                            >
                                + Add
                            </SafeButton>
                        </div>
                    );
                }

                const statusMeta = ROUTE_STATUS_META[route.status];
                const campaignCount = cell.campaignCount;
                const healthState = getRouteHealthState(route);
                const healthMeta = ROUTE_HEALTH_META[healthState];
                const routeCount = cell.routes.length;
                const platforms = cell.routes
                    .map((item) => item.expand?.platform?.display_name)
                    .filter(Boolean)
                    .slice(0, 2) as string[];

                return (
                    <button
                        key={route.id}
                        type="button"
                        onClick={() => onSelectRoutes(cell.routes)}
                        style={{
                            minHeight: '118px',
                            borderRadius: '20px',
                            border: `1px solid ${routeCount > 1 ? sourceMeta.color : statusMeta.color}33`,
                            background: `linear-gradient(160deg, ${sourceMeta.soft} 0%, ${statusMeta.soft} 32%, var(--bg-content) 72%, var(--bg-main) 100%)`,
                            padding: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            textAlign: 'left',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: `0 12px 22px -18px ${sourceMeta.glow}`,
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '4px',
                            background: routeCount > 1
                                ? `linear-gradient(90deg, ${sourceMeta.color} 0%, ${statusMeta.color} 62%, transparent 100%)`
                                : `linear-gradient(90deg, ${statusMeta.color} 0%, transparent 100%)`,
                        }} />
                        <div style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            width: '56px',
                            height: '56px',
                            borderRadius: '999px',
                            background: routeCount > 1 ? sourceMeta.glow : statusMeta.soft,
                            filter: 'blur(10px)',
                        }} />
                        <div style={{ display: 'flex', width: '100%', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                            <div>
                                <div style={{ fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
                                    {campaignCount} campaign{campaignCount === 1 ? '' : 's'}
                                </div>
                                {routeCount > 1 && (
                                    <div style={{ marginTop: '0.2rem', color: sourceMeta.color, fontSize: '0.74rem', fontWeight: 800 }}>
                                        {routeCount} routes in this cell
                                    </div>
                                )}
                                <div style={{ marginTop: '0.35rem', color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 600 }}>
                                    {route.destination_city ? route.destination_city : destination.label}
                                </div>
                            </div>
                            <span style={{
                                width: '11px',
                                height: '11px',
                                borderRadius: '999px',
                                background: statusMeta.color,
                                boxShadow: `0 0 0 5px ${statusMeta.soft}`,
                                flexShrink: 0,
                                marginTop: '0.1rem',
                            }} />
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                            <Badge>{statusMeta.label}</Badge>
                            {route.is_core_route && <Badge accent>Core</Badge>}
                            <Badge subtle tone={healthMeta.color}>{healthState}</Badge>
                            {platforms.map((platform) => (
                                <Badge key={platform}>{platform}</Badge>
                            ))}
                            {routeCount > platforms.length && (
                                <Badge subtle>+{routeCount - platforms.length} more</Badge>
                            )}
                        </div>
                    </button>
                );
            })}
        </>
    );
}

function Badge({
    children,
    accent = false,
    subtle = false,
    tone,
}: {
    children: ReactNode;
    accent?: boolean;
    subtle?: boolean;
    tone?: string;
}) {
    return (
        <span style={{
            borderRadius: '999px',
            padding: '0.28rem 0.55rem',
            fontSize: '0.72rem',
            fontWeight: 800,
            textTransform: 'capitalize',
            border: `1px solid ${accent ? 'hsla(var(--primary) / 0.2)' : tone ? `${tone}30` : 'var(--border-subtle)'}`,
            background: accent ? 'hsla(var(--primary) / 0.12)' : subtle ? (tone ? `${tone}14` : 'rgba(148, 163, 184, 0.10)') : 'rgba(148, 163, 184, 0.12)',
            color: accent ? 'hsl(var(--primary))' : tone || 'var(--text-dim)',
        }}>
            {children}
        </span>
    );
}
