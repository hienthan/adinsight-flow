// TypeScript interfaces for Campaign Notes feature

export interface CampaignPlatform {
    id: string;
    platform_name: string;
    marketplace?: string;
    display_name: string;
    color: string;
    icon?: string;
    metadata?: string;
    sticky_note?: string;
    is_pinned?: boolean;
    order?: number;
    created: string;
    updated: string;
}

export interface Campaign {
    id: string;
    platform: string;
    name: string;
    status: 'active' | 'paused' | 'testing' | 'archived';
    created_date: string;
    last_reviewed_date?: string;
    last_review_outcome?: 'no_change' | 'updated' | 'cpc_increase' | 'cpc_reduce';
    cpc?: number;
    max_daily_budget?: number;
    keywords?: string;
    chatgpt_metadata?: string;
    metadata?: string;
    description?: string;
    general_notes?: string;
    is_dsa: boolean;
    is_testing?: boolean;
    priority?: 'normal' | 'medium' | 'high' | 'critical';
    custom_fields?: Record<string, any>;
    created: string;
    updated: string;
    expand?: {
        platform?: CampaignPlatform;
    };
}

export interface CampaignChange {
    id: string;
    campaign: string;
    change_date: string;
    field_changed: string;
    old_value?: any;
    new_value?: any;
    change_notes?: string;
    things_to_monitor?: string;
    metadata?: Record<string, any>;
    created: string;
    updated: string;
    expand?: {
        campaign?: Campaign;
    };
}

export interface CampaignReminder {
    id: string;
    campaign: string | null;
    platform?: string;
    related_change?: string;
    reminder_date: string;
    message: string;
    check_metrics?: string[];
    status: 'pending' | 'completed' | 'dismissed' | 'snoozed';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    completion_notes?: string;
    snooze_until?: string;
    metadata?: Record<string, any>;
    created: string;
    updated: string;
    expand?: {
        campaign?: Campaign;
        related_change?: CampaignChange;
    };
}

export interface ReminderTemplate {
    id: string;
    name: string;
    trigger_field: string;
    default_days_offset: number;
    message_template: string;
    default_metrics?: string[];
    default_priority?: 'low' | 'medium' | 'high';
    active?: boolean;
    created: string;
    updated: string;
}
export interface CampaignNote {
    id: string;
    platform: string;
    message: string;
    status: 'pending' | 'completed' | 'dismissed';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    due_date?: string;
    created: string;
    updated: string;
    expand?: {
        platform?: CampaignPlatform;
    };
}

export interface CampaignTestTrack {
    id: string;
    track_key: string;
    title: string;
    platform: string;
    lane_scope: 'destination' | 'market_only';
    source_market: string;
    destination_country?: string;
    destination_city?: string;
    pattern_topic: string;
    category?: string;
    test_type: 'cookie' | 'country_launch' | 'topic_validation' | 'landing_page' | 'campaign_structure' | 'creative_angle' | 'bidding' | 'scaling' | 'other';
    status: 'planned' | 'testing' | 'live' | 'watching' | 'failed' | 'paused' | 'archived';
    result?: 'positive' | 'neutral' | 'negative' | 'mixed';
    priority?: 'normal' | 'medium' | 'high' | 'critical';
    cookie_test_state?: 'not_applicable' | 'on' | 'off' | 'mixed';
    summary_note?: string;
    failure_note?: string;
    next_action?: string;
    do_not_retest?: boolean;
    linked_campaigns?: string[];
    main_tags?: string[];
    started_at?: string;
    last_reviewed_at?: string;
    last_state_changed_at?: string;
    owner?: string;
    metadata?: Record<string, any>;
    created: string;
    updated: string;
    expand?: {
        platform?: CampaignPlatform;
        linked_campaigns?: Campaign[];
    };
}

export interface CampaignTestUpdate {
    id: string;
    test_track: string;
    update_type: 'launch_note' | 'performance_review' | 'hypothesis_update' | 'failure_note' | 'winner_note' | 'pause_note' | 'retest_note' | 'general_note';
    status_snapshot?: CampaignTestTrack['status'];
    result_snapshot?: CampaignTestTrack['result'];
    note: string;
    source_market_snapshot?: string;
    destination_country_snapshot?: string;
    destination_city_snapshot?: string;
    pattern_topic_snapshot?: string;
    category_snapshot?: string;
    linked_campaigns_snapshot?: Array<{ id: string; name: string }>;
    important_flag?: boolean;
    created_by?: string;
    metadata?: Record<string, any>;
    created: string;
    updated: string;
    expand?: {
        test_track?: CampaignTestTrack;
    };
}
