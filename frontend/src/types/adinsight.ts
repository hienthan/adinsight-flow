export interface PageRecord {
    id: string;
    url: string;
    slug?: string;
    title?: string;
    language?: string;
    pattern?: string;
    country: string;
    city: string;
    tier?: string;
    canonical_id?: string;
    funnel_stage?: string;
    include_for_dsa?: boolean;
    exclude_for_dsa?: boolean;
    is_private?: boolean;
    languages?: string[];
    content_type: string;
    is_active?: boolean;
    last_http_status?: number;
    sub_tag?: string;
    translated_title_vi?: string;
    title_en?: string;
    affiliate_tier?: string;
    affiliate_score?: number;
    intent_score?: number;
    traffic?: number;
    traffic_pct?: number;
    keyword_count?: number;
    traffic_change?: number;
    cookie_score?: number;
    cpc_risk_score?: number;
    dsa_campaign?: string;
    dsa_adgroup?: string;
    geo_score?: number;
    final_score?: number;
    geo_entity?: string;
    geo_type?: string;
    intent_type?: string;
    intent_primary?: string;
    page_type?: string;
    topic_type?: string;
    geo_category?: string;
    sub_city?: string;
    province?: string;
    display_name?: string;
    time_sensitive?: string;
    classification_confidence?: number;
    readiness_hint?: string;
    remaining_commission_potential?: string;
    post_booking_risk?: string;
    trip_mode_risk?: string;
    market_fit?: string;
    transport_scope?: string;
    transport_trip_stage?: string;
    transport_affiliate_fit?: string;
    transport_geo_scope?: string;
    transport_risk_flags?: string[] | string;
    rule_hits?: string[] | string;
    semrush_metrics?: Record<string, number | null>;
    metadata?: {
        funnel_rule_hit?: string;
        tier_source?: string;
        year_detected?: string;
        geo_source?: string;
        raw_slug?: string;
        processed_at?: string;
        translated_source_text?: string;
        translation_source?: string;
        semrush_signal_hint?: string;
        exclusion_reason?: string;
        classifier_version?: string;
        inferred_language?: string;
        source_text?: string;
        pattern_source?: string;
        semrush_ratios?: Record<string, number>;
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
    type: 'text' | 'select' | 'datalist' | 'checkbox';
    multiple?: boolean;
    options?: FilterOption[];
    placeholder?: string;
}

export interface FilterPreset {
    id: string;
    label: string;
    description?: string;
    filters: Record<string, string>;
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
    metadataMode?: 'platform_metadata' | 'collection_distinct';
    filterPresets?: FilterPreset[];
}
