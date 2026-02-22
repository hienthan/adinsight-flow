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
                id: 'tier', label: 'Tier', type: 'select', multiple: true, options: [
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
                id: 'sub_tag', label: 'Sub Tag', type: 'select', multiple: true, options: [
                    { label: 'All', value: '' },
                    { label: 'Landmark', value: 'landmark', validTiers: ['3'] },
                    { label: 'Tour', value: 'tour', validTiers: ['2'] },
                    { label: 'Ticket', value: 'ticket', validTiers: ['1'] },
                    { label: 'Visa', value: 'visa', validTiers: ['1', '3'] },
                    { label: 'Junk', value: 'junk', validTiers: ['3'] },
                    { label: 'Food', value: 'food', validTiers: ['1', '2', '3'] },
                    { label: 'Itinerary', value: 'itinerary', validTiers: ['2', '3'] },
                    { label: 'Transport', value: 'transport', validTiers: ['1'] },
                    { label: 'Outdoor', value: 'outdoor', validTiers: ['2'] },
                    { label: 'Service', value: 'service', validTiers: ['1'] },
                    { label: 'Class', value: 'class', validTiers: ['2'] },
                    { label: 'Beauty & Spa', value: 'beauty_spa', validTiers: ['1'] },
                    { label: 'Connectivity', value: 'connectivity', validTiers: ['1'] },
                    { label: 'Event', value: 'event', validTiers: ['1', '2'] },
                    { label: 'Tips & Tricks', value: 'tips_and_tricks', validTiers: ['3'] },
                    { label: 'Others', value: 'others' }
                ]
            },
            {
                id: 'content_type', label: 'Content Type', type: 'select', multiple: true, options: [
                    { label: 'All', value: '' },
                    { label: 'POI Exploration', value: 'poi_exploration', validTiers: ['3'] },
                    { label: 'Activity/Tour', value: 'activity_tour', validTiers: ['2'] },
                    { label: 'Activity/Attraction', value: 'activity_attraction', validTiers: ['1'] },
                    { label: 'Travel Document', value: 'travel_document', validTiers: ['1', '3'] },
                    { label: 'Informational Junk', value: 'informational_junk', validTiers: ['3'] },
                    { label: 'Food & Lifestyle', value: 'food_lifestyle', validTiers: ['1', '2', '3'] },
                    { label: 'Travel Guide', value: 'travel_guide', validTiers: ['3'] },
                    { label: 'Transport Guide', value: 'transport_guide', validTiers: ['3'] },
                    { label: 'Activity/Outdoor', value: 'activity_outdoor', validTiers: ['2'] },
                    { label: 'Service/Essential', value: 'service_essential', validTiers: ['1'] },
                    { label: 'Service/Beauty', value: 'service_beauty', validTiers: ['1'] },
                    { label: 'Activity/Workshop', value: 'activity_workshop', validTiers: ['2'] },
                    { label: 'Transport/Rental', value: 'transport_rental', validTiers: ['1'] },
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
                id: 'tier', label: 'Tier', type: 'select', multiple: true, options: [
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
