export interface TrendType {
    id: string;
    key: string;
    name: string;
    category: 'seasonal_travel' | 'entry_pretrip' | 'peak_window' | 'one_off';
    default_priority: 'medium' | 'high';
    default_pre_alert_days: number;
}

export interface Destination {
    code: string;
    name: string;
}

export interface TrendSignal {
    id: string;
    key: string;
    trend_type: string; // Relation ID
    expand?: {
        trend_type?: TrendType;
    };
    status: 'active' | 'draft' | 'archived';
    priority: 'high' | 'medium';
    pre_alert_days: number;
    destinations: (string | Destination)[];
    summary: string;
    mode: 'recurring' | 'one_off';
    source_markets: string[];
    product_types: string[];
    start_mmdd: string;
    end_mmdd: string;
    peak_start_mmdd?: string;
    peak_end_mmdd?: string;
    start_date?: string;
    end_date?: string;
    peak_start_date?: string;
    peak_end_date?: string;
    keywords: string[];
    notes: string;
    updated: string;
}

export type Market = "HK" | "TW" | "ID" | "SG" | "MY" | "AU";
export type Priority = "high" | "medium";
export type SignalState = 'UPCOMING_PREALERT' | 'IN_PREALERT' | 'ACTIVE' | 'PEAK' | 'ENDED';
