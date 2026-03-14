import type { ReactNode } from 'react';
import { SafeButton, SurfaceCard } from '../../components/common/ui';
import type { CampaignRouteRecord } from './types';
import { ROUTE_STATUS_META, getRouteHealthState } from './utils';

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
    return (
        <>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.03) 0%, rgba(59, 130, 246, 0.07) 100%)',
                border: '1px solid var(--border-subtle)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
            }}>
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
                                minHeight: '108px',
                                borderRadius: '18px',
                                border: '1px dashed rgba(148, 163, 184, 0.45)',
                                background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(248,250,252,0.95) 100%)',
                                padding: '1rem',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                            }}
                        >
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
                            minHeight: '108px',
                            borderRadius: '18px',
                            border: `1px solid ${statusMeta.color}33`,
                            background: `linear-gradient(180deg, ${statusMeta.soft} 0%, rgba(255,255,255,0.98) 100%)`,
                            padding: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            textAlign: 'left',
                        }}
                    >
                        <div style={{ display: 'flex', width: '100%', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                            <div>
                                <div style={{ fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
                                    {campaignCount} campaign{campaignCount === 1 ? '' : 's'}
                                </div>
                                {routeCount > 1 && (
                                    <div style={{ marginTop: '0.2rem', color: 'var(--text-dim)', fontSize: '0.74rem', fontWeight: 800 }}>
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
                            <Badge subtle>{healthState}</Badge>
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
}: {
    children: ReactNode;
    accent?: boolean;
    subtle?: boolean;
}) {
    return (
        <span style={{
            borderRadius: '999px',
            padding: '0.28rem 0.55rem',
            fontSize: '0.72rem',
            fontWeight: 800,
            textTransform: 'capitalize',
            border: `1px solid ${accent ? 'hsla(var(--primary) / 0.2)' : 'var(--border-subtle)'}`,
            background: accent ? 'hsla(var(--primary) / 0.12)' : subtle ? 'rgba(15, 23, 42, 0.04)' : 'rgba(255,255,255,0.7)',
            color: accent ? 'hsl(var(--primary))' : 'var(--text-dim)',
        }}>
            {children}
        </span>
    );
}
