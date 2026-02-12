// TypeScript interfaces for Campaign Notes feature

export interface CampaignPlatform {
    id: string;
    platform_name: string;
    marketplace?: string;
    display_name: string;
    color: string;
    icon?: string;
    metadata?: string;
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
    description?: string;
    general_notes?: string;
    is_dsa: boolean;
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
    campaign: string;
    related_change?: string;
    reminder_date: string;
    message: string;
    check_metrics?: string[];
    status: 'pending' | 'completed' | 'dismissed' | 'snoozed';
    priority?: 'low' | 'medium' | 'high';
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
