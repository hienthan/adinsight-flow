import type { CSSProperties } from 'react';
import { createAmbientSurface, toAlphaColor } from '../../components/common/ui';

export const CAMP_TEST_THEME_CLASS = 'camp-test-premium-page';
export const CAMP_TEST_MODAL_CLASS = 'camp-test-premium-modal';

export const CAMP_TEST_THEME_CSS = `
    .${CAMP_TEST_THEME_CLASS},
    .${CAMP_TEST_MODAL_CLASS} {
        --camp-test-label: color-mix(in srgb, var(--text-main) 74%, var(--text-muted) 26%);
        --camp-test-placeholder: color-mix(in srgb, var(--text-muted) 58%, transparent 42%);
        --camp-test-border: color-mix(in srgb, var(--border-subtle) 44%, rgba(59, 130, 246, 0.42) 56%);
        --camp-test-control-bg: linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 98%, white 2%) 0%, color-mix(in srgb, var(--bg-content) 92%, var(--bg-main) 8%) 100%);
        --camp-test-control-shadow: inset 0 1px 0 rgba(255,255,255,0.48), 0 16px 30px -26px rgba(15, 23, 42, 0.36);
        --camp-test-panel-border: color-mix(in srgb, var(--border-subtle) 58%, rgba(59, 130, 246, 0.2) 42%);
        --camp-test-panel-bg: linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 97%, white 3%) 0%, color-mix(in srgb, var(--bg-content) 88%, var(--bg-main) 12%) 100%);
    }

    .${CAMP_TEST_THEME_CLASS} .camp-test-filter-group {
        display: grid;
        gap: 0.45rem;
        min-width: 160px;
    }

    .${CAMP_TEST_THEME_CLASS} .camp-test-filter-label,
    .${CAMP_TEST_MODAL_CLASS} .camp-test-filter-label {
        font-size: 0.72rem;
        font-weight: 900;
        color: var(--camp-test-label);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        margin-bottom: 0.45rem;
    }

    .${CAMP_TEST_THEME_CLASS} .camp-test-filter-control,
    .${CAMP_TEST_MODAL_CLASS} .camp-test-filter-control {
        box-sizing: border-box;
        width: 100%;
        min-height: 46px;
        padding: 0.72rem 1rem;
        border-radius: 14px;
        border: 1px solid var(--camp-test-border);
        background: var(--camp-test-control-bg);
        box-shadow: var(--camp-test-control-shadow);
        color: var(--text-main);
    }

    .${CAMP_TEST_THEME_CLASS} .camp-test-filter-control::placeholder,
    .${CAMP_TEST_MODAL_CLASS} .camp-test-filter-control::placeholder {
        color: var(--camp-test-placeholder);
    }

    .${CAMP_TEST_THEME_CLASS} .camp-test-filter-control:focus,
    .${CAMP_TEST_MODAL_CLASS} .camp-test-filter-control:focus {
        outline: none;
        border-color: color-mix(in srgb, hsl(var(--primary)) 34%, var(--border-subtle) 66%);
        box-shadow: 0 0 0 4px hsla(var(--primary) / 0.08), var(--camp-test-control-shadow);
    }
`;

export const CAMP_TEST_PAGE_BACKGROUND: CSSProperties = {
    background: [
        `radial-gradient(circle at top left, ${toAlphaColor('#3b82f6', 0.1)} 0%, transparent 26%)`,
        `radial-gradient(circle at top right, ${toAlphaColor('#14b8a6', 0.08)} 0%, transparent 24%)`,
        `linear-gradient(180deg, color-mix(in srgb, var(--bg-main) 95%, #f8fbff 5%) 0%, var(--bg-main) 100%)`,
    ].join(', '),
};

export const CAMP_TEST_FILTER_SHELL_STYLE: CSSProperties = {
    ...createAmbientSurface('#3b82f6', 0.62),
    borderRadius: '1.35rem',
    boxShadow: '0 24px 44px -34px rgba(15, 23, 42, 0.52)',
};

export const CAMP_TEST_SUMMARY_SHELL_STYLE: CSSProperties = {
    ...createAmbientSurface('#8b5cf6', 0.42),
    borderRadius: '1.35rem',
    boxShadow: '0 22px 42px -34px rgba(15, 23, 42, 0.44)',
};

export const createCampTestPanelStyle = (accent: string): CSSProperties => ({
    ...createAmbientSurface(accent, 0.42),
    borderRadius: '1.35rem',
    border: `1px solid ${toAlphaColor(accent, 0.16)}`,
    boxShadow: `0 28px 44px -36px ${toAlphaColor(accent, 0.26)}`,
});

export const CAMP_TEST_MODAL_CONTROL_STYLE: CSSProperties = {
    width: '100%',
    minHeight: '46px',
    padding: '0.72rem 0.95rem',
    borderRadius: '14px',
    border: '1px solid color-mix(in srgb, var(--border-subtle) 58%, rgba(59, 130, 246, 0.34) 42%)',
    background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 96%, white 4%) 0%, color-mix(in srgb, var(--bg-content) 89%, var(--bg-main) 11%) 100%)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.42), 0 12px 26px -24px rgba(15, 23, 42, 0.42)',
};

export const CAMP_TEST_MODAL_TEXTAREA_STYLE: CSSProperties = {
    ...CAMP_TEST_MODAL_CONTROL_STYLE,
    minHeight: 'unset',
    resize: 'vertical',
};
