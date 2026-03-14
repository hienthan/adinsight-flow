import { SurfaceCard } from '../../components/common/ui';
import type { RouteKpis } from './types';

interface OutboundMapStatsProps {
    kpis: RouteKpis;
}

const cards = [
    { key: 'activeRoutes', label: 'Active Routes' },
    { key: 'sourceMarketsCovered', label: 'Markets Covered' },
    { key: 'destinationsCovered', label: 'Destinations' },
    { key: 'unmappedActiveRoutes', label: 'Unmapped Active' },
    { key: 'coreRoutes', label: 'Core Routes' },
] as const;

export default function OutboundMapStats({ kpis }: OutboundMapStatsProps) {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
        }}>
            {cards.map((card) => (
                <SurfaceCard key={card.key} variant="soft" radius="16px" style={{ minHeight: '110px' }}>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {card.label}
                    </div>
                    <div style={{ marginTop: '0.8rem', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em' }}>
                        {kpis[card.key]}
                    </div>
                </SurfaceCard>
            ))}
        </div>
    );
}
