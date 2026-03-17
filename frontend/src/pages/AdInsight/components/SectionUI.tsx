import type { ElementType } from "react";
import { LayoutGrid } from "lucide-react";
import { SurfaceCard, createAmbientSurface } from "../../../components/common/ui";

const SECTION_ACCENTS: Record<string, string> = {
    "At Peak / Action Now": "#ef4444",
    "Active Trends": "#22c55e",
    "Upcoming (Pre-alert)": "#f59e0b",
};

interface SectionHeaderProps {
    id: string;
    icon: ElementType;
    title: string;
    count: number;
    bgClass: string;
    colorClass: string;
}

export const SectionHeader = ({ id, icon: Icon, title, count, bgClass, colorClass }: SectionHeaderProps) => (
    <div id={id} className="flex items-center gap-3 mb-4 px-2 py-3 rounded-2xl scroll-mt-32" style={createAmbientSurface(SECTION_ACCENTS[title] || '#3b82f6', 0.2)}>
        <div className={`p-1.5 rounded-lg ${bgClass} ${colorClass}`}>
            <Icon size={18} strokeWidth={2.5} />
        </div>
        <h3 className="text-lg font-black uppercase tracking-tight" style={{ color: "var(--text-main)" }}>{title}</h3>
        <span
            className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full border"
            style={{ color: "var(--text-dim)", background: "var(--bg-overlay)", borderColor: "var(--border-subtle)" }}
        >
            {count}
        </span>
    </div>
);

export const EmptyState = ({ message }: { message: string }) => (
    <SurfaceCard
        className="py-6 flex flex-col items-center justify-center text-center border-dashed border-2 shadow-none"
        variant="inset"
        padding="1.5rem"
        style={{ ...createAmbientSurface('#64748b', 0.12), borderColor: "var(--border-subtle)" }}
    >
        <div
            className="w-8 h-8 rounded-full flex items-center justify-center mb-2"
            style={{ background: "var(--bg-main)", color: "var(--text-muted)" }}
        >
            <LayoutGrid size={16} />
        </div>
        <p className="font-bold text-xs" style={{ color: "var(--text-muted)" }}>{message}</p>
    </SurfaceCard>
);

export const CompactEmptyState = ({ message }: { message: string }) => (
    <div
        className="flex items-center justify-between px-6 py-4 rounded-xl border border-dashed"
        style={{ ...createAmbientSurface('#64748b', 0.1), borderColor: "var(--border-subtle)" }}
    >
        <p className="font-medium text-xs" style={{ color: "var(--text-dim)" }}>{message}</p>
    </div>
);
