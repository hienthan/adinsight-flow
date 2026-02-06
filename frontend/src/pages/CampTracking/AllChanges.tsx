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
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'hsl(var(--primary))', letterSpacing: '-0.03em' }}>
                    Global Change Logs
                </h1>
                <p style={{ color: 'var(--text-dim)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                    Monitor modifications across all tracking campaigns
                </p>
            </div>

            {changes?.length === 0 ? (
                <div className="hero-card" style={{ textAlign: 'center', padding: '5rem' }}>
                    <History size={48} style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', opacity: 0.5 }} />
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>No changes logged yet</h3>
                    <p style={{ color: 'var(--text-dim)' }}>Campaign modifications will appear here.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {changes?.map((change) => (
                        <div
                            key={change.id}
                            className="hero-card animate-fade"
                            style={{
                                padding: '1.5rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                borderLeft: '4px solid hsl(var(--primary))'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span
                                        onClick={() => navigate(`/camp-tracking/campaign/${change.campaign}`)}
                                        style={{ color: 'hsl(var(--primary))', fontSize: '1rem', fontWeight: 800, cursor: 'pointer', letterSpacing: '-0.01em' }}
                                    >
                                        {change.expand?.campaign?.name || 'Unknown Campaign'}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>•</span>
                                    <span className="hero-badge" style={{
                                        background: 'var(--accent-glow)',
                                        color: 'hsl(var(--primary))',
                                        fontSize: '0.7rem'
                                    }}>
                                        {getFieldLabel(change.field_changed)}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 500 }}>
                                    <Calendar size={14} />
                                    {formatDate(change.change_date)}
                                </div>
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr auto 1fr',
                                gap: '1.5rem',
                                alignItems: 'center',
                                background: 'hsla(var(--primary) / 0.03)',
                                padding: '1.25rem',
                                borderRadius: '1rem',
                                border: '1px solid var(--border-subtle)'
                            }}>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PREVIOUS</div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ef4444' }}>{renderValue(change.old_value)}</div>
                                </div>
                                <ArrowRight size={18} style={{ color: 'var(--text-muted)' }} />
                                <div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>UPDATED</div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#22c55e' }}>{renderValue(change.new_value)}</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 500 }}>
                                    <Info size={14} />
                                    {change.metadata?.auto_detected ? 'Automatically detected' : 'Manual entry'}
                                </div>
                                {change.user && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 500 }}>
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
