import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../../lib/utils';
import { SurfaceCard } from './SurfaceCard';

interface ToolbarGroupProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
    compact?: boolean;
}

export function ToolbarGroup({
    children,
    className,
    style,
    compact = false,
    ...props
}: ToolbarGroupProps) {
    return (
        <SurfaceCard
            variant="soft"
            padding={compact ? '0.35rem 0.5rem' : '0.6rem 0.75rem'}
            radius="12px"
            className={cn(className)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: compact ? '0.35rem' : '0.5rem',
                ...style,
            }}
            {...props}
        >
            {children}
        </SurfaceCard>
    );
}
