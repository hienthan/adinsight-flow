import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { CampaignChange } from '../../types/campaign';
import AutoLogItem from '../tracking/AutoLogItem';

interface CampaignHistoryProps {
    campaignId: string;
    platformColor?: string;
}

export default function CampaignHistory({ campaignId, platformColor }: CampaignHistoryProps) {
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

    if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>Loading history...</div>;

    if (changes.length === 0) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <Activity size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                <p>No changes tracked yet for this campaign.</p>
                <p style={{ fontSize: '0.8rem' }}>Changes to CPC, Budget, Keywords, and Status are automatically logged.</p>
            </div>
        );
    }

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '0.75rem'
        }}>
            {changes.map((change) => (
                <AutoLogItem
                    key={change.id}
                    change={change}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    platformColor={platformColor}
                />
            ))}
        </div>
    );
}
