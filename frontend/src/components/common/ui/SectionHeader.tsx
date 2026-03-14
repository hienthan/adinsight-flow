import type { CSSProperties, ReactNode } from 'react';

interface SectionHeaderProps {
    title: ReactNode;
    subtitle?: ReactNode;
    actions?: ReactNode;
    style?: CSSProperties;
    titleStyle?: CSSProperties;
    subtitleStyle?: CSSProperties;
    eyebrow?: ReactNode;
}

export function SectionHeader({
    title,
    subtitle,
    actions,
    style,
    titleStyle,
    subtitleStyle,
    eyebrow,
}: SectionHeaderProps) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                ...style,
            }}
        >
            <div style={{ minWidth: 0 }}>
                {eyebrow ? (
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                        {eyebrow}
                    </div>
                ) : null}
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', ...titleStyle }}>
                    {title}
                </div>
                {subtitle ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.2rem', ...subtitleStyle }}>
                        {subtitle}
                    </div>
                ) : null}
            </div>
            {actions ? <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>{actions}</div> : null}
        </div>
    );
}
