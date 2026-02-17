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
            { header: 'Vietnamese Title', key: 'translated_title_vi' },
            { header: 'Funnel', key: 'funnel_stage', width: '120px' },
            { header: 'Tier', key: 'tier', width: '60px' },
            { header: 'Location', key: 'location' }
        ],
        filters: [
            { id: 'searchTerm', label: 'Search Title', type: 'text', placeholder: 'Type to search...' },
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
                id: 'tier', label: 'Tier', type: 'select', options: [
                    { label: 'All Tiers', value: '' },
                    { label: 'Tier 1', value: '1' },
                    { label: 'Tier 2', value: '2' },
                    { label: 'Tier 3', value: '3' },
                    { label: 'Tier 4', value: '4' },
                    { label: 'Tier 5', value: '5' }
                ]
            },
            {
                id: 'language', label: 'Language', type: 'select', options: [
                    { label: 'All Languages', value: 'all' },
                    { label: 'zh-HK Only', value: 'zh-HK' },
                    { label: 'zh-TW Only', value: 'zh-TW' },
                    { label: 'Both (zh-HK & zh-TW)', value: 'both' }
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
            { header: 'Sub Tag', key: 'sub_tag', width: '120px' },
            { header: 'Funnel', key: 'funnel_stage', width: '120px' },
            { header: 'Tier', key: 'tier', width: '60px' },
            { header: 'Location', key: 'location' }
        ],
        filters: [
            { id: 'searchTerm', label: 'Search Title', type: 'text', placeholder: 'Type to search...' },
            { id: 'sitemap_tag', label: 'Sitemap Tag', type: 'select' },
            { id: 'country', label: 'Country', type: 'datalist', placeholder: 'Global / All' },
            { id: 'sub_tag', label: 'Sub Tag', type: 'text', placeholder: 'e.g. attraction' },
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
                    { label: 'All Tiers', value: '' },
                    { label: 'Tier 1', value: '1' },
                    { label: 'Tier 2', value: '2' },
                    { label: 'Tier 3', value: '3' },
                    { label: 'Tier 4', value: '4' },
                    { label: 'Tier 5', value: '5' }
                ]
            }
        ],
        exportFields: [
            { id: 'country', label: 'Country Name', desc: 'e.g. Indonesia, Thailand' },
            { id: 'city', label: 'City Name', desc: 'Included if present' },
            { id: 'tier', label: 'Tier (1,2,3,4,5)', desc: 'Adds Tier prefix' },
            { id: 'funnel_stage', label: 'Funnel Stage', desc: 'awareness/planning/readiness' },
            { id: 'sub_tag', label: 'Sub-tag', desc: 'Optional taxonomy field' }
        ]
    }
};
