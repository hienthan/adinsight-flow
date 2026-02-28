
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
    Loader2
} from 'lucide-react';
import RichTextEditor from '../../components/common/RichTextEditor';
import { htmlToPlainText, prepareNoteHtmlForRender, normalizeHtmlForCompare } from '../../lib/noteHtml';

interface Note {
    id: string;
    title: string;
    content: string;
    tags: string[];
    is_pinned: boolean;
    priority: 'high' | 'medium' | 'normal';
    platform: 'Klook' | 'Trip' | 'General' | 'Traveloka' | 'System';
    images: string[];
    created: string;
    updated: string;
}

export default function GlobalNotesPage() {
    const queryClient = useQueryClient();
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
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

    const activeNote = notes.find(n => n.id === selectedNoteId);

    // Mutations
    const createMutation = useMutation({
        mutationFn: async () => {
            const newNote = {
                title: 'New Note',
                content: '<h1>New Note</h1><p>Start writing...</p>',
                platform: 'General',
                priority: 'normal',
                is_pinned: false,
                tags: []
            };
            return await pb.collection('general_notes').create(newNote);
        },
        onSuccess: (newNote) => {
            queryClient.invalidateQueries({ queryKey: ['global-notes'] });
            setSelectedNoteId(newNote.id);
            startEditing(newNote as unknown as Note);
        }
    });

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
            const imageUrl = pb.files.getUrl(activeNote as any, filename);

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
    const filteredNotes = notes.filter(note =>
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
            if (p === 'general' || !p || !['klook', 'traveloka', 'tvlk', 'trip', 'system'].includes(p)) return 5;
            if (p === 'traveloka' || p === 'tvlk') return 4;
            if (p === 'klook') return 3;
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
        [activeNote?.id, activeNote?.content] // Added activeNote?.id to ensure refresh
    );

    // Compute changes for Save button
    const hasChanges = useMemo(() => {
        if (!activeNote) return false;

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
    }, [activeNote, editTitle, editContent, editTags, editPlatform, editPriority]);

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

    // Helpers
    const scrollToSection = (headingId: string) => {
        const container = document.querySelector('.note-scroll-container');
        if (!container) return;
        const target = container.querySelector(`[data-note-heading-id="${headingId}"]`) as HTMLElement | null;
        if (!target) return;

        // Scroll with offset for sticky header
        const headerOffset = 100;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + container.scrollTop - headerOffset;

        container.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });

        const originalBg = target.style.backgroundColor;
        target.style.backgroundColor = 'var(--accent-glow)';
        target.style.transition = 'background-color 0.5s';
        setTimeout(() => {
            target.style.backgroundColor = originalBg;
        }, 1000);
    };

    const startEditing = (note: Note) => {
        setEditTitle(note.title);
        setEditContent(note.content);
        setEditTags(note.tags?.join(', ') || '');
        setEditPlatform(String(note.platform || 'General'));
        setEditPriority(note.priority || 'normal');
        setIsEditing(true);
        setSelectedNoteId(note.id);
    };

    return (
        <div className="page-container" style={{ height: 'calc(100vh - 2rem)', display: 'flex', overflow: 'hidden', padding: 0, gap: 0 }}>

            {/* Sidebar List */}
            <div style={{
                width: isLeftSidebarCollapsed ? '0' : '320px',
                minWidth: isLeftSidebarCollapsed ? '0' : '320px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: isLeftSidebarCollapsed ? 0 : 1,
                pointerEvents: isLeftSidebarCollapsed ? 'none' : 'auto',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg-card)',
                borderRight: '1px solid var(--border-subtle)',
                marginTop: '1rem',
                marginLeft: '1rem',
                marginBottom: '1rem',
                borderRadius: '1rem 0 0 1rem',
                overflow: 'hidden',
                boxShadow: '0 0 20px rgba(0,0,0,0.05)'
            }}>
                {/* Header */}
                <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-content)', opacity: 0.9 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--primary))' }}>Knowledge Base</h2>
                        <button
                            onClick={() => createMutation.mutate()}
                            className="hero-btn-ghost"
                            style={{ padding: '0.4rem', borderRadius: '50%' }}
                            title="New Note"
                        >
                            <Plus size={18} />
                        </button>
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.5rem 0.85rem',
                        background: 'var(--bg-main)',
                        borderRadius: '0.75rem',
                        border: '1px solid var(--border-subtle)',
                        transition: 'all 0.2s ease',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                    }}>
                        <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <input
                            type="text"
                            placeholder="Search notes..."
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
                </div>

                {/* Note List */}
                <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-content)' }}>
                    {filteredNotes.map(note => (
                        <div
                            key={note.id}
                            onClick={() => {
                                setSelectedNoteId(note.id);
                                setIsEditing(false);
                            }}
                            style={{
                                padding: '0.6rem 0.85rem',
                                borderBottom: '1px solid var(--border-subtle)',
                                cursor: 'pointer',
                                background: selectedNoteId === note.id
                                    ? 'var(--accent-glow)'
                                    : (note.priority === 'high' ? 'hsla(0, 84%, 60%, 0.03)' : note.priority === 'medium' ? 'hsla(38, 92%, 50%, 0.03)' : 'transparent'),
                                borderLeft: selectedNoteId === note.id
                                    ? '3px solid hsl(var(--primary))'
                                    : (note.priority === 'high' ? '3px solid #ef4444' : note.priority === 'medium' ? '3px solid #f59e0b' : '3px solid transparent'),
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'all 0.1s ease',
                                gap: '0.5rem'
                            }}
                            className="note-item-hover"
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flex: 1, overflow: 'hidden' }}>
                                {String(note.platform || '').toLowerCase() === 'klook' && (
                                    <div style={{ flexShrink: 0, width: 14, height: 14, borderRadius: 3, background: '#ff5b00', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 800 }}>K</div>
                                )}
                                {(String(note.platform || '').toLowerCase() === 'traveloka' || String(note.platform || '').toLowerCase() === 'tvlk') && (
                                    <div style={{ flexShrink: 0, width: 14, height: 14, borderRadius: 3, background: '#1ba0e2', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.45rem', fontWeight: 800 }}>TK</div>
                                )}
                                {String(note.platform || '').toLowerCase() === 'trip' && (
                                    <div style={{ flexShrink: 0, width: 14, height: 14, borderRadius: 3, background: '#0e2b5c', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 800 }}>T</div>
                                )}
                                {String(note.platform || '').toLowerCase() === 'system' && (
                                    <div style={{ flexShrink: 0, width: 14, height: 14, borderRadius: 3, background: 'var(--text-dim)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 800 }}>
                                        <Settings size={8} />
                                    </div>
                                )}
                                {(!note.platform || String(note.platform || '').toLowerCase() === 'general' || !['klook', 'traveloka', 'tvlk', 'trip', 'system'].includes(String(note.platform || '').toLowerCase())) && (
                                    <div style={{
                                        flexShrink: 0,
                                        width: 14,
                                        height: 14,
                                        borderRadius: 3,
                                        background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 1px 3px rgba(79, 70, 229, 0.4)'
                                    }}>
                                        <Globe size={9} strokeWidth={3} />
                                    </div>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', overflow: 'hidden', flex: 1 }}>
                                    <span style={{
                                        fontWeight: selectedNoteId === note.id ? 600 : 400,
                                        fontSize: '0.78rem',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        color: selectedNoteId === note.id ? 'hsl(var(--primary))' : 'var(--text-main)',
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
                                {note.priority === 'high' && <AlertCircle size={9} color="#ef4444" />}
                                {note.priority === 'medium' && <span style={{ color: '#f59e0b', fontSize: '9px', fontWeight: 800 }}>M</span>}
                                {note.is_pinned && <Pin size={10} style={{ flexShrink: 0, color: 'var(--accent)', fill: 'var(--accent)', opacity: 0.9 }} />}
                                <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontWeight: 500, opacity: 0.8 }}>
                                    {new Date(note.updated).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                        </div>
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
                background: 'var(--bg-content)',
                overflow: 'hidden',
                marginTop: '1rem',
                marginRight: isRightSidebarCollapsed ? '1rem' : '0',
                marginBottom: '1rem',
                borderRadius: isLeftSidebarCollapsed ? '1rem' : '0 1rem 1rem 0',
                border: '1px solid var(--border-subtle)',
                borderLeft: isLeftSidebarCollapsed ? '1px solid var(--border-subtle)' : 'none',
                borderRight: isRightSidebarCollapsed ? '1px solid var(--border-subtle)' : 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '10px 0 20px rgba(0,0,0,0.05)'
            }}>
                {activeNote ? (
                    <>
                        {/* Note Toolbar */}
                        <div style={{
                            padding: '1rem 1.5rem',
                            borderBottom: '1px solid var(--border-subtle)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'var(--bg-card)',
                            position: 'sticky',
                            top: 0,
                            zIndex: 10
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', gap: '0.25rem', marginRight: '0.5rem' }}>
                                    <button
                                        onClick={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
                                        className={`hero-btn-ghost ${isLeftSidebarCollapsed ? 'text-primary' : ''}`}
                                        style={{ padding: '0.4rem', borderRadius: '8px' }}
                                        title={isLeftSidebarCollapsed ? "Show Notes List" : "Hide Notes List"}
                                    >
                                        {isLeftSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                                    </button>
                                </div>

                                {isEditing ? (
                                    <input
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        style={{
                                            fontSize: '1.25rem',
                                            fontWeight: 700,
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
                                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>{activeNote.title}</h1>
                                )}

                                {!isEditing && activeNote.is_pinned && <span className="hero-badge" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>PINNED</span>}
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {isEditing ? (
                                    <>
                                        <button
                                            onClick={() => updateMutation.mutate(activeNote.id)}
                                            disabled={!hasChanges}
                                            className="hero-btn hero-btn-primary"
                                        >
                                            Save
                                        </button>
                                        <button onClick={() => setIsEditing(false)} className="hero-btn hero-btn-ghost">Cancel</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => togglePinMutation.mutate(activeNote)} className="hero-btn-ghost" title={activeNote.is_pinned ? "Unpin" : "Pin"}>
                                            <Pin size={18} style={{ fill: activeNote.is_pinned ? 'currentColor' : 'none' }} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteNote(activeNote.id)}
                                            className={`hero-btn-ghost ${confirmingDeleteNote ? 'bg-destructive text-white' : 'text-destructive'}`}
                                            title={confirmingDeleteNote ? "Confirm Delete" : "Delete"}
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                        >
                                            <Trash2 size={18} />
                                            {confirmingDeleteNote && <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>Confirm?</span>}
                                        </button>
                                        <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', margin: '0 0.25rem' }} />
                                        <button
                                            onClick={() => setIsRightSidebarCollapsed(!isRightSidebarCollapsed)}
                                            className={`hero-btn-ghost ${isRightSidebarCollapsed ? 'text-primary' : ''}`}
                                            style={{ padding: '0.4rem', borderRadius: '8px' }}
                                            title={isRightSidebarCollapsed ? "Show Information" : "Hide Information"}
                                        >
                                            {isRightSidebarCollapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Editor / Viewer Container */}
                        <div className="note-content-area" style={{ flex: 1, display: 'flex', background: 'var(--bg-main)', overflow: 'hidden', minWidth: 0 }}>
                            <div className="note-scroll-container" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                                <div style={{
                                    maxWidth: '920px',
                                    width: '100%',
                                    margin: '0 auto',
                                    padding: '2.5rem 1.5rem',
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}>
                                    {/* Document "Page" */}
                                    <div style={{
                                        flex: 1,
                                        background: 'var(--bg-card)',
                                        borderRadius: '1.25rem',
                                        border: '1px solid var(--border-subtle)',
                                        boxShadow: '0 10px 30px -15px rgba(0,0,0,0.05)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        overflow: 'hidden'
                                    }}>
                                        {isEditing ? (
                                            <div style={{ padding: '3.5rem 4rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
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
                                                            <option value="General">General</option>
                                                            <option value="System">System</option>
                                                            <option value="Klook">Klook</option>
                                                            <option value="Trip">Trip</option>
                                                            <option value="Traveloka">TVLK</option>
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
                                                            <option value="normal">Normal</option>
                                                            <option value="medium">Medium</option>
                                                            <option value="high">High</option>
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
                                            <div style={{ flex: 1, padding: '3.5rem 4rem' }}>
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
                                                        <button onClick={() => startEditing(activeNote)} className="hero-btn hero-btn-ghost" style={{ fontSize: '0.75rem' }}>
                                                            Edit Content
                                                        </button>
                                                    </div>
                                                    <div
                                                        className="note-content-html"
                                                        dangerouslySetInnerHTML={{ __html: renderedNote.html }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Meta & TOC (Right) */}
                            <div style={{
                                width: isRightSidebarCollapsed ? '0' : '280px',
                                minWidth: isRightSidebarCollapsed ? '0' : '280px',
                                borderLeft: isRightSidebarCollapsed ? 'none' : '1px solid var(--border-subtle)',
                                padding: isRightSidebarCollapsed ? '0' : '2rem 1.5rem',
                                opacity: isRightSidebarCollapsed ? 0 : 1,
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                pointerEvents: isRightSidebarCollapsed ? 'none' : 'auto',
                                background: 'var(--bg-card)',
                                overflowY: 'auto',
                                position: 'sticky',
                                top: '0',
                                height: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2.5rem',
                                boxShadow: '-5px 0 15px rgba(0,0,0,0.02)',
                                marginTop: '1rem',
                                marginRight: '1rem',
                                marginBottom: '1rem',
                                borderRadius: '0 1rem 1rem 0',
                                flexShrink: 0
                            }}>
                                {/* Meta Section - Minimalized */}
                                <div>
                                    <h4 style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.8rem', letterSpacing: '0.05em' }}>Information</h4>

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
                                            <span className="hero-badge" style={{ background: 'hsla(var(--primary) / 0.1)', color: 'hsl(var(--primary))', fontWeight: 700, fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                                                {String(activeNote.platform || '').toLowerCase() === 'traveloka' || String(activeNote.platform || '').toLowerCase() === 'tvlk' ? 'TVLK' : (String(activeNote.platform || '').toLowerCase() === 'system' ? 'System' : activeNote.platform || 'General')}
                                            </span>
                                        </div>

                                        <div style={{ gridColumn: 'span 1' }}>
                                            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.2rem', textTransform: 'uppercase', opacity: 0.7 }}>Priority</div>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span className="hero-badge" style={{
                                                    background: activeNote.priority === 'high' ? 'hsla(0, 84%, 60%, 0.1)' : activeNote.priority === 'medium' ? 'hsla(38, 92%, 50%, 0.1)' : 'var(--bg-subtle)',
                                                    color: activeNote.priority === 'high' ? '#ef4444' : activeNote.priority === 'medium' ? '#f59e0b' : 'var(--text-dim)',
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
                                                        <span key={t} style={{ color: 'var(--text-dim)', fontSize: '0.65rem', fontWeight: 600 }}>#{t}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Attachments Section */}
                                {activeNote.images && activeNote.images.length > 0 && (
                                    <div>
                                        <h4 style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', letterSpacing: '0.05em' }}>Attachments</h4>
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
                                                            src={pb.files.getUrl(activeNote as any, img, { thumb: '100x100' })}
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
                                                        <button
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
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* TOC Section */}
                                {!isEditing && (
                                    <div>
                                        <h4 style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', letterSpacing: '0.05em' }}>Table of Contents</h4>
                                        <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            {renderedNote.headings.length === 0 ? (
                                                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem' }}>No sections found</div>
                                            ) : (
                                                renderedNote.headings.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        style={{
                                                            paddingLeft: `${(item.level - 1) * 0.75}rem`,
                                                            cursor: 'pointer',
                                                            fontSize: item.level === 1 ? '0.82rem' : '0.78rem',
                                                            fontWeight: item.level === 1 ? 700 : 500,
                                                            color: item.level === 1 ? 'var(--text-main)' : 'var(--text-dim)',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            padding: '0.25rem 0.5rem',
                                                            borderRadius: '0.4rem',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onClick={() => scrollToSection(item.id)}
                                                        className="hover:bg-accent-glow hover:text-primary"
                                                        title={item.text}
                                                    >
                                                        {item.text}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        <Monitor size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                        <h3>Select a note or create a new one</h3>
                    </div>
                )}
            </div>
        </div>
    );
}
