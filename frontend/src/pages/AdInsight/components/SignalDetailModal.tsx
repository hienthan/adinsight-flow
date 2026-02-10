import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Tabs, Tab, Button, Textarea } from "@heroui/react";
import { MapPin, Calendar, TrendingUp, Info, Save } from "lucide-react";
import { TrendSignal, SignalState, Destination } from "../types";
import { formatDate } from "../utils";

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
    if (!signal) return null;

    const stateLabel = signal.state.replace('_', ' ');

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="3xl"
            backdrop="blur"
            classNames={{
                base: "bg-white border border-slate-200 shadow-2xl rounded-[20px] overflow-hidden",
                header: "p-8 pb-0",
                footer: "px-8 py-6 pt-2",
                body: "p-0",
                closeButton: "top-8 right-8 text-slate-400 hover:text-slate-600 transition-colors"
            }}
        >
            <ModalContent>
                {() => (
                    <>
                        <ModalHeader className="flex items-center gap-4">
                            <div style={{ width: '4px', height: '24px', background: 'hsl(var(--primary))', borderRadius: '4px' }} />
                            <div className="space-y-0.5 text-left">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                                        {signal?.expand?.trend_type?.name || "Signal Details"}
                                    </h2>
                                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stateLabel}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 opacity-60">
                                    <MapPin size={12} />
                                    <span>{signal?.destinations.map((d: string | Destination) => typeof d === 'string' ? d : (d.name || d.code)).join(', ')}</span>
                                </div>
                            </div>
                        </ModalHeader>

                        <ModalBody>
                            <Tabs
                                aria-label="Strategy tabs"
                                color="primary"
                                variant="underlined"
                                classNames={{
                                    base: "px-8 pt-4 border-b border-slate-100 bg-white",
                                    tabList: "gap-8 w-full relative rounded-none p-0 border-none",
                                    cursor: "w-full bg-[hsl(var(--primary))]",
                                    tab: "max-w-fit px-0 h-12",
                                    tabContent: "font-black text-[11px] uppercase tracking-wider text-slate-400 group-data-[selected=true]:text-[hsl(var(--primary))]"
                                }}
                            >
                                <Tab
                                    key="overview"
                                    title="Information"
                                >
                                    <div className="h-[450px] overflow-y-auto p-10 space-y-12">
                                        <div className="grid grid-cols-2 gap-10">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    <Calendar size={14} />
                                                    Market Window
                                                </div>
                                                <p className="text-xl font-black text-slate-900 tracking-tight ml-6">
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
                                                <div className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
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
                                            <div className="flex flex-wrap gap-2 p-8 rounded-2xl bg-slate-50 border border-slate-100 min-h-[160px] content-start shadow-inner">
                                                {Array.isArray(signal?.keywords) && signal?.keywords.length > 0 ? (
                                                    signal.keywords.map((kw: string) => (
                                                        <span key={kw} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-[11px] font-bold text-slate-700 shadow-sm">
                                                            {kw}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-sm font-bold text-slate-400 italic">No targeting keywords specified.</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Tab>

                                <Tab
                                    key="strategy"
                                    title="Campaign Strategy"
                                >
                                    <div className="h-[450px] overflow-y-auto p-10">
                                        <Textarea
                                            label="STRATEGY DOCUMENTATION"
                                            labelPlacement="outside"
                                            placeholder="Define targeting rules, creative directions, or optimization tactics..."
                                            minRows={14}
                                            value={noteDraft}
                                            onValueChange={setNoteDraft}
                                            classNames={{
                                                label: "text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4",
                                                input: "text-base font-medium text-slate-700 p-6",
                                                inputWrapper: "border border-slate-200 hover:border-blue-400 focus-within:border-primary transition-all shadow-inner bg-slate-50/30 rounded-2xl"
                                            }}
                                        />
                                    </div>
                                </Tab>
                            </Tabs>
                        </ModalBody>

                        <ModalFooter className="flex justify-end gap-3">
                            <Button
                                variant="light"
                                onPress={onClose}
                                className="px-8 font-bold text-sm text-slate-500"
                            >
                                Cancel
                            </Button>
                            <Button
                                color="primary"
                                className="px-10 font-bold text-sm bg-primary text-white shadow-lg shadow-primary/20 rounded-xl flex items-center gap-2"
                                isLoading={isSaving}
                                onPress={handleSaveNote}
                            >
                                {isSaving ? 'Saving...' : 'Update Strategy'}
                                {!isSaving && <Save size={18} />}
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};
