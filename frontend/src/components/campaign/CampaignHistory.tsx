import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity, Calendar, Trash2 } from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { CampaignChange } from '../../types/campaign';
import { formatDate } from '../../lib/utils';

interface CampaignHistoryProps {
    campaignId: string;
}

export default function CampaignHistory({ campaignId }: CampaignHistoryProps) {
    const queryClient = useQueryClient();
    const { data: changes = [], isLoading } = useQuery<CampaignChange[]>({
        queryKey: ['campaign-changes', campaignId],
        queryFn: async () => {
            return await pb.collection('campaign_changes').getFullList<CampaignChange>({
                filter: `campaign = "${campaignId}"`,
                sort: '-change_date',
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

    const formatValue = (val: any) => {
        if (val === null || val === undefined) return 'None';
        if (Array.isArray(val)) return val.length > 0 ? val.join(', ') : 'Empty list';
        if (typeof val === 'number') return val.toString();
        return val.toString();
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {changes.map((change) => (
                <div
                    key={change.id}
                    style={{
                        paddingBottom: '1rem',
                        borderBottom: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em', color: 'var(--text-main)' }}>
                            {change.field_changed.replace('_', ' ')} UPDATED
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Calendar size={10} />
                                {formatDate(change.change_date)}
                            </span>
                            <button
                                onClick={() => { if (confirm('Remove this log entry?')) deleteMutation.mutate(change.id); }}
                                className="hero-btn-ghost text-destructive"
                                style={{ padding: '0.1rem', height: 'auto' }}
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'var(--bg-subtle)',
                        padding: '0.6rem 0.8rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem'
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.1rem' }}>Old Value</span>
                            <span style={{ color: '#ef4444', textDecoration: 'line-through', fontWeight: 500 }}>{formatValue(change.old_value)}</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.1rem' }}>New Value</span>
                            <span style={{ color: '#22c55e', fontWeight: 700 }}>{formatValue(change.new_value)}</span>
                        </div>
                    </div>

                    {change.change_notes && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontStyle: 'italic', marginTop: '0.1rem' }}>
                            "{change.change_notes}"
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
