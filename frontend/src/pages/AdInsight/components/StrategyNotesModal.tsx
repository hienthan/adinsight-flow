import React from "react";
import { 
    Modal, 
    ModalContent, 
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button, 
    Textarea
} from "@heroui/react";
import { Info } from "lucide-react";

interface StrategyNotesModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    selectedSignal: {
        id: string;
        name: string;
        destLabel: string;
        notes?: string;
    } | null;
    draftNotes: string;
    setDraftNotes: (notes: string) => void;
    handleSaveNotes: () => Promise<void>;
    isSavingNotes: boolean;
}

export const StrategyNotesModal: React.FC<StrategyNotesModalProps> = ({
    isOpen,
    onOpenChange,
    selectedSignal,
    draftNotes,
    setDraftNotes,
    handleSaveNotes,
    isSavingNotes,
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            size="2xl"
            placement="center"
            scrollBehavior="inside"
            backdrop="blur"
            disableAnimation={false}
            classNames={{
                wrapper: "items-center justify-center p-4",
                base: "bg-(--bg-content) border border-(--border-subtle) shadow-2xl rounded-[24px] overflow-hidden max-h-[95vh]",
                closeButton: "top-8 right-8 text-(--text-muted) hover:text-(--text-main) transition-colors p-2 hover:bg-(--bg-overlay) rounded-full z-50",
                backdrop: "bg-black/30 backdrop-blur-md",
            }}
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader style={{ padding: "20px 20px 10px 20px" }} className="flex flex-col gap-1">
                            <div className="flex items-start gap-6">
                                <div className="w-[6px] h-[42px] bg-blue-600 rounded-full mt-1 shrink-0" />
                                <div className="flex flex-col gap-1">
                                    <h4 className="text-[1.65rem] font-bold tracking-tight text-(--text-main) leading-tight">
                                        Update Strategy Notes
                                    </h4>
                                    <div className="flex items-center gap-2 text-[0.95rem] font-semibold text-(--text-dim) opacity-70">
                                        <span>{selectedSignal?.name}</span>
                                        <span className="opacity-40">·</span>
                                        <span>{selectedSignal?.destLabel}</span>
                                    </div>
                                </div>
                            </div>
                        </ModalHeader>

                        <ModalBody style={{ padding: "0px 20px 10px 20px" }} className="overflow-y-auto">
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.25em] text-(--text-muted) block pl-1 opacity-80">
                                        Internal Documentation
                                    </label>
                                    <Textarea
                                        value={draftNotes}
                                        onValueChange={setDraftNotes}
                                        minRows={10}
                                        variant="bordered"
                                        radius="lg"
                                        disableAutosize
                                        classNames={{
                                            base: "w-full",
                                            inputWrapper: [
                                                "bg-(--bg-main)/40",
                                                "border border-(--border-subtle)",
                                                "shadow-none",
                                                "rounded-2xl",
                                                "!px-8",
                                                "!py-6",
                                                "hover:border-primary/50",
                                                "focus-within:!border-primary/70",
                                                "transition-all duration-300",
                                            ].join(" "),
                                            input: "text-[15px] leading-relaxed font-medium text-(--text-main) placeholder:text-(--text-muted)/40"
                                        }}
                                        placeholder="Outline targeting rules, content angles, or specific campaign adjustments for this trend..."
                                        style={{ minHeight: "340px" }}
                                    />
                                </div>

                                <div className="p-5 rounded-[14px] border border-primary/10 bg-primary/[0.03] flex items-start gap-4">
                                    <div className="mt-1 text-primary/60 shrink-0">
                                        <Info size={22} />
                                    </div>
                                    <p className="text-[13px] font-semibold leading-relaxed text-primary/70">
                                        Strategic insights are shared across all regional ad accounts. Keep documentation concise, actionable, and updated for all teams involved.
                                    </p>
                                </div>
                            </div>
                        </ModalBody>

                        <ModalFooter style={{ padding: "12px 20px 16px 20px" }} className="flex items-center justify-between border-t border-(--border-subtle)/50 bg-(--bg-overlay)/5">
                            <div className="flex flex-col gap-1">
                                <p className="text-[10px] font-black text-(--text-muted) uppercase tracking-widest opacity-60">
                                    Status: Local Draft
                                </p>
                                <p className="text-[10px] font-bold text-(--text-muted) uppercase tracking-tighter opacity-40">
                                    {new Date().toLocaleDateString('en-GB')} · {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                            <div className="flex items-center gap-5">
                                <Button
                                    variant="light"
                                    onPress={onClose}
                                    className="px-8 font-bold text-sm h-14 rounded-xl text-(--text-dim) hover:bg-(--bg-overlay) transition-all"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    color="primary"
                                    onPress={async () => {
                                        await handleSaveNotes();
                                        onClose();
                                    }}
                                    isLoading={isSavingNotes}
                                    isDisabled={selectedSignal?.notes === draftNotes}
                                    className="px-10 h-12 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-black text-[11px] uppercase tracking-[0.12em] transition-all"
                                >
                                    {isSavingNotes ? 'Saving...' : 'Update'}
                                </Button>
                            </div>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};
