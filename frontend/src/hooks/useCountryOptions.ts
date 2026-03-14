import { useMemo } from 'react';

export interface CountryOption {
    label: string;
    value: string;
    code: string;
}

const NON_COUNTRY_REGION_CODES = new Set([
    'AC', 'CP', 'CQ', 'DG', 'EA', 'EU', 'EZ', 'IC', 'QO', 'TA', 'UN', 'XA', 'XB', 'XK', 'ZZ',
]);

const COUNTRY_LABEL_ALIASES: Record<string, string> = {
    'bolivia (plurinational state of)': 'Bolivia',
    'bosnia & herzegovina': 'Bosnia and Herzegovina',
    'brunei darussalam': 'Brunei',
    'cape verde': 'Cabo Verde',
    'congo - brazzaville': 'Congo',
    'congo - kinshasa': 'Democratic Republic of the Congo',
    'czechia': 'Czech Republic',
    "cote d'ivoire": "Cote d'Ivoire",
    'cote divoire': "Cote d'Ivoire",
    'hong kong sar china': 'Hong Kong',
    'iran (islamic republic of)': 'Iran',
    "korea (the democratic people's republic of)": 'North Korea',
    "korea, democratic people's republic of": 'North Korea',
    'korea (the republic of)': 'South Korea',
    'korea, republic of': 'South Korea',
    "lao people's democratic republic": 'Laos',
    'macao sar china': 'Macau',
    'micronesia (federated states of)': 'Micronesia',
    'moldova (the republic of)': 'Moldova',
    'myanmar (burma)': 'Myanmar',
    'occupied palestinian territory': 'Palestine',
    'palestinian territories': 'Palestine',
    'russian federation': 'Russia',
    'swaziland': 'Eswatini',
    'syrian arab republic': 'Syria',
    'taiwan': 'Taiwan',
    'taiwan, province of china': 'Taiwan',
    'tanzania, united republic of': 'Tanzania',
    'turkiye': 'Turkey',
    'united states minor outlying islands': 'U.S. Outlying Islands',
    'united states of america': 'United States',
    'venezuela (bolivarian republic of)': 'Venezuela',
    'viet nam': 'Vietnam',
};

const normalizeCountryLabel = (label: string) => {
    const normalized = label.trim().toLowerCase();
    return COUNTRY_LABEL_ALIASES[normalized] ?? label.trim();
};

const generateCountryOptions = (): CountryOption[] => {
    if (typeof Intl === 'undefined' || typeof Intl.DisplayNames === 'undefined') {
        return [];
    }

    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
    const seen = new Set<string>();
    const options: CountryOption[] = [];
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (const first of letters) {
        for (const second of letters) {
            const code = `${first}${second}`;
            if (NON_COUNTRY_REGION_CODES.has(code)) {
                continue;
            }

            const rawLabel = displayNames.of(code);
            if (!rawLabel || rawLabel === code) {
                continue;
            }

            const label = normalizeCountryLabel(rawLabel);
            const dedupeKey = `${code}|${label}`;
            if (seen.has(dedupeKey)) {
                continue;
            }

            seen.add(dedupeKey);
            options.push({
                code,
                label,
                value: label,
            });
        }
    }

    return options.sort((a, b) => a.label.localeCompare(b.label));
};

const COUNTRY_OPTIONS = generateCountryOptions();
const COUNTRY_OPTIONS_BY_LABEL = new Map(
    COUNTRY_OPTIONS.map((option) => [option.label.toLowerCase(), option]),
);
const COUNTRY_OPTIONS_BY_CODE = new Map(
    COUNTRY_OPTIONS.map((option) => [option.code.toUpperCase(), option]),
);

export const resolveCountryOption = (input?: string | null): CountryOption | undefined => {
    if (!input) return undefined;

    const trimmed = input.trim();
    if (!trimmed) return undefined;

    const byCode = COUNTRY_OPTIONS_BY_CODE.get(trimmed.toUpperCase());
    if (byCode) return byCode;

    const normalizedLabel = normalizeCountryLabel(trimmed).toLowerCase();
    return COUNTRY_OPTIONS_BY_LABEL.get(normalizedLabel);
};

export const getCountryOptions = () => COUNTRY_OPTIONS;

export function useCountryOptions() {
    return useMemo(() => COUNTRY_OPTIONS, []);
}
