import { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
    PieChart, Pie, AreaChart, Area, ResponsiveContainer, RadialBarChart, RadialBar
} from 'recharts';
import { PageRecord } from '../../../types/adinsight';

/* ── Color palette ─────────────────────────────────────────────────────── */
const C = {
    blue:    '#3b82f6',
    emerald: '#10b981',
    amber:   '#f59e0b',
    rose:    '#f43f5e',
    violet:  '#8b5cf6',
    cyan:    '#06b6d4',
    fuchsia: '#d946ef',
    lime:    '#84cc16',
    orange:  '#fb923c',
    slate:   '#94a3b8',
};
const PALETTE = Object.values(C);
const TIER_COLORS: Record<string, string> = {
    'Tier 1': C.emerald,
    'Tier 2': C.amber,
    'Tier 3': C.rose,
    'Tier 4': C.slate,
};

type IntentContentDatum = {
    name: string;
    _total?: number;
} & Record<string, string | number | undefined>;

/* ── CSS-variable based styles — works in any mode (light/dark) ─────────
   The app uses CSS custom properties for theming, NOT Tailwind dark classes.
   All component backgrounds/text MUST use var(--bg-card), var(--text-main) etc.
───────────────────────────────────────────────────────────────────────── */
const cardStyle: React.CSSProperties = {
    background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 96%, var(--bg-main) 4%) 0%, color-mix(in srgb, var(--bg-content) 90%, var(--bg-main) 10%) 100%)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '16px',
    padding: '1.25rem',
    boxShadow: '0 18px 34px -30px rgba(15, 23, 42, 0.62)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
};

const cardTitleStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: 'var(--text-main)',
    margin: 0,
};

const cardSubtitleStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    color: 'var(--text-dim)',
    margin: 0,
};

/* Recharts axis / grid picks up the current CSS variable text color */
const axisStyle = { fontSize: 10, fill: 'var(--text-dim)' };
const gridProps = {
    strokeDasharray: '3 3' as const,
    stroke: 'var(--border-subtle)',
    vertical: false as const,
};

/* ── Premium dark tooltip ────────────────────────────────────────────────
   Always dark regardless of mode — this is intentional (contrast on hover)
───────────────────────────────────────────────────────────────────────── */
interface TooltipPayloadItem {
    name: string;
    value: number | string;
    color?: string;
    fill?: string;
}
function PremiumTooltip({ active, payload, label }: {
    active?: boolean;
    payload?: TooltipPayloadItem[];
    label?: string | number;
}) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'rgba(15,23,42,0.95)',
            border: '1px solid rgba(148,163,184,0.15)',
            borderRadius: '8px',
            padding: '0.5rem 0.75rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            fontSize: '0.75rem',
            minWidth: '120px',
        }}>
            {label !== undefined && (
                <p style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }}>{label}</p>
            )}
            {payload.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#94a3b8' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block', backgroundColor: p.color ?? p.fill ?? C.blue }} />
                        {p.name}
                    </span>
                    <span style={{ fontWeight: 700, color: '#f8fafc' }}>{p.value}</span>
                </div>
            ))}
        </div>
    );
}

/* ── ChartCard shell ─────────────────────────────────────────────────────  */
function ChartCard({ title, subtitle, accent = C.blue, children }: {
    title: string; subtitle?: string; accent?: string; children: React.ReactNode;
}) {
    return (
        <div
            style={{
                ...cardStyle,
                borderTopWidth: 2,
                borderTopColor: accent,
                background: [
                    `radial-gradient(circle at top right, ${accent}20 0%, transparent 32%)`,
                    cardStyle.background as string,
                ].join(', '),
            }}
        >
            <div>
                <p style={cardTitleStyle}>{title}</p>
                {subtitle && <p style={cardSubtitleStyle}>{subtitle}</p>}
            </div>
            <div style={{ flex: 1 }}>{children}</div>
        </div>
    );
}

/* ── KPI Card ────────────────────────────────────────────────────────────  */
function KpiCard({ label, value, accent, icon }: { label: string; value: string; accent: string; icon: string }) {
    return (
        <div style={{
            ...cardStyle,
            position: 'relative',
            overflow: 'hidden',
            padding: '0.85rem 1rem',
            borderTopWidth: 0,
            borderBottomWidth: 0,
            borderRightWidth: 0,
            borderLeftWidth: 3,
            borderLeftColor: accent,
            background: [
                `radial-gradient(circle at top right, ${accent}1f 0%, transparent 40%)`,
                cardStyle.background as string,
            ].join(', '),
        } as React.CSSProperties}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                <p style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
                <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>{icon}</span>
            </div>
            <p style={{ fontSize: '1.5rem', fontWeight: 900, color: accent, margin: 0, lineHeight: 1 }}>{value}</p>
        </div>
    );
}

