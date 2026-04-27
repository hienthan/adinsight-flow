import { PlatformConfig } from '../types/adinsight';

export const PLATFORMS: Record<string, PlatformConfig> = {
    klook: {
        id: 'klook',
        name: 'Klook',
        collection: 'pages',
        titleKey: 'translated_title_vi',
        defaultSitemapTags: ['blog', 'activity', 'mobility'],
        columns: [
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
        activeFilterKey: 'include_for_dsa',
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
            { header: 'English Title', key: 'title_en', width: '22%' },
            { header: 'Score', key: 'score', width: '10%' },
            { header: 'Content Type', key: 'content_type', width: '12%' },
            { header: 'SubTag', key: 'sub_tag', width: '12%' },
            { header: 'Campaign', key: 'dsa_campaign', width: '14%' },
            { header: 'Geo Entity', key: 'geo_entity', width: '12%' },
            { header: 'Location', key: 'location', width: '12%' }
        ],
        filters: [
            { id: 'searchTerm', label: 'Search Title', type: 'text', placeholder: 'Include keywords...' },
            { id: 'excludeTerm', label: 'Exclude Title', type: 'text', placeholder: 'Exclude keywords...' },
            {
                id: 'intent_type', label: 'Intent', type: 'select', multiple: true, options: [
                    { label: 'All', value: '' },
                    { label: 'Transport', value: 'transport' },
                    { label: 'Things to Do', value: 'things_to_do' },
                    { label: 'Information', value: 'information' },
                    { label: 'Destination', value: 'destination' },
                    { label: 'Planning', value: 'planning' }
                ]
            },
            {
                id: 'content_type', label: 'Content', type: 'select', multiple: true, options: [
                    { label: 'All', value: '' },
                    { label: 'Attractions', value: 'attractions' },
                    { label: 'Activities', value: 'activities' },
                    { label: 'Transport', value: 'transport' },
                    { label: 'Planning', value: 'planning' },
                    { label: 'Culinary', value: 'culinary' },
                    { label: 'Events', value: 'events' },
                    { label: 'Wellness', value: 'wellness' },
                    { label: 'Shopping', value: 'shopping' }
                ]
            },
            {
                id: 'dsa_campaign', label: 'Campaign', type: 'select', multiple: true, options: [
                    { label: 'All', value: '' },
                    { label: 'Things to Do', value: 'things_to_do' },
                    { label: 'Destination', value: 'destination' },
                    { label: 'Planning', value: 'planning' },
                    { label: 'Information', value: 'information' },
                    { label: 'Transport', value: 'transport' },
                    { label: 'Transit Hubs', value: 'transit_hubs' },
                    { label: 'Leisure Hotspots', value: 'leisure_hotspots' },
                    { label: 'Global General', value: 'general_dsa' },
                    { label: 'Exclude', value: 'exclude' }
                ]
            },
            {
                id: 'province', label: 'Province', type: 'select', multiple: true, options: [
                    { label: 'All', value: '' },
                    { label: 'Unknown', value: 'Unknown' },
                    { label: 'Aceh', value: 'aceh' },
                    { label: 'Bali', value: 'bali' },
                    { label: 'Bangka Belitung', value: 'bangka-belitung' },
                    { label: 'Banten', value: 'banten' },
                    { label: 'Bengkulu', value: 'bengkulu' },
                    { label: 'Central Java', value: 'central-java' },
                    { label: 'Central Sulawesi', value: 'central-sulawesi' },
                    { label: 'Yogyakarta', value: 'daerah-istimewa-yogyakarta' },
                    { label: 'Jakarta', value: 'jakarta' },
                    { label: 'East Java', value: 'east-java' },
                    { label: 'East Nusa Tenggara', value: 'east-nusa-tenggara' },
                    { label: 'Kalimantan', value: 'kalimantan' },
                    { label: 'Lampung', value: 'lampung' },
                    { label: 'Maluku', value: 'maluku' },
                    { label: 'North Kalimantan', value: 'north-kalimantan' },
                    { label: 'North Maluku', value: 'north-maluku' },
                    { label: 'North Sulawesi', value: 'north-sulawesi' },
                    { label: 'North Sumatra', value: 'north-sumatra' },
                    { label: 'Nusa Tenggara', value: 'nusa-tenggara' },
                    { label: 'Papua', value: 'papua' },
                    { label: 'Central Papua', value: 'papua-tengah' },
                    { label: 'Riau Islands', value: 'riau-islands' },
                    { label: 'South Kalimantan', value: 'south-kalimantan' },
                    { label: 'South Sulawesi', value: 'south-sulawesi' },
                    { label: 'South Sumatra', value: 'south-sumatra' },
                    { label: 'Southeast Sulawesi', value: 'southeast-sulawesi' },
                    { label: 'Sulawesi', value: 'sulawesi' },
                    { label: 'West Java', value: 'west-java' },
                    { label: 'West Kalimantan', value: 'west-kalimantan' },
                    { label: 'West Nusa Tenggara', value: 'west-nusa-tenggara' },
                    { label: 'West Sumatra', value: 'west-sumatra' }
                ]
            },
            { id: 'country', label: 'Country', type: 'datalist', placeholder: 'Global / All' },
            {
                id: 'language', label: 'Lang', type: 'select', options: [
                    { label: 'All', value: 'all' },
                    { label: 'id-id', value: 'id-id' },
                    { label: 'en-en', value: 'en-en' }
                ]
            }
        ],
        activeFilterKey: 'is_active',
        exportFields: [
            { id: 'dsa_campaign', label: 'Campaign (Grouping)', desc: 'Main campaign label for Google Ads' },
            { id: 'geo_entity', label: 'Geo Entity', desc: 'The specific entity (Landmark/City/etc)' },
            { id: 'content_type', label: 'Content Type', desc: 'Page Category' },
            { id: 'province', label: 'Province', desc: 'Target Province' },
            { id: 'city', label: 'City', desc: 'Primary City match' },
            { id: 'title_en', label: 'English Title', desc: 'Page title in English' }
        ]
    },
    viator: {
        id: 'viator',
        name: 'Viator',
        collection: 'viator_pages',
        titleKey: 'title',
        defaultSitemapTags: [],
        metadataMode: 'collection_distinct',
        columns: [
            { header: 'Title', key: 'title', width: '30%' },
            { header: 'Country', key: 'country', width: '10%' },
            { header: 'City', key: 'city', width: '12%' },
            { header: 'Page Type', key: 'page_type', width: '10%' },
            { header: 'Intent', key: 'intent_primary', width: '12%' },
            { header: 'Campaign', key: 'dsa_campaign', width: '18%' },
            { header: 'Confidence', key: 'classification_confidence', width: '8%' }
        ],
        filters: [
            { id: 'searchTerm', label: 'Search Title', type: 'text', placeholder: 'Include keywords...' },
            { id: 'searchUrl', label: 'Search URL', type: 'text', placeholder: 'Contains URL...' },
            { id: 'excludeTerm', label: 'Exclude Title', type: 'text', placeholder: 'Exclude keywords...' },
            { id: 'country', label: 'Country', type: 'datalist', placeholder: 'Global / All' },
            {
                id: 'page_type', label: 'Page Type', type: 'select', multiple: true, options: [
                    { label: 'All', value: '' },
                    { label: 'Product', value: 'product' },
                    { label: 'Ticket', value: 'ticket' },
                    { label: 'Things To Do', value: 'ttd' }
                ]
            },
            { id: 'city', label: 'City', type: 'text', placeholder: 'e.g. Paris' },
            { id: 'is_private', label: 'Private Only', type: 'checkbox' },
            { id: 'show_url', label: 'URL', type: 'checkbox' },
            {
                id: 'intent_primary', label: 'Intent', type: 'select', multiple: true, options: [
                    { label: 'All', value: '' },
                    { label: 'Things To Do', value: 'things_to_do' },
                    { label: 'Ticket', value: 'ticket' },
                    { label: 'Day Trip', value: 'day_trip' },
                    { label: 'Multi Day', value: 'multi_day' },
                    { label: 'Transport', value: 'transport' },
                    { label: 'Cruise', value: 'cruise' },
                    { label: 'Food', value: 'food' },
                    { label: 'Show', value: 'show' },
                    { label: 'Private Tour', value: 'private_tour' }
                ]
            },
            { id: 'dsa_campaign', label: 'Campaign', type: 'text', placeholder: 'Contains...' },
            {
                id: 'classification_confidence', label: 'Confidence', type: 'select', options: [
                    { label: 'All', value: '' },
                    { label: 'High', value: 'high' },
                    { label: 'Medium', value: 'medium' },
                    { label: 'Low', value: 'low' }
                ]
            }
        ],
        exportFields: [
            { id: 'country', label: 'Country', desc: 'Destination country' },
            { id: 'city', label: 'City', desc: 'Primary city or destination anchor' },
            { id: 'page_type', label: 'Page Type', desc: 'product / ticket / ttd' },
            { id: 'intent_primary', label: 'Intent', desc: 'DSA grouping intent' },
            { id: 'content_type', label: 'Content Type', desc: 'Inventory subtype' },
            { id: 'dsa_campaign', label: 'Campaign', desc: 'Deterministic campaign key' },
            { id: 'dsa_adgroup', label: 'Ad Group', desc: 'Ad group grouping key' },
            { id: 'title', label: 'Title', desc: 'Human-readable title' }
        ]
    },
    trip: {
        id: 'trip',
        name: 'Trip.com',
        collection: 'trip_pages',
        titleKey: 'title',
        defaultSitemapTags: [],
        metadataMode: 'collection_distinct',
        columns: [
            { header: 'Title', key: 'title', width: '24%' },
            { header: 'Pattern', key: 'pattern', width: '14%' },
            { header: 'Traffic', key: 'traffic', width: '8%' },
            { header: 'Keywords', key: 'keyword_count', width: '8%' },
            { header: 'Trend', key: 'traffic_change', width: '8%' },
            { header: 'Geo Entity', key: 'geo_entity', width: '12%' },
            { header: 'Location', key: 'location', width: '12%' },
            { header: 'Content', key: 'content_type', width: '12%' },
            { header: 'Readiness', key: 'readiness_hint', width: '10%' },
            { header: 'Market Fit', key: 'market_fit', width: '10%' }
        ],
        filters: [
            { id: 'searchTerm', label: 'Search Title', type: 'text', placeholder: 'Include keywords...' },
            { id: 'searchUrl', label: 'Search URL', type: 'text', placeholder: 'Contains URL...' },
            { id: 'excludeTerm', label: 'Exclude Title', type: 'text', placeholder: 'Exclude keywords...' },
            {
                id: 'pattern', label: 'Pattern', type: 'select', multiple: true, options: [
                    { label: 'All', value: '' },
                    { label: 'Blog', value: 'blog' },
                    { label: 'Guide Destination', value: 'guide/destination' },
                    { label: 'Guide Info', value: 'guide/info' },
                    { label: 'Travel Guide Destination', value: 'travel-guide/destination' }
                ]
            },
            { id: 'country', label: 'Country', type: 'datalist', placeholder: 'Global / All' },
            {
                id: 'is_active', label: 'Status', type: 'select', options: [
                    { label: 'All', value: '' },
                    { label: 'Active Only', value: 'true' },
                    { label: 'Inactive Only', value: 'false' }
                ]
            },
            {
                id: 'content_type', label: 'Content', type: 'select', multiple: true, options: [
                    { label: 'All', value: '' },
                    { label: 'Requirements', value: 'requirements' },
                    { label: 'Utility Info', value: 'utility_info' },
                    { label: 'Transport Info', value: 'transport_info' },
                    { label: 'Planning Guide', value: 'planning_guide' },
                    { label: 'Destination Guide', value: 'destination_guide' },
                    { label: 'Weather Info', value: 'weather_info' },
                    { label: 'Airline Ops', value: 'airline_ops_info' },
                    { label: 'Generic Info', value: 'generic_info' }
                ]
            },
            {
                id: 'readiness_hint', label: 'Readiness', type: 'select', multiple: true, options: [
                    { label: 'All', value: '' },
                    { label: 'High', value: 'high' },
                    { label: 'Medium High', value: 'medium_high' },
                    { label: 'Medium', value: 'medium' },
                    { label: 'Low', value: 'low' }
                ]
            },
            {
                id: 'market_fit', label: 'Market Fit', type: 'select', multiple: true, options: [
                    { label: 'All', value: '' },
                    { label: 'High', value: 'high' },
                    { label: 'Medium', value: 'medium' },
                    { label: 'Low', value: 'low' }
                ]
            },
            {
                id: 'intent_primary', label: 'Intent', type: 'select', multiple: true, options: [
                    { label: 'All', value: '' },
                    { label: 'Travel Requirements', value: 'travel_requirements' },
                    { label: 'Travel Readiness', value: 'travel_readiness' },
                    { label: 'Transport', value: 'transport' },
                    { label: 'Planning', value: 'planning' },
                    { label: 'Destination Research', value: 'destination_research' },
                    { label: 'General Info', value: 'general_info' }
                ]
            },
            {
                id: 'topic_type', label: 'Topic', type: 'select', multiple: true, options: [
                    { label: 'All', value: '' },
                    { label: 'Entry Document', value: 'entry_document' },
                    { label: 'Visa', value: 'visa' },
                    { label: 'Plug Voltage', value: 'plug_voltage' },
                    { label: 'Baggage Rule', value: 'baggage_rule' },
                    { label: 'Airport Transport', value: 'airport_transport' },
                    { label: 'City Transport', value: 'city_transport' },
                    { label: 'Itinerary', value: 'itinerary' },
                    { label: 'Cost Budget', value: 'cost_budget' },
                    { label: 'Weather', value: 'weather' },
                    { label: 'Airline Ops', value: 'airline_ops' },
                    { label: 'Destination Guide', value: 'destination_guide' },
                    { label: 'Generic Info', value: 'generic_info' },
                    { label: 'Local Daytrip', value: 'local_daytrip' }
                ]
            },
            { id: 'geo_entity', label: 'Geo Entity', type: 'text', placeholder: 'e.g. thailand' },
            {
                id: 'language', label: 'Lang', type: 'select', options: [
                    { label: 'All', value: 'all' },
                    { label: 'zh-HK', value: 'zh-HK' },
                    { label: 'zh-TW', value: 'zh-TW' }
                ]
            }
        ],
        activeFilterKey: 'is_active',
        exportFields: [
            { id: 'country', label: 'Country', desc: 'Destination country or market anchor' },
            { id: 'city', label: 'City', desc: 'Primary city when available' },
            { id: 'geo_entity', label: 'Geo Entity', desc: 'Classifier geo anchor' },
            { id: 'intent_primary', label: 'Intent', desc: 'Travel intent cluster' },
            { id: 'content_type', label: 'Content Type', desc: 'Trip content category' },
            { id: 'sub_tag', label: 'Sub-tag', desc: 'Fine-grained classifier tag' },
            { id: 'readiness_hint', label: 'Readiness', desc: '7-day cookie relevance signal' },
            { id: 'pattern', label: 'Pattern', desc: 'Semrush source pattern' },
            { id: 'title', label: 'Title', desc: 'English title for review/export' }
        ],
        filterPresets: [
            {
                id: 'trip_active',
                label: 'All Active',
                description: 'Core working inventory',
                filters: {
                    is_active: 'true'
                }
            },
            {
                id: 'trip_unknown_geo',
                label: 'Unknown Geo',
                description: 'Active rows needing geo review',
                filters: {
                    is_active: 'true',
                    geo_entity: 'unknown'
                }
            },
            {
                id: 'trip_high_readiness',
                label: 'High Readiness',
                description: 'Strong 7-day cookie candidates',
                filters: {
                    is_active: 'true',
                    readiness_hint: 'high|medium_high'
                }
            },
            {
                id: 'trip_weather',
                label: 'Weather',
                description: 'Weather rows for manual review',
                filters: {
                    is_active: 'true',
                    content_type: 'weather_info'
                }
            },
            {
                id: 'trip_blog_active',
                label: 'Blog Active',
                description: 'Blog rows still considered active',
                filters: {
                    is_active: 'true',
                    pattern: 'blog'
                }
            }
        ]
    }
};
