import { X } from 'lucide-react';
import CampaignForm from './CampaignForm';

interface EditCampaignModalProps {
    campaignId?: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function EditCampaignModal({ campaignId, isOpen, onClose, onSuccess }: EditCampaignModalProps) {
    if (!isOpen) return null;

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
                    padding: '2rem',
                    background: 'var(--bg-content)',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    position: 'relative',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '4px', height: '24px', background: 'hsl(var(--primary))', borderRadius: '4px' }} />
                        <h2 className="hero-section-title" style={{ fontSize: '1.25rem', marginBottom: 0 }}>
                            {campaignId ? 'Edit Tracking Strategy' : 'Create New Campaign'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="hero-btn-ghost"
                        style={{ padding: '0.5rem', borderRadius: '50%' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <CampaignForm
                    campaignId={campaignId}
                    onCancel={onClose}
                    onSuccess={() => {
                        onSuccess?.();
                        onClose();
                    }}
                />
            </div>
        </div>
    );
}
