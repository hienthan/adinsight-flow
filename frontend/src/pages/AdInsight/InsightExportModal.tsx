import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, X } from 'lucide-react';

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
}

export const InsightExportModal: React.FC<InsightExportModalProps> = ({
    isOpen,
    onClose,
    onExport,
    fields,
    totalCount,
    isExporting
}) => {
    const [selectedFields, setSelectedFields] = useState<string[]>(['country', 'city', 'tier', 'funnel_stage', 'sub_tag']);
    const [fileName, setFileName] = useState('');
    const [customLabel, setCustomLabel] = useState('');

    const toggleField = (id: string) => {
        setSelectedFields(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    };

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const modalContent = (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.65)',
            transform: 'translateZ(0)', // GPU Composite fix
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem',
            animation: 'fade-in 0.2s ease-out'
        }} onClick={onClose}>
            <div
                style={{
                    width: '100%',
                    maxWidth: '500px',
                    background: 'var(--bg-card)',
                    borderRadius: '24px',
                    boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.4)',
                    border: '1px solid var(--border-subtle)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '85vh',
                    position: 'relative',
                    pointerEvents: 'auto',
                    transform: 'translateZ(0)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div style={{
                    padding: '1.75rem 2rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--bg-main)'
                }}>
                    <div>
                        <h4 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'hsl(var(--primary))', letterSpacing: '-0.02em' }}>
                            Export Configuration
                        </h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', margin: '0.25rem 0 0 0' }}>
                            Choose how to build the 'Custom Label' column
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'var(--bg-overlay)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '10px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <X size={20} />
                    </button>
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
                                        borderRadius: '12px',
                                        border: '1px solid var(--border-subtle)',
                                        background: 'var(--bg-content)',
                                        transition: 'all 0.2s'
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
                    background: 'var(--bg-main)',
                    display: 'flex',
                    gap: '1rem'
                }}>
                    <button
                        onClick={onClose}
                        className="hero-btn hero-btn-secondary"
                        style={{ flex: 1, padding: '0.85rem' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onExport(selectedFields, fileName, customLabel)}
                        disabled={isExporting || (selectedFields.length === 0 && !customLabel.trim())}
                        className="hero-btn hero-btn-primary"
                        style={{ flex: 2, padding: '0.85rem', gap: '0.6rem' }}
                    >
                        {isExporting ? 'Exporting...' : (
                            <>
                                <Download size={18} />
                                <span>Export {totalCount.toLocaleString()} Records</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
