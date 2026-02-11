import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { CampaignChange } from '../../types/campaign';
import AutoLogItem from '../tracking/AutoLogItem';

interface CampaignHistoryProps {
    campaignId: string;
    platformColor?: string;
    compact?: boolean;
    limit?: number;
}

export default function CampaignHistory({ campaignId, platformColor, compact = false, limit }: CampaignHistoryProps) {
    const queryClient = useQueryClient();
    const { data: changes = [], isLoading } = useQuery<CampaignChange[]>({
        queryKey: ['campaign-changes', campaignId],
        queryFn: async () => {
            return await pb.collection('campaign_changes').getFullList<CampaignChange>({
                filter: `campaign = "${campaignId}"`,
                sort: '-change_date',
                expand: 'campaign,campaign.platform'
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return await pb.collection('campaign_changes').delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campaign-changes', campaignId] });
            queryClient.invalidateQueries({ queryKey: ['all-changes'] });
        },
    });

    if (isLoading) {
        return (
            <div style={{ padding: compact ? '1rem' : '2rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: compact ? '0.8rem' : 'inherit' }}>
                Loading history...
            </div>
        );
    }

    const visibleChanges = typeof limit === 'number' ? changes.slice(0, limit) : changes;

    if (visibleChanges.length === 0) {
        return (
            <div style={{
                padding: compact ? '1rem' : '3rem',
                textAlign: 'center',
                color: 'var(--text-dim)',
                background: compact ? 'var(--bg-overlay)' : 'var(--bg-card)',
                borderRadius: '12px',
                border: compact ? '1px dashed var(--border-subtle)' : '1px solid var(--border-color)',
                fontSize: compact ? '0.75rem' : 'inherit'
            }}>
                <Activity size={compact ? 22 : 48} style={{ marginBottom: compact ? '0.45rem' : '1rem', opacity: 0.25 }} />
                <p style={{ margin: 0 }}>No tracked changes yet.</p>
                {!compact && <p style={{ fontSize: '0.8rem' }}>Changes to CPC, Budget, Keywords, and Status are automatically logged.</p>}
            </div>
        );
    }

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: compact ? '0.5rem' : '0.75rem'
        }}>
            {visibleChanges.map((change) => (
                <AutoLogItem
                    key={change.id}
                    change={change}
                    onDelete={compact ? undefined : (id) => deleteMutation.mutate(id)}
                    platformColor={platformColor}
                />
            ))}
        </div>
    );
}
