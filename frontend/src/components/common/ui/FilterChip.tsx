import type { CSSProperties, ReactNode } from 'react';
import { SafeButton } from './SafeButton';

interface FilterChipProps {
    active: boolean;
    onClick: () => void;
    children: ReactNode;
    activeBackground: string;
    inactiveBackground: string;
    activeBorder: string;
    inactiveBorder: string;
    activeColor: string;
    inactiveColor: string;
    activeShadow?: string;
    inactiveShadow?: string;
    dimmed?: boolean;
    indicator?: ReactNode;
    style?: CSSProperties;
    title?: string;
}

export function FilterChip({
    active,
    onClick,
    children,
    activeBackground,
    inactiveBackground,
    activeBorder,
    inactiveBorder,
    activeColor,
    inactiveColor,
    activeShadow = 'none',
    inactiveShadow = 'none',
    dimmed = false,
    indicator,
    style,
    title,
}: FilterChipProps) {
    return (
        <SafeButton
            onClick={onClick}
            title={title}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '10px',
                border: `1px solid ${active ? activeBorder : inactiveBorder}`,
                background: active ? activeBackground : inactiveBackground,
                fontSize: '0.8rem',
                fontWeight: 800,
                color: active ? activeColor : inactiveColor,
                cursor: 'pointer',
                boxShadow: active ? activeShadow : inactiveShadow,
                opacity: dimmed ? 0.55 : 1,
                ...style,
            }}
        >
            {indicator}
            {children}
        </SafeButton>
    );
}
