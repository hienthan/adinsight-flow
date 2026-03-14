import { TrendingUp, AlertTriangle, Calendar } from "lucide-react";
import { SurfaceCard } from "../../../components/common/ui";

interface StatCardsProps {
    loading: boolean;
    activeCount: number;
    highPriorityCount: number;
    peakCount: number;
}

export const StatCards = ({ loading, activeCount, highPriorityCount, peakCount }: StatCardsProps) => {
    const cards = [
        {
            label: "Active Trends",
            value: activeCount,
            tone: "primary",
            icon: TrendingUp,
            cardBg: "rgba(59, 130, 246, 0.06)",
            iconBg: "rgba(59, 130, 246, 0.1)",
            color: "hsl(var(--primary))",
        },
        {
            label: "High Priority",
            value: highPriorityCount,
            tone: "danger",
            icon: AlertTriangle,
            cardBg: "rgba(239, 68, 68, 0.06)",
            iconBg: "rgba(239, 68, 68, 0.1)",
            color: "#ef4444",
        },
        {
            label: "At Peak Now",
            value: peakCount,
            tone: "success",
            icon: Calendar,
            cardBg: "rgba(16, 185, 129, 0.06)",
            iconBg: "rgba(16, 185, 129, 0.1)",
            color: "#10b981",
        },
    ] as const;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <SurfaceCard key={card.label} padding="1.25rem" style={{ background: card.cardBg, border: "none", boxShadow: "var(--shadow-soft)" }}>
                        <div className="flex-row items-center gap-4 p-0 flex">
                            <div className="p-3 rounded-2xl" style={{ background: card.iconBg, color: card.color }}>
                                <Icon size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: `${card.color}99` }}>{card.label}</p>
                                <h3 className="text-3xl font-black" style={{ color: card.color }}>
                                    {loading ? <span className="inline-block w-12 h-8 rounded-lg animate-pulse" style={{ background: 'rgba(148, 163, 184, 0.2)' }} /> : card.value}
                                </h3>
                            </div>
                        </div>
                    </SurfaceCard>
                );
            })}
        </div>
    );
};
