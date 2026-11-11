import { useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';

export function usePlatformMeta(
    defaultSitemapTags: string[],
    collection?: string,
    metadataMode: 'platform_metadata' | 'collection_distinct' = 'platform_metadata'
) {
    const [countries, setCountries] = useState<string[]>([]);
    const [sitemapTags, setSitemapTags] = useState<string[]>(defaultSitemapTags);

    useEffect(() => {
        const fetchMeta = async () => {
            try {
                if (metadataMode === 'collection_distinct' && collection) {
                    const records = await pb.collection(collection).getFullList({
                        fields: 'country',
                        sort: 'country'
                    });
                    const uniqueCountries = Array.from(
                        new Set(
                            records
                                .map((r) => String(r.country || '').trim())
                                .filter(Boolean)
                        )
                    ).sort((a, b) => a.localeCompare(b));

                    setCountries(uniqueCountries);
                    setSitemapTags(defaultSitemapTags);
                    return;
                }

                const records = await pb.collection('platform_metadata').getFullList({
                    sort: 'value'
                });
                const uniqueCountries = Array.from(new Set(
                    records.filter(r => r.type === 'country').map(r => {
                        const val = r.value.trim();
                        // Deduplicate common variations
                        if (val === 'Viet Nam') return 'Vietnam';
                        return val;
                    })
                )).sort();
                const metadataTags = Array.from(
                    new Set(
                        records
                            .filter((r) => r.type === 'sitemap_tag')
                            .map((r) => String(r.value || '').split(':')[0])
                            .filter(Boolean)
                    )
                ).sort();

                setCountries(uniqueCountries);
                setSitemapTags(Array.from(new Set([...defaultSitemapTags, ...metadataTags])));
            } catch (err) {
                console.error('Meta fetch error', err);
            }
        };
        fetchMeta();
    }, [collection, defaultSitemapTags, metadataMode]);

    return { countries, sitemapTags };
}
