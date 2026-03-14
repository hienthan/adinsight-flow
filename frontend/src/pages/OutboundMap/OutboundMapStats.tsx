import { SurfaceCard } from '../../components/common/ui';
import type { RouteKpis } from './types';

interface OutboundMapStatsProps {
    kpis: RouteKpis;
}

const cards = [
    { key: 'activeRoutes', label: 'Active Routes', color: '#10b981', glow: 'rgba(16, 185, 129, 0.14)' },
    { key: 'sourceMarketsCovered', label: 'Markets Covered', color: '#06b6d4', glow: 'rgba(6, 182, 212, 0.14)' },
    { key: 'destinationsCovered', label: 'Destinations', color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.14)' },
    { key: 'unmappedActiveRoutes', label: 'Unmapped Active', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.12)' },
    { key: 'coreRoutes', label: 'Core Routes', color: '#d4a373', glow: 'rgba(212, 163, 115, 0.15)' },
] as const;

export default function OutboundMapStats({ kpis }: OutboundMapStatsProps) {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
        }}>
            {cards.map((card) => (
                <SurfaceCard
                    key={card.key}
                    variant="soft"
                    radius="18px"
                    style={{
                        minHeight: '118px',
                        position: 'relative',
                        overflow: 'hidden',
                        background: `linear-gradient(160deg, ${card.glow} 0%, var(--bg-content) 58%, var(--bg-main) 100%)`,
                        border: `1px solid ${card.color}22`,
                    }}
                >
                    <div style={{
                        position: 'absolute',
                        top: '-20px',
                        right: '-20px',
                        width: '96px',
                        height: '96px',
                        borderRadius: '999px',
                        background: `${card.color}18`,
                        filter: 'blur(4px)',
                    }} />
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', position: 'relative' }}>
                        {card.label}
                    </div>
                    <div style={{ marginTop: '0.8rem', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em', position: 'relative' }}>
                        {kpis[card.key]}
                    </div>
                    <div style={{
                        marginTop: '0.65rem',
                        width: '46px',
                        height: '4px',
                        borderRadius: '999px',
                        background: card.color,
                        position: 'relative',
                    }} />
                </SurfaceCard>
            ))}
        </div>
    );
}
