import { SurfaceCard } from '../../components/common/ui';
import type { CampaignRouteRecord } from './types';
import { ROUTE_STATUS_META } from './utils';

interface OutboundMapGeoProps {
    routes: CampaignRouteRecord[];
    onSelectRoute: (route: CampaignRouteRecord) => void;
}

export default function OutboundMapGeo({ routes, onSelectRoute }: OutboundMapGeoProps) {
    const groupedRoutes = new Map<string, CampaignRouteRecord[]>();
    routes.forEach((route) => {
        const current = groupedRoutes.get(route.source_market) || [];
        current.push(route);
        groupedRoutes.set(route.source_market, current);
    });

    const sources = Array.from(groupedRoutes.keys()).sort();

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {sources.map((source) => (
                <SurfaceCard key={source} variant="default" radius="20px" style={{ gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                Source Market
                            </div>
                            <div style={{ marginTop: '0.25rem', fontSize: '1.6rem', fontWeight: 800 }}>{source}</div>
                        </div>
                        <div style={{ color: 'var(--text-dim)', fontWeight: 700 }}>
                            {groupedRoutes.get(source)?.length || 0} routes
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.7rem' }}>
                        {(groupedRoutes.get(source) || [])
                            .sort((a, b) => a.destination_country.localeCompare(b.destination_country))
                            .map((route) => {
                                const statusMeta = ROUTE_STATUS_META[route.status];
                                const count = route.expand?.campaigns?.length ?? route.campaigns?.length ?? 0;

                                return (
                                    <button
                                        key={route.id}
                                        type="button"
                                        onClick={() => onSelectRoute(route)}
                                        style={{
                                            borderRadius: '16px',
                                            border: `1px solid ${statusMeta.color}33`,
                                            background: statusMeta.soft,
                                            color: 'var(--text-main)',
                                            padding: '0.85rem 1rem',
                                            minWidth: '132px',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <div style={{ fontWeight: 800 }}>{route.destination_country_code || route.destination_country}</div>
                                        <div style={{ marginTop: '0.2rem', fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                                            {route.destination_city || route.destination_country}
                                        </div>
                                        <div style={{ marginTop: '0.45rem', fontSize: '0.74rem', fontWeight: 800, color: statusMeta.color }}>
                                            {statusMeta.label} | {count} camp
                                        </div>
                                    </button>
                                );
                            })}
                    </div>
                </SurfaceCard>
            ))}
        </div>
    );
}
