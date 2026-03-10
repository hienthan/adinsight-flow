import { TrendSignal, TrendType, SignalState } from './types';

export function addDays(d: Date, days: number) {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
}

export function startOfDay(d: Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

export function intersects(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
    return aStart <= bEnd && aEnd >= bStart;
}

function parseLocalYYYYMMDD(dateStr: string): Date {
    const [y, m, d] = dateStr.split("-").map((x) => parseInt(x, 10));
    return new Date(y, m - 1, d);
}

export const getStateColor = (state: SignalState): "danger" | "success" | "warning" | "primary" | "default" => {
    switch (state) {
        case 'PEAK': return 'danger';        // ROSE (mapped to danger in HeroUI)
        case 'ACTIVE': return 'success';     // EMERALD
        case 'IN_PREALERT': return 'warning'; // AMBER
        case 'UPCOMING_PREALERT': return 'warning'; // AMBER
        case 'ENDED': return 'default';
        default: return 'default';
    }
};

export const getPriorityColor = (priority: string): "danger" | "warning" => {
    return priority === 'high' ? 'danger' : 'warning';
};

export const getCategoryLabel = (cat: string) => {
    switch (cat) {
        case 'seasonal_travel': return 'Seasonal';
        case 'entry_pretrip': return 'Pre-Trip';
        case 'peak_window': return 'Peak Window';
        case 'one_off': return 'Event';
        default: return cat;
    }
};

export const resolveDate = (mmdd: string, year: number) => {
    const [mm, dd] = mmdd.split('-').map(Number);
    return new Date(year, mm - 1, dd);
};

export const resolveRecurringWindow = (today: Date, start_mmdd: string, end_mmdd: string, p_start_mmdd?: string, p_end_mmdd?: string) => {
    const currentYear = today.getFullYear();
    let start = resolveDate(start_mmdd, currentYear);
    let end = resolveDate(end_mmdd, currentYear);

    if (end < start) {
        end = resolveDate(end_mmdd, currentYear + 1);
    }

    if (today > end) {
        start = resolveDate(start_mmdd, currentYear + 1);
        end = resolveDate(end_mmdd, (end.getFullYear() + 1));
    }

    let peak_start, peak_end;
    if (p_start_mmdd && p_end_mmdd) {
        peak_start = resolveDate(p_start_mmdd, start.getFullYear());
        peak_end = resolveDate(p_end_mmdd, start.getFullYear());
        if (peak_end < peak_start) peak_end = resolveDate(p_end_mmdd, start.getFullYear() + 1);
    }

    return { start, end, peak_start, peak_end };
};

export const computeState = (today: Date, signal: TrendSignal, trendType?: TrendType) => {
    let start, end, peak_start, peak_end;
    const pre_alert_days = signal.pre_alert_days || trendType?.default_pre_alert_days || 14;

    if (signal.mode === 'one_off') {
        start = signal.start_date ? new Date(signal.start_date) : new Date();
        end = signal.end_date ? new Date(signal.end_date) : new Date();
        peak_start = signal.peak_start_date ? new Date(signal.peak_start_date) : undefined;
        peak_end = signal.peak_end_date ? new Date(signal.peak_end_date) : undefined;
    } else {
        ({ start, end, peak_start, peak_end } = resolveRecurringWindow(today, signal.start_mmdd, signal.end_mmdd, signal.peak_start_mmdd, signal.peak_end_mmdd));
    }

    const pre_alert_date = new Date(start);
    pre_alert_date.setDate(pre_alert_date.getDate() - pre_alert_days);

    let state: SignalState = 'UPCOMING_PREALERT';

    if (today < pre_alert_date) state = 'UPCOMING_PREALERT';
    else if (today < start) state = 'IN_PREALERT';
    else if (today <= end) {
        state = 'ACTIVE';
        if (peak_start && peak_end && today >= peak_start && today <= peak_end) {
            state = 'PEAK';
        }
    } else state = 'ENDED';

    return { state, start, end, peak_start, peak_end, pre_alert_date };
};

export const formatDate = (date: Date) => date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });

export const formatDestinations = (destinations: (string | { name?: string; code?: string } | unknown)[] | undefined): string => {
    if (!destinations || destinations.length === 0) return '—';

    // Handle array of strings or objects
    const labels = destinations.map(d => {
        if (typeof d === 'string') return d;
        if (d && typeof d === 'object') {
            const dest = d as { name?: string; code?: string };
            return dest.name || dest.code || '';
        }
        return '';
    }).filter(Boolean); // Remove empty strings

    return labels.join(', ');
};

export const formatKeyDate = (state: SignalState, start: Date, end: Date, pre_alert_date: Date): string => {
    if (state === 'PEAK') return `Ends ${formatDate(end)}`;
    if (state === 'ACTIVE') return `Ends ${formatDate(end)}`;
    if (state === 'IN_PREALERT' || state === 'UPCOMING_PREALERT') {
        const diff = Math.ceil((pre_alert_date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        if (diff > 0) return `Alert in ${diff}d`;
        return `Starts ${formatDate(start)}`;
    }
    return formatDate(start);
};

export function resolveSignalDates(signal: TrendSignal, today: Date, preAlertDays: number) {
    if (signal.mode === "one_off") {
        if (!signal.start_date || !signal.end_date) return null;
        const start = parseLocalYYYYMMDD(signal.start_date);
        const end = parseLocalYYYYMMDD(signal.end_date);
        const preAlert = addDays(start, -preAlertDays);

        const peakStart = signal.peak_start_date ? parseLocalYYYYMMDD(signal.peak_start_date) : undefined;
        const peakEnd = signal.peak_end_date ? parseLocalYYYYMMDD(signal.peak_end_date) : undefined;

        return { start, end, preAlert, peakStart, peakEnd };
    }

    if (!signal.start_mmdd || !signal.end_mmdd) return null;
    const { start, end, peak_start, peak_end } = resolveRecurringWindow(
        today,
        signal.start_mmdd,
        signal.end_mmdd,
        signal.peak_start_mmdd,
        signal.peak_end_mmdd
    );
    const preAlert = addDays(start, -preAlertDays);
    return { start, end, preAlert, peakStart: peak_start, peakEnd: peak_end };
}
