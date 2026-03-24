import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Bell, Activity, ChevronDown, ChevronRight, History, X } from 'lucide-react';
import CampaignForm from './CampaignForm';
import AddReminderModal from './AddReminderModal';
import CampaignReminders from './CampaignReminders';
import CampaignHistory from './CampaignHistory';
import { SafeButton } from '../common/ui/SafeButton';
import { SurfaceCard } from '../common/ui/SurfaceCard';
import { SAFE_BUTTON_SELECTORS, SAFE_CARD_SELECTORS, createSafeInteractionScopeCss } from '../../lib/uiMotion';

interface EditCampaignModalProps {
    campaignId?: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function EditCampaignModal({ campaignId, isOpen, onClose, onSuccess }: EditCampaignModalProps) {
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const [isRemindersCollapsed, setIsRemindersCollapsed] = useState(false);
    const [isAutoLogCollapsed, setIsAutoLogCollapsed] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [isFormSubmitting, setIsFormSubmitting] = useState(false);
    const shouldCloseOnBackdropClickRef = useRef(false);
    const campaignFormId = 'campaign-edit-form';

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                if (!isReminderModalOpen) {
                    onClose();
                } else {
                    setIsReminderModalOpen(false);
                }
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose, isReminderModalOpen]);

    // Prevent background scrolling and pointer bleed when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            // Also prevent pointer events on the body wrapper if necessary, 
            // but usually overflow: hidden is enough to stop scroll-based repaint glitches.
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const modalContent = (
        <>
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(2, 6, 23, 0.76)',
                    /* GPU hack removed */
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1rem',
                }}
                onMouseDown={(e) => {
                    shouldCloseOnBackdropClickRef.current = e.target === e.currentTarget;
                }}
                onClick={(e) => {
                    if (e.target === e.currentTarget && shouldCloseOnBackdropClickRef.current) {
                        onClose();
                    }
                    shouldCloseOnBackdropClickRef.current = false;
                }}
            >
                <div
                    className="campaign-edit-modal-shell hero-card animate-fade modal-layout"
                    style={{
                        width: '100%',
                        maxWidth: '920px',
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '0.65rem',
                        background: [
                            'radial-gradient(circle at top right, rgba(59, 130, 246, 0.14) 0%, transparent 28%)',
                            'radial-gradient(circle at top left, rgba(20, 184, 166, 0.12) 0%, transparent 24%)',
                            'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 94%, var(--bg-main) 6%) 0%, color-mix(in srgb, var(--bg-content) 88%, var(--bg-main) 12%) 100%)',
                        ].join(', '),
                        maxHeight: '90vh',
                        position: 'relative',
                        boxShadow: 'var(--shadow-large)',
                        borderRadius: '2rem',
                        pointerEvents: 'auto', // Ensure clicks hit this layer, not the blurred background
                        /* GPU hack removed */
                        overscrollBehavior: 'contain', // Prevent scroll-bleed to blurred background
                        overflow: 'hidden',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <style>{`
                        ${createSafeInteractionScopeCss('.campaign-edit-modal-shell', [...SAFE_BUTTON_SELECTORS, ...SAFE_CARD_SELECTORS])}
                    `}</style>
                    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.1rem 0.2rem', gap: '0.65rem' }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                Campaign Edit
                            </div>
                            <SafeButton
                                onClick={onClose}
                                className="hero-btn hero-btn-ghost"
                            style={{ padding: '0.34rem', borderRadius: '0.7rem', background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)' }}
                            >
                                <X size={16} />
                            </SafeButton>
                        </div>

                        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 0.1rem 0.1rem 0.1rem' }}>
                            <CampaignForm
                                campaignId={campaignId}
                                formId={campaignFormId}
                                hideActions={true}
                                layoutVariant="modal"
                                onDirtyChange={setIsFormDirty}
                                onSubmittingChange={setIsFormSubmitting}
                                onCancel={onClose}
                                onSuccess={() => {
                                    onSuccess?.();
                                    onClose();
                                }}
                            />

                            {campaignId ? (
                                <div
                                    style={{
                                        marginTop: '0.55rem',
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                        gap: '0.6rem',
                                    }}
                                >
                                    <SurfaceCard
                                        padding="0.55rem"
                                        radius="1.05rem"
                                        style={{
                                            background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.08) 0%, var(--bg-overlay) 100%)',
                                            border: '1px solid rgba(59, 130, 246, 0.14)',
                                        }}
                                    >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isRemindersCollapsed ? 0 : '0.18rem' }}>
                                    <SafeButton
                                        type="button"
                                        onClick={() => setIsRemindersCollapsed((v) => !v)}
                                        className="hero-btn hero-btn-ghost"
                                        style={{ padding: '0.1rem 0.24rem', gap: '0.24rem', fontSize: '0.66rem', fontWeight: 800, color: 'var(--text-dim)' }}
                                    >
                                        {isRemindersCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                                        <Bell size={12} style={{ color: 'hsl(var(--primary))' }} />
                                        Reminders
                                    </SafeButton>
                                    <SafeButton
                                        type="button"
                                        onClick={() => setIsReminderModalOpen(true)}
                                        className="hero-btn hero-btn-ghost"
                                        style={{ padding: '0.22rem 0.42rem', fontSize: '0.66rem', borderRadius: '0.65rem', background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)' }}
                                    >
                                        <Plus size={11} />
                                        Add
                                    </SafeButton>
                                </div>

                                {!isRemindersCollapsed && (
                                    <div style={{ maxHeight: '132px', overflowY: 'auto', paddingRight: '0.05rem' }}>
                                        <CampaignReminders campaignId={campaignId} compact={true} />
                                    </div>
                                )}
                                    </SurfaceCard>

                                    <SurfaceCard
                                        padding="0.55rem"
                                        radius="1.05rem"
                                        style={{
                                            background: 'linear-gradient(180deg, rgba(20, 184, 166, 0.08) 0%, var(--bg-overlay) 100%)',
                                            border: '1px solid rgba(20, 184, 166, 0.14)',
                                        }}
                                    >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isAutoLogCollapsed ? 0 : '0.18rem' }}>
                                    <SafeButton
                                        type="button"
                                        onClick={() => setIsAutoLogCollapsed((v) => !v)}
                                        className="hero-btn hero-btn-ghost"
                                        style={{ padding: '0.1rem 0.24rem', gap: '0.24rem', fontSize: '0.66rem', fontWeight: 800, color: 'var(--text-dim)' }}
                                    >
                                        {isAutoLogCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                                        <Activity size={12} style={{ color: 'hsl(var(--primary))' }} />
                                        AutoLog (Latest)
                                    </SafeButton>
                                    <SafeButton
                                        type="button"
                                        onClick={() => setIsHistoryModalOpen(true)}
                                        className="hero-btn hero-btn-ghost"
                                        title="View Full History"
                                        style={{ padding: '0.22rem 0.46rem', fontSize: '0.66rem', borderRadius: '0.65rem', background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)' }}
                                    >
                                        <History size={12} />
                                    </SafeButton>
                                </div>

                                {!isAutoLogCollapsed && (
                                    <div style={{ maxHeight: '132px', overflowY: 'auto', paddingRight: '0.05rem' }}>
                                        <CampaignHistory campaignId={campaignId} compact={true} limit={5} />
                                    </div>
                                )}
                                    </SurfaceCard>
                                </div>
                            ) : (
                                <SurfaceCard
                                padding="0.8rem 0.9rem"
                                radius="1rem"
                                style={{
                                        marginTop: '0.55rem',
                                        background: 'linear-gradient(180deg, rgba(148, 163, 184, 0.08) 0%, var(--bg-overlay) 100%)',
                                        border: '1px dashed var(--border-subtle)',
                                        fontSize: 'var(--text-xs)',
                                        color: 'var(--text-dim)',
                                    }}
                                >
                                    Save campaign first to add reminders and review autolog history.
                                </SurfaceCard>
                            )}
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '0.65rem 0.85rem 0.2rem 0.85rem',
                                borderTop: '1px solid var(--border-subtle)',
                                background: 'linear-gradient(180deg, transparent 0%, var(--bg-overlay) 100%)',
                            }}
                        >
                            <div>
                                <div style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                    Ready To Save
                                </div>
                                <div style={{ marginTop: '0.14rem', fontSize: '0.76rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                                    {isFormDirty ? 'Changes detected in this strategy.' : 'No unsaved changes detected.'}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <SafeButton
                                    onClick={onClose}
                                    className="hero-btn hero-btn-ghost"
                                    style={{ padding: '0.46rem 0.7rem', fontSize: 'var(--text-xs)' }}
                                >
                                    Cancel
                                </SafeButton>
                                <SafeButton
                                    type="submit"
                                    form={campaignFormId}
                                    disabled={isFormSubmitting || (!!campaignId && !isFormDirty)}
                                    className="hero-btn hero-btn-primary"
                                    style={{ padding: '0.5rem 0.9rem', fontSize: 'var(--text-xs)' }}
                                >
                                    {isFormSubmitting ? 'Saving...' : (campaignId ? 'Update' : 'Create')}
                                </SafeButton>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {campaignId && (
                <AddReminderModal
                    campaignId={campaignId}
                    isOpen={isReminderModalOpen}
                    onClose={() => setIsReminderModalOpen(false)}
                />
            )}

            {/* Sub-modal for Full History */}
            {campaignId && isHistoryModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                    background: 'rgba(2, 6, 23, 0.84)',
                        /* GPU hack removed */
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1100, // Higher than main modal
                        padding: '2rem',
                    }}
                    onClick={() => setIsHistoryModalOpen(false)}
                >
                    <div
                        className="hero-card animate-fade modal-layout"
                        style={{
                            width: '100%',
                            maxWidth: '900px',
                            maxHeight: '85vh',
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '1.5rem',
                            background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 94%, var(--bg-main) 6%) 0%, color-mix(in srgb, var(--bg-content) 88%, var(--bg-main) 12%) 100%)',
                            position: 'relative',
                            boxShadow: 'var(--shadow-large)',
                            borderRadius: '2rem',
                            overflow: 'hidden',
                            pointerEvents: 'auto',
                            /* GPU hack removed */
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '4px', height: '20px', background: 'hsl(var(--primary))', borderRadius: '4px' }} />
                                <h3 className="hero-section-title" style={{ fontSize: '1.1rem', marginBottom: 0 }}>Full AutoLog History</h3>
                            </div>
                            <button
                                onClick={() => setIsHistoryModalOpen(false)}
                                className="hero-btn hero-btn-ghost"
                                style={{ padding: '0.4rem' }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
                            <CampaignHistory campaignId={campaignId} compact={false} />
                        </div>
                    </div>
                </div>
            )}
        </>
    );

    return createPortal(modalContent, document.body);
}