/* ── Score bar row ───────────────────────────────────────────────────────  */
function ScoreRow({ name, value, rank }: { name: string; value: number; rank: number }) {
    const color = PALETTE[rank % PALETTE.length];
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.75rem' }}>
            <span style={{ color: 'var(--text-dim)', width: '14px', fontFamily: 'monospace' }}>{rank + 1}</span>
            <span style={{ color: 'var(--text-main)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
            <div style={{ width: '90px', height: '6px', background: 'var(--muted)', borderRadius: '99px', overflow: 'hidden', flexShrink: 0 }}>
                <div style={{
                    height: '100%',
                    borderRadius: '99px',
                    width: `${(value / 10) * 100}%`,
                    background: `linear-gradient(90deg, ${color}99, ${color})`,
                    transition: 'width 0.6s ease',
                }} />
            </div>
            <span style={{ fontWeight: 700, width: '28px', textAlign: 'right', color, flexShrink: 0 }}>{value}</span>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════════════════ */
// Helper to unify Jakarta variants
const normalizeProvince = (p: string | undefined): string => {
    if (!p) return 'Unknown';
    const low = p.toLowerCase();
    if (low === 'jakarta' || low === 'dki-jakarta' || low === 'daerah-khusus-ibukota-jakarta') return 'Jakarta';
    return p;
};

export function DashboardCharts({ records, isLoading }: { records: PageRecord[]; isLoading: boolean }) {

    const data = useMemo(() => {
        if (!records || records.length === 0) return null;

        const totalUrls = records.length;
        const tier1Count = records.filter(r => r.tier === '1').length;
        const validScores = records.map(r => Number(r.final_score) || 0).filter(s => s > 0);
        const avgScore = validScores.length ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;
        const provincesCovered = new Set(records.map(r => normalizeProvince(r.province))).size;

        // Top provinces
        const provCounts: Record<string, number> = {};
        records.forEach(r => { 
            const p = normalizeProvince(r.province); 
            provCounts[p] = (provCounts[p] || 0) + 1; 
        });
        const topProvinces = Object.entries(provCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count).slice(0, 10);

        // Intent × Tier matrix
        const intentTiers: Record<string, { name: string; 'Tier 1': number; 'Tier 2': number; 'Tier 3': number; 'Tier 4': number }> = {};
        records.forEach(r => {
            const intent = r.intent_primary || r.intent_type || 'unknown';
            const tk = (r.tier ? `Tier ${r.tier}` : 'Tier 4') as 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Tier 4';
            if (!intentTiers[intent]) intentTiers[intent] = { name: intent, 'Tier 1': 0, 'Tier 2': 0, 'Tier 3': 0, 'Tier 4': 0 };
            intentTiers[intent][tk]++;
        });
        const intentTierData = Object.values(intentTiers)
            .map(d => ({ ...d, _total: d['Tier 1'] + d['Tier 2'] + d['Tier 3'] + d['Tier 4'] }))
            .sort((a, b) => b._total - a._total).slice(0, 8);

        // Content Type pie
        const contentTypeMap: Record<string, number> = {};
        records.forEach(r => { const ct = r.content_type || 'none'; contentTypeMap[ct] = (contentTypeMap[ct] || 0) + 1; });
        const contentTypeData = Object.entries(contentTypeMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // Intent × Content Type matrix
        const intentContent: Record<string, IntentContentDatum> = {};
        const allContentTypes = Array.from(new Set(records.map(r => r.content_type || 'none')));
        records.forEach(r => {
            const intent = r.intent_primary || r.intent_type || 'unknown';
            const ct = r.content_type || 'none';
            if (!intentContent[intent]) {
                intentContent[intent] = { name: intent };
                allContentTypes.forEach(t => intentContent[intent][t] = 0);
            }
            intentContent[intent][ct] = Number(intentContent[intent][ct] || 0) + 1;
        });
        const intentContentData = Object.values(intentContent)
            .map((d) => {
                let total = 0;
                allContentTypes.forEach(t => total += Number(d[t] || 0));
                return { ...d, _total: total };
            })
            .sort((a, b) => Number(b._total || 0) - Number(a._total || 0)).slice(0, 8);

        // Score distribution
        const scoreDist: Record<string, number> = {};
        for (let i = 1; i <= 10; i++) scoreDist[i.toString()] = 0;
        records.forEach(r => {
            const sc = Math.floor(Number(r.final_score) || 0);
            scoreDist[sc < 1 ? '1' : sc > 10 ? '10' : sc.toString()]++;
        });
        const scoreDistData = Object.keys(scoreDist).sort((a, b) => Number(a) - Number(b)).map(k => ({ bucket: k, URLs: scoreDist[k] }));

        // Score by intent
        const intentScores: Record<string, { sum: number; count: number }> = {};
        records.forEach(r => {
            const intent = r.intent_primary || r.intent_type || 'unknown';
            const sc = Number(r.final_score) || 0;
            if (!intentScores[intent]) intentScores[intent] = { sum: 0, count: 0 };
            if (sc > 0) { intentScores[intent].sum += sc; intentScores[intent].count++; }
        });
        const scoreByIntentData = Object.entries(intentScores)
            .filter(([, v]) => v.count > 0)
            .map(([name, v]) => ({ name, 'Avg Score': parseFloat((v.sum / v.count).toFixed(2)) }))
            .sort((a, b) => b['Avg Score'] - a['Avg Score']).slice(0, 6);

        // Score by province
        const provScores: Record<string, { sum: number; count: number }> = {};
        records.forEach(r => {
            const p = normalizeProvince(r.province);
            const sc = Number(r.final_score) || 0;
            if (!provScores[p]) provScores[p] = { sum: 0, count: 0 };
            if (sc > 0) { provScores[p].sum += sc; provScores[p].count++; }
        });
        const scoreByProvinceData = Object.entries(provScores)
            .filter(([, v]) => v.count > 0)
            .map(([name, v]) => ({ name, value: parseFloat((v.sum / v.count).toFixed(2)) }))
            .sort((a, b) => b.value - a.value).slice(0, 10);

        // Tier composition
        const tierMap: Record<string, number> = {};
        records.forEach(r => { const t = r.tier ? `Tier ${r.tier}` : 'Unknown'; tierMap[t] = (tierMap[t] || 0) + 1; });
        const tierCompositionData = Object.entries(tierMap)
            .map(([name, value]) => ({ name, value, fill: TIER_COLORS[name] ?? C.slate }))
            .sort((a, b) => a.name.localeCompare(b.name));

        return { totalUrls, tier1Count, avgScore, provincesCovered, topProvinces, intentTierData, contentTypeData, intentContentData, allContentTypes, scoreDistData, scoreByIntentData, scoreByProvinceData, tierCompositionData };
    }, [records]);

    /* Loading skeleton */
    if (isLoading) {
        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {[...Array(8)].map((_, i) => (
                    <div key={i} style={{
                        ...cardStyle,
                        height: '120px',
                        background: 'var(--muted)',
                        animation: `pulse 1.5s ease-in-out ${i * 80}ms infinite`,
                    }} />
                ))}
                <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
            </div>
        );
    }

    /* Empty state */
    if (!data) {
        return (
            <div style={{
                ...cardStyle,
                padding: '3rem',
                textAlign: 'center',
                border: '2px dashed var(--border-subtle)',
            }}>
                <p style={{ fontSize: '1.5rem', margin: '0 0 0.5rem' }}>🔍</p>
                <p style={{ fontWeight: 600, color: 'var(--text-main)', margin: '0 0 0.25rem' }}>No data found</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>Try changing the Pattern or clear the Province filter</p>
            </div>
        );
    }

    /* Grid layout */
    const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '1rem' };
    const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem' };
    const gridResponsive2: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px,1fr))', gap: '1rem' };
    const gridResponsive3: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px,1fr))', gap: '1rem' };
    void grid2; void grid3;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* ── KPI Cards ─────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem' }}>
                <KpiCard label="Total URLs"        value={data.totalUrls.toLocaleString()}  accent={C.blue}    icon="🔗" />
                <KpiCard label="Tier 1 URLs"       value={data.tier1Count.toLocaleString()} accent={C.emerald} icon="🏆" />
                <KpiCard label="Avg Final Score"   value={data.avgScore.toFixed(2)}         accent={C.amber}   icon="⭐" />
                <KpiCard label="Provinces Covered" value={String(data.provincesCovered)}    accent={C.fuchsia} icon="📍" />
            </div>

            {/* ── Geo + Intent Matrix ────────────────────────────── */}
            <div style={gridResponsive2}>
                <ChartCard title="Top Provinces by URL Count" subtitle="Geographical distribution" accent={C.blue}>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={data.topProvinces} layout="vertical" margin={{ left: 0, right: 28, top: 4, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gp" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor={C.blue} stopOpacity={0.7} />
                                    <stop offset="100%" stopColor={C.cyan} stopOpacity={0.9} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                            <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="name" tick={axisStyle} width={90} axisLine={false} tickLine={false} />
                            <Tooltip content={<PremiumTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
                            <Bar dataKey="count" fill="url(#gp)" radius={[0, 6, 6, 0]} maxBarSize={20}
                                label={{ position: 'right', fontSize: 9, fill: 'var(--text-dim)' }} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Intent & Tier Matrix" subtitle="Funnel structure by tier" accent={C.emerald}>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={data.intentTierData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                            <CartesianGrid {...gridProps} />
                            <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
                            <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                            <Tooltip content={<PremiumTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
                            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
                            {(['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'] as const).map(tier => (
                                <Bar key={tier} dataKey={tier} stackId="a" fill={TIER_COLORS[tier]} maxBarSize={36} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            {/* ── Content × Intent Matrix ─────────────────────────── */}
            <div style={gridResponsive2}>
                <ChartCard title="Intent & Content Matrix" subtitle="Content distribution by intent" accent={C.amber}>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={data.intentContentData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                            <CartesianGrid {...gridProps} />
                            <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
                            <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                            <Tooltip content={<PremiumTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
                            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
                            {data.allContentTypes.map((ct: string, i: number) => (
                                <Bar key={ct} dataKey={ct} stackId="a" fill={PALETTE[i % PALETTE.length]} maxBarSize={36} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Score Distribution" subtitle="Bell curve of inventory quality" accent={C.cyan}>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={data.scoreDistData} margin={{ left: 0, right: 10, top: 8, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={C.cyan} stopOpacity={0.45} />
                                    <stop offset="95%" stopColor={C.cyan} stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid {...gridProps} />
                            <XAxis dataKey="bucket" tick={axisStyle} axisLine={false} tickLine={false} />
                            <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                            <Tooltip content={<PremiumTooltip />} />
                            <Area type="monotone" dataKey="URLs" stroke={C.cyan} strokeWidth={2.5} fill="url(#gs)"
                                dot={false} activeDot={{ r: 5, fill: C.cyan, stroke: 'var(--bg-card)', strokeWidth: 2 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            {/* ── Score Intelligence ─────────────────────────────── */}
            <div style={gridResponsive3}>
                <ChartCard title="Score by Intent" accent={C.violet}>
                    <ResponsiveContainer width="100%" height={230}>
                        <BarChart data={data.scoreByIntentData} layout="vertical" margin={{ left: 0, right: 28, top: 4, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gi" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor={C.violet} stopOpacity={0.6} />
                                    <stop offset="100%" stopColor={C.fuchsia} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                            <XAxis type="number" domain={[0, 10]} tick={axisStyle} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="name" tick={axisStyle} width={80} axisLine={false} tickLine={false} />
                            <Tooltip content={<PremiumTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
                            <Bar dataKey="Avg Score" fill="url(#gi)" radius={[0, 6, 6, 0]} maxBarSize={18}
                                label={{ position: 'right', fontSize: 9, fill: 'var(--text-dim)' }} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Score by Province" subtitle="Top 10 averages" accent={C.cyan}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px', overflowY: 'auto', maxHeight: '220px' }}>
                        {data.scoreByProvinceData.map((item, i) => (
                            <ScoreRow key={i} rank={i} name={item.name} value={item.value} />
                        ))}
                    </div>
                </ChartCard>

                <ChartCard title="Content Type Distribution" subtitle="Main content breakdown" accent={C.violet}>
                    <ResponsiveContainer width="100%" height={230}>
                        <PieChart>
                            <Pie
                                data={data.contentTypeData}
                                cx="50%" cy="50%"
                                innerRadius={40} outerRadius={80}
                                paddingAngle={2}
                                dataKey="value" nameKey="name"
                                stroke="none"
                            >
                                {data.contentTypeData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                            </Pie>
                            <Tooltip content={<PremiumTooltip />} />
                            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 9 }} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Tier Composition" subtitle="URL tier distribution" accent={C.emerald}>
                    <ResponsiveContainer width="100%" height={230}>
                        <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="88%" data={data.tierCompositionData} startAngle={180} endAngle={0}>
                            <RadialBar dataKey="value" cornerRadius={4} background={{ fill: 'var(--muted)' }}
                                label={{ position: 'insideStart', fill: '#fff', fontSize: 10, fontWeight: 700 }}>
                                {data.tierCompositionData.map((item, i) => <Cell key={i} fill={item.fill} />)}
                            </RadialBar>
                            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }}
                                formatter={(v) => <span style={{ color: 'var(--text-dim)' }}>{v}</span>} />
                            <Tooltip content={<PremiumTooltip />} />
                        </RadialBarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </div>
    );
}
