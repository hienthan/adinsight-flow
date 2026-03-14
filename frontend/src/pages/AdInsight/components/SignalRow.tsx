import React from "react";
import { Button, Chip } from "@heroui/react";
import { MapPin, Info, Tag, Edit3, TrendingUp, Sparkles, Zap, Calendar, ArrowRight, Bell } from "lucide-react";
import { Destination } from "../types";

type SignalState = "PEAK" | "ACTIVE" | "IN_PREALERT" | "UPCOMING_PREALERT" | "ENDED";
type ResolvedDates = {
    start: Date;
    end: Date;
    preAlert: Date;
    peakStart?: Date;
    peakEnd?: Date;
};

interface SignalRowProps {
    x: {
        s: {
            id: string;
            key: string;
            notes?: string;
            summary?: string;
            priority: "high" | "medium";
            source_markets?: string[];
            product_types?: string[];
            keywords?: string[];
            pre_alert_days?: number;
            destinations: Array<string | Destination>;
        };
        name: string;
        destLabel: string;
        dates: ResolvedDates;
        state: SignalState;
        preAlertDays: number;
        searchable: string;
    };
    expanded: boolean;
    onToggleExpand: () => void;
    onOpenNotes: (id: string, name: string, destLabel: string, notes?: string) => void;
    formatProductType: (type: string) => string;
    today: Date;
}

const formatMMDD = (d: Date) => {
    return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" }).replace("/", "-");
};

const MARKET_CHIP_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    HK: { bg: "rgba(59, 130, 246, 0.14)", text: "#1d4ed8", border: "rgba(59, 130, 246, 0.28)" },
    TW: { bg: "rgba(16, 185, 129, 0.14)", text: "#047857", border: "rgba(16, 185, 129, 0.28)" },
    ID: { bg: "rgba(245, 158, 11, 0.14)", text: "#b45309", border: "rgba(245, 158, 11, 0.28)" },
    SG: { bg: "rgba(139, 92, 246, 0.14)", text: "#7c3aed", border: "rgba(139, 92, 246, 0.28)" },
    MY: { bg: "rgba(6, 182, 212, 0.14)", text: "#0e7490", border: "rgba(6, 182, 212, 0.28)" },
    AU: { bg: "rgba(244, 63, 94, 0.14)", text: "#be123c", border: "rgba(244, 63, 94, 0.28)" },
    DEFAULT: { bg: "rgba(148, 163, 184, 0.14)", text: "#475569", border: "rgba(148, 163, 184, 0.28)" },
};

export const StateBadge = ({ state }: { state: SignalState }) => {
    const getStyle = (s: SignalState) => {
        switch (s) {
            case "PEAK": return { label: "ACTIVE", icon: Sparkles, color: "#ef4444", bg: "rgba(239, 68, 68, 0.08)", border: "rgba(239, 68, 68, 0.2)" };
            case "ACTIVE": return { label: "ACTIVE", icon: TrendingUp, color: "#10b981", bg: "rgba(16, 185, 129, 0.08)", border: "rgba(16, 185, 129, 0.2)" };
            case "IN_PREALERT": return { label: "PRE-ALERT", icon: Zap, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.08)", border: "rgba(245, 158, 11, 0.2)" };
            case "UPCOMING_PREALERT": return { label: "UPCOMING", icon: Calendar, color: "#3b82f6", bg: "rgba(59, 130, 246, 0.08)", border: "rgba(59, 130, 246, 0.2)" };
            default: return { label: "ENDED", icon: Info, color: "#9ca3af", bg: "rgba(156, 163, 175, 0.08)", border: "rgba(156, 163, 175, 0.2)" };
        }
    };

    const style = getStyle(state);
    const Icon = style.icon;

    return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-md border text-[10px] font-black tracking-widest" 
             style={{ background: style.bg, color: style.color, borderColor: style.border }}>
            <Icon size={11} strokeWidth={3} />
            {style.label}
        </div>
    );
};

