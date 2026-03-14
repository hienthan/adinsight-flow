import { useMemo, useState, useEffect } from "react";
import { pb } from "../../lib/pocketbase";
import { useDisclosure } from "@heroui/react";
import { Search, Sparkles, TrendingUp, Calendar, Info, Check } from "lucide-react";
import { toast } from "sonner";

// Import extracted components
import { SignalRow } from "./components/SignalRow";
import { StrategyNotesModal } from "./components/StrategyNotesModal.tsx";
import { SectionHeader, EmptyState, CompactEmptyState } from "./components/SectionUI";
import { SafeButton, SurfaceCard, ToolbarGroup } from "../../components/common/ui";

// Import shared types and utils
import { TrendSignal, SignalState, Market, Priority } from "./types";
import { 
    computeState, 
    resolveSignalDates, 
    formatDestinations, 
    startOfDay, 
    addDays, 
    intersects 
} from "./utils";

type PreparedSignal = {
    s: TrendSignal;
    name: string;
    destLabel: string;
    dates: {
        start: Date;
        end: Date;
        preAlert: Date;
        peakStart?: Date;
        peakEnd?: Date;
    };
    state: SignalState;
    preAlertDays: number;
    searchable: string;
};

const TREND_RADAR_HEADER_STYLE = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '1.5rem',
    borderRadius: '12px',
    boxShadow: 'var(--shadow-soft)',
} as const;

const FILTER_SECTION_STYLE = {
    marginBottom: '1.5rem',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: '0.9rem',
} as const;

const FILTER_CARD_STYLE = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    borderRadius: '0.85rem',
} as const;

const STATUS_VIEW_ITEMS = [
    { id: "section-peak", label: "At Peak" },
    { id: "section-active", label: "Active" },
    { id: "section-upcoming", label: "Pre-alert" },
] as const;

const MARKETS = ["HK", "TW", "ID", "SG", "MY", "AU"] as const;

const HORIZON_OPTIONS = [
    { value: "TODAY", label: "Today" },
    { value: "7", label: "Next 7 days" },
    { value: "14", label: "Next 14 days" },
    { value: "30", label: "Next 30 days" },
    { value: "ALL", label: "All time" },
] as const;

const PRODUCT_TYPE_LABELS: Record<string, string> = {
    guide_content: "Guide",
    entry_pretrip: "Entry",
    esim: "eSIM",
    attraction: "Attraction",
    rail: "Rail"
};

