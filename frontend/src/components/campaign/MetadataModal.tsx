import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save } from 'lucide-react';
import RichTextEditor from '../common/RichTextEditor';
import { pb } from '../../lib/pocketbase';
import { useQueryClient } from '@tanstack/react-query';

interface MetadataModalProps {
    isOpen: boolean;
    onClose: () => void;
    campaignId?: string;
    initialContent?: string;
    onSave?: (newContent: string) => void;
    title?: string;
}

export default function MetadataModal({
    isOpen,
    onClose,
    campaignId,
    initialContent = '',
    onSave,
    title = 'Campaign Metadata'
}: MetadataModalProps) {
    const [content, setContent] = useState(initialContent);
    const [isSaving, setIsSaving] = useState(false);
    const queryClient = useQueryClient();

    useEffect(() => {
        if (isOpen) {
            setContent(initialContent || '');
        }
    }, [isOpen, initialContent]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (campaignId && !onSave) {
                // Save directly to DB if we only have campaignId
                await pb.collection('campaigns').update(campaignId, {
                    metadata: content
                });
                queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
                queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            }
            if (onSave) {
                onSave(content);
            }
            onClose();
        } catch (error) {
            console.error('Failed to save metadata:', error);
            alert('Failed to save metadata');
        } finally {
            setIsSaving(false);
        }
    };

    const modalContent = (
        <div
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2000,
                padding: '0.25rem'
            }}
            onClick={onClose}
        >
            <div
                className="hero-card animate-fade"
                style={{
                    width: '100%',
                    maxWidth: '800px',
                    height: '50vh',
                    minHeight: '350px',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--bg-content)',
                    padding: '0.5rem 0.75rem',
                    boxShadow: 'var(--shadow-2xl)'
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <h3 className="hero-section-title" style={{ marginBottom: 0, fontSize: '0.9rem' }}>{title}</h3>
                    <button onClick={onClose} className="hero-btn hero-btn-ghost" style={{ padding: '0.1rem' }}>
                        <X size={18} />
                    </button>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: '0.5rem', minHeight: '0' }}>
                    <RichTextEditor
                        value={content}
                        onChange={setContent}
                        placeholder="Detailed metadata support..."
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', border: 'none', borderRadius: 0 }}
                        contentStyle={{ flex: 1 }}
                        maxHeight="100%"
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button onClick={onClose} className="hero-btn hero-btn-ghost" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}>
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="hero-btn hero-btn-primary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}>
                        <Save size={12} style={{ marginRight: '0.25rem' }} />
                        {isSaving ? 'Saving...' : 'Save Metadata'}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
