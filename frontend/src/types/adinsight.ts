export interface PageRecord {
    id: string;
    url: string;
    slug: string;
    country: string;
    city: string;
    tier: string;
    canonical_id: string;
    funnel_stage?: string;
    include_for_dsa: boolean;
    exclude_for_dsa: boolean;
    is_private: boolean;
    languages: string[];
    content_type: string;
    is_active: boolean;
    last_http_status?: number;
    sub_tag?: string;
    translated_title_vi?: string;
    title_en?: string;
    affiliate_tier?: string;
    affiliate_score?: number;
    intent_score?: number;
    cookie_score?: number;
    cpc_risk_score?: number;
    dsa_campaign?: string;
    geo_score?: number;
    final_score?: number;
    geo_entity?: string;
    geo_type?: string;
    intent_type?: string;
    intent_primary?: string;
    sub_city?: string;
    province?: string;
    display_name?: string;
    time_sensitive?: string;
    metadata?: {
        funnel_rule_hit?: string;
        tier_source?: string;
        year_detected?: string;
        geo_source?: string;
        raw_slug?: string;
        processed_at?: string;
    };
}

export interface ColumnDef {
    header: string;
    key: keyof PageRecord | 'location' | 'actions' | 'score';
    width?: string;
    render?: (record: PageRecord) => React.ReactNode;
}

export interface FilterOption {
    label: string;
    value: string;
    validTiers?: string[];
}

export interface FilterDef {
    id: string;
    label: string;
    type: 'text' | 'select' | 'datalist';
    multiple?: boolean;
    options?: FilterOption[];
    placeholder?: string;
}

export interface PlatformConfig {
    id: string;
    name: string;
    collection: string;
    titleKey: keyof PageRecord;
    defaultSitemapTags: string[];
    columns: ColumnDef[];
    filters: FilterDef[];
    activeFilterKey?: keyof PageRecord;
    exportFields: { id: string; label: string; desc: string }[];
}
