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
            { header: 'English Title', key: 'title_en', width: '22%' },
            { header: 'Tier', key: 'tier', width: '8%' },
            { header: 'Score', key: 'score', width: '10%' },
            { header: 'Content Type', key: 'content_type', width: '12%' },
            { header: 'Geo Entity', key: 'geo_entity', width: '12%' },
            { header: 'Geo Type', key: 'geo_type', width: '10%' },
            { header: 'Campaign', key: 'dsa_campaign', width: '14%' },
            { header: 'Location', key: 'location', width: '12%' }
        ],
        filters: [
            { id: 'searchTerm', label: 'Search Title', type: 'text', placeholder: 'Include keywords...' },
            { id: 'excludeTerm', label: 'Exclude Title', type: 'text', placeholder: 'Exclude keywords...' },
            {
                id: 'tier', label: 'Tier', type: 'select', multiple: true, options: [
                    { label: 'All', value: '' },
                    { label: '1', value: '1' },
                    { label: '2', value: '2' },
                    { label: '3', value: '3' },
                    { label: '4', value: '4' }
                ]
            },
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
                id: 'dsa_campaign', label: 'Campaign', type: 'select', multiple: true, options: [
                    { label: 'All', value: '' },
                    { label: 'Transit Hubs', value: 'TVLK_ID_Transit_Hubs' },
                    { label: 'Leisure Hotspots', value: 'TVLK_ID_Leisure_Hotspots' },
                    { label: 'Cultural/Family', value: 'TVLK_ID_Cultural_Family' },
                    { label: 'Shopping/Business', value: 'TVLK_ID_Shopping_Business' },
                    { label: 'General Provinces', value: 'TVLK_ID_General_Provinces' },
                    { label: 'CatchAll No Geo', value: 'TVLK_ID_CatchAll_NoGeo' },
                    { label: 'General DSA', value: 'TVLK_ID_General_DSA' },
                    { label: 'Exclude System', value: 'TVLK_ID_Exclude_System' },
                    { label: 'Exclude Low Perf', value: 'TVLK_ID_Exclude_LowPerformance' }
                ]
            },
            {
                id: 'province', label: 'Province', type: 'select', multiple: true, options: [
                    { label: 'All', value: '' },
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
            { id: 'tier', label: 'Tier (1-4)', desc: 'Cookie Tier' },
            { id: 'intent_type', label: 'Intent Type', desc: 'Classification intent' },
            { id: 'geo_type', label: 'Geo Type', desc: 'Type of location entity' },
            { id: 'city', label: 'City', desc: 'Primary City match' },
            { id: 'title_en', label: 'English Title', desc: 'Page title in English' },
            { id: 'url', label: 'URL', desc: 'Target link' }
        ]
    }
};
