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
            { header: 'ID', key: 'canonical_id', width: '80px' },
            { header: 'English Title', key: 'title_en', width: '350px' },
            { header: 'Tier', key: 'affiliate_tier', width: '80px' },
            { header: 'Score', key: 'affiliate_score', width: '70px' },
            { header: 'Campaign', key: 'dsa_campaign', width: '180px' },
            { header: 'Category', key: 'geo_category', width: '120px' },
            { header: 'Location', key: 'location', width: '250px' }
        ],
        filters: [
            { id: 'searchTerm', label: 'Search Title', type: 'text', placeholder: 'Include keywords...' },
            { id: 'excludeTerm', label: 'Exclude Title', type: 'text', placeholder: 'Exclude keywords...' },
            {
                id: 'affiliate_tier', label: 'Tier', type: 'select', multiple: true, options: [
                    { label: 'All', value: '' },
                    { label: 'a1 (Priority)', value: 'a1' },
                    { label: 'a2 (Price)', value: 'a2' },
                    { label: 'a3 (Inspir.)', value: 'a3' },
                    { label: 'a4 (BOFU)', value: 'a4' },
                    { label: 'Excluded', value: 'excluded' }
                ]
            },
            {
                id: 'geo_category', label: 'Category', type: 'select', multiple: true, options: [
                    { label: 'All', value: '' },
                    { label: 'City', value: 'city' },
                    { label: 'Sub City', value: 'sub_city' },
                    { label: 'Airport', value: 'airport' },
                    { label: 'Station', value: 'station' },
                    { label: 'Seaport', value: 'seaport' },
                    { label: 'Landmark', value: 'landmark' },
                    { label: 'Resort Area', value: 'resort_area' },
                    { label: 'Shopping', value: 'shopping_district' }
                ]
            },
            {
                id: 'dsa_campaign', label: 'Campaign', type: 'select', multiple: true, options: [
                    { label: 'All', value: '' },
                    { label: 'Discovery_Broad', value: 'Discovery_Broad' },
                    { label: 'Discovery_Exact', value: 'Discovery_Exact' },
                    { label: 'Discovery_Phrase', value: 'Discovery_Phrase' }
                ]
            },
            {
                id: 'province', label: 'Province', type: 'select', multiple: true, options: [
                    { label: 'All', value: '' },
                    { label: 'Bali', value: 'Bali' },
                    { label: 'Jakarta', value: 'Jakarta' },
                    { label: 'West Java', value: 'West Java' },
                    { label: 'Central Java', value: 'Central Java' },
                    { label: 'East Java', value: 'East Java' },
                    { label: 'Yogyakarta', value: 'Yogyakarta' },
                    { label: 'North Sumatra', value: 'North Sumatra' },
                    { label: 'South Sulawesi', value: 'South Sulawesi' }
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
            { id: 'affiliate_tier', label: 'Tier (a1-a4)', desc: 'Affiliate Cookie Tier' },
            { id: 'geo_category', label: 'POI Category', desc: 'Airport, Landmark, etc.' },
            { id: 'city', label: 'City', desc: 'Primary City match' },
            { id: 'sub_city', label: 'Sub City', desc: 'Granular location' },
            { id: 'title_en', label: 'English Title', desc: 'Page title in English' },
            { id: 'url', label: 'URL', desc: 'Target link' }
        ]
    }
};
