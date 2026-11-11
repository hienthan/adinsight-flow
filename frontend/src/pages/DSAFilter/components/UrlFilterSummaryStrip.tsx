import { Download, Globe } from 'lucide-react';
import { MetricCard } from '../../../components/common/ui';
import type { UrlFilterResponse } from '../urlFilterUtils';
import { formatUrlFilterCurrency, formatUrlFilterNumber } from '../urlFilterViewUtils';

interface UrlFilterSummaryStripProps {
    summary: UrlFilterResponse['summary'] | null;
    fileName: string;
}

export function UrlFilterSummaryStrip({ summary, fileName }: UrlFilterSummaryStripProps) {
    return (
        <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            <MetricCard label="Rows" value={(summary?.total_rows ?? 0).toLocaleString()} helper={fileName || 'No file yet'} icon={Globe} accent="#0f766e" style={{ padding: '0.8rem 0.9rem' }} />
            <MetricCard label="Matched" value={(summary?.matched_rows ?? 0).toLocaleString()} helper={`${formatUrlFilterNumber(summary?.included_clicks ?? 0)} clicks`} accent="#2563eb" style={{ padding: '0.8rem 0.9rem' }} />
            <MetricCard label="Unknown" value={(summary?.unknown_rows ?? 0).toLocaleString()} helper="Kept unless excluded" accent="#d97706" style={{ padding: '0.8rem 0.9rem' }} />
            <MetricCard label="Included" value={(summary?.included_rows ?? 0).toLocaleString()} helper={`${formatUrlFilterCurrency(summary?.included_cost ?? 0)} cost`} icon={Download} accent="#14b8a6" style={{ padding: '0.8rem 0.9rem' }} />
        </div>
    );
}
