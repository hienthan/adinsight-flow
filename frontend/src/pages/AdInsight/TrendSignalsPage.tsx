import { useMemo, useState, useEffect } from "react";
import { pb } from "../../lib/pocketbase";
import {
    useDisclosure
} from "@heroui/react";
import {
    Search, Sparkles, TrendingUp, Calendar, Info
} from "lucide-react";
import { toast } from "sonner";

// Import extracted components
import { SignalRow } from "./components/SignalRow";
import { StrategyNotesModal } from "./components/StrategyNotesModal.tsx";
import { SectionHeader, EmptyState, CompactEmptyState } from "./components/SectionUI";

// --- Types ---
type Market = "HK" | "TW" | "ID" | "SG" | "MY" | "AU";
type Priority = "high" | "medium";
type Mode = "recurring" | "one_off";

type DestinationObj = { code: string; name: string };
type Destination = string | DestinationObj;

type TrendSignal = {
    id: string;
    key: string;
    trend_type: string;
    trend_type_name?: string;
    source_markets: string[];
    destinations: Destination[];
    mode: Mode;
    status: "active" | "draft" | "archived";
    pre_alert_days: number;
    start_mmdd?: string;
    end_mmdd?: string;
    peak_start_mmdd?: string;
    peak_end_mmdd?: string;
    start_date?: string;
    end_date?: string;
    peak_start_date?: string;
    peak_end_date?: string;
    product_types: string[];
    keywords: string[];
    priority: Priority;
    summary: string;
    notes: string;
    updated: string;
    expand?: {
        trend_type?: {
            key?: string;
            name?: string;
        };
    };
};

type SignalState = "PEAK" | "ACTIVE" | "IN_PREALERT" | "UPCOMING_PREALERT" | "ENDED";

type ResolvedDates = {
    start: Date;
    end: Date;
    preAlert: Date;
    peakStart?: Date;
    peakEnd?: Date;
};

type PreparedSignal = {
    s: TrendSignal;
    name: string;
    destLabel: string;
    dates: ResolvedDates;
    state: SignalState;
    preAlertDays: number;
    searchable: string;
};

// --- Logic Helpers ---

function isDestObj(d: Destination): d is DestinationObj {
    return typeof d === "object" && d !== null && "name" in d;
}

function formatDestinations(destinations: Destination[]) {
    if (!Array.isArray(destinations) || destinations.length === 0) return "—";
    const names = destinations
        .map((d) => (isDestObj(d) ? d.name : String(d)))
        .map((s) => s.trim())
        .filter(Boolean);
    return names.length ? names.join(" · ") : "—";
}

function parseLocalYYYYMMDD(dateStr: string): Date {
    const [y, m, d] = dateStr.split("-").map((x) => parseInt(x, 10));
    return new Date(y, m - 1, d);
}

function parseMMDD(mmdd: string) {
    const [mm, dd] = mmdd.split("-").map((x) => parseInt(x, 10));
    return { mm, dd };
}

function addDays(d: Date, days: number) {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
}

function startOfDay(d: Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

function intersects(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
    return aStart <= bEnd && aEnd >= bStart;
}

function resolveRecurringWindow(today: Date, start_mmdd: string, end_mmdd: string, peak_start_mmdd?: string, peak_end_mmdd?: string) {
    const t = startOfDay(today);
    const year = t.getFullYear();

    const s0 = parseMMDD(start_mmdd);
    const e0 = parseMMDD(end_mmdd);

    let start = new Date(year, s0.mm - 1, s0.dd);
    let end = new Date(year, e0.mm - 1, e0.dd);

    if (end < start) {
        end = new Date(year + 1, e0.mm - 1, e0.dd);
    }

    if (t > end) {
        start = new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());
        end = new Date(end.getFullYear() + 1, end.getMonth(), end.getDate());
    }

    let peakStart: Date | undefined;
    let peakEnd: Date | undefined;

    if (peak_start_mmdd && peak_end_mmdd) {
        const ps0 = parseMMDD(peak_start_mmdd);
        const pe0 = parseMMDD(peak_end_mmdd);

        peakStart = new Date(start.getFullYear(), ps0.mm - 1, ps0.dd);
        peakEnd = new Date(start.getFullYear(), pe0.mm - 1, pe0.dd);

        if (peakEnd < peakStart) {
            peakEnd = new Date(peakEnd.getFullYear() + 1, peakEnd.getMonth(), peakEnd.getDate());
        }

        if (peakStart < start) peakStart = start;
        if (peakEnd > end) peakEnd = end;
    }

    return { start, end, peakStart, peakEnd };
}

