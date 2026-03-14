import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save } from 'lucide-react';
import RichTextEditor from '../common/RichTextEditor';
import { pb } from '../../lib/pocketbase';
import { useQueryClient } from '@tanstack/react-query';
import { normalizeHtmlForCompare } from '../../lib/noteHtml';
import { SafeButton, SurfaceCard, SectionHeader } from '../common/ui';
import { SAFE_BUTTON_SELECTORS, createSafeInteractionScopeCss } from '../../lib/uiMotion';

interface MetadataModalProps {
    isOpen: boolean;
    onClose: () => void;
    campaignId?: string;
    initialContent?: string;
    onSave?: (newContent: string) => void;
    campaignName?: string;
}

export default function MetadataModal({
    isOpen,
    onClose,
    campaignId,
    initialContent = '',
    onSave,
    campaignName
}: MetadataModalProps) {
    const [content, setContent] = useState(initialContent);
    const [isSaving, setIsSaving] = useState(false);
    const queryClient = useQueryClient();

    const displayTitle = campaignName ? `${campaignName} Metadata` : 'Campaign Metadata';
    const hasChanges = normalizeHtmlForCompare(content) !== normalizeHtmlForCompare(initialContent);

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
            className="metadata-modal"
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(2, 6, 23, 0.75)',
                /* GPU hack removed */
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2000,
                padding: '1.5rem'
            }}
            onClick={onClose}
        >
            <style>{`
                ${createSafeInteractionScopeCss('.metadata-modal', SAFE_BUTTON_SELECTORS)}
            `}</style>
            <SurfaceCard
                className="animate-fade"
                padding={0}
                radius="2rem"
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: '800px',
                    height: '50vh',
                    minHeight: '350px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: 'var(--shadow-large)',
                    pointerEvents: 'auto',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        padding: '1.35rem 1.5rem 1rem 1.5rem',
                        borderBottom: '1px solid var(--border-subtle)',
                        background: 'var(--bg-overlay)',
                    }}
                >
                    <SectionHeader
                        title={<h3 className="hero-section-title" style={{ marginBottom: 0, fontSize: '0.95rem' }}>{displayTitle}</h3>}
                        actions={
                            <SafeButton onClick={onClose} className="hero-btn hero-btn-ghost" style={{ padding: '0.1rem' }}>
                                <X size={18} />
                            </SafeButton>
                        }
                        style={{ marginBottom: 0 }}
                    />
                </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1rem 1.5rem 0 1.5rem', minHeight: '0' }}>
                        <RichTextEditor
                            value={content}
                            onChange={setContent}
                            placeholder="Detailed metadata support..."
                            style={{ flex: 1, display: 'flex', flexDirection: 'column', border: 'none', borderRadius: 0 }}
                            contentStyle={{ flex: 1 }}
                            maxHeight="100%"
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '0 1.5rem 1.25rem 1.5rem' }}>
                        <SafeButton onClick={onClose} className="hero-btn hero-btn-ghost" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}>
                            Cancel
                        </SafeButton>
                        <SafeButton onClick={handleSave} disabled={isSaving || !hasChanges} className="hero-btn hero-btn-primary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}>
                            <Save size={12} style={{ marginRight: '0.25rem' }} />
                            {isSaving ? 'Saving...' : 'Save Metadata'}
                        </SafeButton>
                    </div>
            </SurfaceCard>
        </div>
    );

    return createPortal(modalContent, document.body);
}
