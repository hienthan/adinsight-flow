import { useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';
import { TrendSignal } from '../pages/AdInsight/types';
import { computeState } from '../pages/AdInsight/utils';

export const useTrendCounts = () => {
    const [counts, setCounts] = useState({ active: 0, preAlert: 0, upcoming: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCounts = async () => {
            try {
                const signals = await pb.collection('trend_signals').getFullList<TrendSignal>({
                    expand: 'trend_type',
                    filter: 'status = "active"'
                });

                const today = new Date();
                let activeCount = 0;
                let preAlertCount = 0;
                let upcomingCount = 0;

                signals.forEach(signal => {
                    const { state } = computeState(today, signal, signal.expand?.trend_type);
                    if (state === 'ACTIVE' || state === 'PEAK') {
                        activeCount++;
                    } else if (state === 'IN_PREALERT') {
                        preAlertCount++;
                    } else if (state === 'UPCOMING_PREALERT') {
                        upcomingCount++;
                    }
                });

                setCounts({ active: activeCount, preAlert: preAlertCount, upcoming: upcomingCount });
            } catch (error) {
                console.error('Error fetching trend counts:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCounts();

        // Refresh every 5 minutes
        const interval = setInterval(fetchCounts, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    return { ...counts, loading };
};
