import { Tabs, Tab, Button, Textarea } from "@heroui/react";
import { MapPin, Calendar, TrendingUp, Info, Save, X } from "lucide-react";
import { TrendSignal, SignalState, Destination } from "../types";
import { formatDate } from "../utils";
import { useEffect } from "react";

interface SignalDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    signal: (TrendSignal & { state: SignalState; start: Date; end: Date; pre_alert_date: Date }) | null;
    noteDraft: string;
    setNoteDraft: (val: string) => void;
    handleSaveNote: () => void;
    isSaving: boolean;
}

export const SignalDetailModal = ({
    isOpen,
    onClose,
    signal,
    noteDraft,
    setNoteDraft,
    handleSaveNote,
    isSaving
}: SignalDetailModalProps) => {
    // Prevent scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen || !signal) return null;

    const stateLabel = signal.state.replace('_', ' ');

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '1.5rem',
            }}
            onClick={onClose}
        >
            <div
                className="hero-card animate-fade"
                style={{
                    width: '100%',
                    maxWidth: '800px',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '0',
                    background: 'var(--bg-content)',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    position: 'relative',
                    boxShadow: 'var(--shadow-medium)',
                    borderRadius: '1rem'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header: Consistent with EditCampaignModal */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2rem 2rem 1.5rem 2rem', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center gap-4">
                        <div style={{ width: '4px', height: '24px', background: 'hsl(var(--primary))', borderRadius: '4px' }} />
                        <div className="space-y-0.5 text-left">
                            <div className="flex items-center gap-3">
                                <h2 className="hero-section-title" style={{ fontSize: '1.25rem', marginBottom: 0 }}>
                                    {signal?.expand?.trend_type?.name || "Signal Details"}
                                </h2>
                                <span className="hero-badge" style={{ background: 'var(--accent-glow)', color: 'hsl(var(--primary))' }}>
                                    {stateLabel}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--text-dim)', opacity: 0.8 }}>
                                <MapPin size={12} />
                                <span>{signal?.destinations.map((d: string | Destination) => typeof d === 'string' ? d : (d.name || d.code)).join(', ')}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="hero-btn-ghost"
                        style={{ padding: '0.5rem', borderRadius: '50%' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content Body */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Tabs
                        aria-label="Strategy tabs"
                        color="primary"
                        variant="underlined"
                        classNames={{
                            base: "px-8 pt-4 border-b border-(--border-subtle) bg-(--bg-content)",
                            tabList: "gap-8 w-full relative rounded-none p-0 border-none",
                            cursor: "w-full bg-[hsl(var(--primary))]",
                            tab: "max-w-fit px-0 h-12",
                            tabContent: "font-black text-[10px] uppercase tracking-widest text-(--text-muted) group-data-[selected=true]:text-[hsl(var(--primary))]"
                        }}
                    >
                        <Tab key="overview" title="Information">
                            <div className="h-[450px] overflow-y-auto p-10 space-y-12">
                                <div className="grid grid-cols-2 gap-10">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-(--text-muted)">
                                            <Calendar size={14} />
                                            Market Window
                                        </div>
                                        <p className="text-xl font-black tracking-tight ml-6" style={{ color: 'var(--text-main)' }}>
                                            {signal && `${formatDate(signal.start)} — ${formatDate(signal.end)}`}
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-rose-500">
                                            <TrendingUp size={14} />
                                            Peak Period
                                        </div>
                                        <p className="text-xl font-black text-rose-600 tracking-tight ml-6">
                                            {signal?.peak_start_mmdd ? `${signal.peak_start_mmdd} — ${signal.peak_end_mmdd}` : 'Seasonal Varies'}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-(--text-muted)">
                                            <Info size={14} />
                                            Target Keywords
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="light"
                                            className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--primary))] h-8 px-2"
                                            onPress={() => {
                                                if (signal) {
                                                    const kw = Array.isArray(signal.keywords) ? signal.keywords.join(', ') : '';
                                                    navigator.clipboard.writeText(kw);
                                                }
                                            }}
                                        >
                                            Copy List
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 p-8 rounded-2xl bg-(--bg-main) border border-(--border-subtle) min-h-[160px] content-start shadow-inner">
                                        {Array.isArray(signal?.keywords) && signal?.keywords.length > 0 ? (
                                            signal.keywords.map((kw: string) => (
                                                <span key={kw} className="px-4 py-2 rounded-xl bg-(--bg-content) border border-(--border-subtle) text-[11px] font-bold shadow-sm" style={{ color: 'var(--text-main)' }}>
                                                    {kw}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-sm font-bold italic" style={{ color: 'var(--text-muted)' }}>No targeting keywords specified.</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Tab>

                        <Tab key="strategy" title="Campaign Strategy">
                            <div className="h-[450px] overflow-y-auto p-10">
                                <div className="filter-group">
                                    <label style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>STRATEGY DOCUMENTATION</label>
                                    <Textarea
                                        placeholder="Define targeting rules, creative directions, or optimization tactics..."
                                        minRows={14}
                                        value={noteDraft}
                                        onValueChange={setNoteDraft}
                                        classNames={{
                                            input: "text-base font-medium p-6",
                                            inputWrapper: "border border-(--border-subtle) hover:border-[hsl(var(--primary))] focus-within:!border-[hsl(var(--primary))] transition-all shadow-inner bg-(--bg-main) rounded-2xl"
                                        }}
                                        style={{ color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>
                        </Tab>
                    </Tabs>
                </div>

                {/* Footer */}
                <div style={{ padding: '0 2rem 2rem 2rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                    <Button
                        variant="light"
                        onPress={onClose}
                        className="px-8 font-bold text-sm"
                        style={{ color: 'var(--text-dim)' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        color="primary"
                        className="hero-btn-primary px-10 font-bold text-sm shadow-lg shadow-primary/20 rounded-xl flex items-center gap-2"
                        isLoading={isSaving}
                        onPress={handleSaveNote}
                    >
                        {isSaving ? 'Saving...' : 'Update Strategy'}
                        {!isSaving && <Save size={18} />}
                    </Button>
                </div>
            </div>
        </div>
    );
};
