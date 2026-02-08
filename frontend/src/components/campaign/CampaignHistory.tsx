import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { History, Activity, Calendar, Trash2 } from 'lucide-react';
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {changes.map((change) => (
                <div
                    key={change.id}
                    style={{
                        background: 'var(--bg-card)',
                        padding: '1.25rem',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        gap: '1.25rem'
                    }}
                >
                    {/* Icon Column */}
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'var(--secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent)',
                        flexShrink: 0
                    }}>
                        <History size={20} />
                    </div>

                    {/* Content Column */}
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: 'var(--accent)' }}>
                                {change.field_changed.replace('_', ' ')} Updated
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Calendar size={12} />
                                    {formatDate(change.change_date)}
                                </span>
                                <button
                                    onClick={() => { if (confirm('Remove this log entry?')) deleteMutation.mutate(change.id); }}
                                    className="hero-btn-ghost text-destructive"
                                    style={{ padding: '0.25rem', borderRadius: '6px' }}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(0,0,0,0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.75rem' }}>
                            <div>
                                <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Old Value</label>
                                <div style={{ fontSize: '0.9rem', color: '#f87171', textDecoration: 'line-through' }}>{formatValue(change.old_value)}</div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>New Value</label>
                                <div style={{ fontSize: '0.9rem', color: '#4ade80', fontWeight: 600 }}>{formatValue(change.new_value)}</div>
                            </div>
                        </div>

                        {change.change_notes && (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontStyle: 'italic' }}>
                                "{change.change_notes}"
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
