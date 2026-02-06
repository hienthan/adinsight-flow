import { useQuery } from '@tanstack/react-query';
import { History, ArrowRight, Calendar, User, Info } from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { formatDate } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

export default function AllChanges() {
    const navigate = useNavigate();

    const { data: changes, isLoading } = useQuery<any[]>({
        queryKey: ['all-changes'],
        queryFn: async () => {
            return await pb.collection('campaign_changes').getFullList({
                sort: '-change_date',
                expand: 'campaign',
                limit: 100
            });
        }
    });

    if (isLoading) return <div className="page-container" style={{ textAlign: 'center', padding: '5rem' }}>Loading change logs...</div>;

    const renderValue = (val: any) => {
        if (val === null || val === undefined) return <span style={{ fontStyle: 'italic', color: 'var(--text-dim)' }}>null</span>;
        if (Array.isArray(val)) return val.length > 0 ? val.join(', ') : <span style={{ fontStyle: 'italic', color: 'var(--text-dim)' }}>empty list</span>;
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
    };

    const getFieldLabel = (field: string) => {
        return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <div className="page-container">
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Global Change Logs</h2>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                    Monitor modifications across all tracking campaigns
                </p>
            </div>

            {changes?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '5rem', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                    <History size={48} style={{ color: 'var(--border-color)', marginBottom: '1rem' }} />
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No changes logged yet</h3>
                    <p style={{ color: 'var(--text-dim)' }}>Campaign modifications will appear here.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {changes?.map((change) => (
                        <div
                            key={change.id}
                            className="animate-fade"
                            style={{
                                background: 'var(--bg-card)',
                                padding: '1.25rem 1.5rem',
                                borderRadius: '12px',
                                border: '1px solid var(--border-color)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem',
                                transition: 'all 0.2s',
                                borderLeft: '4px solid var(--secondary)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span
                                        onClick={() => navigate(`/camp-tracking/campaign/${change.campaign}`)}
                                        style={{ color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        {change.expand?.campaign?.name || 'Unknown Campaign'}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>•</span>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        background: 'var(--secondary)',
                                        padding: '0.1rem 0.5rem',
                                        borderRadius: '6px',
                                        color: 'var(--text-main)'
                                    }}>
                                        {getFieldLabel(change.field_changed)}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                                    <Calendar size={14} />
                                    {formatDate(change.change_date)}
                                </div>
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr auto 1fr',
                                gap: '1rem',
                                alignItems: 'center',
                                background: 'rgba(255, 255, 255, 0.02)',
                                padding: '1rem',
                                borderRadius: '8px'
                            }}>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '0.2rem' }}>BEFORE</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#ef4444' }}>{renderValue(change.old_value)}</div>
                                </div>
                                <ArrowRight size={16} style={{ color: 'var(--text-dim)' }} />
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '0.2rem' }}>AFTER</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#22c55e' }}>{renderValue(change.new_value)}</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-dim)', fontSize: '0.7rem' }}>
                                    <Info size={14} />
                                    {change.metadata?.auto_detected ? 'Automatically detected' : 'Manual entry'}
                                </div>
                                {change.user && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                                        <User size={14} />
                                        Modified by {change.user}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
