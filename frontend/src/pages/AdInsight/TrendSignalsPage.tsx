import { useMemo, useState, useEffect } from "react";
import { pb } from "../../lib/pocketbase";
import {
    Select,
    SelectItem,
    Button,
    Switch,
    Input,
    Textarea,
    Tooltip,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    useDisclosure
} from "@heroui/react";
import {
    Search, Sparkles, TrendingUp, Calendar, LayoutGrid, Zap, Info, Tag,
    HelpCircle, Copy, Edit3, MapPin, Save
} from "lucide-react";
import { toast } from "sonner";

// --- Types tailored to the Skeleton ---
type Market = "HK" | "TW" | "ID" | "SG" | "MY" | "AU";
type Priority = "high" | "medium";
type Mode = "recurring" | "one_off";

type DestinationObj = { code: string; name: string };
type Destination = string | DestinationObj;

// Extension of the DB type to match Skeleton logic
type TrendSignal = {
    id: string; // Added ID for keying
    key: string;
    trend_type: string; // key
    trend_type_name?: string; // optional if you denormalize
    source_markets?: Market[]; // optional means ALL
    destinations: Destination[];
    mode: Mode;

    start_mmdd?: string;
    end_mmdd?: string;
    peak_start_mmdd?: string;
    peak_end_mmdd?: string;

    start_date?: string; // YYYY-MM-DD
    end_date?: string;
    peak_start_date?: string;
    peak_end_date?: string;

    product_types?: string[];
    keywords?: string[];
    priority: Priority;
    summary: string;

    // Added generic fields from DB to avoid TS errors if raw data has more
    [key: string]: any;
};

type SignalState = "PEAK" | "ACTIVE" | "IN_PREALERT" | "UPCOMING_PREALERT" | "ENDED";

type ResolvedDates = {
    start: Date;
    end: Date;
    preAlert: Date;
    peakStart?: Date;
    peakEnd?: Date;
};

// --- Logic Helpers (Copied from Skeleton) ---

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

function resolveRecurringWindow(today: Date, start_mmdd: string, end_mmdd: string, peak_start_mmdd?: string, peak_end_mmdd?: string) {
    const t = startOfDay(today);
    const year = t.getFullYear();

    const s0 = parseMMDD(start_mmdd);
    const e0 = parseMMDD(end_mmdd);

    let start = new Date(year, s0.mm - 1, s0.dd);
    let end = new Date(year, e0.mm - 1, e0.dd);

    // wrap-year
    if (end < start) end = new Date(year + 1, e0.mm - 1, e0.dd);

    // if already passed, shift forward one year
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
        if (peakEnd < peakStart) peakEnd = new Date(peakEnd.getFullYear() + 1, peakEnd.getMonth(), peakEnd.getDate());
        // ensure peak roughly aligns inside [start,end] (best-effort)
        if (peakStart < start) peakStart = start;
        if (peakEnd > end) peakEnd = end;
    }

    return { start, end, peakStart, peakEnd };
}

