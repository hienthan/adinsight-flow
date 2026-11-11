import type { CSSProperties } from 'react';

export const isGradientColor = (input: string | undefined): boolean => {
    if (!input) return false;
    return input.includes('gradient(');
};

export const extractBaseColor = (input: string | undefined, fallback = '#3b82f6'): string => {
    if (!input) return fallback;
    const normalized = input.trim();
    if (!isGradientColor(normalized)) {
        return normalized;
    }
    const match = normalized.match(/#(?:[0-9a-fA-F]{3,8})|rgba?\([^)]+\)|hsla?\([^)]+\)/);
    return match ? match[0] : fallback;
};

export const toAlphaColor = (input: string | undefined, alpha: number) => {
    if (!input) return `rgba(59, 130, 246, ${alpha})`;
    const normalized = extractBaseColor(input.trim());

    if (normalized.startsWith('#')) {
        const hex = normalized.slice(1);
        const safeHex = hex.length === 3
            ? hex.split('').map((char) => char + char).join('')
            : hex.length >= 6 ? hex.slice(0, 6) : hex;
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

export const createAmbientSurface = (accent: string, intensity = 1): CSSProperties => {
    const baseColor = extractBaseColor(accent);
    return {
        background: [
            `radial-gradient(circle at top right, ${toAlphaColor(baseColor, 0.16 * intensity)} 0%, transparent 42%)`,
            `radial-gradient(circle at bottom left, ${toAlphaColor(baseColor, 0.08 * intensity)} 0%, transparent 50%)`,
            'linear-gradient(180deg, var(--bg-content) 0%, color-mix(in srgb, var(--bg-content) 86%, var(--bg-main) 14%) 100%)',
        ].join(', '),
        border: `1px solid ${toAlphaColor(baseColor, 0.2 * intensity)}`,
        boxShadow: `0 18px 40px -28px ${toAlphaColor(baseColor, 0.5 * intensity)}`,
    };
};

export const createPremiumBadgeStyle = (
    accent: string,
    options?: {
        textColor?: string;
        intensity?: number;
        background?: string;
        borderColor?: string;
    },
): CSSProperties => {
    const isGrad = isGradientColor(accent);
    const baseColor = extractBaseColor(accent);
    return {
        background: options?.background ?? (isGrad ? accent : toAlphaColor(baseColor, 0.12 * (options?.intensity ?? 1))),
        border: `1px solid ${options?.borderColor ?? toAlphaColor(baseColor, 0.24 * (options?.intensity ?? 1))}`,
        color: options?.textColor ?? (isGrad ? '#ffffff' : baseColor),
    };
};
