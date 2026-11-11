import type { CSSProperties, ReactNode } from 'react';
import { SurfaceCard } from './SurfaceCard';
import { SectionHeader } from './SectionHeader';
import { createAmbientSurface } from './premium';

interface PageHeroProps {
    title: ReactNode;
    subtitle?: ReactNode;
    eyebrow?: ReactNode;
    actions?: ReactNode;
    accent?: string;
    children?: ReactNode;
    style?: CSSProperties;
}

export function PageHero({
    title,
    subtitle,
    eyebrow,
    actions,
    accent = '#3b82f6',
    children,
    style,
}: PageHeroProps) {
    return (
        <SurfaceCard
            padding="1.1rem 1.2rem"
            radius="1.5rem"
            style={{
                ...createAmbientSurface(accent, 0.9),
                ...style,
            }}
        >
            <SectionHeader
                eyebrow={eyebrow}
                title={title}
                subtitle={subtitle}
                actions={actions}
                titleStyle={{ fontSize: '1.28rem', fontWeight: 850, letterSpacing: '-0.04em', lineHeight: 1.08 }}
                subtitleStyle={{ fontSize: '0.84rem', lineHeight: 1.5, maxWidth: '52rem' }}
            />
            {children ? <div style={{ marginTop: '0.75rem' }}>{children}</div> : null}
        </SurfaceCard>
    );
}
