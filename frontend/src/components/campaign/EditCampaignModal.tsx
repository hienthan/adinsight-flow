import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Bell, Activity, ChevronDown, ChevronRight, Edit2 } from 'lucide-react';
import CampaignForm from './CampaignForm';
import AddReminderModal from './AddReminderModal';
import CampaignReminders from './CampaignReminders';
import CampaignHistory from './CampaignHistory';
import { pb } from '../../lib/pocketbase';
import { Campaign, CampaignPlatform } from '../../types/campaign';
import RichTextEditor from '../common/RichTextEditor';
import { normalizeHtmlForCompare, sanitizeNoteHtml } from '../../lib/noteHtml';

interface EditCampaignModalProps {
    campaignId?: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function EditCampaignModal({ campaignId, isOpen, onClose, onSuccess }: EditCampaignModalProps) {
    const queryClient = useQueryClient();
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const [isRemindersCollapsed, setIsRemindersCollapsed] = useState(false);
    const [isAutoLogCollapsed, setIsAutoLogCollapsed] = useState(false);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [isFormSubmitting, setIsFormSubmitting] = useState(false);
    const [isPlatformNotesModalOpen, setIsPlatformNotesModalOpen] = useState(false);
    const [platformNotesDraft, setPlatformNotesDraft] = useState('');
    const [platformNotesSaving, setPlatformNotesSaving] = useState(false);
    const [platformNotesError, setPlatformNotesError] = useState<string | null>(null);
    const shouldCloseOnBackdropClickRef = useRef(false);
    const campaignFormId = 'campaign-edit-form';

    const { data: campaign } = useQuery<Campaign>({
        queryKey: ['campaign', campaignId],
        queryFn: async () => {
            if (!campaignId) return null as any;
            return await pb.collection('campaigns').getOne<Campaign>(campaignId);
        },
        enabled: !!campaignId && isOpen,
    });

    const platformId = campaign?.platform;

    const { data: campaignPlatform } = useQuery<CampaignPlatform>({
        queryKey: ['campaign-platform', platformId],
        queryFn: async () => {
            if (!platformId) return null as any;
            return await pb.collection('campaign_platforms').getOne<CampaignPlatform>(platformId);
        },
        enabled: !!platformId && isOpen,
    });

    useEffect(() => {
        if (isPlatformNotesModalOpen) {
            setPlatformNotesDraft(campaignPlatform?.metadata || '');
            setPlatformNotesError(null);
        }
    }, [isPlatformNotesModalOpen, campaignPlatform?.metadata]);

    const platformNotesDirty = normalizeHtmlForCompare(platformNotesDraft || '') !== normalizeHtmlForCompare(campaignPlatform?.metadata || '');

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                // If sub-modal is open, don't close the main modal
                if (!isPlatformNotesModalOpen && !isReminderModalOpen) {
                    onClose();
                } else if (isPlatformNotesModalOpen) {
                    setIsPlatformNotesModalOpen(false);
                } else if (isReminderModalOpen) {
                    setIsReminderModalOpen(false);
                }
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose, isPlatformNotesModalOpen, isReminderModalOpen]);

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
                    className="hero-card animate-fade"
                    style={{
                        width: '100%',
                        maxWidth: '800px',
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '2rem',
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
                                marginTop: '1rem',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                gap: '0.75rem',
                            }}
                        >
                            <div
                                className="hero-card"
                                style={{
                                    gridColumn: '1 / -1',
                                    padding: '0.6rem',
                                    background: 'var(--bg-overlay)',
                                    border: '1px solid var(--border-subtle)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                                        Campaign Platform Notes
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setIsPlatformNotesModalOpen(true)}
                                        className="hero-btn hero-btn-ghost"
                                        style={{ padding: '0.2rem 0.4rem', fontSize: '0.72rem' }}
                                    >
                                        <Edit2 size={12} />
                                        Edit
                                    </button>
                                </div>
                                <div
                                    style={{
                                        background: 'var(--bg-content)',
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: '10px',
                                        padding: '0.65rem 0.75rem',
                                        color: 'var(--text-dim)',
                                        fontSize: 'var(--text-xs)',
                                        lineHeight: 1.5,
                                        minHeight: '42px',
                                        maxHeight: '84px',
                                        overflowY: 'auto',
                                    }}
                                >
                                    {campaignPlatform?.metadata ? (
                                        <div
                                            style={{ color: 'var(--text-dim)' }}
                                            dangerouslySetInnerHTML={{ __html: sanitizeNoteHtml(campaignPlatform.metadata) }}
                                        />
                                    ) : (
                                        'No platform notes yet.'
                                    )}
                                </div>
                            </div>

                            <div
                                className="hero-card"
                                style={{
                                    padding: '0.55rem',
                                    background: 'var(--bg-overlay)',
                                    border: '1px solid var(--border-subtle)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isRemindersCollapsed ? 0 : '0.35rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setIsRemindersCollapsed((v) => !v)}
                                        className="hero-btn hero-btn-ghost"
                                        style={{ padding: '0.15rem 0.3rem', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-dim)' }}
                                    >
                                        {isRemindersCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                                        <Bell size={13} style={{ color: 'hsl(var(--primary))' }} />
                                        Reminders
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsReminderModalOpen(true)}
                                        className="hero-btn hero-btn-ghost"
                                        style={{ padding: '0.15rem 0.35rem', fontSize: '0.72rem' }}
                                    >
                                        <Plus size={12} />
                                        Add
                                    </button>
                                </div>

                                {!isRemindersCollapsed && (
                                    <div style={{ maxHeight: '120px', overflowY: 'auto', paddingRight: '0.1rem' }}>
                                        <CampaignReminders campaignId={campaignId} compact={true} />
                                    </div>
                                )}
                            </div>

                            <div
                                className="hero-card"
                                style={{
                                    padding: '0.55rem',
                                    background: 'var(--bg-overlay)',
                                    border: '1px solid var(--border-subtle)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isAutoLogCollapsed ? 0 : '0.35rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setIsAutoLogCollapsed((v) => !v)}
                                        className="hero-btn hero-btn-ghost"
                                        style={{ padding: '0.15rem 0.3rem', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-dim)' }}
                                    >
                                        {isAutoLogCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                                        <Activity size={13} style={{ color: 'hsl(var(--primary))' }} />
                                        AutoLog (Latest)
                                    </button>
                                </div>

                                {!isAutoLogCollapsed && (
                                    <div style={{ maxHeight: '120px', overflowY: 'auto', paddingRight: '0.1rem' }}>
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

            {isPlatformNotesModalOpen && (
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
                        zIndex: 1200,
                        padding: '1.5rem',
                    }}
                    onMouseDown={(e) => {
                        shouldCloseOnBackdropClickRef.current = e.target === e.currentTarget;
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget && shouldCloseOnBackdropClickRef.current) {
                            setIsPlatformNotesModalOpen(false);
                        }
                        shouldCloseOnBackdropClickRef.current = false;
                    }}
                >
                    <div
                        className="hero-card animate-fade"
                        style={{
                            width: '100%',
                            maxWidth: '700px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            padding: '1.25rem',
                            background: 'var(--bg-content)',
                            border: '1px solid var(--border-subtle)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <h3 className="hero-section-title" style={{ marginBottom: 0, fontSize: '1rem' }}>
                                    Edit Platform Notes
                                </h3>
                                <p style={{ margin: '0.2rem 0 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>
                                    {campaignPlatform?.display_name || 'Current platform'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPlatformNotesModalOpen(false)}
                                className="hero-btn hero-btn-ghost"
                                style={{ padding: '0.35rem', borderRadius: '50%' }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {platformNotesError && (
                            <div
                                style={{
                                    border: '1px solid hsla(3 85% 45% / 0.4)',
                                    background: 'hsla(3 85% 58% / 0.1)',
                                    color: 'hsl(3 85% 40%)',
                                    borderRadius: '10px',
                                    padding: '0.6rem 0.75rem',
                                    fontSize: 'var(--text-xs)',
                                    fontWeight: 700,
                                }}
                            >
                                {platformNotesError}
                            </div>
                        )}

                        <div className="filter-group">
                            <label>Platform Notes</label>
                            <RichTextEditor
                                value={platformNotesDraft}
                                onChange={setPlatformNotesDraft}
                                placeholder="Enter governance notes, constraints, and campaign guidance..."
                                minHeight={220}
                                maxHeight={420}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button
                                type="button"
                                onClick={() => setIsPlatformNotesModalOpen(false)}
                                className="hero-btn hero-btn-ghost"
                                disabled={platformNotesSaving}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={platformNotesSaving || !campaignPlatform || !platformNotesDirty}
                                className="hero-btn hero-btn-primary"
                                onClick={async () => {
                                    if (!campaignPlatform?.id) return;
                                    try {
                                        setPlatformNotesSaving(true);
                                        setPlatformNotesError(null);
                                        await pb.collection('campaign_platforms').update(campaignPlatform.id, {
                                            metadata: platformNotesDraft,
                                        });
                                        queryClient.invalidateQueries({ queryKey: ['campaign-platform', campaignPlatform.id] });
                                        queryClient.invalidateQueries({ queryKey: ['platforms'] });
                                        setIsPlatformNotesModalOpen(false);
                                    } catch (error: any) {
                                        setPlatformNotesError(error?.message || 'Failed to update platform notes');
                                    } finally {
                                        setPlatformNotesSaving(false);
                                    }
                                }}
                            >
                                {platformNotesSaving ? 'Saving...' : 'Update Notes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
