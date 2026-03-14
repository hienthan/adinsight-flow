import type { CSSProperties } from 'react';

export const toAlphaColor = (input: string | undefined, alpha: number) => {
    if (!input) return `rgba(59, 130, 246, ${alpha})`;
    const normalized = input.trim();

    if (normalized.startsWith('#')) {
        const hex = normalized.slice(1);
        const safeHex = hex.length === 3
            ? hex.split('').map((char) => char + char).join('')
            : hex;
        if (safeHex.length === 6) {
            const int = Number.parseInt(safeHex, 16);
            const r = (int >> 16) & 255;
            const g = (int >> 8) & 255;
            const b = int & 255;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
    }

    if (normalized.startsWith('rgb(')) {
        return normalized.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
    }

    if (normalized.startsWith('rgba(')) {
        return normalized.replace(/rgba\((.+),\s*[\d.]+\)/, `rgba($1, ${alpha})`);
    }

    return normalized;
};

export const createAmbientSurface = (accent: string, intensity = 1): CSSProperties => ({
    background: [
        `radial-gradient(circle at top right, ${toAlphaColor(accent, 0.16 * intensity)} 0%, transparent 42%)`,
        `radial-gradient(circle at bottom left, ${toAlphaColor(accent, 0.08 * intensity)} 0%, transparent 50%)`,
        'linear-gradient(180deg, var(--bg-content) 0%, color-mix(in srgb, var(--bg-content) 86%, var(--bg-main) 14%) 100%)',
    ].join(', '),
    border: `1px solid ${toAlphaColor(accent, 0.2 * intensity)}`,
    boxShadow: `0 18px 40px -28px ${toAlphaColor(accent, 0.5 * intensity)}`,
});

export const createPremiumBadgeStyle = (
    accent: string,
    options?: {
        textColor?: string;
        intensity?: number;
        background?: string;
        borderColor?: string;
    },
): CSSProperties => ({
    background: options?.background ?? toAlphaColor(accent, 0.12 * (options?.intensity ?? 1)),
    border: `1px solid ${options?.borderColor ?? toAlphaColor(accent, 0.2 * (options?.intensity ?? 1))}`,
    color: options?.textColor ?? accent,
});
