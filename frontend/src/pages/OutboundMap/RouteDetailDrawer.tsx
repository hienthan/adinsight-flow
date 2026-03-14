import type { ReactNode } from 'react';
import { X, Pencil } from 'lucide-react';
import { SafeButton } from '../../components/common/ui';
import type { CampaignRouteRecord } from './types';
import { ROUTE_HEALTH_META, ROUTE_PRIORITY_META, ROUTE_STATUS_META, getRouteHealthState, getSourceMarketMeta } from './utils';

interface RouteDetailDrawerProps {
    route?: CampaignRouteRecord;
    routes?: CampaignRouteRecord[];
    onClose: () => void;
    onEdit: (route: CampaignRouteRecord) => void;
    onSelectRoute?: (route: CampaignRouteRecord) => void;
}

export default function RouteDetailDrawer({ route, routes = [], onClose, onEdit, onSelectRoute }: RouteDetailDrawerProps) {
    if (!route) return null;

    const statusMeta = ROUTE_STATUS_META[route.status];
    const priorityMeta = route.priority ? ROUTE_PRIORITY_META[route.priority] : undefined;
    const campaigns = route.expand?.campaigns || [];
    const health = getRouteHealthState(route);
    const healthMeta = ROUTE_HEALTH_META[health];
    const sourceMeta = getSourceMarketMeta(route.source_market);

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 110,
            pointerEvents: 'none',
        }}>
            <div
                onClick={onClose}
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(2, 6, 23, 0.32)',
                    backdropFilter: 'blur(4px)',
                    pointerEvents: 'auto',
                }}
            />

            <aside
                style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 'min(480px, 100vw)',
                    height: '100%',
                    background: 'var(--bg-content)',
                    borderLeft: '1px solid var(--border-subtle)',
                    boxShadow: 'var(--shadow-large)',
                    padding: '1.5rem',
                    overflowY: 'auto',
                    pointerEvents: 'auto',
                    backgroundImage: `radial-gradient(circle at top right, ${sourceMeta.glow} 0%, rgba(255,255,255,0) 32%)`,
                }}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    padding: '1.15rem',
                    borderRadius: '20px',
                    background: `linear-gradient(145deg, ${sourceMeta.soft} 0%, ${statusMeta.soft} 42%, rgba(255,255,255,0.98) 100%)`,
                    border: `1px solid ${sourceMeta.color}26`,
                    boxShadow: `0 22px 34px -28px ${sourceMeta.glow}`,
                }}>
                    <div>
                        <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Route Detail
                        </div>
                        <h2 style={{ marginTop: '0.45rem', fontSize: '1.85rem', lineHeight: 1.1, letterSpacing: '-0.04em' }}>
                            {route.route_name}
                        </h2>
                        <div style={{ marginTop: '0.65rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <Tag tone={sourceMeta.color}>{sourceMeta.label}</Tag>
                            <Tag tone={statusMeta.color}>{statusMeta.label}</Tag>
                            <Tag tone={healthMeta.color}>{healthMeta.label}</Tag>
                        </div>
                    </div>

                    <SafeButton
                        onClick={onClose}
                        style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '999px',
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--bg-main)',
                            display: 'grid',
                            placeItems: 'center',
                        }}
                    >
                        <X size={16} />
                    </SafeButton>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem', marginTop: '1rem' }}>
                    {route.is_core_route && <Tag tone="hsl(var(--primary))">Core Route</Tag>}
                    {priorityMeta && <Tag tone={priorityMeta.color}>{priorityMeta.label}</Tag>}
                </div>

                {routes.length > 1 && (
                    <section style={{ marginTop: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.86rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)', marginBottom: '0.8rem' }}>
                            Routes In This Cell
                        </h3>
                        <div style={{ display: 'grid', gap: '0.7rem' }}>
                            {routes.map((candidate) => {
                                const active = candidate.id === route.id;
                                const candidateStatus = ROUTE_STATUS_META[candidate.status];
                                const candidateSource = getSourceMarketMeta(candidate.source_market);
                                return (
                                    <button
                                        key={candidate.id}
                                        type="button"
                                        onClick={() => onSelectRoute?.(candidate)}
                                        style={{
                                            borderRadius: '16px',
                                            border: `1px solid ${active ? `${candidateSource.color}33` : 'var(--border-subtle)'}`,
                                            background: active
                                                ? `linear-gradient(135deg, ${candidateSource.soft} 0%, ${candidateStatus.soft} 55%, rgba(255,255,255,0.98) 100%)`
                                                : 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 100%)',
                                            padding: '0.9rem 1rem',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            boxShadow: active ? `0 18px 28px -24px ${candidateSource.glow}` : 'none',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                                            <div style={{ fontWeight: 800 }}>{candidate.expand?.platform?.display_name || 'Unassigned'}</div>
                                            <span style={{
                                                width: '10px',
                                                height: '10px',
                                                borderRadius: '999px',
                                                background: candidateStatus.color,
                                                boxShadow: `0 0 0 5px ${candidateStatus.soft}`,
                                                flexShrink: 0,
                                            }} />
                                        </div>
                                        <div style={{ marginTop: '0.25rem', color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 600 }}>
                                            {candidate.route_name}
                                        </div>
                                        <div style={{ marginTop: '0.55rem', display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                                            <Tag tone={candidateSource.color}>{candidate.source_market}</Tag>
                                            <Tag tone={candidateStatus.color}>{candidateStatus.label}</Tag>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}

                <div style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem' }}>
                    <InfoCard label="Platform" value={route.expand?.platform?.display_name || 'Unassigned'} />
                    <InfoCard label="Source" value={route.source_market} />
                    <InfoCard label="Destination" value={route.destination_label || route.destination_country} />
                    <InfoCard label="Owner" value={route.owner || 'Unassigned'} />
                    <InfoCard label="Last Reviewed" value={route.last_reviewed_date ? route.last_reviewed_date.slice(0, 10) : 'Not reviewed'} />
                    <InfoCard label="Budget Hint" value={route.budget_hint ? `${route.budget_hint}` : 'N/A'} />
                </div>

                <section style={{ marginTop: '1.75rem' }}>
                    <h3 style={{ fontSize: '0.86rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)', marginBottom: '0.8rem' }}>
                        Campaigns
                    </h3>
                    <div style={{ display: 'grid', gap: '0.7rem' }}>
                        {campaigns.length > 0 ? campaigns.map((campaign) => (
                            <div
                                key={campaign.id}
                                style={{
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: '16px',
                                    padding: '0.9rem 1rem',
                                    background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 100%)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                                    <div style={{ fontWeight: 800 }}>{campaign.name}</div>
                                    <Tag tone={campaign.status === 'active' ? '#10b981' : campaign.status === 'paused' ? '#f59e0b' : '#94a3b8'}>
                                        {campaign.status}
                                    </Tag>
                                </div>
                                <div style={{ marginTop: '0.35rem', color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 600 }}>
                                    Priority: {campaign.priority || 'normal'}
                                </div>
                            </div>
                        )) : (
                            <div style={{
                                border: '1px dashed var(--border-subtle)',
                                borderRadius: '14px',
                                padding: '1rem',
                                color: 'var(--text-dim)',
                                fontWeight: 600,
                            }}>
                                No campaign attached yet.
                            </div>
                        )}
                    </div>
                </section>

                <section style={{ marginTop: '1.75rem' }}>
                    <h3 style={{ fontSize: '0.86rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)', marginBottom: '0.8rem' }}>
                        Seasonal Tags
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem' }}>
                        {(route.seasonal_tags || []).length > 0 ? (route.seasonal_tags || []).map((tag) => (
                            <Tag key={tag}>{tag}</Tag>
                        )) : <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>No seasonal tag</span>}
                    </div>
                </section>

                <section style={{ marginTop: '1.75rem' }}>
                    <h3 style={{ fontSize: '0.86rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)', marginBottom: '0.8rem' }}>
                        Notes
                    </h3>
                    <div style={{
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '16px',
                        padding: '1rem',
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.98) 100%)',
                        color: route.notes ? 'var(--text-main)' : 'var(--text-dim)',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                    }}>
                        {route.notes || 'No notes yet.'}
                    </div>
                </section>

                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
                    <SafeButton
                        onClick={() => onEdit(route)}
                        style={{
                            flex: 1,
                            borderRadius: '14px',
                            border: '1px solid hsl(var(--primary))',
                            background: 'hsla(var(--primary) / 0.1)',
                            color: 'hsl(var(--primary))',
                            fontWeight: 800,
                            padding: '0.95rem 1rem',
                        }}
                    >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Pencil size={16} />
                            Edit Route
                        </span>
                    </SafeButton>
                </div>
            </aside>
        </div>
    );
}

function InfoCard({ label, value }: { label: string; value: string }) {
    return (
        <div style={{
            border: '1px solid var(--border-subtle)',
            borderRadius: '14px',
            padding: '0.95rem 1rem',
            background: 'var(--bg-main)',
        }}>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {label}
            </div>
            <div style={{ marginTop: '0.3rem', fontWeight: 700 }}>
                {value}
            </div>
        </div>
    );
}

function Tag({ children, tone }: { children: ReactNode; tone?: string }) {
    return (
        <span style={{
            borderRadius: '999px',
            padding: '0.35rem 0.6rem',
            border: '1px solid var(--border-subtle)',
            background: tone ? `${tone}14` : 'rgba(15, 23, 42, 0.04)',
            color: tone || 'var(--text-dim)',
            fontSize: '0.74rem',
            fontWeight: 800,
            textTransform: 'capitalize',
        }}>
            {children}
        </span>
    );
}
