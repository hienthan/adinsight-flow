export interface ParsedUploadRow {
    rowId: number;
    urlOriginal: string;
    urlNormalized: string;
    headline: string;
    clicksRaw: string;
    clicks: number | null;
    impressionsRaw: string;
    impressions: number | null;
    costRaw: string;
    cost: number | null;
    ctrRaw: string;
    ctr: number | null;
    pageCountry: string;
    pageCity: string;
    classification: 'matched' | 'unknown';
    confidence: 'high' | 'medium' | 'low';
    matchedBy: string;
    reason: string;
    include: boolean;
    warnings: string[];
}

export interface UrlFilterSessionMeta {
    session_id: string;
    file_name: string;
    platform: string;
    created_at: string;
    expires_at: string;
    row_count: number;
    country_options: string[];
}

export interface UrlFilterSummary {
    total_rows: number;
    matched_rows: number;
    unknown_rows: number;
    included_rows: number;
    excluded_rows: number;
    included_clicks: number;
    excluded_clicks: number;
    included_cost: number;
    excluded_cost: number;
    top_countries: Array<{ country: string; count: number }>;
}

export interface UrlFilterResponse {
    session_id: string;
    meta: UrlFilterSessionMeta;
    summary: UrlFilterSummary;
    country_options: string[];
    rows: Array<{
        row_id: number;
        url_original: string;
        url_normalized: string;
        headline: string;
        clicks_raw: string;
        clicks: number | null;
        impressions_raw: string;
        impressions: number | null;
        cost_raw: string;
        cost: number | null;
        ctr_raw: string;
        ctr: number | null;
        page_country: string;
        page_city: string;
        classification: 'matched' | 'unknown';
        confidence: 'high' | 'medium' | 'low';
        matched_by: string;
        reason: string;
        include: boolean;
        warnings: string[];
    }>;
    total_filtered_rows: number;
}

export interface UrlFilterState {
    searchTerm: string;
    includeCountries: string;
    excludeCountries: string;
    includeStatus: 'all' | 'included' | 'excluded';
    classification: 'all' | 'matched' | 'unknown';
    excludeTerm: string;
}

export const INITIAL_URL_FILTER_STATE: UrlFilterState = {
    searchTerm: '',
    includeCountries: '',
    excludeCountries: '',
    includeStatus: 'all',
    classification: 'all',
    excludeTerm: '',
};

export const URL_FILTER_EXPORT_FIELDS = [
    { id: 'page_country', label: 'Country', desc: 'Adds geo=<country> to the DSA label.' },
    { id: 'page_city', label: 'City', desc: 'Adds city=<city> when available.' },
    { id: 'classification', label: 'Classification', desc: 'Adds class=matched or class=unknown.' },
    { id: 'confidence', label: 'Confidence', desc: 'Adds confidence=<level> to reflect detection trust.' },
    { id: 'headline', label: 'Headline', desc: 'Appends a human-readable headline segment.' },
] as const;

export function mapApiRow(row: UrlFilterResponse['rows'][number]): ParsedUploadRow {
    return {
        rowId: row.row_id,
        urlOriginal: row.url_original,
        urlNormalized: row.url_normalized,
        headline: row.headline,
        clicksRaw: row.clicks_raw,
        clicks: row.clicks,
        impressionsRaw: row.impressions_raw,
        impressions: row.impressions,
        costRaw: row.cost_raw,
        cost: row.cost,
        ctrRaw: row.ctr_raw,
        ctr: row.ctr,
        pageCountry: row.page_country,
        pageCity: row.page_city,
        classification: row.classification,
        confidence: row.confidence,
        matchedBy: row.matched_by,
        reason: row.reason,
        include: row.include,
        warnings: row.warnings,
    };
}

export function buildSessionQuery(filters: UrlFilterState) {
    const params = new URLSearchParams();
    params.set('search_term', filters.searchTerm);
    params.set('include_countries', filters.includeCountries);
    params.set('exclude_countries', filters.excludeCountries);
    params.set('include_status', filters.includeStatus);
    params.set('classification', filters.classification);
    params.set('exclude_term', filters.excludeTerm);
    return params.toString();
}
