import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../../lib/utils';
import { SAFE_INTERACTIVE_TRANSITION } from '../../../lib/uiMotion';

interface SurfaceCardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
    padding?: CSSProperties['padding'];
    radius?: CSSProperties['borderRadius'];
    variant?: 'default' | 'soft' | 'inset';
    interactive?: boolean;
    noLift?: boolean;
}

const variantStyles: Record<NonNullable<SurfaceCardProps['variant']>, CSSProperties> = {
    default: {
        background: 'var(--bg-content)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-soft)',
    },
    soft: {
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-soft)',
    },
    inset: {
        background: 'var(--bg-overlay)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
    },
};

export function SurfaceCard({
    children,
    className,
    style,
    padding = '1.5rem',
    radius = '12px',
    variant = 'default',
    interactive = false,
    noLift = true,
    ...props
}: SurfaceCardProps) {
    return (
        <div
            className={cn('hero-card', noLift && 'no-lift', className)}
            style={{
                display: 'block',
                flexDirection: 'initial',
                padding,
                borderRadius: radius,
                transition: SAFE_INTERACTIVE_TRANSITION,
                ...variantStyles[variant],
                ...(interactive ? { cursor: 'pointer' } : null),
                ...style,
            }}
            {...props}
        >
            {children}
        </div>
    );
}