export const SignalRow: React.FC<SignalRowProps> = ({
    x,
    expanded,
    onToggleExpand,
    onOpenNotes,
    formatProductType,
    today,
}) => {
    const productTypes = (x.s.product_types || []).map(formatProductType);
    const preAlertDays = x.s.pre_alert_days || x.preAlertDays || 14;
    const recommendedStartDate = new Date(x.dates.start);
    recommendedStartDate.setDate(recommendedStartDate.getDate() - preAlertDays);

    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const startDate = new Date(x.dates.start);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(x.dates.end);
    endDate.setHours(0, 0, 0, 0);

    const msPerDay = 1000 * 60 * 60 * 24;
    const daysUntilAction = Math.ceil((recommendedStartDate.getTime() - todayStart.getTime()) / msPerDay);
    const daysUntilEnd = Math.max(0, Math.ceil((endDate.getTime() - todayStart.getTime()) / msPerDay));

    let actionPrimary = "Start campaigns NOW";
    let actionSecondary = `Peak starts on ${formatMMDD(startDate)}`;
    let actionTone: "amber" | "green" | "red" | "yellow" | "gray" = "amber";

    if (todayStart < startDate) {
        if (todayStart >= recommendedStartDate) {
            actionPrimary = "Start campaigns NOW";
            actionSecondary = `Peak starts on ${formatMMDD(startDate)}`;
            actionTone = "amber";
        } else {
            const safeDays = Math.max(daysUntilAction, 1);
            actionPrimary = `Start in ${safeDays} day${safeDays > 1 ? "s" : ""}`;
            actionSecondary = `Recommended prep date: ${formatMMDD(recommendedStartDate)}`;
            actionTone = "amber";
        }
    } else if (todayStart <= endDate) {
        if (x.state === "PEAK") {
            actionPrimary = "PEAK NOW - maximize coverage";
            actionSecondary = "Highest demand period";
            actionTone = "red";
        } else if (daysUntilEnd <= 7) {
            actionPrimary = "Peak ending soon";
            actionSecondary = `Taper budgets after ${formatMMDD(endDate)}`;
            actionTone = "yellow";
        } else {
            actionPrimary = "Active - optimize & scale";
            actionSecondary = `Peak ends in ${daysUntilEnd} days (${formatMMDD(endDate)})`;
            actionTone = "green";
        }
    } else {
        actionPrimary = "Trend ended";
        actionSecondary = "Review performance & save notes";
        actionTone = "gray";
    }

    const actionToneStyle = {
        amber: { bg: "rgba(245, 158, 11, 0.12)", text: "#b45309", border: "rgba(245, 158, 11, 0.24)" },
        green: { bg: "rgba(16, 185, 129, 0.12)", text: "#047857", border: "rgba(16, 185, 129, 0.24)" },
        red: { bg: "rgba(239, 68, 68, 0.12)", text: "#b91c1c", border: "rgba(239, 68, 68, 0.24)" },
        yellow: { bg: "rgba(234, 179, 8, 0.12)", text: "#a16207", border: "rgba(234, 179, 8, 0.24)" },
        gray: { bg: "rgba(148, 163, 184, 0.12)", text: "#475569", border: "rgba(148, 163, 184, 0.24)" },
    }[actionTone];

    return (
        <div
            className={`signal-row-card w-full group hero-card border border-(--border-subtle) ${expanded ? 'bg-(--bg-main) shadow-xl' : 'hover:border-primary/40 hover:shadow-lg'}`}
            style={{ 
                padding: 0, 
                background: "var(--bg-content)", 
                borderRadius: "12px", 
                overflow: "hidden",
                marginBottom: "16px", // Balanced separation
                display: "block",
                width: "100%",
                transition: 'background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease'
            }}
        >
            <style>{`
                .signal-row-card:hover {
                    transform: none;
                }
            `}</style>
            {/* SCAN ROW - 4 COLUMNS LAYOUT */}
            <button
                type="button"
                onClick={onToggleExpand}
                className="w-full text-left focus:outline-none grid grid-cols-1 md:grid-cols-[1.6fr_1.2fr_1fr_1.2fr] gap-4 items-center"
                style={{
                    padding: "12px 20px", // Balanced row padding
                    minHeight: "64px",
                    display: "grid"
                }}
            >
                {/* COL 1: Status & Title (keep) */}
                <div className="flex items-center gap-5 min-w-0 flex-[1.2]">
                    <div className="w-[100px] shrink-0 flex items-center justify-center">
                        <StateBadge state={x.state} />
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                        <div className="flex items-center gap-2">
                            <h4 className="text-[0.95rem] font-bold truncate group-hover:text-primary transition-colors text-(--text-main) tracking-tight">
                                {x.name}
                            </h4>
                            {x.s.priority === 'high' && (
                                <span className="text-[7px] font-black text-rose-500 uppercase tracking-widest shrink-0">Priority</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-semibold text-(--text-muted) uppercase tracking-wide truncate opacity-80">
                            <MapPin size={10} className="text-primary opacity-70 shrink-0" />
                            <span className="truncate">{x.destLabel}</span>
                            {x.s.source_markets && x.s.source_markets.length > 0 && (
                                <div className="flex gap-1 shrink-0 ml-1">
                                    {x.s.source_markets.map((m: string) => (
                                        <Chip
                                            key={m}
                                            size="sm"
                                            variant="flat"
                                            radius="md"
                                            style={{
                                                backgroundColor: (MARKET_CHIP_STYLES[m] || MARKET_CHIP_STYLES.DEFAULT).bg,
                                                color: (MARKET_CHIP_STYLES[m] || MARKET_CHIP_STYLES.DEFAULT).text,
                                                border: `1px solid ${(MARKET_CHIP_STYLES[m] || MARKET_CHIP_STYLES.DEFAULT).border}`,
                                            }}
                                            classNames={{
                                                base: "h-5 rounded-[8px] shadow-sm",
                                                content: "text-[9px] font-extrabold px-2 tracking-wide",
                                            }}
                                        >
                                            {m}
                                        </Chip>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* COL 2: Product Types (keep) */}
                <div className="flex-1 flex items-center gap-2 px-4 overflow-hidden">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {productTypes.slice(0, 6).map((pt: string) => (
                            <Chip
                                key={pt}
                                size="sm"
                                variant="flat"
                                radius="md"
                                style={{ backgroundColor: 'rgba(139, 92, 246, 0.12)', color: '#7c3aed', border: '1px solid rgba(139, 92, 246, 0.15)' }}
                                classNames={{
                                    base: "h-6 min-w-0 rounded-[10px]",
                                    content: "text-[10px] font-bold px-2.5 capitalize truncate"
                                }}
                            >
                                {pt}
                            </Chip>
                        ))}
                        {productTypes.length > 6 && (
                            <span className="text-[10px] font-black text-(--text-muted) shrink-0">+{productTypes.length - 6}</span>
                        )}
                    </div>
                </div>

                {/* COL 3: Peak window */}
                <div className="min-w-0 px-2">
                    <div className="text-[9px] font-black uppercase tracking-[0.14em] text-(--text-muted) mb-1">
                        Peak window
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-black tracking-wider text-(--text-main)">
                        <span>{formatMMDD(startDate)}</span>
                        <ArrowRight size={10} className="opacity-30" />
                        <span>{formatMMDD(endDate)}</span>
                    </div>
                </div>

                {/* COL 4: Action timing */}
                <div className="min-w-0 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] border mb-1.5"
                            style={{
                                backgroundColor: actionToneStyle.bg,
                                color: actionToneStyle.text,
                                borderColor: actionToneStyle.border,
                            }}
                        >
                            <Bell size={10} />
                            <span className="text-[9px] font-black uppercase tracking-wider">
                                Action timing
                            </span>
                        </div>
                        <p className="text-[11px] font-black leading-tight text-(--text-main) truncate">
                            {actionPrimary}
                        </p>
                        <p className="text-[10px] font-semibold leading-tight text-(--text-muted) truncate">
                            {actionSecondary}
                        </p>
                    </div>
                    <div className={`transition-transform duration-300 shrink-0 ${expanded ? "rotate-180 text-primary" : "text-(--text-muted)"}`}>
                        <TrendingUp size={14} className="rotate-90" />
                    </div>
                </div>
            </button>

             {/* EXPANDED AREA */}
            {expanded && (
                <div
                    className="border-t border-(--border-subtle) animate-in fade-in slide-in-from-top-1 duration-200"
                    style={{ 
                        background: "rgba(var(--bg-main), 0.05)",
                        padding: "10px 14px", // Balanced Gutter
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px"
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex flex-col gap-5">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h5 className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.25em] text-(--text-muted)">
                                    <Sparkles size={14} className="text-primary/50" />
                                    Executive Summary
                                </h5>
                                <Button isIconOnly size="sm" variant="light" color="primary" radius="lg" onPress={() => onOpenNotes(x.s.id, x.name, x.destLabel, x.s.notes)}>
                                    <Edit3 size={18} />
                                 </Button>
                            </div>
                            <div style={{ paddingLeft: "26px" }}>
                                <p className="leading-relaxed font-bold text-[0.85rem] text-(--text-main) tracking-tight text-left">
                                    {x.s.summary || "No summary recorded."}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2 pt-4 border-t border-(--border-subtle)/30">
                            <h5 className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.25em] text-(--text-muted)">
                                 <Info size={14} className="text-primary/50" />
                                Strategy Notes
                            </h5>
                            <div style={{ paddingLeft: "26px" }}>
                                <div 
                                    className="rounded-xl border border-(--border-subtle) shadow-sm relative overflow-hidden"
                                    style={{
                                        background: "var(--bg-content)",
                                        padding: "16px 20px",
                                        minHeight: "80px"
                                    }}
                                >
                                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
                                    {x.s.notes ? (
                                        <p className="text-[0.9rem] font-medium leading-relaxed text-(--text-dim) italic whitespace-pre-wrap pl-2">"{x.s.notes}"</p>
                                    ) : (
                                        <p className="text-sm font-medium italic text-(--text-muted) opacity-50 pl-2">No additional strategy notes.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 pt-4 border-t border-(--border-subtle)/30">
                            <h5 className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.25em] text-(--text-muted)">
                                <Tag size={14} className="text-primary/50" />
                                Target Context
                            </h5>
                            <div className="flex flex-wrap gap-2.5" style={{ paddingLeft: "26px" }}>
                                {Array.isArray(x.s.keywords) && x.s.keywords.length > 0 ? (
                                    x.s.keywords.map((kw: string) => (
                                        <div key={kw} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-(--border-subtle) bg-(--bg-content) text-[10px] font-bold text-(--text-main) shadow-sm">
                                            <span className="text-primary/40 font-black">#</span>{kw}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm font-medium italic text-(--text-muted) opacity-50 pl-2">No keywords defined.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
