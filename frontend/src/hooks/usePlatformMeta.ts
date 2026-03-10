import { useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';

export function usePlatformMeta(defaultSitemapTags: string[]) {
    const [countries, setCountries] = useState<string[]>([]);
    const [sitemapTags, setSitemapTags] = useState<string[]>(defaultSitemapTags);

    useEffect(() => {
        const fetchMeta = async () => {
            try {
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
    }, [defaultSitemapTags]);

    return { countries, sitemapTags };
}
