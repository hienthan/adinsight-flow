export const SAFE_INTERACTIVE_TRANSITION =
    'background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease';

export const SAFE_PANEL_TRANSITION =
    'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease, margin 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s ease, box-shadow 0.2s ease';

export const SAFE_ITEM_TRANSITION =
    'background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease, opacity 0.12s ease';

export const SAFE_BUTTON_SELECTORS = [
    '.hero-btn',
    '.hero-btn-ghost',
    '.hero-btn-primary',
    '.hero-btn-secondary',
];

export const SAFE_CARD_SELECTORS = ['.hero-card'];

export const SAFE_NAV_SELECTORS = ['.nav-item', '.nav-item-header'];

export const SAFE_THEME_TOGGLE_SELECTORS = ['.theme-toggle'];

const toScopedSelectors = (scopeClass: string, selectors: string[]) =>
    selectors.map((selector) => `${scopeClass} ${selector}`).join(',\n');

export const createSafeInteractionScopeCss = (
    scopeClass: string,
    selectors: string[],
    transition: string = SAFE_INTERACTIVE_TRANSITION,
) => {
    const scopedSelectors = toScopedSelectors(scopeClass, selectors);
    return `
${scopedSelectors} {
    transition: ${transition};
}

${scopedSelectors}:hover {
    transform: none;
    filter: none;
}
`;
};