function formatProductType(type: string) {
    return PRODUCT_TYPE_LABELS[type] || type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// --- Main Page Component ---

export default function TrendRadarPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [signals, setSignals] = useState<TrendSignal[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // PocketBase Best Practice: Selective field fetching
                const records = await pb.collection('trend_signals').getFullList<TrendSignal>({
                    expand: 'trend_type',
                    sort: '-created',
                    fields: 'id,key,trend_type,status,mode,pre_alert_days,start_mmdd,end_mmdd,peak_start_mmdd,peak_end_mmdd,start_date,end_date,peak_start_date,peak_end_date,source_markets,destinations,product_types,keywords,priority,summary,notes,updated,expand.trend_type.name,expand.trend_type.key'
                });

                const transformed = records.map(r => ({
                    ...r,
                    trend_type_name: r.expand?.trend_type?.name || r.key,
                    source_markets: r.source_markets || [],
                    product_types: Array.isArray(r.product_types) ? r.product_types : (typeof r.product_types === 'string' ? (r.product_types as string).split(',').map((k: string) => k.trim()) : []),
                    keywords: Array.isArray(r.keywords) ? r.keywords : (typeof r.keywords === 'string' ? (r.keywords as string).split(',').map((k: string) => k.trim()) : []),
                })) as (TrendSignal & { trend_type_name: string })[];

                setSignals(transformed);
            } catch (error) {
                console.error("Error fetching signals:", error);
                toast.error("Failed to load trend signals");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const defaultPreAlertDays = 14;
    const today = useMemo(() => new Date(), []);

    // UI controls
    const [q, setQ] = useState("");
    const [market, setMarket] = useState<Market | "ALL">("ALL");
    const [horizon, setHorizon] = useState<"TODAY" | "7" | "14" | "30" | "ALL">("14");
    const [includeBaseline, setIncludeBaseline] = useState(false);

    const [showMoreActive, setShowMoreActive] = useState(false);
    const [showMoreUpcoming, setShowMoreUpcoming] = useState(false);
    const [activeSection, setActiveSection] = useState<string | null>("section-active");

    const horizonDays = horizon === "TODAY" ? 0 : horizon === "7" ? 7 : horizon === "14" ? 14 : horizon === "30" ? 30 : null;

    const isBaselineSignal = (s: TrendSignal) => {
        const tt = s.expand?.trend_type?.key || s.trend_type;
        const fullYear = s.mode === "recurring" && s.start_mmdd === "01-01" && s.end_mmdd === "12-31";
        return tt === "entry_pretrip" || tt === "outbound_planning" || fullYear;
    };

    const prepared = useMemo(() => {
        const lowerQ = q.trim().toLowerCase();

        const filtered = signals
            .filter((s) => (includeBaseline ? true : !isBaselineSignal(s)))
            .filter((s) => {
                const sm = s.source_markets;
                if (market === "ALL") return true;
                if (!sm || sm.length === 0) return true;
                return (sm as string[]).includes(market);
            })
            .map((s) => {
                const preAlertDays = s.pre_alert_days || defaultPreAlertDays;
                const dates = resolveSignalDates(s, today, preAlertDays);
                if (!dates) return null;

                const { state } = computeState(today, s, s.expand?.trend_type);
                const name = (s as any).trend_type_name || s.trend_type;
                const destLabel = formatDestinations(s.destinations);
                const searchable = `${name} ${destLabel} ${s.summary ?? ""} ${(s.keywords ?? []).join(" ")}`.toLowerCase();

                return { s, name, destLabel, dates, state, preAlertDays, searchable } as PreparedSignal;
            })
            .filter((x): x is PreparedSignal => x !== null);

        const withSearch = lowerQ ? filtered.filter((x) => x.searchable.includes(lowerQ)) : filtered;

        const withinHorizon = horizonDays == null
            ? withSearch
            : withSearch.filter((x) => {
                const hStart = startOfDay(today);
                const hEnd = addDays(hStart, horizonDays);

                if (x.state === "PEAK" || x.state === "ACTIVE") return intersects(x.dates.start, x.dates.end, hStart, hEnd);
                if (x.state === "IN_PREALERT") return intersects(x.dates.preAlert, x.dates.start, hStart, hEnd);
                if (x.state === "UPCOMING_PREALERT") return intersects(x.dates.preAlert, x.dates.preAlert, hStart, hEnd);
                return false;
            });

        const stateWeight: Record<SignalState, number> = { PEAK: 0, ACTIVE: 1, IN_PREALERT: 2, UPCOMING_PREALERT: 3, ENDED: 4 };
        const priorityWeight: Record<Priority, number> = { high: 0, medium: 1 };

        withinHorizon.sort((a, b) => {
            const sw = stateWeight[a.state] - stateWeight[b.state];
            if (sw !== 0) return sw;
            const pw = priorityWeight[a.s.priority] - priorityWeight[b.s.priority];
            if (pw !== 0) return pw;
            const aDate = (a.state === "IN_PREALERT" || a.state === "UPCOMING_PREALERT") ? a.dates.start : a.dates.end;
            const bDate = (b.state === "IN_PREALERT" || b.state === "UPCOMING_PREALERT") ? b.dates.start : b.dates.end;
            return aDate.getTime() - bDate.getTime();
        });

        return withinHorizon;
    }, [signals, q, market, horizon, includeBaseline, defaultPreAlertDays, today]);

    const peak = prepared.filter((x) => x.state === "PEAK");
    const active = prepared.filter((x) => x.state === "ACTIVE");
    const upcoming = prepared.filter((x) => x.state === "IN_PREALERT" || x.state === "UPCOMING_PREALERT");
    const statusViewItems = [
        { ...STATUS_VIEW_ITEMS[0], count: peak.length },
        { ...STATUS_VIEW_ITEMS[1], count: active.length },
        { ...STATUS_VIEW_ITEMS[2], count: upcoming.length },
    ];

    const activeToShow = (q.trim() || showMoreActive) ? active : active.slice(0, 8);
    const upcomingToShow = (q.trim() || showMoreUpcoming) ? upcoming : upcoming.slice(0, 12);

    const [expandedKey, setExpandedKey] = useState<string | null>(null);

    // Notes Modal Logic
    const { isOpen: isNotesOpen, onOpen: onNotesOpen, onOpenChange: onNotesOpenChange } = useDisclosure();
    const [selectedSignal, setSelectedSignal] = useState<{ id: string, name: string, destLabel: string, notes?: string } | null>(null);
    const [draftNotes, setDraftNotes] = useState("");
    const [isSavingNotes, setIsSavingNotes] = useState(false);

    const handleOpenNotes = (id: string, name: string, destLabel: string, notes?: string) => {
        setSelectedSignal({ id, name, destLabel, notes });
        setDraftNotes(notes || "");
        onNotesOpen();
    };

    const handleSaveNotes = async () => {
        if (!selectedSignal) return;
        setIsSavingNotes(true);
        try {
            await pb.collection('trend_signals').update(selectedSignal.id, { notes: draftNotes });
            setSignals(prev => prev.map(s => s.id === selectedSignal.id ? { ...s, notes: draftNotes } : s));
            toast.success("Strategy notes updated");
            onNotesOpenChange();
        } catch (error) {
            console.error("Error saving notes:", error);
            toast.error("Failed to save notes");
        } finally {
            setIsSavingNotes(false);
        }
    };

    const scrollToSection = (id: string) => {
        setActiveSection(id);
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    if (isLoading) {
        return (
            <div className="page-container flex items-center justify-center min-h-[60vh]">
                <div className="text-slate-400 font-bold animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 animate-bounce" />
                    Loading Trend Radar...
                </div>
            </div>
        );
    }

    return (
        <div className="page-container w-full px-8 py-8 animate-fade">
            {/* Zone 1: Header Summary Card - Compact Version */}
            <SurfaceCard
                variant="soft"
                padding="0.75rem 1.5rem"
                style={TREND_RADAR_HEADER_STYLE}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div
                        className="rounded-xl flex items-center justify-center text-white"
                        style={{
                            width: '36px',
                            height: '36px',
                            background: "linear-gradient(135deg, hsl(var(--primary)) 0%, #4f46e5 100%)",
                        }}
                    >
                        <TrendingUp size={18} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                            Trend Radar
                        </h1>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0 }}>
                            Daily intelligence scan.
                        </p>
                    </div>
                </div>
            </SurfaceCard>

            {/* Zone 2: Filter Controls (grouped like CampOverview) */}
            <section style={FILTER_SECTION_STYLE}>
                <SurfaceCard
                    variant="inset"
                    padding="0.65rem"
                    style={FILTER_CARD_STYLE}
                >
                    <div className="filter-group">
                        <label>Search Trends</label>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                            <input
                                type="text"
                                placeholder="Name, destination, keywords..."
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                style={{ minWidth: '320px', paddingLeft: '2.5rem' }}
                            />
                        </div>
                    </div>

                    <div className="filter-group">
                        <label>Market</label>
                        <select
                            value={market}
                            onChange={(e) => {
                                const value = e.target.value as Market | "ALL";
                                setMarket(value);
                            }}
                            style={{ minWidth: '150px' }}
                        >
                            <option value="ALL">All Markets</option>
                            {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Horizon</label>
                        <select
                            value={horizon}
                            onChange={(e) => {
                                const value = e.target.value as "TODAY" | "7" | "14" | "30" | "ALL";
                                setHorizon(value);
                            }}
                            style={{ minWidth: '160px' }}
                        >
                            {HORIZON_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label style={{ opacity: 0 }}>&nbsp;</label>
                        <SafeButton
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.55rem',
                                height: '40px',
                                border: '1px solid var(--border-subtle)',
                                background: includeBaseline ? 'var(--accent-glow)' : 'var(--bg-content)',
                                borderRadius: '0.65rem',
                                padding: '0 0.8rem',
                                cursor: 'pointer',
                                userSelect: 'none',
                                fontSize: 'var(--text-sm)',
                                fontWeight: 700,
                                textTransform: 'none',
                                letterSpacing: 'normal',
                                color: includeBaseline ? 'hsl(var(--primary))' : 'var(--text-dim)',
                            }}
                            onClick={() => setIncludeBaseline(!includeBaseline)}
                        >
                            <span
                                style={{
                                    width: '14px',
                                    height: '14px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--border-subtle)',
                                    background: includeBaseline ? 'hsl(var(--primary))' : 'var(--bg-content)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                }}
                            >
                                {includeBaseline && <Check size={10} strokeWidth={4} />}
                            </span>
                            Baseline
                        </SafeButton>
                    </div>
                </SurfaceCard>

                <SurfaceCard
                    variant="inset"
                    padding="0.65rem"
                    style={FILTER_CARD_STYLE}
                >
                    <div className="filter-group">
                        <label>Status View</label>
                        <ToolbarGroup
                            compact
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                background: 'var(--bg-overlay)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '0.7rem',
                                padding: '0.2rem',
                                gap: '0.25rem',
                            }}
                        >
                            {statusViewItems.map((item) => {
                                const isActive = activeSection === item.id;
                                return (
                                    <SafeButton
                                        key={item.id}
                                        onClick={() => scrollToSection(item.id)}
                                        className="hero-btn"
                                        aria-pressed={isActive}
                                        style={{
                                            padding: '0.4rem 0.7rem',
                                            borderRadius: '0.5rem',
                                            fontSize: 'var(--text-xs)',
                                            fontWeight: 700,
                                            background: isActive ? 'hsl(var(--primary))' : 'transparent',
                                            color: isActive ? 'var(--text-on-accent)' : 'var(--text-dim)',
                                            border: 'none',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.35rem',
                                        }}
                                    >
                                        {item.label}
                                        <span style={{ fontWeight: 800, opacity: isActive ? 1 : 0.8 }}>{item.count}</span>
                                    </SafeButton>
                                );
                            })}
                        </ToolbarGroup>
                    </div>
                </SurfaceCard>
            </section>

            {/* Zone 3: Content Sections */}
            <div className="flex flex-col gap-12 pb-32" style={{ marginTop: '1.5rem' }}>
                <section>
                    <SectionHeader id="section-peak" icon={Sparkles} title="At Peak / Action Now" count={peak.length} bgClass="bg-rose-100" colorClass="text-rose-600" />
                    <div>
                        {peak.length === 0 ? <CompactEmptyState message="No trends at peak right now." /> : peak.map(x => (
                            <SignalRow
                                key={x.s.id}
                                x={x}
                                expanded={expandedKey === x.s.key}
                                onToggleExpand={() => setExpandedKey(expandedKey === x.s.key ? null : x.s.key)}
                                onOpenNotes={handleOpenNotes}
                                formatProductType={formatProductType}
                                today={today}
                            />
                        ))}
                    </div>
                </section>

                <section>
                    <SectionHeader id="section-active" icon={TrendingUp} title="Active Trends" count={active.length} bgClass="bg-emerald-100" colorClass="text-emerald-600" />
                    <div>
                        {activeToShow.length === 0 ? <EmptyState message="No active trends found matching criteria." /> : activeToShow.map(x => (
                            <SignalRow
                                key={x.s.id}
                                x={x}
                                expanded={expandedKey === x.s.key}
                                onToggleExpand={() => setExpandedKey(expandedKey === x.s.key ? null : x.s.key)}
                                onOpenNotes={handleOpenNotes}
                                formatProductType={formatProductType}
                                today={today}
                            />
                        ))}
                        {!q.trim() && !showMoreActive && active.length > 8 && (
                            <SafeButton onClick={() => setShowMoreActive(true)} className="mt-4 w-full py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200">
                                Show {active.length - 8} more active trends ↓
                            </SafeButton>
                        )}
                    </div>
                </section>

                <section>
                    <SectionHeader id="section-upcoming" icon={Calendar} title="Upcoming (Pre-alert)" count={upcoming.length} bgClass="bg-amber-100" colorClass="text-amber-600" />
                    <div>
                        {upcomingToShow.length === 0 ? <EmptyState message="No upcoming trends in the forecast." /> : upcomingToShow.map(x => (
                            <SignalRow
                                key={x.s.id}
                                x={x}
                                expanded={expandedKey === x.s.key}
                                onToggleExpand={() => setExpandedKey(expandedKey === x.s.key ? null : x.s.key)}
                                onOpenNotes={handleOpenNotes}
                                formatProductType={formatProductType}
                                today={today}
                            />
                        ))}
                        {!q.trim() && !showMoreUpcoming && upcoming.length > 12 && (
                            <SafeButton onClick={() => setShowMoreUpcoming(true)} className="mt-4 w-full py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200">
                                Show {upcoming.length - 12} more upcoming trends ↓
                            </SafeButton>
                        )}
                    </div>
                </section>

                {horizon !== 'ALL' && (
                    <SurfaceCard className="mt-4 mx-2 flex items-start gap-3" padding="1rem" style={{ background: 'rgba(239, 246, 255, 0.7)', border: '1px solid rgba(191, 219, 254, 1)' }}>
                        <Info size={16} className="text-blue-500 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-xs font-medium text-slate-600 mb-1">Some trends may be hidden because they fall outside the selected timeframe (<strong>{horizon === 'TODAY' ? 'Today' : `Next ${horizon} Days`}</strong>).</p>
                            <SafeButton onClick={() => setHorizon('ALL')} className="text-[10px] font-black uppercase tracking-wider text-blue-600 hover:text-blue-700 underline">View All Timeframes</SafeButton>
                        </div>
                    </SurfaceCard>
                )}
            </div>

            {/* Zone 4: Strategy Notes Modal - Now extracted */}
            <StrategyNotesModal
                isOpen={isNotesOpen}
                onOpenChange={onNotesOpenChange}
                selectedSignal={selectedSignal}
                draftNotes={draftNotes}
                setDraftNotes={setDraftNotes}
                handleSaveNotes={handleSaveNotes}
                isSavingNotes={isSavingNotes}
            />
        </div>
    );
}
