import { PlatformConfig } from '../types/adinsight';

export const PLATFORMS: Record<string, PlatformConfig> = {
    klook: {
        id: 'klook',
        name: 'Klook',
        collection: 'pages',
        titleKey: 'translated_title_vi',
        defaultSitemapTags: ['blog', 'activity', 'mobility'],
        columns: [
            { header: 'ID', key: 'canonical_id', width: '80px' },
            {
                header: 'Slug',
                key: 'slug',
                width: '320px',
            },
            { header: 'English Title', key: 'translated_title_vi' },
            { header: 'Funnel', key: 'funnel_stage', width: '120px' },
            { header: 'Tier', key: 'tier', width: '60px' },
            { header: 'Location', key: 'location' }
        ],
        filters: [
            { id: 'searchTerm', label: 'Search Title', type: 'text', placeholder: 'Include keywords...' },
            { id: 'excludeTerm', label: 'Exclude Title', type: 'text', placeholder: 'Exclude keywords...' },
            { id: 'sitemap_tag', label: 'Sitemap Tag', type: 'select' },
            { id: 'country', label: 'Country', type: 'datalist', placeholder: 'Global / All' },
            { id: 'city', label: 'City', type: 'text', placeholder: 'Any City' },
            {
                id: 'funnel_stage', label: 'Funnel Stage', type: 'select', options: [
                    { label: 'All Stages', value: '' },
                    { label: 'Awareness', value: 'awareness' },
                    { label: 'Planning', value: 'planning' },
                    { label: 'Readiness', value: 'readiness' }
                ]
            },
            {
                id: 'tier', label: 'Tier', type: 'select', options: [
                    { label: 'All', value: '' },
                    { label: '1', value: '1' },
                    { label: '2', value: '2' },
                    { label: '3', value: '3' },
                    { label: '4', value: '4' },
                    { label: '5', value: '5' }
                ]
            },
            {
                id: 'language', label: 'Lang', type: 'select', options: [
                    { label: 'All', value: 'all' },
                    { label: 'zh-HK', value: 'zh-HK' },
                    { label: 'zh-TW', value: 'zh-TW' },
                    { label: 'Both', value: 'both' }
                ]
            }
        ],
        exportFields: [
            { id: 'country', label: 'Country Name', desc: 'e.g. Hong Kong, Japan' },
            { id: 'city', label: 'City Name', desc: 'Included if present' },
            { id: 'tier', label: 'Tier (1,2,3,4,5)', desc: 'Adds Tier prefix' },
            { id: 'funnel_stage', label: 'Funnel Stage', desc: 'awareness/planning/readiness' },
            { id: 'sub_tag', label: 'Sub-tag', desc: 'Optional taxonomy field' }
        ]
    },
    traveloka: {
        id: 'traveloka',
        name: 'Traveloka',
        collection: 'tvlk_pages',
        titleKey: 'title_en',
        defaultSitemapTags: ['activities'],
        columns: [
            { header: 'ID', key: 'canonical_id', width: '80px' },
            {
                header: 'Slug',
                key: 'slug',
                width: '320px'
            },
            { header: 'English Title', key: 'title_en' },
            { header: 'Sub Tag', key: 'sub_tag', width: '100px' },
            { header: 'Content Type', key: 'content_type', width: '120px' },
            { header: 'Funnel', key: 'funnel_stage', width: '110px' },
            { header: 'Tier', key: 'tier', width: '60px' },
            { header: 'Location', key: 'location' }
        ],
        filters: [
            { id: 'searchTerm', label: 'Search Title', type: 'text', placeholder: 'Include (e.g. tour, japan)...' },
            { id: 'excludeTerm', label: 'Exclude Title', type: 'text', placeholder: 'Exclude (e.g. ticket, pass)...' },
            { id: 'sitemap_tag', label: 'Sitemap Tag', type: 'select' },
            { id: 'country', label: 'Country', type: 'datalist', placeholder: 'Global / All' },
            { id: 'city', label: 'City', type: 'text', placeholder: 'Any City' },
            {
                id: 'sub_tag', label: 'Sub Tag', type: 'select', options: [
                    { label: 'All', value: '' },
                    { label: 'Landmark', value: 'landmark' },
                    { label: 'Tour', value: 'tour' },
                    { label: 'Ticket', value: 'ticket' },
                    { label: 'Visa', value: 'visa' },
                    { label: 'Junk', value: 'junk' },
                    { label: 'Food', value: 'food' },
                    { label: 'Itinerary', value: 'itinerary' },
                    { label: 'Transport', value: 'transport' },
                    { label: 'Outdoor', value: 'outdoor' },
                    { label: 'Service', value: 'service' },
                    { label: 'Class', value: 'class' },
                    { label: 'Beauty & Spa', value: 'beauty_spa' },
                    { label: 'Connectivity', value: 'connectivity' },
                    { label: 'Event', value: 'event' },
                    { label: 'Tips & Tricks', value: 'tips_and_tricks' },
                    { label: 'Others', value: 'others' }
                ]
            },
            {
                id: 'content_type', label: 'Content Type', type: 'select', options: [
                    { label: 'All', value: '' },
                    { label: 'POI Exploration', value: 'poi_exploration' },
                    { label: 'Activity/Tour', value: 'activity_tour' },
                    { label: 'Activity/Attraction', value: 'activity_attraction' },
                    { label: 'Travel Document', value: 'travel_document' },
                    { label: 'Informational Junk', value: 'informational_junk' },
                    { label: 'Food & Lifestyle', value: 'food_lifestyle' },
                    { label: 'Travel Guide', value: 'travel_guide' },
                    { label: 'Transport Guide', value: 'transport_guide' },
                    { label: 'Activity/Outdoor', value: 'activity_outdoor' },
                    { label: 'Service/Essential', value: 'service_essential' },
                    { label: 'Service/Beauty', value: 'service_beauty' },
                    { label: 'Activity/Workshop', value: 'activity_workshop' },
                    { label: 'Transport/Rental', value: 'transport_rental' },
                    { label: 'Others', value: 'others' }
                ]
            },
            {
                id: 'funnel_stage', label: 'Funnel Stage', type: 'select', options: [
                    { label: 'All Stages', value: '' },
                    { label: 'Awareness', value: 'awareness' },
                    { label: 'Planning', value: 'planning' },
                    { label: 'Consideration', value: 'consideration' },
                    { label: 'Readiness', value: 'readiness' }
                ]
            },
            {
                id: 'tier', label: 'Tier', type: 'select', options: [
                    { label: 'All', value: '' },
                    { label: '1', value: '1' },
                    { label: '2', value: '2' },
                    { label: '3', value: '3' },
                    { label: '4', value: '4' },
                    { label: '5', value: '5' }
                ]
            },
            {
                id: 'language', label: 'Lang', type: 'select', options: [
                    { label: 'All', value: 'all' },
                    { label: 'zh-HK', value: 'zh-HK' },
                    { label: 'zh-TW', value: 'zh-TW' },
                    { label: 'Both', value: 'both' }
                ]
            }
        ],
        activeFilterKey: 'is_active',
        exportFields: [
            { id: 'country', label: 'Country Name', desc: 'e.g. Indonesia, Thailand' },
            { id: 'city', label: 'City Name', desc: 'Included if present' },
            { id: 'tier', label: 'Tier (1,2,3,4,5)', desc: 'Adds Tier prefix' },
            { id: 'funnel_stage', label: 'Funnel Stage', desc: 'awareness/planning/readiness' },
            { id: 'sub_tag', label: 'Sub-tag', desc: 'Optional taxonomy field' }
        ]
    }
};
