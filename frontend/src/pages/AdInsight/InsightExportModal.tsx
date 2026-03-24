import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, X } from 'lucide-react';
import { SafeButton, SectionHeader, SurfaceCard, createAmbientSurface, createPremiumBadgeStyle } from '../../components/common/ui';
import { SAFE_INTERACTIVE_TRANSITION } from '../../lib/uiMotion';

interface ExportField {
    id: string;
    label: string;
    desc: string;
}

interface InsightExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (selectedFields: string[], fileName: string, customLabel?: string) => void;
    fields: ExportField[];
    totalCount: number;
    isExporting: boolean;
    secondaryActionLabel?: string;
    onSecondaryAction?: () => void;
    isSecondaryActionLoading?: boolean;
}

export const InsightExportModal: React.FC<InsightExportModalProps> = ({
    isOpen,
    onClose,
    onExport,
    fields,
    totalCount,
    isExporting,
    secondaryActionLabel,
    onSecondaryAction,
    isSecondaryActionLoading = false,
}) => {
    const [selectedFields, setSelectedFields] = useState<string[]>([]);
    const [fileName, setFileName] = useState('');
    const [customLabel, setCustomLabel] = useState('');
    const [hasInitialized, setHasInitialized] = useState(false);

    const toggleField = (id: string) => {
        setSelectedFields(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    };

    useEffect(() => {
        if (!hasInitialized && fields.length > 0) {
            const defaultsToExclude = ['province', 'city', 'content_type', 'title_en', 'translated_title_vi'];
            setSelectedFields(fields.filter(f => !defaultsToExclude.includes(f.id)).map(f => f.id));
            setHasInitialized(true);
        }

        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [fields, hasInitialized, isOpen, onClose]);

    if (!isOpen) return null;

    const modalContent = (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(2, 6, 23, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem',
            animation: 'fade-in 0.2s ease-out'
        }} onClick={onClose}>
            <SurfaceCard
                style={{
                    width: '100%',
                    maxWidth: '560px',
                    borderRadius: '24px',
                    boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.4)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '85vh',
                    position: 'relative',
                    pointerEvents: 'auto',
                    ...createAmbientSurface('#3b82f6', 0.9),
                    /* GPU hack removed */
                }}
                onClick={(e) => e.stopPropagation()}
                padding={0}
                radius="24px"
            >
                {/* Modal Header */}
                <div style={{
                    padding: '1.75rem 2rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: 'transparent'
                }}>
                    <div className="hero-badge" style={{ marginBottom: '0.7rem', ...createPremiumBadgeStyle('#3b82f6', { textColor: '#93c5fd' }) }}>
                        Export Builder
                    </div>
                    <SectionHeader
                        title={
                            <div>
                                <h4 style={{ fontSize: '1.35rem', fontWeight: 850, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
                                    Export Configuration
                                </h4>
                                <p style={{ fontSize: '0.88rem', color: 'var(--text-dim)', margin: '0.35rem 0 0 0', lineHeight: 1.55 }}>
                                    Build a clean CSV label recipe for {totalCount.toLocaleString()} matching records.
                                </p>
                            </div>
                        }
                        actions={
                            <SafeButton
                                onClick={onClose}
                                style={{
                                    background: 'var(--bg-overlay)',
                                    border: '1px solid var(--border-subtle)',
                                    color: 'var(--text-main)',
                                    width: '38px',
                                    height: '38px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '12px',
                                }}
                            >
                                <X size={20} />
                            </SafeButton>
                        }
                        style={{ marginBottom: 0 }}
                    />
                </div>

                {/* Filename Input */}
                <div style={{ padding: '1.5rem 2rem 0 2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                        Filename (Optional)
                    </label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Enter custom filename..."
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                borderRadius: '12px',
                                border: '1px solid var(--border-subtle)',
                                background: 'var(--bg-content)',
                                fontSize: '0.9rem',
                                color: 'var(--text-main)',
                                outline: 'none'
                            }}
                        />
                        <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: 'var(--text-dim)', pointerEvents: 'none' }}>
                            .csv
                        </span>
                    </div>
                </div>

                {/* Modal Body */}
                <div style={{ padding: '0 2rem 2rem 2rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Custom Label Text */}
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                            <span>Custom Suffix (Optional)</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Enter additional text (e.g. tier1-event)"
                            value={customLabel}
                            onChange={(e) => setCustomLabel(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.85rem 1rem',
                                borderRadius: '12px',
                                border: '1px solid var(--border-subtle)',
                                background: 'var(--bg-content)',
                                fontSize: '0.95rem',
                                color: 'var(--text-main)',
                                outline: 'none',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                            }}
                        />
                        <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                            This text will be appended to the end of your dynamic labels.
                        </p>
                    </div>

                    {/* Dynamic Fields */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                            Dynamic Fields
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {fields.map(field => (
                                <label
                                    key={field.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        cursor: 'pointer',
                                        padding: '0.75rem 1rem',
                                        borderRadius: '14px',
                                        border: '1px solid var(--border-subtle)',
                                        background: selectedFields.includes(field.id)
                                            ? 'linear-gradient(180deg, rgba(59, 130, 246, 0.08) 0%, var(--bg-content) 100%)'
                                            : 'linear-gradient(180deg, var(--bg-content) 0%, color-mix(in srgb, var(--bg-content) 92%, var(--bg-main) 8%) 100%)',
                                        transition: SAFE_INTERACTIVE_TRANSITION
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedFields.includes(field.id)}
                                        onChange={() => toggleField(field.id)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'hsl(var(--primary))' }}
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{field.label}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{field.desc}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div style={{
                    padding: '1.5rem 2rem',
                    borderTop: '1px solid var(--border-subtle)',
                    background: 'linear-gradient(180deg, transparent 0%, var(--bg-overlay) 100%)',
                    display: 'flex',
                    gap: '1rem'
                }}>
                    <SafeButton
                        onClick={onClose}
                        className="hero-btn hero-btn-secondary"
                        style={{ flex: 1, padding: '0.85rem' }}
                    >
                        Cancel
                    </SafeButton>
                    {secondaryActionLabel && onSecondaryAction ? (
                        <SafeButton
                            onClick={onSecondaryAction}
                            disabled={isSecondaryActionLoading || totalCount === 0}
                            className="hero-btn hero-btn-secondary"
                            style={{ flex: 1.2, padding: '0.85rem' }}
                        >
                            {isSecondaryActionLoading ? 'Copying...' : secondaryActionLabel}
                        </SafeButton>
                    ) : null}
                    <SafeButton
                        onClick={() => onExport(selectedFields, fileName, customLabel)}
                        disabled={isExporting || (selectedFields.length === 0 && !customLabel.trim())}
                        className="hero-btn hero-btn-primary"
                        style={{ flex: secondaryActionLabel && onSecondaryAction ? 1.8 : 2, padding: '0.85rem', gap: '0.6rem' }}
                    >
                        {isExporting ? 'Exporting...' : (
                            <>
                                <Download size={18} />
                                <span>Export {totalCount.toLocaleString()} Records</span>
                            </>
                        )}
                    </SafeButton>
                </div>
            </SurfaceCard>
        </div>
    );

    return createPortal(modalContent, document.body);
};