function resolveSignalDates(signal: TrendSignal, today: Date, preAlertDays: number): ResolvedDates | null {
    if (signal.mode === "one_off") {
        if (!signal.start_date || !signal.end_date) return null;
        const start = parseLocalYYYYMMDD(signal.start_date);
        const end = parseLocalYYYYMMDD(signal.end_date);
        const preAlert = addDays(start, -preAlertDays);

        const peakStart = signal.peak_start_date ? parseLocalYYYYMMDD(signal.peak_start_date) : undefined;
        const peakEnd = signal.peak_end_date ? parseLocalYYYYMMDD(signal.peak_end_date) : undefined;

        return { start, end, preAlert, peakStart, peakEnd };
    }

    if (!signal.start_mmdd || !signal.end_mmdd) return null;
    const { start, end, peakStart, peakEnd } = resolveRecurringWindow(
        today,
        signal.start_mmdd,
        signal.end_mmdd,
        signal.peak_start_mmdd,
        signal.peak_end_mmdd
    );
    const preAlert = addDays(start, -preAlertDays);
    return { start, end, preAlert, peakStart, peakEnd };
}

function computeState(today: Date, dates: ResolvedDates): SignalState {
    const t = startOfDay(today);
    const start = startOfDay(dates.start);
    const end = startOfDay(dates.end);
    const pre = startOfDay(dates.preAlert);

    const peakStart = dates.peakStart ? startOfDay(dates.peakStart) : undefined;
    const peakEnd = dates.peakEnd ? startOfDay(dates.peakEnd) : undefined;

    if (peakStart && peakEnd && t >= peakStart && t <= peakEnd) return "PEAK";
    if (t >= start && t <= end) return "ACTIVE";
    if (t >= pre && t < start) return "IN_PREALERT";
    if (t < pre) return "UPCOMING_PREALERT";
    return "ENDED";
}

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
                const records = await pb.collection('trend_signals').getFullList({
                    expand: 'trend_type',
                    sort: '-created',
                });

                const transformed: TrendSignal[] = records.map(r => ({
                    ...r,
                    id: r.id,
                    key: r.key,
                    trend_type: r.trend_type,
                    trend_type_name: r.expand?.trend_type?.name || r.key,
                    source_markets: r.source_markets || [],
                    destinations: r.destinations,
                    mode: r.mode,
                    status: r.status,
                    pre_alert_days: r.pre_alert_days || 14,
                    start_mmdd: r.start_mmdd,
                    end_mmdd: r.end_mmdd,
                    peak_start_mmdd: r.peak_start_mmdd,
                    peak_end_mmdd: r.peak_end_mmdd,
                    start_date: r.start_date,
                    end_date: r.end_date,
                    peak_start_date: r.peak_start_date,
                    peak_end_date: r.peak_end_date,
                    product_types: Array.isArray(r.product_types) ? r.product_types : (typeof r.product_types === 'string' ? r.product_types.split(',').map((k: string) => k.trim()) : []),
                    keywords: Array.isArray(r.keywords) ? r.keywords : (typeof r.keywords === 'string' ? r.keywords.split(',').map((k: string) => k.trim()) : []),
                    priority: r.priority,
                    summary: r.summary,
                    notes: r.notes || "",
                    updated: r.updated,
                })) as TrendSignal[];

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
                return sm.includes(market as Market);
            })
            .map((s) => {
                const preAlertDays = s.pre_alert_days || defaultPreAlertDays;
                const dates = resolveSignalDates(s, today, preAlertDays);
                if (!dates) return null;

                const state = computeState(today, dates);
                const name = s.trend_type_name || s.trend_type;
                const destLabel = formatDestinations(s.destinations);
                const searchable = `${name} ${destLabel} ${s.summary ?? ""} ${(s.keywords ?? []).join(" ")}`.toLowerCase();

                return { s, name, destLabel, dates, state, preAlertDays, searchable };
            })
            .filter((x): x is PreparedSignal => x !== null);

        const withSearch = lowerQ ? filtered.filter((x) => x.searchable.includes(lowerQ)) : filtered;

        const withinHorizon = horizonDays == null
            ? withSearch
            : withSearch.filter((x) => {
                const { state, dates } = x;
                const hStart = startOfDay(today);
                const hEnd = addDays(hStart, horizonDays);

                if (state === "PEAK" || state === "ACTIVE") return intersects(dates.start, dates.end, hStart, hEnd);
                if (state === "IN_PREALERT") return intersects(dates.preAlert, dates.start, hStart, hEnd);
                if (state === "UPCOMING_PREALERT") return intersects(dates.preAlert, dates.preAlert, hStart, hEnd);
                return false;
            });

        const stateWeight: Record<SignalState, number> = { PEAK: 0, ACTIVE: 1, IN_PREALERT: 2, UPCOMING_PREALERT: 3, ENDED: 4 };
        const priorityWeight: Record<Priority, number> = { high: 0, medium: 1 };

        withinHorizon.sort((a, b) => {
            const sw = stateWeight[a.state] - stateWeight[b.state];
            if (sw !== 0) return sw;
            const pw = priorityWeight[a.s.priority] - priorityWeight[b.s.priority];
            if (pw !== 0) return pw;
            const aDate = a.state === "IN_PREALERT" ? a.dates.start : a.state === "UPCOMING_PREALERT" ? a.dates.preAlert : a.dates.end;
            const bDate = b.state === "IN_PREALERT" ? b.dates.start : b.state === "UPCOMING_PREALERT" ? b.dates.preAlert : b.dates.end;
            return aDate.getTime() - bDate.getTime();
        });

        return withinHorizon;
    }, [signals, q, market, horizon, includeBaseline, defaultPreAlertDays, today]);

    const peak = prepared.filter((x) => x.state === "PEAK");
    const active = prepared.filter((x) => x.state === "ACTIVE");
    const upcoming = prepared.filter((x) => x.state === "IN_PREALERT" || x.state === "UPCOMING_PREALERT");

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
            <div
                className="hero-card"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '1.5rem',
                    padding: '0.75rem 1.5rem',
                    background: 'var(--bg-content)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-soft)'
                }}
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
            </div>

            {/* Zone 2: Filter Controls (grouped like CampOverview) */}
            <section style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '0.9rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', padding: '0.65rem', border: '1px solid var(--border-subtle)', borderRadius: '0.85rem', background: 'var(--bg-overlay)' }}>
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
                            {["HK", "TW", "ID", "SG", "MY", "AU"].map(m => <option key={m} value={m}>{m}</option>)}
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
                            <option value="TODAY">Today</option>
                            <option value="7">Next 7 days</option>
                            <option value="14">Next 14 days</option>
                            <option value="30">Next 30 days</option>
                            <option value="ALL">All time</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label style={{ opacity: 0 }}>&nbsp;</label>
                        <label
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
                        >
                            <input
                                type="checkbox"
                                checked={includeBaseline}
                                onChange={(e) => setIncludeBaseline(e.target.checked)}
                                style={{ width: '14px', height: '14px', accentColor: 'hsl(var(--primary))', cursor: 'pointer' }}
                            />
                            Baseline
                        </label>
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', padding: '0.65rem', border: '1px solid var(--border-subtle)', borderRadius: '0.85rem', background: 'var(--bg-overlay)' }}>
                    <div className="filter-group">
                        <label>Status View</label>
                        <div
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
                            {[
                                { id: "section-peak", label: "At Peak", count: peak.length },
                                { id: "section-active", label: "Active", count: active.length },
                                { id: "section-upcoming", label: "Pre-alert", count: upcoming.length },
                            ].map((item) => {
                                const isActive = activeSection === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => scrollToSection(item.id)}
                                        className="hero-btn"
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
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* Zone 3: Content Sections */}
            <div className="flex flex-col gap-12 pb-32" style={{ marginTop: '1.5rem' }}>
                <section>
                    <SectionHeader id="section-peak" icon={Sparkles} title="At Peak / Action Now" count={peak.length} bgClass="bg-rose-100" colorClass="text-rose-600" />
                    <div className="flex flex-col gap-0">
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
                    <div className="flex flex-col gap-0">
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
                            <button onClick={() => setShowMoreActive(true)} className="mt-4 w-full py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-200">
                                Show {active.length - 8} more active trends ↓
                            </button>
                        )}
                    </div>
                </section>

                <section>
                    <SectionHeader id="section-upcoming" icon={Calendar} title="Upcoming (Pre-alert)" count={upcoming.length} bgClass="bg-amber-100" colorClass="text-amber-600" />
                    <div className="flex flex-col gap-0">
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
                            <button onClick={() => setShowMoreUpcoming(true)} className="mt-4 w-full py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-200">
                                Show {upcoming.length - 12} more upcoming trends ↓
                            </button>
                        )}
                    </div>
                </section>

                {horizon !== 'ALL' && (
                    <div className="mt-4 mx-2 p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex items-start gap-3">
                        <Info size={16} className="text-blue-500 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-xs font-medium text-slate-600 mb-1">Some trends may be hidden because they fall outside the selected timeframe (<strong>{horizon === 'TODAY' ? 'Today' : `Next ${horizon} Days`}</strong>).</p>
                            <button onClick={() => setHorizon('ALL')} className="text-[10px] font-black uppercase tracking-wider text-blue-600 hover:text-blue-700 underline">View All Timeframes</button>
                        </div>
                    </div>
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
