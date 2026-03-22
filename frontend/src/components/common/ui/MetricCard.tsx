import type { CSSProperties, ElementType, ReactNode } from 'react';
import { SurfaceCard } from './SurfaceCard';
import { createAmbientSurface, toAlphaColor } from './premium';

interface MetricCardProps {
    label: ReactNode;
    value: ReactNode;
    helper?: ReactNode;
    icon?: ElementType;
    accent?: string;
    style?: CSSProperties;
}

export function MetricCard({
    label,
    value,
    helper,
    icon: Icon,
    accent = '#3b82f6',
    style,
}: MetricCardProps) {
    return (
        <SurfaceCard
            padding="1rem 1.05rem"
            radius="1.35rem"
            style={{
                ...createAmbientSurface(accent, 0.7),
                overflow: 'hidden',
                position: 'relative',
                ...style,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        {label}
                    </div>
                    <div style={{ marginTop: '0.55rem', fontSize: '1.55rem', fontWeight: 850, letterSpacing: '-0.04em', color: 'var(--text-main)', lineHeight: 1 }}>
                        {value}
                    </div>
                    {helper ? (
                        <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                            {helper}
                        </div>
                    ) : null}
                </div>
                {Icon ? (
                    <div
                        style={{
                            width: '2.35rem',
                            height: '2.35rem',
                            borderRadius: '0.9rem',
                            display: 'grid',
                            placeItems: 'center',
                            background: toAlphaColor(accent, 0.12),
                            border: `1px solid ${toAlphaColor(accent, 0.18)}`,
                            color: accent,
                            flexShrink: 0,
                        }}
                    >
                        <Icon size={18} />
                    </div>
                ) : null}
            </div>
        </SurfaceCard>
    );
}
