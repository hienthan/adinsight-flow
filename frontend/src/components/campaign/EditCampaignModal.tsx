import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Bell, Activity, ChevronDown, ChevronRight, History, X } from 'lucide-react';
import CampaignForm from './CampaignForm';
import AddReminderModal from './AddReminderModal';
import CampaignReminders from './CampaignReminders';
import CampaignHistory from './CampaignHistory';
import { pb } from '../../lib/pocketbase';
import { Campaign } from '../../types/campaign';

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

    useQuery<Campaign>({
        queryKey: ['campaign', campaignId],
        queryFn: async () => {
            if (!campaignId) return null as any;
            return await pb.collection('campaigns').getOne<Campaign>(campaignId);
        },
        enabled: !!campaignId && isOpen,
    });

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

    if (!isOpen) return null;

    return (
        <>
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
                    className="hero-card animate-fade modal-layout"
                    style={{
                        width: '100%',
                        maxWidth: '800px',
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '1.5rem',
                        background: 'var(--bg-content)',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        position: 'relative',
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: campaignId ? '1.25rem' : '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '4px', height: '24px', background: 'hsl(var(--primary))', borderRadius: '4px' }} />
                            <h2 className="hero-section-title" style={{ fontSize: '1.25rem', marginBottom: 0 }}>
                                {campaignId ? 'Edit Tracking Strategy' : 'Create New Campaign'}
                            </h2>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                                onClick={onClose}
                                className="hero-btn hero-btn-ghost"
                                style={{ padding: '0.45rem 0.75rem', fontSize: 'var(--text-xs)' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form={campaignFormId}
                                disabled={isFormSubmitting || (!!campaignId && !isFormDirty)}
                                className="hero-btn hero-btn-primary"
                                style={{ padding: '0.45rem 0.85rem', fontSize: 'var(--text-xs)' }}
                            >
                                {isFormSubmitting ? 'Saving...' : (campaignId ? 'Update' : 'Create')}
                            </button>
                        </div>
                    </div>

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
                                marginTop: '0.75rem',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                gap: '0.65rem',
                            }}
                        >
                            <div
                                className="hero-card"
                                style={{
                                    padding: '0.45rem',
                                    background: 'var(--bg-overlay)',
                                    border: '1px solid var(--border-subtle)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isRemindersCollapsed ? 0 : '0.25rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setIsRemindersCollapsed((v) => !v)}
                                        className="hero-btn hero-btn-ghost"
                                        style={{ padding: '0.15rem 0.3rem', gap: '0.3rem', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-dim)' }}
                                    >
                                        {isRemindersCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                                        <Bell size={13} style={{ color: 'hsl(var(--primary))' }} />
                                        Reminders
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsReminderModalOpen(true)}
                                        className="hero-btn hero-btn-ghost"
                                        style={{ padding: '0.15rem 0.35rem', fontSize: '0.7rem' }}
                                    >
                                        <Plus size={12} />
                                        Add
                                    </button>
                                </div>

                                {!isRemindersCollapsed && (
                                    <div style={{ maxHeight: '160px', overflowY: 'auto', paddingRight: '0.1rem' }}>
                                        <CampaignReminders campaignId={campaignId} compact={true} />
                                    </div>
                                )}
                            </div>

                            <div
                                className="hero-card"
                                style={{
                                    padding: '0.45rem',
                                    background: 'var(--bg-overlay)',
                                    border: '1px solid var(--border-subtle)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isAutoLogCollapsed ? 0 : '0.25rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setIsAutoLogCollapsed((v) => !v)}
                                        className="hero-btn hero-btn-ghost"
                                        style={{ padding: '0.15rem 0.3rem', gap: '0.3rem', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-dim)' }}
                                    >
                                        {isAutoLogCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                                        <Activity size={13} style={{ color: 'hsl(var(--primary))' }} />
                                        AutoLog (Latest)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsHistoryModalOpen(true)}
                                        className="hero-btn hero-btn-ghost"
                                        title="View Full History"
                                        style={{ padding: '0.15rem 0.35rem', fontSize: '0.7rem' }}
                                    >
                                        <History size={13} />
                                    </button>
                                </div>

                                {!isAutoLogCollapsed && (
                                    <div style={{ maxHeight: '160px', overflowY: 'auto', paddingRight: '0.1rem' }}>
                                        <CampaignHistory campaignId={campaignId} compact={true} limit={5} />
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div
                            className="hero-card"
                            style={{
                                marginTop: '1.5rem',
                                padding: '0.85rem 1rem',
                                background: 'var(--bg-overlay)',
                                border: '1px dashed var(--border-subtle)',
                                fontSize: 'var(--text-xs)',
                                color: 'var(--text-dim)',
                            }}
                        >
                            Save campaign first to add reminders.
                        </div>
                    )}
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
                        background: 'rgba(0, 0, 0, 0.4)',
                        backdropFilter: 'blur(10px)',
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
                            background: 'var(--bg-content)',
                            position: 'relative',
                            boxShadow: 'var(--shadow-2xl)',
                            overflow: 'hidden'
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
}
