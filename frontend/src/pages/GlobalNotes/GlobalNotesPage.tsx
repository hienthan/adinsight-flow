
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '../../lib/pocketbase';
import {
    Plus,
    Search,
    Pin,
    Trash2,
    Monitor,
    PanelLeftClose,
    PanelLeftOpen,
    PanelRightClose,
    PanelRightOpen,
    Globe,
    AlertCircle,
    Settings,
    Loader2,
    Copy,
    FileText,
    Paperclip,
    WandSparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import RichTextEditor from '../../components/common/RichTextEditor';
import { htmlToPlainText, prepareNoteHtmlForRender, normalizeHtmlForCompare } from '../../lib/noteHtml';
import {
    SAFE_BUTTON_SELECTORS,
    SAFE_INTERACTIVE_TRANSITION,
    SAFE_ITEM_TRANSITION,
    SAFE_PANEL_TRANSITION,
    createSafeInteractionScopeCss,
} from '../../lib/uiMotion';
import { SurfaceCard } from '../../components/common/ui/SurfaceCard';
import { SafeButton } from '../../components/common/ui/SafeButton';
import { ToolbarGroup } from '../../components/common/ui/ToolbarGroup';
import { SectionHeader } from '../../components/common/ui/SectionHeader';
import { createAmbientSurface, createPremiumBadgeStyle, toAlphaColor } from '../../components/common/ui';

interface Note {
    id: string;
    title: string;
    content: string;
    tags: string[];
    is_pinned: boolean;
    priority: 'high' | 'medium' | 'normal';
    platform: 'Klook' | 'Trip' | 'General' | 'Traveloka' | 'System' | 'RSA' | 'DSA' | 'Prompt';
    images: string[];
    created: string;
    updated: string;
}

type PocketBaseFileRecord = Parameters<typeof pb.files.getUrl>[0];
const DRAFT_NOTE_ID = '__draft_note__';

const NOTE_SHELL_STYLE = {
    height: 'calc(100vh - 2rem)',
    display: 'flex',
    overflow: 'hidden',
    padding: 0,
    gap: 0,
} as const;

const NOTE_TOOLBAR_GROUP_STYLE = {
    marginRight: '0.2rem',
    background: 'transparent',
    border: 'none',
    boxShadow: 'none',
    padding: 0,
} as const;

const NOTE_META_OPTIONS = {
    platforms: [
        { value: 'General', label: 'General' },
        { value: 'Prompt', label: 'Prompt' },
        { value: 'RSA', label: 'RSA' },
        { value: 'DSA', label: 'DSA' },
        { value: 'System', label: 'System' },
        { value: 'Klook', label: 'Klook' },
        { value: 'Trip', label: 'Trip' },
        { value: 'Traveloka', label: 'TVLK' },
    ],
    priorities: [
        { value: 'normal', label: 'Normal' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
    ],
} as const;

const GENERAL_PLATFORM_KEYS = ['klook', 'traveloka', 'tvlk', 'trip', 'system', 'rsa', 'dsa', 'prompt'] as const;

const getPlatformAccent = (platform?: string) => {
    const normalized = String(platform || '').toLowerCase();
    if (normalized === 'klook') return '#ff5b00';
    if (normalized === 'traveloka' || normalized === 'tvlk') return '#1ba0e2';
    if (normalized === 'trip') return '#0e2b5c';
    if (normalized === 'prompt') return '#7c3aed';
    if (normalized === 'rsa') return '#3b82f6';
    if (normalized === 'dsa') return '#8b5cf6';
    if (normalized === 'system') return '#64748b';
    return '#4f46e5';
};

const getPriorityAccent = (priority?: Note['priority']) => {
    if (priority === 'high') return '#ef4444';
    if (priority === 'medium') return '#f59e0b';
    return '#22c55e';
};

const formatPlatformLabel = (platform?: string) => {
    const normalized = String(platform || '').toLowerCase();
    if (normalized === 'traveloka' || normalized === 'tvlk') return 'TVLK';
    if (normalized === 'system') return 'System';
    if (normalized === 'rsa') return 'RSA';
    if (normalized === 'dsa') return 'DSA';
    if (normalized === 'prompt') return 'Prompt';
    return platform || 'General';
};

const getPlatformBadge = (platform?: string) => {
    const normalized = String(platform || '').toLowerCase();
    const baseStyle = {
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
    } as const;

    if (normalized === 'klook') {
        return {
            label: 'K',
            style: { ...baseStyle, minWidth: 14, height: 14, borderRadius: 3, background: 'rgba(255, 91, 0, 0.1)', color: '#ff5b00', fontSize: '0.5rem', padding: '0 3px' },
        };
    }
    if (normalized === 'traveloka' || normalized === 'tvlk') {
        return {
            label: 'TK',
            style: { ...baseStyle, minWidth: 14, height: 14, borderRadius: 3, background: 'rgba(27, 160, 226, 0.1)', color: '#1ba0e2', fontSize: '0.45rem', padding: '0 3px' },
        };
    }
    if (normalized === 'prompt') {
        return {
            icon: <WandSparkles size={8} strokeWidth={2.6} />,
            style: { ...baseStyle, minWidth: 14, height: 14, borderRadius: 3, background: 'hsla(262, 83%, 58%, 0.12)', color: '#7c3aed', fontSize: '0.5rem', padding: '0 3px' },
        };
    }
    if (normalized === 'rsa') {
        return {
            label: 'RSA',
            style: { ...baseStyle, minWidth: 24, height: 14, borderRadius: 3, background: 'hsla(var(--primary) / 0.1)', color: 'hsl(var(--primary))', fontSize: '0.55rem', padding: '0 4px' },
        };
    }
    if (normalized === 'dsa') {
        return {
            label: 'DSA',
            style: { ...baseStyle, minWidth: 24, height: 14, borderRadius: 3, background: 'hsla(271, 81%, 56%, 0.1)', color: 'hsla(271, 81%, 56%, 1)', fontSize: '0.55rem', padding: '0 4px' },
        };
    }
    if (normalized === 'trip') {
        return {
            label: 'T',
            style: { ...baseStyle, minWidth: 14, height: 14, borderRadius: 3, background: 'rgba(14, 43, 92, 0.1)', color: '#0e2b5c', fontSize: '0.5rem', padding: '0 3px' },
        };
    }
    if (normalized === 'system') {
        return {
            icon: <Settings size={8} />,
            style: { ...baseStyle, minWidth: 14, height: 14, borderRadius: 3, background: 'var(--bg-subtle)', color: 'var(--text-dim)', fontSize: '0.5rem', padding: '0 3px' },
        };
    }
    if (!platform || normalized === 'general' || !GENERAL_PLATFORM_KEYS.includes(normalized as (typeof GENERAL_PLATFORM_KEYS)[number])) {
        return {
            icon: <Globe size={9} strokeWidth={3} />,
            style: { ...baseStyle, width: 14, height: 14, borderRadius: 3, background: 'hsla(243, 75%, 59%, 0.1)', color: '#4f46e5' },
        };
    }
    return null;
};

export default function GlobalNotesPage() {
    const queryClient = useQueryClient();
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [draftNote, setDraftNote] = useState<Note | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
    const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(true);

    // Form state
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');
    const [editTags, setEditTags] = useState('');
    const [editPlatform, setEditPlatform] = useState<string>('General');
    const [editPriority, setEditPriority] = useState<'high' | 'medium' | 'normal'>('normal');
    const [confirmingDeleteNote, setConfirmingDeleteNote] = useState(false);
    const [confirmingDeleteImage, setConfirmingDeleteImage] = useState<string | null>(null);

    // Fetch notes
    const { data: notes = [] } = useQuery<Note[]>({
        queryKey: ['global-notes'],
        queryFn: async () => {
            const records = await pb.collection('general_notes').getFullList({
                sort: '-is_pinned,-updated',
            });
            // Manual cast since RecordModel doesn't match Note interface perfectly
            return records.map(r => ({
                id: r.id,
                title: r.title,
                content: r.content,
                tags: r.tags,
                is_pinned: r.is_pinned,
                priority: r.priority || 'normal',
                platform: r.platform,
                images: r.images || [],
                created: r.created,
                updated: r.updated
            })) as Note[];
        },
    });

    // Select first note on load if none selected
    useEffect(() => {
        if (!selectedNoteId && notes.length > 0 && !isEditing) {
            setSelectedNoteId(notes[0].id);
        }
    }, [notes, selectedNoteId, isEditing]);

    const allNotes = useMemo(
        () => (draftNote ? [draftNote, ...notes] : notes),
        [draftNote, notes]
    );
    const activeNote = allNotes.find(n => n.id === selectedNoteId);
    const isDraftNote = activeNote?.id === DRAFT_NOTE_ID;

    const updateMutation = useMutation({
        mutationFn: async (id: string) => {
            return await pb.collection('general_notes').update(id, {
                title: editTitle,
                content: editContent,
                tags: editTags.split(',').map(t => t.trim()).filter(t => t),
                platform: editPlatform,
                priority: editPriority
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['global-notes'] });
            setIsEditing(false);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return await pb.collection('general_notes').delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['global-notes'] });
            setSelectedNoteId(null);
            setIsEditing(false);
            setConfirmingDeleteNote(false);
        }
    });

    const handleDeleteNote = (id: string) => {
        if (!confirmingDeleteNote) {
            setConfirmingDeleteNote(true);
            setTimeout(() => setConfirmingDeleteNote(false), 3000);
            return;
        }
        deleteMutation.mutate(id);
    };

    const handleImageUpload = async (file: File): Promise<string> => {
        if (isDraftNote) {
            toast.error('Save the note before uploading images');
            throw new Error('Cannot upload images for unsaved draft note');
        }
        if (!selectedNoteId) throw new Error('No note selected');

        const formData = new FormData();
        formData.append('images', file);

        const updatedRecord = await pb.collection('general_notes').update(selectedNoteId, formData);
        queryClient.invalidateQueries({ queryKey: ['global-notes'] });

        // Get the filename of the last uploaded image
        const filename = updatedRecord.images[updatedRecord.images.length - 1];
        return pb.files.getUrl(updatedRecord, filename);
    };

    const deleteImageMutation = useMutation({
        mutationFn: async (filename: string) => {
            if (!selectedNoteId || !activeNote) return;

            // Remove from PB
            await pb.collection('general_notes').update(selectedNoteId, {
                'images-': [filename]
            });
            return filename;
        },
        onSuccess: (filename) => {
            if (!filename) return;

            // Get URL for cleanup
            const imageUrl = pb.files.getUrl(activeNote as PocketBaseFileRecord, filename);

            // Escape special chars for regex
            const escapedUrl = imageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const contentCleanup = editContent.replace(new RegExp(`<img[^>]*src=["']${escapedUrl}["'][^>]*>`, 'g'), '');

            if (contentCleanup !== editContent) {
                setEditContent(contentCleanup);
                if (!isEditing) {
                    pb.collection('general_notes').update(selectedNoteId!, {
                        content: contentCleanup
                    }).then(() => queryClient.invalidateQueries({ queryKey: ['global-notes'] }));
                }
            }
            queryClient.invalidateQueries({ queryKey: ['global-notes'] });
        }
    });

    const togglePinMutation = useMutation({
        mutationFn: async (note: Note) => {
            return await pb.collection('general_notes').update(note.id, {
                is_pinned: !note.is_pinned
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['global-notes'] });
        }
    });

    // Filtering
    const filteredNotes = allNotes.filter(note =>
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        htmlToPlainText(note.content).toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => {
        // 1. Pinned status (true > false)
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;

        // 2. Priority (high > medium > normal)
        const priorityScore = { high: 3, medium: 2, normal: 1 };
        const aPriority = priorityScore[a.priority || 'normal'];
        const bPriority = priorityScore[b.priority || 'normal'];
        if (aPriority !== bPriority) return bPriority - aPriority;

        // 3. Platform (Traveloka > Klook > System > General)
        const getPlatformScore = (platform?: string) => {
            const p = String(platform || '').toLowerCase();
            if (p === 'rsa') return 8;
            if (p === 'dsa') return 7;
            if (p === 'prompt') return 6;
            if (p === 'traveloka' || p === 'tvlk') return 5;
            if (p === 'klook') return 4;
            if (p === 'trip') return 3;
            if (p === 'system') return 2;
            return 1;
        };
        const aPlatform = getPlatformScore(a.platform);
        const bPlatform = getPlatformScore(b.platform);
        if (aPlatform !== bPlatform) return bPlatform - aPlatform;

        // 4. Updated time (newest first)
        return new Date(b.updated).getTime() - new Date(a.updated).getTime();
    });

    const renderedNote = useMemo(
        () => prepareNoteHtmlForRender(activeNote?.content || ''),
        [activeNote?.content]
    );

    // Compute changes for Save button
    const hasChanges = useMemo(() => {
        if (!activeNote) return false;
        if (isDraftNote) return true;

        // Title comparison
        const titleChanged = (activeNote.title || '') !== (editTitle || '');

        // Use normalized HTML for content comparison
        const contentChanged = normalizeHtmlForCompare(activeNote.content || '') !== normalizeHtmlForCompare(editContent || '');

        // Tags comparison (ignore order and empty strings)
        const currentTagsStr = (activeNote.tags || []).map(t => t.trim()).filter(Boolean).sort().join(',');
        const editTagsStr = editTags.split(',').map(t => t.trim()).filter(Boolean).sort().join(',');
        const tagsChanged = currentTagsStr !== editTagsStr;

        // Platform comparison
        const currentPlatform = String(activeNote.platform || 'General');
        const platformChanged = currentPlatform !== editPlatform;

        // Priority comparison
        const currentPriority = activeNote.priority || 'normal';
        const priorityChanged = currentPriority !== editPriority;

        return titleChanged || contentChanged || tagsChanged || platformChanged || priorityChanged;
    }, [activeNote, editTitle, editContent, editTags, editPlatform, editPriority, isDraftNote]);

    // ESC support for editing
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isEditing) {
                setIsEditing(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isEditing]);

    const startEditing = (note: Note) => {
        setEditTitle(note.title);
        setEditContent(note.content);
        setEditTags(note.tags?.join(', ') || '');
        setEditPlatform(String(note.platform || 'General'));
        setEditPriority(note.priority || 'normal');
        setIsEditing(true);
        setSelectedNoteId(note.id);
    };

    const handleCreateDraft = () => {
        const newDraft: Note = {
            id: DRAFT_NOTE_ID,
            title: 'New Note',
            content: '<h1>New Note</h1><p>Start writing...</p>',
            platform: 'General',
            priority: 'normal',
            is_pinned: false,
            tags: [],
            images: [],
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
        };

        setDraftNote(newDraft);
        startEditing(newDraft);
    };

    const handleSaveNote = async () => {
        if (!activeNote) return;

        if (isDraftNote) {
            try {
                const createdNote = await pb.collection('general_notes').create({
                    title: editTitle,
                    content: editContent,
                    tags: editTags.split(',').map(t => t.trim()).filter(t => t),
                    platform: editPlatform,
                    priority: editPriority,
                    is_pinned: false,
                });
                setDraftNote(null);
                setSelectedNoteId(createdNote.id);
                setIsEditing(false);
                queryClient.invalidateQueries({ queryKey: ['global-notes'] });
            } catch (error) {
                console.error('Failed to create note:', error);
                toast.error('Failed to create note');
            }
            return;
        }

        updateMutation.mutate(activeNote.id);
    };

    const handleCancelEditing = () => {
        if (isDraftNote) {
            setDraftNote(null);
            setSelectedNoteId(notes[0]?.id ?? null);
            setIsEditing(false);
            return;
        }

        setIsEditing(false);
    };

    const handleCopyToClipboard = () => {
        if (!activeNote) return;
        const plainText = htmlToPlainText(activeNote.content);
        const htmlContent = `<h1 style="font-size: 1.75rem; border-bottom: 1px solid #eee; padding-bottom: 0.3rem;">${activeNote.title}</h1>${activeNote.content}`;
        const fullPlainText = `${activeNote.title}\n\n${plainText}`;

        // Attempt to copy as rich text (HTML + Plain)
        try {
            const blobHtml = new Blob([htmlContent], { type: 'text/html' });
            const blobText = new Blob([fullPlainText], { type: 'text/plain' });
            const data = [new ClipboardItem({
                'text/html': blobHtml,
                'text/plain': blobText,
            })];

            navigator.clipboard.write(data).then(() => {
                toast.success('Note copied as Rich Text');
            }).catch(err => {
                console.error('Clipboard API error:', err);
                // Fallback to legacy plain text copy
                navigator.clipboard.writeText(fullPlainText).then(() => {
                    toast.success('Copied as Plain Text');
                });
            });
        } catch (err) {
            console.error('Clipboard error:', err);
            navigator.clipboard.writeText(fullPlainText).then(() => {
                toast.success('Copied as Plain Text');
            });
        }
    };

    const toolbarActions = activeNote && !isEditing ? [
        {
            key: 'copy',
            title: 'Copy to Clipboard',
            onClick: handleCopyToClipboard,
            content: <Copy size={16} />,
        },
        {
            key: 'pin',
            title: activeNote.is_pinned ? 'Unpin' : 'Pin',
            onClick: () => togglePinMutation.mutate(activeNote),
            content: <Pin size={16} style={{ fill: activeNote.is_pinned ? 'currentColor' : 'none' }} />,
        },
        {
            key: 'delete',
            title: confirmingDeleteNote ? 'Confirm Delete' : 'Delete',
            onClick: () => handleDeleteNote(activeNote.id),
            className: `hero-btn-ghost ${confirmingDeleteNote ? 'bg-destructive text-white' : 'text-destructive'}`,
            style: { display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.28rem 0.38rem', borderRadius: '8px' },
            content: (
                <>
                    <Trash2 size={16} />
                    {confirmingDeleteNote && <span style={{ fontSize: '0.68rem', fontWeight: 800 }}>Confirm?</span>}
                </>
            ),
        },
    ] : [];

    return (
        <div className="page-container global-notes-page" style={NOTE_SHELL_STYLE}>
            <style>{`
                ${createSafeInteractionScopeCss('.global-notes-page', SAFE_BUTTON_SELECTORS)}

                .global-notes-page .note-item-hover:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 16px 30px -28px rgba(15, 23, 42, 0.35);
                }
            `}</style>

            {/* Sidebar List */}
            <div style={{
                width: isLeftSidebarCollapsed ? '0' : '320px',
                minWidth: isLeftSidebarCollapsed ? '0' : '320px',
                transition: SAFE_PANEL_TRANSITION,
                opacity: isLeftSidebarCollapsed ? 0 : 1,
                pointerEvents: isLeftSidebarCollapsed ? 'none' : 'auto',
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 92%, var(--bg-main) 8%) 0%, var(--bg-content) 100%)',
                borderRight: '1px solid var(--border-subtle)',
                marginTop: '1rem',
                marginLeft: '1rem',
                marginBottom: '1rem',
                borderRadius: '1rem 0 0 1rem',
                overflow: 'hidden',
                boxShadow: '0 24px 42px -34px rgba(15, 23, 42, 0.28)'
            }}>
                {/* Header */}
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)', background: 'color-mix(in srgb, var(--bg-content) 94%, var(--bg-main) 6%)' }}>
                    <SurfaceCard
                        padding="0.9rem"
                        radius="1.1rem"
                        style={{
                            ...createAmbientSurface('#4f46e5', 0.45),
                            boxShadow: 'none',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.65rem', marginBottom: '0.7rem' }}>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                    Knowledge Base
                                </div>
                                <div style={{ marginTop: '0.15rem', fontSize: '1rem', fontWeight: 850, letterSpacing: '-0.03em', color: 'var(--text-main)' }}>
                                    General Notes
                                </div>
                            </div>
                            <SafeButton
                                onClick={handleCreateDraft}
                                className="hero-btn hero-btn-primary"
                                style={{ padding: '0.5rem 0.75rem', minHeight: '2rem', fontSize: '0.75rem' }}
                            >
                                <Plus size={14} />
                                Create
                            </SafeButton>
                        </div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            padding: '0.65rem 0.9rem',
                            marginTop: '0.85rem',
                            background: 'color-mix(in srgb, var(--bg-content) 84%, var(--bg-main) 16%)',
                            borderRadius: '0.9rem',
                            border: '1px solid var(--border-subtle)',
                            transition: SAFE_INTERACTIVE_TRANSITION,
                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
                        }}>
                            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            <input
                                type="text"
                                placeholder="Search notes, content, tags..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: 'var(--text-main)',
                                    fontSize: '0.85rem',
                                    width: '100%',
                                    padding: '0.2rem 0'
                                }}
                            />
                        </div>
                    </SurfaceCard>
                </div>

                {/* Note List */}
                <div style={{ flex: 1, overflowY: 'auto', background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 96%, var(--bg-main) 4%) 0%, var(--bg-content) 100%)', padding: '0.8rem' }}>
                    {filteredNotes.map(note => (
                        (() => {
                            const badge = getPlatformBadge(note.platform);
                            const platformAccent = getPlatformAccent(note.platform);
                            const priorityAccent = getPriorityAccent(note.priority);
                            const isSelected = selectedNoteId === note.id;
                            return (
                                <div
                                    key={note.id}
                                    onClick={() => {
                                        setSelectedNoteId(note.id);
                                        setIsEditing(false);
                                    }}
                                    style={{
                                        padding: '0.8rem 0.9rem',
                                        cursor: 'pointer',
                                        background: isSelected
                                            ? createAmbientSurface(platformAccent, 0.65).background
                                            : `linear-gradient(180deg, ${toAlphaColor(priorityAccent, 0.04)} 0%, color-mix(in srgb, var(--bg-content) 94%, var(--bg-main) 6%) 100%)`,
                                        border: `1px solid ${isSelected ? toAlphaColor(platformAccent, 0.22) : 'var(--border-subtle)'}`,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: SAFE_ITEM_TRANSITION,
                                        gap: '0.5rem',
                                        borderRadius: '1rem',
                                        marginBottom: '0.65rem',
                                        boxShadow: isSelected ? `0 18px 30px -28px ${toAlphaColor(platformAccent, 0.5)}` : 'none',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                    className="note-item-hover"
                                >
                                    <div style={{ position: 'absolute', left: 0, top: '18%', bottom: '18%', width: '3px', background: isSelected ? platformAccent : priorityAccent, borderRadius: '0 6px 6px 0' }} />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flex: 1, overflow: 'hidden' }}>
                                        {badge && <div style={badge.style}>{badge.icon ?? badge.label}</div>}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', overflow: 'hidden', flex: 1 }}>
                                    <span style={{
                                        fontWeight: isSelected ? 700 : 600,
                                        fontSize: '0.8rem',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        color: isSelected ? platformAccent : 'var(--text-main)',
                                        letterSpacing: '-0.01em'
                                    }}>
                                        {note.title}
                                    </span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                                {note.images && note.images.length > 0 && (
                                    <div title="Contains images" style={{ display: 'flex', alignItems: 'center' }}>
                                        <Monitor size={12} style={{ color: 'hsl(var(--primary))' }} />
                                    </div>
                                )}
                                {note.priority === 'high' && <AlertCircle size={10} color="#ef4444" />}
                                {note.priority === 'medium' && <span style={{ color: '#f59e0b', fontSize: '9px', fontWeight: 800 }}>M</span>}
                                {note.is_pinned && <Pin size={10} style={{ flexShrink: 0, color: 'var(--accent)', fill: 'var(--accent)', opacity: 0.9 }} />}
                                <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontWeight: 500, opacity: 0.8 }}>
                                    {new Date(note.updated).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                                </div>
                            );
                        })()
                    ))}
                    {filteredNotes.length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                            No notes found
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 96%, var(--bg-main) 4%) 0%, var(--bg-content) 100%)',
                overflow: 'hidden',
                marginTop: '1rem',
                marginRight: isRightSidebarCollapsed ? '1rem' : '0',
                marginBottom: '1rem',
                borderRadius: isLeftSidebarCollapsed ? '1rem' : '0 1rem 1rem 0',
                border: '1px solid var(--border-subtle)',
                borderLeft: isLeftSidebarCollapsed ? '1px solid var(--border-subtle)' : 'none',
                borderRight: isRightSidebarCollapsed ? '1px solid var(--border-subtle)' : 'none',
                transition: SAFE_PANEL_TRANSITION,
                boxShadow: '0 26px 44px -34px rgba(15, 23, 42, 0.28)'
            }}>
                {activeNote ? (
                    <>
                        {/* Note Toolbar */}
                        <div style={{
                            padding: '0.55rem 0.9rem',
                            borderBottom: '1px solid var(--border-subtle)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '0.75rem',
                            background: createAmbientSurface(getPlatformAccent(activeNote.platform), 0.4).background,
                            position: 'sticky',
                            top: 0,
                            zIndex: 10
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0, flex: 1 }}>
                                <ToolbarGroup compact style={NOTE_TOOLBAR_GROUP_STYLE}>
                                    <SafeButton
                                        onClick={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
                                        className={`hero-btn-ghost ${isLeftSidebarCollapsed ? 'text-primary' : ''}`}
                                        style={{ padding: '0.28rem', borderRadius: '7px' }}
                                        title={isLeftSidebarCollapsed ? "Show Notes List" : "Hide Notes List"}
                                    >
                                        {isLeftSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                                    </SafeButton>
                                </ToolbarGroup>

                                {isEditing ? (
                                    <input
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        style={{
                                            fontSize: '1rem',
                                            fontWeight: 750,
                                            background: 'transparent',
                                            border: 'none',
                                            borderBottom: '1px solid var(--primary)',
                                            outline: 'none',
                                            color: 'var(--text-main)',
                                            flex: 1,
                                            maxWidth: '500px',
                                            paddingBottom: '2px'
                                        }}
                                        placeholder="Note Title"
                                        autoFocus
                                    />
                                ) : (
                                    <h1
                                        title={activeNote.title}
                                        style={{
                                            fontSize: '0.98rem',
                                            fontWeight: 760,
                                            margin: 0,
                                            color: 'var(--text-main)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            minWidth: 0,
                                            flexShrink: 1,
                                            maxWidth: '100%',
                                            lineHeight: 1.15,
                                        }}
                                    >
                                        {activeNote.title}
                                    </h1>
                                )}

                                {!isEditing && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0, minWidth: 0 }}>
                                        <span className="hero-badge" style={{ ...createPremiumBadgeStyle(getPlatformAccent(activeNote.platform), { textColor: getPlatformAccent(activeNote.platform) }), padding: '0.16rem 0.42rem', fontSize: '0.7rem' }}>
                                            {formatPlatformLabel(activeNote.platform)}
                                        </span>
                                        <span className="hero-badge" style={{ ...createPremiumBadgeStyle(getPriorityAccent(activeNote.priority), { textColor: getPriorityAccent(activeNote.priority) }), padding: '0.16rem 0.42rem', fontSize: '0.7rem' }}>
                                            {activeNote.priority === 'high' ? 'High' : activeNote.priority === 'medium' ? 'Med' : 'Norm'}
                                        </span>
                                        {activeNote.is_pinned && <span className="hero-badge" style={{ ...createPremiumBadgeStyle('#f59e0b', { textColor: '#f59e0b' }), padding: '0.16rem 0.42rem', fontSize: '0.7rem' }}>Pin</span>}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0, alignItems: 'center' }}>
                                {isEditing ? (
                                    <>
                                        <SafeButton
                                            onClick={handleSaveNote}
                                            disabled={!hasChanges}
                                            className="hero-btn hero-btn-primary"
                                            style={{ padding: '0.38rem 0.7rem', fontSize: '0.76rem' }}
                                        >
                                            Save
                                        </SafeButton>
                                        <SafeButton onClick={handleCancelEditing} className="hero-btn hero-btn-ghost" style={{ padding: '0.38rem 0.65rem', fontSize: '0.76rem' }}>Cancel</SafeButton>
                                    </>
                                ) : (
                                    <>
                                        {toolbarActions.map((action) => (
                                            <SafeButton
                                                key={action.key}
                                                onClick={action.onClick}
                                                className={action.className || 'hero-btn-ghost'}
                                                title={action.title}
                                                style={action.style || { padding: '0.28rem', borderRadius: '8px' }}
                                            >
                                                {action.content}
                                            </SafeButton>
                                        ))}
                                        <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)', margin: '0 0.12rem' }} />
                                        <SafeButton
                                            onClick={() => setIsRightSidebarCollapsed(!isRightSidebarCollapsed)}
                                            className={`hero-btn-ghost ${isRightSidebarCollapsed ? 'text-primary' : ''}`}
                                            style={{ padding: '0.28rem', borderRadius: '7px' }}
                                            title={isRightSidebarCollapsed ? "Show Information" : "Hide Information"}
                                        >
                                            {isRightSidebarCollapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
                                        </SafeButton>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Editor / Viewer Container */}
                        <div className="note-content-area" style={{ flex: 1, display: 'flex', background: 'var(--bg-main)', overflow: 'hidden', minWidth: 0 }}>
                            <div className="note-scroll-container" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                                <div style={{
                                    maxWidth: '980px',
                                    width: '100%',
                                    margin: '0 auto',
                                    padding: '1.25rem 1.5rem',
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}>
                                    <SurfaceCard
                                        variant="soft"
                                        radius="1.25rem"
                                        padding={0}
                                        style={{
                                            flex: 1,
                                            ...createAmbientSurface(getPlatformAccent(activeNote.platform), 0.28),
                                            boxShadow: `0 22px 42px -30px ${toAlphaColor(getPlatformAccent(activeNote.platform), 0.28)}`,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        {isEditing ? (
                                            <div style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                                                            Platform
                                                        </span>
                                                        <select
                                                            value={editPlatform || 'General'}
                                                            onChange={e => setEditPlatform(e.target.value)}
                                                            style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.8rem', outline: 'none' }}
                                                        >
                                                            {NOTE_META_OPTIONS.platforms.map((option) => (
                                                                <option key={option.value} value={option.value}>
                                                                    {option.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                                                            Priority
                                                        </span>
                                                        <select
                                                            value={editPriority || 'normal'}
                                                            onChange={e => setEditPriority(e.target.value as 'high' | 'medium' | 'normal')}
                                                            style={{
                                                                padding: '0.35rem 0.5rem',
                                                                borderRadius: '6px',
                                                                border: editPriority === 'high' ? '1px solid #ef4444' : editPriority === 'medium' ? '1px solid #f59e0b' : '1px solid var(--border-subtle)',
                                                                background: editPriority === 'high' ? 'hsla(0, 84%, 60%, 0.05)' : editPriority === 'medium' ? 'hsla(38, 92%, 50%, 0.05)' : 'var(--bg-main)',
                                                                color: editPriority === 'high' ? '#ef4444' : editPriority === 'medium' ? '#f59e0b' : 'var(--text-main)',
                                                                fontSize: '0.8rem', outline: 'none', fontWeight: 600
                                                            }}
                                                        >
                                                            {NOTE_META_OPTIONS.priorities.map((option) => (
                                                                <option key={option.value} value={option.value}>
                                                                    {option.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                                                            Tags
                                                        </span>
                                                        <input
                                                            value={editTags}
                                                            onChange={e => setEditTags(e.target.value)}
                                                            placeholder="Comma separated, e.g. Strategy, Q1"
                                                            style={{ flex: 1, padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.8rem', outline: 'none' }}
                                                        />
                                                    </div>
                                                </div>

                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                                    <RichTextEditor
                                                        value={editContent}
                                                        onChange={setEditContent}
                                                        placeholder="Write your note..."
                                                        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                                                        contentStyle={{ flex: 1 }}
                                                        maxHeight="100%"
                                                        onUploadImage={handleImageUpload}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ flex: 1, padding: '1.5rem 1.75rem' }}>
                                                <div
                                                    style={{
                                                        color: 'var(--text-main)',
                                                        lineHeight: 1.6,
                                                        cursor: 'text',
                                                        fontSize: 'var(--text-sm)'
                                                    }}
                                                    onDoubleClick={() => startEditing(activeNote)}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
                                                        <SafeButton onClick={() => startEditing(activeNote)} className="hero-btn hero-btn-ghost" style={{ fontSize: '0.75rem' }}>
                                                            Edit Content
                                                        </SafeButton>
                                                    </div>
                                                    <div
                                                        className="note-content-html"
                                                        dangerouslySetInnerHTML={{ __html: renderedNote.html }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </SurfaceCard>
                                </div>
                            </div>

                            {/* Sidebar Meta & TOC (Right) */}
                            <div style={{
                                width: isRightSidebarCollapsed ? '0' : '280px',
                                minWidth: isRightSidebarCollapsed ? '0' : '280px',
                                borderLeft: isRightSidebarCollapsed ? 'none' : '1px solid var(--border-subtle)',
                                padding: isRightSidebarCollapsed ? '0' : '2rem 1.5rem',
                                opacity: isRightSidebarCollapsed ? 0 : 1,
                                transition: SAFE_PANEL_TRANSITION,
                                pointerEvents: isRightSidebarCollapsed ? 'none' : 'auto',
                                background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 90%, var(--bg-main) 10%) 0%, var(--bg-content) 100%)',
                                overflowY: 'auto',
                                position: 'sticky',
                                top: '0',
                                height: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2.5rem',
                                boxShadow: '-22px 0 42px -38px rgba(15, 23, 42, 0.3)',
                                marginTop: '1rem',
                                marginRight: '1rem',
                                marginBottom: '1rem',
                                borderRadius: '0 1rem 1rem 0',
                                flexShrink: 0
                            }}>
                                {/* Meta Section - Minimalized */}
                                <SurfaceCard
                                    variant="inset"
                                    padding="0.9rem"
                                    style={{ ...createAmbientSurface(getPlatformAccent(activeNote.platform), 0.32), boxShadow: 'none' }}
                                >
                                    <SectionHeader
                                        title={<h4 style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', margin: 0 }}>Information</h4>}
                                        actions={<FileText size={14} style={{ color: getPlatformAccent(activeNote.platform) }} />}
                                        style={{ marginBottom: '0.8rem' }}
                                    />

                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(2, 1fr)',
                                        gap: '0.75rem',
                                        background: 'var(--bg-main)',
                                        padding: '0.75rem',
                                        borderRadius: '0.75rem',
                                        border: '1px solid var(--border-subtle)'
                                    }}>
                                        <div style={{ gridColumn: 'span 1' }}>
                                            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.2rem', textTransform: 'uppercase', opacity: 0.7 }}>Platform</div>
                                            <span style={{
                                                ...createPremiumBadgeStyle(getPlatformAccent(activeNote.platform), { textColor: getPlatformAccent(activeNote.platform) }),
                                                fontWeight: 800,
                                                fontSize: '0.65rem',
                                                padding: '0.2rem 0.5rem',
                                                borderRadius: '6px',
                                            }}>
                                                {formatPlatformLabel(activeNote.platform)}
                                            </span>
                                        </div>

                                        <div style={{ gridColumn: 'span 1' }}>
                                            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.2rem', textTransform: 'uppercase', opacity: 0.7 }}>Priority</div>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span className="hero-badge" style={{
                                                    ...createPremiumBadgeStyle(getPriorityAccent(activeNote.priority), {
                                                        textColor: activeNote.priority === 'normal' ? 'var(--text-dim)' : getPriorityAccent(activeNote.priority),
                                                        background: activeNote.priority === 'normal' ? 'var(--bg-subtle)' : undefined,
                                                        borderColor: activeNote.priority === 'normal' ? 'var(--border-subtle)' : undefined,
                                                    }),
                                                    fontWeight: 700,
                                                    fontSize: '0.65rem',
                                                    padding: '0.1rem 0.4rem'
                                                }}>
                                                    {activeNote.priority === 'high' ? 'High' : activeNote.priority === 'medium' ? 'Medium' : 'Normal'}
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ gridColumn: 'span 2' }}>
                                            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.2rem', textTransform: 'uppercase', opacity: 0.7 }}>Last Updated</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', fontWeight: 500 }}>
                                                {new Date(activeNote.updated).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                            </div>
                                        </div>

                                        {activeNote.tags && activeNote.tags.length > 0 && (
                                            <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                                                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                                    {activeNote.tags.map(t => (
                                                        <span key={t} className="hero-badge" style={{ background: 'var(--bg-subtle)', color: 'var(--text-dim)', border: '1px solid var(--border-subtle)' }}>#{t}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </SurfaceCard>

                                {/* Attachments Section */}
                                {activeNote.images && activeNote.images.length > 0 && (
                                    <SurfaceCard
                                        variant="inset"
                                        padding="0.9rem"
                                        style={{ ...createAmbientSurface('#22c55e', 0.24), boxShadow: 'none' }}
                                    >
                                        <SectionHeader
                                            title={<h4 style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', margin: 0 }}>Attachments</h4>}
                                            actions={<Paperclip size={14} style={{ color: '#22c55e' }} />}
                                            style={{ marginBottom: '1rem' }}
                                        />
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.6rem' }}>
                                            {activeNote.images.map((img: string) => (
                                                <div key={img} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                    padding: '0.5rem',
                                                    borderRadius: '0.75rem',
                                                    background: 'var(--bg-main)',
                                                    border: '1px solid var(--border-subtle)',
                                                }}>
                                                    <div style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        borderRadius: '0.4rem',
                                                        overflow: 'hidden',
                                                        background: 'var(--bg-subtle)',
                                                        flexShrink: 0
                                                    }}>
                                                        <img
                                                            src={pb.files.getUrl(activeNote as PocketBaseFileRecord, img, { thumb: '100x100' })}
                                                            alt={img}
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = 'https://placehold.co/40x40?text=IMG';
                                                            }}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{
                                                            fontSize: '0.65rem',
                                                            color: 'var(--text-main)',
                                                            fontWeight: 600,
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}>
                                                            {img.split('_').pop()}
                                                        </div>
                                                        <SafeButton
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (confirmingDeleteImage === img) {
                                                                    deleteImageMutation.mutate(img);
                                                                    setConfirmingDeleteImage(null);
                                                                } else {
                                                                    setConfirmingDeleteImage(img);
                                                                    setTimeout(() => setConfirmingDeleteImage(null), 3000);
                                                                }
                                                            }}
                                                            disabled={deleteImageMutation.isPending}
                                                            className={`hero-btn-ghost ${confirmingDeleteImage === img ? 'bg-destructive text-white' : 'text-destructive'}`}
                                                            style={{
                                                                padding: '0.2rem 0.5rem',
                                                                marginTop: '0.2rem',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.25rem',
                                                                borderRadius: '0.4rem',
                                                                background: confirmingDeleteImage === img ? 'var(--destructive)' : 'transparent'
                                                            }}
                                                        >
                                                            {deleteImageMutation.isPending ? (
                                                                <Loader2 size={10} className="animate-spin" />
                                                            ) : (
                                                                <Trash2 size={10} />
                                                            )}
                                                            <span style={{ fontSize: '0.6rem', fontWeight: 700 }}>
                                                                {deleteImageMutation.isPending ? 'Removing...' : (confirmingDeleteImage === img ? 'Confirm?' : 'Remove')}
                                                            </span>
                                                        </SafeButton>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </SurfaceCard>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                        <SurfaceCard
                            padding="1.1rem 1.2rem"
                            radius="1.2rem"
                            style={{ maxWidth: '28rem', width: '100%', ...createAmbientSurface('#4f46e5', 0.35) }}
                        >
                            <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                General Notes
                            </div>
                            <div style={{ marginTop: '0.25rem', fontSize: '1.15rem', fontWeight: 850, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
                                Select or create a note
                            </div>
                            <div style={{ marginTop: '0.75rem' }}>
                                <SafeButton onClick={handleCreateDraft} className="hero-btn hero-btn-primary">
                                    <Plus size={16} />
                                    Create
                                </SafeButton>
                            </div>
                        </SurfaceCard>
                    </div>
                )}
            </div>
        </div>
    );
}
