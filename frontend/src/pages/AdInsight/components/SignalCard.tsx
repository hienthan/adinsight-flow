import { ChevronRight, MapPin, Bell } from "lucide-react";
import { TrendSignal, SignalState, Destination } from "../types";
import { getStateColor, getPriorityColor, formatDate } from "../utils";
import { SAFE_INTERACTIVE_TRANSITION } from "../../../lib/uiMotion";
import { SurfaceCard } from "../../../components/common/ui";

interface SignalCardProps {
    signal: TrendSignal & { state: SignalState; start: Date; end: Date; pre_alert_date: Date };
    onOpen: (signal: TrendSignal & { state: SignalState; start: Date; end: Date; pre_alert_date: Date }) => void;
}

export const SignalCard = ({ signal, onOpen }: SignalCardProps) => {
    const destinationLabel = signal.destinations
        ?.map((d: string | Destination) => (typeof d === "string" ? d : d.name))
        .join(", ");

    const priorityTone = getPriorityColor(signal.priority);
    const stateTone = getStateColor(signal.state);

    const toneStyles: Record<string, { bg: string; text: string; border: string }> = {
        primary: { bg: "rgba(59, 130, 246, 0.12)", text: "#2563eb", border: "rgba(59, 130, 246, 0.18)" },
        success: { bg: "rgba(16, 185, 129, 0.12)", text: "#059669", border: "rgba(16, 185, 129, 0.18)" },
        danger: { bg: "rgba(239, 68, 68, 0.12)", text: "#dc2626", border: "rgba(239, 68, 68, 0.18)" },
        warning: { bg: "rgba(245, 158, 11, 0.12)", text: "#d97706", border: "rgba(245, 158, 11, 0.18)" },
        default: { bg: "rgba(148, 163, 184, 0.12)", text: "#475569", border: "rgba(148, 163, 184, 0.18)" },
        secondary: { bg: "rgba(139, 92, 246, 0.12)", text: "#7c3aed", border: "rgba(139, 92, 246, 0.18)" },
    };

    const priorityStyle = toneStyles[priorityTone] || toneStyles.default;
    const stateStyle = toneStyles[stateTone] || toneStyles.default;

    const renderChip = (label: string, style: { bg: string; text: string; border: string }, extraClassName = "") => (
        <span
            className={extraClassName}
            style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "24px",
                padding: "0 0.75rem",
                borderRadius: "10px",
                background: style.bg,
                color: style.text,
                border: `1px solid ${style.border}`,
                fontSize: "10px",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
            }}
        >
            {label}
        </span>
    );

    return (
        <button
            type="button"
            className="signal-card bg-(--bg-content) border border-(--border-subtle) shadow-md hover:shadow-xl h-full rounded-[20px]"
            onClick={() => onOpen(signal)}
            style={{ textAlign: "left", width: "100%", padding: 0, cursor: "pointer" }}
        >
            <style>{`
                .signal-card {
                    transition: ${SAFE_INTERACTIVE_TRANSITION};
                }
            `}</style>
            <SurfaceCard padding="0" radius="20px" style={{ height: "100%", overflow: "hidden", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)" }}>
            <div style={{ padding: "40px 40px 24px 40px" }} className="flex flex-col items-start gap-4">
                <div className="flex justify-between w-full items-start">
                    <div className="flex flex-wrap gap-2">
                        {renderChip(signal.priority, priorityStyle)}
                        {renderChip(signal.state.replace('_', ' '), stateStyle, signal.state === 'PEAK' ? 'animate-pulse shadow-sm' : '')}
                    </div>
                    <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.15)' }} className="flex items-center gap-2 px-3 py-1.5 rounded-md">
                        <Bell size={12} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Pre: {signal.pre_alert_days || 14}</span>
                    </div>
                </div>
                
                <div className="space-y-2">
                    <h4 className="font-extrabold text-2xl text-(--text-main) leading-tight tracking-tight">
                        {signal.expand?.trend_type?.name || signal.key}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-(--text-muted) uppercase tracking-widest">
                        <MapPin size={11} className="text-primary/60" />
                        {destinationLabel}
                    </div>
                </div>
            </div>

            <div style={{ padding: "0px 40px 24px 40px" }} className="space-y-8 flex-1">
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-(--text-muted)">
                        <span>Timeline</span>
                        <div className="flex items-center gap-2 text-(--text-main)">
                            <span>{formatDate(signal.start)}</span>
                            <ChevronRight size={10} className="opacity-30" />
                            <span>{formatDate(signal.end)}</span>
                        </div>
                    </div>
                    <div className="h-1.5 w-full bg-(--bg-overlay) rounded-full overflow-hidden">
                        <div className="h-full bg-primary/40 w-full" />
                    </div>
                </div>

                <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-(--text-muted)">Coverage</p>
                    <div className="flex flex-wrap gap-2">
                        {signal.product_types?.map(p => (
                            <span
                                key={p} 
                                style={{ backgroundColor: 'rgba(139, 92, 246, 0.12)', color: '#7c3aed', border: '1px solid rgba(139, 92, 246, 0.15)' }}
                                className="inline-flex items-center rounded-[10px] border px-3 py-1.5 font-bold h-7 capitalize"
                            >
                                {p}
                            </span>
                        ))}
                    </div>
                </div>

                {signal.notes && (
                    <div className="bg-primary/[0.03] p-6 rounded-xl border border-primary/10 italic text-[13px] text-(--text-dim) leading-relaxed line-clamp-2 relative overflow-hidden">
                        <div className="absolute left-0 top-0 h-full w-1 bg-primary/20" />
                        "{signal.notes}"
                    </div>
                )}
            </div>

            <div style={{ padding: "32px 40px 40px 40px" }} className="bg-(--bg-overlay)/20 border-t border-(--border-subtle) justify-between flex items-center">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${signal.status === 'active' ? 'bg-success' : 'bg-default-400'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-(--text-muted)">
                        {signal.status}
                    </span>
                </div>
                <div className="font-bold text-primary flex items-center gap-2 text-xs bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-lg transition-colors">
                    View Insights <ChevronRight size={14} />
                </div>
            </div>
            </SurfaceCard>
        </button>
    );
};
