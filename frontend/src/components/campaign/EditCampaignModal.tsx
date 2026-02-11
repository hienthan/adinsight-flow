import { useState } from 'react';
import { X, Plus, Bell, Activity, ChevronDown, ChevronRight } from 'lucide-react';
import CampaignForm from './CampaignForm';
import AddReminderModal from './AddReminderModal';
import CampaignReminders from './CampaignReminders';
import CampaignHistory from './CampaignHistory';

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
            onClick={onClose}
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
                        {campaignId && (
                            <button
                                onClick={() => setIsReminderModalOpen(true)}
                                className="hero-btn hero-btn-secondary"
                                style={{ padding: '0.45rem 0.75rem', fontSize: 'var(--text-xs)' }}
                            >
                                <Plus size={14} />
                                Reminder
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="hero-btn-ghost"
                            style={{ padding: '0.5rem', borderRadius: '50%' }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <CampaignForm
                    campaignId={campaignId}
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
                                padding: '0.75rem',
                                background: 'var(--bg-overlay)',
                                border: '1px solid var(--border-subtle)',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isRemindersCollapsed ? 0 : '0.55rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsRemindersCollapsed((v) => !v)}
                                    className="hero-btn hero-btn-ghost"
                                    style={{ padding: '0.2rem 0.35rem', gap: '0.35rem', fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--text-dim)' }}
                                >
                                    {isRemindersCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                                    <Bell size={13} style={{ color: 'hsl(var(--primary))' }} />
                                    Reminders
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsReminderModalOpen(true)}
                                    className="hero-btn hero-btn-ghost"
                                    style={{ padding: '0.25rem 0.45rem', fontSize: 'var(--text-xs)' }}
                                >
                                    <Plus size={12} />
                                    Add
                                </button>
                            </div>

                            {!isRemindersCollapsed && (
                                <div style={{ maxHeight: '210px', overflowY: 'auto', paddingRight: '0.15rem' }}>
                                    <CampaignReminders campaignId={campaignId} compact={true} />
                                </div>
                            )}
                        </div>

                        <div
                            className="hero-card"
                            style={{
                                padding: '0.75rem',
                                background: 'var(--bg-overlay)',
                                border: '1px solid var(--border-subtle)',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isAutoLogCollapsed ? 0 : '0.55rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsAutoLogCollapsed((v) => !v)}
                                    className="hero-btn hero-btn-ghost"
                                    style={{ padding: '0.2rem 0.35rem', gap: '0.35rem', fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--text-dim)' }}
                                >
                                    {isAutoLogCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                                    <Activity size={13} style={{ color: 'hsl(var(--primary))' }} />
                                    AutoLog (Latest)
                                </button>
                            </div>

                            {!isAutoLogCollapsed && (
                                <div style={{ maxHeight: '210px', overflowY: 'auto', paddingRight: '0.15rem' }}>
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
        </>
    );
}
