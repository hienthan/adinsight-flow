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
            padding="1.5rem"
            radius="1.8rem"
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
                titleStyle={{ fontSize: '1.5rem', fontWeight: 850, letterSpacing: '-0.04em' }}
                subtitleStyle={{ fontSize: '0.92rem', lineHeight: 1.6, maxWidth: '56rem' }}
            />
            {children ? <div style={{ marginTop: '1rem' }}>{children}</div> : null}
        </SurfaceCard>
    );
}