function resolveSignalDates(signal: TrendSignal, today: Date, preAlertDays: number): ResolvedDates | null {
    if (signal.mode === "one_off") {
        if (!signal.start_date || !signal.end_date) return null;
        const start = new Date(signal.start_date);
        const end = new Date(signal.end_date);
        const preAlert = addDays(start, -preAlertDays);

        const peakStart = signal.peak_start_date ? new Date(signal.peak_start_date) : undefined;
        const peakEnd = signal.peak_end_date ? new Date(signal.peak_end_date) : undefined;

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

function formatShortDate(d: Date) {
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

function daysDiff(from: Date, to: Date) {
    const a = startOfDay(from).getTime();
    const b = startOfDay(to).getTime();
    return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

// --- Constants & Mapping ---
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

function StateBadge({ state }: { state: SignalState }) {
    // Style matches Page 1's hero-badge logic (rgba backgrounds)
    const getStyle = (s: SignalState) => {
        switch (s) {
            case "PEAK": return { label: "AT PEAK", icon: Sparkles, color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.2)" };
            case "ACTIVE": return { label: "ACTIVE", icon: TrendingUp, color: "#10b981", bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.2)" };
            case "IN_PREALERT": return { label: "PRE-ALERT", icon: Zap, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.2)" };
            case "UPCOMING_PREALERT": return { label: "UPCOMING", icon: Calendar, color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)", border: "rgba(59, 130, 246, 0.2)" };
            default: return { label: "ENDED", icon: Info, color: "#9ca3af", bg: "rgba(156, 163, 175, 0.1)", border: "rgba(156, 163, 175, 0.2)" };
        }
    };

    const style = getStyle(state);
    const Icon = style.icon;

    return (
        <div className="hero-badge" style={{
            background: style.bg,
            color: style.color,
            borderColor: style.border,
            borderWidth: '1px',
            borderStyle: 'solid',
            gap: '6px',
            paddingRight: '10px'
        }}>
            <Icon size={12} strokeWidth={3} />
            {style.label}
        </div>
    );
}

function RowRightMeta({ state, today, dates }: { state: SignalState; today: Date; dates: ResolvedDates }) {
    const start = dates.start;
    const end = dates.end;
    const pre = dates.preAlert;

    let label = "";
    if (state === "PEAK" && dates.peakEnd) label = `Peak ends ${formatShortDate(dates.peakEnd)}`;
    else if (state === "ACTIVE") label = `Ends ${formatShortDate(end)}`;
    else if (state === "IN_PREALERT") label = `Starts ${formatShortDate(start)}`;
    else if (state === "UPCOMING_PREALERT") {
        const d = daysDiff(today, pre);
        label = `Alert in ${d}d`;
    } else label = `Ended ${formatShortDate(end)}`;

    return <div className="text-right text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div>;
}

// --- Main Page Component ---

export default function TrendRadarPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [signals, setSignals] = useState<TrendSignal[]>([]);

    // Fetch Data (Original Logic adapted)
    useEffect(() => {
        const fetchData = async () => {
            try {
                const records = await pb.collection('trend_signals').getFullList({
                    expand: 'trend_type',
                    sort: '-created',
                });

                // Transform records to match TrendSignal type expected by logic
                const transformed: TrendSignal[] = records.map(r => ({
                    ...r,
                    key: r.key,
                    trend_type: r.trend_type,
                    trend_type_name: r.expand?.trend_type?.name || r.key,
                    source_markets: r.source_markets, // Type assertion might be needed if strictly checked
                    destinations: r.destinations,
                    mode: r.mode,
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
                }));

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

    // Skeleton Logic Integration
    const trendTypeNameMap: Record<string, string> = {}; // Populated via expand if needed
    const defaultPreAlertDays = 14;

    const today = useMemo(() => new Date(), []);

    // UI controls
    const [q, setQ] = useState("");
    const [market, setMarket] = useState<Market | "ALL">("ALL");
    const [horizon, setHorizon] = useState<"TODAY" | "7" | "14" | "30" | "ALL">("14");
    const [statusView, setStatusView] = useState<"ACTIVE" | "DRAFT" | "ALL">("ALL");
    const [includeBaseline, setIncludeBaseline] = useState(false);

    // show-more per section
    const [showMoreActive, setShowMoreActive] = useState(false);
    const [showMoreUpcoming, setShowMoreUpcoming] = useState(false);
    const [activeSection, setActiveSection] = useState<string | null>(null);

    const horizonDays = horizon === "TODAY" ? 0 : horizon === "7" ? 7 : horizon === "14" ? 14 : horizon === "30" ? 30 : null;

    // You can define baseline as: entry_pretrip OR outbound_planning OR full-year windows
    const isBaselineSignal = (s: TrendSignal) => {
        const tt = s.expand?.trend_type?.key || s.trend_type; // Adjusted to check expanded key if available
        const fullYear = s.mode === "recurring" && s.start_mmdd === "01-01" && s.end_mmdd === "12-31";
        return tt === "entry_pretrip" || tt === "outbound_planning" || fullYear;
    };

    const prepared = useMemo(() => {
        const lowerQ = q.trim().toLowerCase();

        const filtered = signals
            // statusView: adapt to your data if you have draft/active fields; otherwise ignore
            .filter((s) => statusView === "ALL" || s.status === statusView.toLowerCase())
            .filter((s) => (includeBaseline ? true : !isBaselineSignal(s)))
            .filter((s) => {
                const sm = s.source_markets;
                if (market === "ALL") return true;
                if (!sm || sm.length === 0) return true; // treat empty as ALL
                return sm.includes(market as Market);
            })
            .map((s) => {
                const preAlertDays = s.pre_alert_days || defaultPreAlertDays;
                const dates = resolveSignalDates(s, today, preAlertDays);
                if (!dates) return null;

                const state = computeState(today, dates);
                const name = s.trend_type_name || trendTypeNameMap[s.trend_type] || s.trend_type;

                const destLabel = formatDestinations(s.destinations);
                const searchable = `${name} ${destLabel} ${s.summary ?? ""} ${(s.keywords ?? []).join(" ")}`.toLowerCase();

                return { s, name, destLabel, dates, state, preAlertDays, searchable };
            })
            .filter(Boolean) as Array<{
                s: TrendSignal;
                name: string;
                destLabel: string;
                dates: ResolvedDates;
                state: SignalState;
                preAlertDays: number;
                searchable: string;
            }>;

        const withSearch = lowerQ ? filtered.filter((x) => x.searchable.includes(lowerQ)) : filtered;

        // horizon filter: keep only signals whose next relevant date falls within horizon
        const withinHorizon =
            horizonDays == null
                ? withSearch
                : withSearch.filter((x) => {
                    const { state, dates } = x;

                    // FIX: active/peak signals are "current" so they always fall within any future horizon
                    if (state === "PEAK" || state === "ACTIVE") return true;

                    const relevant =
                        state === "IN_PREALERT"
                            ? dates.start
                            : state === "UPCOMING_PREALERT"
                                ? dates.preAlert
                                : dates.end;

                    const d = daysDiff(today, relevant);
                    return d >= 0 && d <= horizonDays;
                });

        // sorting
        const stateWeight: Record<SignalState, number> = {
            PEAK: 0,
            ACTIVE: 1,
            IN_PREALERT: 2,
            UPCOMING_PREALERT: 3,
            ENDED: 4,
        };

        const priorityWeight: Record<Priority, number> = { high: 0, medium: 1 };

        withinHorizon.sort((a, b) => {
            const sw = stateWeight[a.state] - stateWeight[b.state];
            if (sw !== 0) return sw;

            const pw = priorityWeight[a.s.priority] - priorityWeight[b.s.priority];
            if (pw !== 0) return pw;

            // soonest relevant date
            const aDate =
                a.state === "IN_PREALERT" ? a.dates.start : a.state === "UPCOMING_PREALERT" ? a.dates.preAlert : a.dates.end;
            const bDate =
                b.state === "IN_PREALERT" ? b.dates.start : b.state === "UPCOMING_PREALERT" ? b.dates.preAlert : b.dates.end;

            return aDate.getTime() - bDate.getTime();
        });

        return withinHorizon;
    }, [signals, q, market, horizon, statusView, includeBaseline, defaultPreAlertDays, today]);

    const peak = prepared.filter((x) => x.state === "PEAK");
    const active = prepared.filter((x) => x.state === "ACTIVE");
    const upcoming = prepared.filter((x) => x.state === "IN_PREALERT" || x.state === "UPCOMING_PREALERT");

    const activeToShow = (q.trim() || showMoreActive) ? active : active.slice(0, 8);
    const upcomingToShow = (q.trim() || showMoreUpcoming) ? upcoming : upcoming.slice(0, 12);

    // expanded rows
    const [expandedKey, setExpandedKey] = useState<string | null>(null);

    // Notes Modal Logic
    const { isOpen: isNotesOpen, onOpen: onNotesOpen, onOpenChange: onNotesOpenChange } = useDisclosure();
    const [selectedSignal, setSelectedSignal] = useState<{ id: string, name: string, destLabel: string, strategy_notes?: string } | null>(null);
    const [draftNotes, setDraftNotes] = useState("");
    const [isSavingNotes, setIsSavingNotes] = useState(false);

    const handleOpenNotes = (id: string, name: string, destLabel: string, strategy_notes?: string) => {
        setSelectedSignal({ id, name, destLabel, strategy_notes });
        setDraftNotes(strategy_notes || "");
        onNotesOpen();
    };

    const handleSaveNotes = async () => {
        if (!selectedSignal) return;
        setIsSavingNotes(true);
        try {
            await pb.collection('trend_signals').update(selectedSignal.id, {
                strategy_notes: draftNotes
            });

            // Update local state
            setSignals(prev => prev.map(s =>
                s.id === selectedSignal.id ? { ...s, strategy_notes: draftNotes } : s
            ));

            toast.success("Strategy notes updated");
            onNotesOpenChange();
        } catch (error) {
            console.error("Error saving notes:", error);
            toast.error("Failed to save notes");
        } finally {
            setIsSavingNotes(false);
        }
    };

    const handleCopyKeywords = (keywords: string[]) => {
        const text = keywords.join(", ");
        navigator.clipboard.writeText(text);
        toast.success("Keywords copied to clipboard");
    };

    const renderRow = (x: (typeof prepared)[number]) => {
        const expanded = expandedKey === x.s.key;

        // Human readable product types
        const productTypes = (x.s.product_types || []).map(formatProductType);

        return (
            <div className={`w-full group hero-card mb-3 transition-all ${expanded ? 'ring-2 ring-primary/20 shadow-md bg-white' : 'hover:border-primary/40 bg-white/70'}`} style={{ padding: 0 }}>
                {/* 3-COLUMN SCAN ROW */}
                <button
                    type="button"
                    onClick={() => setExpandedKey(expanded ? null : x.s.key)}
                    className="w-full text-left focus:outline-none"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(140px, 160px) 1fr minmax(200px, 240px)',
                        alignItems: 'center'
                    }}
                >
                    {/* COL 1: STATE BADGE */}
                    <div className="p-4 flex items-center justify-center border-r border-slate-50">
                        <StateBadge state={x.state} />
                    </div>

                    {/* COL 2: TITLE + DESTINATIONS + CHIPS (Limited) */}
                    <div className="p-4 flex flex-col min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                            <h4 className="text-[1.05rem] font-black leading-tight text-slate-800 truncate group-hover:text-primary transition-colors">
                                {x.name}
                            </h4>
                            {x.s.priority === 'high' && (
                                <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                                    High Priority
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                            <div className="text-xs font-bold text-slate-400 truncate uppercase tracking-wide">
                                {x.destLabel}
                            </div>
                            {/* Source market if relevant/different */}
                            {market === "ALL" && x.s.source_markets && x.s.source_markets.length > 0 && (
                                <span className="text-[9px] font-bold text-slate-300 border border-slate-200 px-1 rounded">
                                    {x.s.source_markets.join(", ")}
                                </span>
                            )}
                        </div>

                        {/* Collapsed Chips */}
                        {!expanded && (
                            <div className="flex flex-wrap gap-1.5">
                                {productTypes.slice(0, 3).map(pt => (
                                    <span key={pt} className="px-1.5 py-0.5 bg-slate-50 text-slate-400 text-[9px] font-bold border border-slate-100 rounded uppercase">
                                        {pt}
                                    </span>
                                ))}
                                {productTypes.length > 3 && (
                                    <span className="text-[9px] font-bold text-slate-300">+{productTypes.length - 3}</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* COL 3: TIME + DETAILS TOGGLE */}
                    <div className="p-4 flex flex-col items-end justify-center gap-1.5 border-l border-slate-50 h-full">
                        <RowRightMeta state={x.state} today={today} dates={x.dates} />

                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-primary transition-colors">
                            <span>{expanded ? "Collapse" : "Details"}</span>
                            <span className={`text-[8px] transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>▼</span>
                        </div>
                    </div>
                </button>

                {/* EXPANDED AREA: Progressive Disclosure */}
                {expanded && (
                    <div className="p-0 border-t border-slate-50 animate-in fade-in slide-in-from-top-2 duration-300 bg-white" onClick={(e) => e.stopPropagation()}>
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px]">

                            {/* LEFT COLUMN: Summary + Keywords */}
                            <div className="p-8 border-r border-slate-50 flex flex-col gap-6">
                                {/* Summary Section */}
                                <div className="space-y-3">
                                    <h5 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <Info size={12} /> Executive Summary
                                    </h5>
                                    <div className="relative group/summary">
                                        <p className="text-slate-700 leading-relaxed font-black text-[0.9rem] line-clamp-2">
                                            {x.s.summary || "No summary available for this trend."}
                                        </p>
                                        {x.s.summary && x.s.summary.length > 180 && (
                                            <button
                                                onClick={(e) => {
                                                    const p = e.currentTarget.previousElementSibling;
                                                    if (p) {
                                                        const isClamped = p.classList.contains('line-clamp-2');
                                                        p.classList.toggle('line-clamp-2', !isClamped);
                                                        e.currentTarget.textContent = isClamped ? 'Show Less' : 'Show More';
                                                    }
                                                }}
                                                className="mt-2 text-[10px] font-black uppercase tracking-wider text-blue-600 hover:text-blue-700 hover:underline"
                                            >
                                                Show More
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Keywords Section */}
                                <div className="space-y-3 pt-6 border-t border-slate-50">
                                    <h5 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <Tag size={12} /> Search Context & Keywords
                                    </h5>
                                    {Array.isArray(x.s.keywords) && x.s.keywords.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {x.s.keywords.map(kw => (
                                                <span key={kw} className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] font-bold text-slate-500 italic">
                                                    #{kw}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs font-bold text-slate-300 italic">No keywords available for this signal.</p>
                                    )}
                                </div>

                                {/* Metadata Footer (Optional) */}
                                <div className="mt-auto pt-6 flex items-center gap-4 border-t border-slate-50 opacity-40">
                                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                        <MapPin size={10} /> {x.destLabel}
                                    </div>
                                    {x.s.source_markets && x.s.source_markets.length > 0 && (
                                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                            <TrendingUp size={10} /> {x.s.source_markets.join(", ")}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Actions + Coverage + Status */}
                            <div className="p-8 bg-slate-50/50 flex flex-col gap-8">
                                {/* Actions Area */}
                                <div className="space-y-3">
                                    <Button
                                        size="sm"
                                        variant="solid"
                                        className="w-full h-10 px-4 font-black uppercase tracking-widest text-[10px] bg-slate-900 text-white shadow-xl shadow-slate-200"
                                        onPress={() => handleOpenNotes(x.s.id, x.name, x.destLabel, (x.s as any).strategy_notes)}
                                        startContent={<Edit3 size={14} />}
                                    >
                                        Update Notes
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="bordered"
                                        className="w-full h-10 px-4 font-black uppercase tracking-widest text-[10px] text-slate-500 border-slate-200 bg-white hover:bg-slate-50"
                                        onPress={() => handleCopyKeywords(x.s.keywords || [])}
                                        isDisabled={!x.s.keywords?.length}
                                        startContent={<Copy size={14} />}
                                    >
                                        Copy List
                                    </Button>
                                </div>

                                {/* Product Coverage */}
                                <div className="space-y-4">
                                    <h5 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <LayoutGrid size={12} /> Coverage
                                    </h5>
                                    <div className="flex flex-wrap gap-2">
                                        {productTypes.slice(0, 5).map(pt => (
                                            <span key={pt} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-700 shadow-sm">
                                                {pt}
                                            </span>
                                        ))}
                                        {productTypes.length > 5 && (
                                            <Tooltip content={productTypes.slice(5).join(", ")}>
                                                <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-400">
                                                    +{productTypes.length - 5}
                                                </span>
                                            </Tooltip>
                                        )}
                                    </div>
                                </div>

                                {/* Timeline / Status */}
                                <div className="mt-auto pt-6 border-t border-slate-100">
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Market Status</span>
                                        <RowRightMeta state={x.state} today={today} dates={x.dates} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const SectionHeader = ({ id, icon: Icon, title, count, bgClass, colorClass }: any) => (
        <div id={id} className="flex items-center gap-3 mb-4 px-2 scroll-mt-32">
            <div className={`p-1.5 rounded-lg ${bgClass} ${colorClass}`}>
                <Icon size={18} strokeWidth={2.5} />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{title}</h3>
            <span className="ml-auto text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                {count}
            </span>
        </div>
    );

    const EmptyState = ({ message }: { message: string }) => (
        <div className="hero-card py-6 flex flex-col items-center justify-center text-center border-dashed border-2 border-slate-200 bg-slate-50/50 shadow-none">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 mb-2">
                <LayoutGrid size={16} />
            </div>
            <p className="text-slate-400 font-bold text-xs">{message}</p>
        </div>
    );

    const CompactEmptyState = ({ message }: { message: string }) => (
        <div className="flex items-center justify-between px-6 py-4 rounded-xl bg-slate-50/50 border border-dashed border-slate-200">
            <p className="text-slate-500 font-medium text-xs">{message}</p>
        </div>
    );

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

    const scrollToSection = (id: string) => {
        setActiveSection(id);
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    return (
        <div className="page-container w-full max-w-[1440px] px-8 py-8 animate-fade mx-auto">
            {/* Zone 1: Header Summary Card */}
            <div className="hero-card mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/50 backdrop-blur-sm border-slate-200/80 transition-all duration-300">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 ring-4 ring-blue-50">
                        <TrendingUp size={28} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Trend Radar</h1>
                        <p className="text-slate-500 font-medium text-sm">Daily intelligence scan of emerging seasonal spikes and market shifts.</p>
                    </div>
                </div>

                {/* Summary Stats Group - Clickable for Navigation */}
                <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-xl border border-slate-200/60">
                    <button
                        onClick={() => scrollToSection("section-peak")}
                        className={`px-5 py-2.5 rounded-lg flex flex-col items-center min-w-[120px] transition-all cursor-pointer border ${activeSection === "section-peak"
                            ? "bg-white shadow-md border-rose-200 ring-2 ring-rose-500/20 scale-105 z-10"
                            : "hover:bg-white hover:shadow-sm hover:border-slate-200 border-transparent opacity-70 hover:opacity-100"
                            }`}
                    >
                        <span className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${activeSection === "section-peak" ? "text-rose-600" : "text-slate-500"}`}>At Peak</span>
                        <span className={`text-2xl font-black tabular-nums leading-none ${activeSection === "section-peak" ? "text-slate-800" : "text-slate-600"}`}>{peak.length}</span>
                        {activeSection === "section-peak" && <span className="text-[9px] font-bold text-rose-500 mt-1">Showing</span>}
                    </button>

                    <div className="w-px h-8 bg-slate-200" />

                    <button
                        onClick={() => scrollToSection("section-active")}
                        className={`px-5 py-2.5 rounded-lg flex flex-col items-center min-w-[120px] transition-all cursor-pointer border ${activeSection === "section-active"
                            ? "bg-white shadow-md border-emerald-200 ring-2 ring-emerald-500/20 scale-105 z-10"
                            : "hover:bg-white hover:shadow-sm hover:border-slate-200 border-transparent opacity-70 hover:opacity-100"
                            }`}
                    >
                        <span className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${activeSection === "section-active" ? "text-emerald-600" : "text-slate-500"}`}>Active</span>
                        <span className={`text-2xl font-black tabular-nums leading-none ${activeSection === "section-active" ? "text-slate-800" : "text-slate-600"}`}>{active.length}</span>
                        {activeSection === "section-active" && <span className="text-[9px] font-bold text-emerald-500 mt-1">Showing</span>}
                    </button>

                    <div className="w-px h-8 bg-slate-200" />

                    <button
                        onClick={() => scrollToSection("section-upcoming")}
                        className={`px-5 py-2.5 rounded-lg flex flex-col items-center min-w-[120px] transition-all cursor-pointer border ${activeSection === "section-upcoming"
                            ? "bg-white shadow-md border-amber-200 ring-2 ring-amber-500/20 scale-105 z-10"
                            : "hover:bg-white hover:shadow-sm hover:border-slate-200 border-transparent opacity-70 hover:opacity-100"
                            }`}
                    >
                        <span className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${activeSection === "section-upcoming" ? "text-amber-600" : "text-slate-500"}`}>Pre-alert</span>
                        <span className={`text-2xl font-black tabular-nums leading-none ${activeSection === "section-upcoming" ? "text-slate-800" : "text-slate-600"}`}>{upcoming.length}</span>
                        {activeSection === "section-upcoming" && <span className="text-[9px] font-bold text-amber-500 mt-1">Showing</span>}
                    </button>
                </div>
            </div>

            {/* Zone 2: Filter Bar */}
            <section className="hero-card mb-12 !p-3 flex flex-col md:flex-row items-center gap-4 sticky top-4 z-40 backdrop-blur-xl bg-white/95 shadow-xl shadow-slate-200/20 !border-slate-200 ring-1 ring-slate-900/10">
                {/* Search - HeroUI Input */}
                <div className="flex-1 w-full min-w-[260px]">
                    <Input
                        type="text"
                        placeholder="Search trends (name, destination...)"
                        value={q}
                        onValueChange={setQ}
                        variant="bordered"
                        radius="lg"
                        startContent={<Search size={18} className="text-slate-400" />}
                        classNames={{
                            input: "text-sm font-bold text-slate-900 placeholder:text-slate-400 ml-2",
                            inputWrapper: "h-11 border-1 !border-slate-200 hover:!border-blue-400 focus-within:!border-blue-500 transition-all shadow-none bg-white",
                        }}
                    />
                </div>

                <div className="hidden md:block h-8 w-px bg-slate-200 mx-1" />

                {/* Filters Group - Standardized Height h-10 */}
                <div className="flex w-full md:w-auto items-center gap-3">
                    <Select
                        selectedKeys={[market]}
                        onSelectionChange={(keys) => {
                            const v = Array.from(keys)[0] as any;
                            setMarket(v);
                        }}
                        className="w-full md:w-[150px]"
                        aria-label="Market"
                        disallowEmptySelection
                        variant="bordered"
                        radius="lg"
                        classNames={{
                            trigger: "h-11 border-1 !border-slate-200 bg-white hover:!border-blue-400 transition-all shadow-none",
                            value: "text-sm font-bold text-slate-700",
                        }}
                    >
                        <SelectItem key="ALL">All markets</SelectItem>
                        <SelectItem key="HK">HK</SelectItem>
                        <SelectItem key="TW">TW</SelectItem>
                        <SelectItem key="ID">ID</SelectItem>
                        <SelectItem key="SG">SG</SelectItem>
                        <SelectItem key="MY">MY</SelectItem>
                        <SelectItem key="AU">AU</SelectItem>
                    </Select>

                    <Select
                        selectedKeys={[horizon]}
                        onSelectionChange={(keys) => setHorizon(Array.from(keys)[0] as any)}
                        className="w-full md:w-[180px]"
                        aria-label="Filter Horizon"
                        disallowEmptySelection
                        variant="bordered"
                        radius="lg"
                        classNames={{
                            trigger: "h-11 border-1 !border-slate-200 bg-white hover:!border-blue-400 transition-all shadow-none",
                            value: "text-sm font-bold text-slate-700",
                        }}
                    >
                        <SelectItem key="TODAY">Today</SelectItem>
                        <SelectItem key="7">Next 7 days</SelectItem>
                        <SelectItem key="14">Next 14 days</SelectItem>
                        <SelectItem key="30">Next 30 days (+Window)</SelectItem>
                        <SelectItem key="ALL">All time</SelectItem>
                    </Select>
                </div>

                <div className="hidden md:block h-8 w-px bg-slate-200 mx-1" />

                {/* View Controls & Toggles */}
                <div className="flex w-full md:w-auto items-center justify-between md:justify-end gap-6 pr-2">
                    {/* Baseline Toggle - Separated Label & Tooltip */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 cursor-help group">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-slate-600 transition-colors">Baseline</span>
                            <Tooltip content="Show evergreen / always-on trends used for long-term coverage." placement="top">
                                <HelpCircle size={12} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                            </Tooltip>
                        </div>
                        <Switch
                            size="sm"
                            isSelected={includeBaseline}
                            onValueChange={setIncludeBaseline}
                            classNames={{
                                wrapper: "h-6 w-10 bg-slate-200 group-data-[selected=true]:bg-blue-600",
                                thumb: "w-4 h-4 bg-white border border-transparent shadow-sm group-data-[selected=true]:ml-0.5"
                            }}
                            aria-label="Toggle Baseline"
                        />
                    </div>

                    {/* Segmented Control */}
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 h-10 items-center">
                        {(["ALL", "ACTIVE", "DRAFT"] as const).map((v) => (
                            <button
                                key={v}
                                onClick={() => setStatusView(v)}
                                className={[
                                    "px-4 h-8 text-[10px] font-black uppercase tracking-wider rounded-md transition-all flex items-center justify-center relative",
                                    statusView === v
                                        ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 z-10"
                                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50",
                                ].join(" ")}
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Zone 3: Content Sections */}
            <div className="flex flex-col gap-20 pb-32 mt-4">
                {/* PEAK SECTION */}
                <section>
                    <SectionHeader
                        id="section-peak"
                        icon={Sparkles}
                        title="At Peak / Action Now"
                        count={peak.length}
                        bgClass="bg-rose-100"
                        colorClass="text-rose-600"
                    />
                    <div className="flex flex-col gap-0">
                        {peak.length === 0 ? (
                            <CompactEmptyState
                                message="No trends at peak right now."
                            />
                        ) : (
                            peak.map(renderRow)
                        )}
                    </div>
                </section>

                {/* ACTIVE SECTION */}
                <section>
                    <SectionHeader
                        id="section-active"
                        icon={TrendingUp}
                        title="Active Trends"
                        count={active.length}
                        bgClass="bg-emerald-100"
                        colorClass="text-emerald-600"
                    />
                    <div className="flex flex-col gap-0">
                        {activeToShow.length === 0 ? (
                            <EmptyState
                                message="No active trends found matching criteria."
                            />
                        ) : (
                            activeToShow.map(renderRow)
                        )}
                        {/* Show More Button */}
                        {!q.trim() && !showMoreActive && active.length > 8 && (
                            <button
                                onClick={() => setShowMoreActive(true)}
                                className="mt-4 w-full py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-200"
                            >
                                Show {active.length - 8} more active trends ↓
                            </button>
                        )}
                    </div>
                </section>

                {/* UPCOMING SECTION */}
                <section>
                    <SectionHeader
                        id="section-upcoming"
                        icon={Calendar}
                        title="Upcoming (Pre-alert)"
                        count={upcoming.length}
                        bgClass="bg-amber-100"
                        colorClass="text-amber-600"
                    />
                    <div className="flex flex-col gap-0">
                        {upcomingToShow.length === 0 ? (
                            <EmptyState
                                message="No upcoming trends in the forecast."
                            />
                        ) : (
                            upcomingToShow.map(renderRow)
                        )}
                        {!q.trim() && !showMoreUpcoming && upcoming.length > 12 && (
                            <button
                                onClick={() => setShowMoreUpcoming(true)}
                                className="mt-4 w-full py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-200"
                            >
                                Show {upcoming.length - 12} more upcoming trends ↓
                            </button>
                        )}
                    </div>
                </section>

                {/* Hidden Trends Hint */}
                {
                    horizon !== 'ALL' && (
                        <div className="mt-4 mx-2 p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex items-start gap-3">
                            <Info size={16} className="text-blue-500 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-xs font-medium text-slate-600 mb-1">
                                    Some trends may be hidden because they fall outside the selected timeframe (<strong>{horizon === 'TODAY' ? 'Today' : `Next ${horizon} Days`}</strong>).
                                </p>
                                <button onClick={() => setHorizon('ALL')} className="text-[10px] font-black uppercase tracking-wider text-blue-600 hover:text-blue-700 underline">
                                    View All Timeframes
                                </button>
                            </div>
                        </div>
                    )
                }
            </div >

            {/* Strategy Notes Modal */}
            {/* Strategy Notes Modal - Refined to match Campaign Edit Style */}
            <Modal
                isOpen={isNotesOpen}
                onOpenChange={onNotesOpenChange}
                size="2xl"
                backdrop="blur"
                classNames={{
                    base: "bg-white border border-slate-200 shadow-2xl rounded-[20px] overflow-hidden",
                    header: "p-8 pb-0",
                    body: "p-8",
                    footer: "p-8 pt-4",
                    closeButton: "top-8 right-8 text-slate-400 hover:text-slate-600 transition-colors"
                }}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex items-center gap-4">
                                <div style={{ width: '4px', height: '24px', background: 'hsl(var(--primary))', borderRadius: '4px' }} />
                                <div className="space-y-0.5">
                                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Update Strategy Notes</h2>
                                    <p className="text-xs font-medium text-slate-500">{selectedSignal?.name} · {selectedSignal?.destLabel}</p>
                                </div>
                            </ModalHeader>
                            <ModalBody>
                                <div className="space-y-6">
                                    <Textarea
                                        label="STRATEGY DOCUMENTATION"
                                        labelPlacement="outside"
                                        placeholder="Define targeting rules, creative directions, or optimization tactics..."
                                        minRows={8}
                                        value={draftNotes}
                                        onValueChange={setDraftNotes}
                                        classNames={{
                                            label: "text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2",
                                            input: "text-base font-medium text-slate-700 p-4",
                                            inputWrapper: "border border-slate-200 hover:border-blue-400 focus-within:border-primary transition-all shadow-sm bg-slate-50/30 rounded-xl"
                                        }}
                                    />

                                    <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex items-start gap-3">
                                        <Info size={16} className="text-blue-500 mt-0.5" />
                                        <p className="text-xs font-medium text-blue-700 leading-relaxed">
                                            These notes are internal only and will be visible to all ad managers collaborating on this trend region.
                                        </p>
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter className="flex justify-end gap-3">
                                <Button
                                    variant="light"
                                    onPress={onClose}
                                    className="px-6 font-bold text-sm text-slate-500"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    color="primary"
                                    onPress={handleSaveNotes}
                                    isLoading={isSavingNotes}
                                    isDisabled={selectedSignal?.strategy_notes === draftNotes}
                                    className="px-8 font-bold text-sm bg-primary text-white shadow-lg shadow-primary/20 rounded-xl flex items-center gap-2"
                                >
                                    {isSavingNotes ? 'Saving...' : 'Update Strategy'}
                                    {!isSavingNotes && <Save size={18} />}
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div >
    );
}
