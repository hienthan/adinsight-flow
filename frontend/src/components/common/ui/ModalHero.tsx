import type { CSSProperties, ReactNode } from 'react';
import { SectionHeader } from './SectionHeader';
import { SurfaceCard } from './SurfaceCard';
import { createAmbientSurface } from './premium';

interface ModalHeroProps {
    title: ReactNode;
    subtitle?: ReactNode;
    eyebrow?: ReactNode;
    actions?: ReactNode;
    accent?: string;
    children?: ReactNode;
    style?: CSSProperties;
    compact?: boolean;
}

export function ModalHero({
    title,
    subtitle,
    eyebrow,
    actions,
    accent = '#3b82f6',
    children,
    style,
    compact = false,
}: ModalHeroProps) {
    return (
        <SurfaceCard
            padding={compact ? '0.9rem 1rem' : '1.1rem 1.2rem'}
            radius="1.5rem"
            style={{
                ...createAmbientSurface(accent, 0.8),
                ...style,
            }}
        >
            <SectionHeader
                eyebrow={eyebrow}
                title={title}
                subtitle={subtitle}
                actions={actions}
                titleStyle={{ fontSize: compact ? '1.15rem' : '1.35rem', fontWeight: 850, letterSpacing: '-0.03em' }}
                subtitleStyle={{ fontSize: compact ? '0.8rem' : '0.88rem', lineHeight: compact ? 1.45 : 1.55 }}
            />
            {children ? <div style={{ marginTop: compact ? '0.7rem' : '0.9rem' }}>{children}</div> : null}
        </SurfaceCard>
    );
}
