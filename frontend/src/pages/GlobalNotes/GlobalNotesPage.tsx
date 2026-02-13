
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '../../lib/pocketbase';
import {
    Plus,
    Search,
    Pin,
    Trash2,
    Monitor
} from 'lucide-react';
import RichTextEditor from '../../components/common/RichTextEditor';
import { htmlToPlainText, prepareNoteHtmlForRender } from '../../lib/noteHtml';

interface Note {
    id: string;
    title: string;
    content: string;
    tags: string[];
    is_pinned: boolean;
    platform: 'Klook' | 'Trip' | 'General';
    created: string;
    updated: string;
}

export default function GlobalNotesPage() {
    const queryClient = useQueryClient();
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    // Form state
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');
    const [editTags, setEditTags] = useState('');
    const [editPlatform, setEditPlatform] = useState<string>('General');

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
                platform: r.platform,
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
                platform: editPlatform
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
            if (activeNote?.id === selectedNoteId) setSelectedNoteId(null);
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
    );

    const renderedNote = useMemo(
        () => prepareNoteHtmlForRender(activeNote?.content || ''),
        [activeNote?.id, activeNote?.content] // Added activeNote?.id to ensure refresh
    );

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
        setIsEditing(true);
        setSelectedNoteId(note.id);
    };

    return (
        <div className="page-container" style={{ height: 'calc(100vh - 2rem)', display: 'flex', overflow: 'hidden', padding: 0, gap: 0 }}>

            {/* Sidebar List */}
            <div style={{
                width: '320px',
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
                                padding: '0.85rem 1.25rem',
                                borderBottom: '1px solid var(--border-subtle)',
                                cursor: 'pointer',
                                background: selectedNoteId === note.id ? 'var(--accent-glow)' : 'transparent',
                                borderLeft: selectedNoteId === note.id ? '4px solid hsl(var(--primary))' : '4px solid transparent',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'all 0.15s ease'
                            }}
                            className="note-item-hover"
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, overflow: 'hidden' }}>
                                {note.is_pinned && <Pin size={10} style={{ flexShrink: 0, color: 'var(--accent)', fill: 'var(--accent)' }} />}
                                <span style={{
                                    fontWeight: selectedNoteId === note.id ? 700 : 500,
                                    fontSize: '0.85rem',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    color: selectedNoteId === note.id ? 'hsl(var(--primary))' : 'var(--text-main)'
                                }}>
                                    {note.title}
                                </span>
                            </div>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', flexShrink: 0, fontWeight: 600 }}>
                                {new Date(note.updated).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
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
                marginRight: '1rem',
                marginBottom: '1rem',
                borderRadius: '0 1rem 1rem 0',
                border: '1px solid var(--border-subtle)',
                borderLeft: 'none',
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {isEditing ? (
                                    <input
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        style={{ fontSize: '1.25rem', fontWeight: 700, background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', outline: 'none', color: 'var(--text-main)', width: '300px' }}
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
                                        <button onClick={() => updateMutation.mutate(activeNote.id)} className="hero-btn hero-btn-primary">Save Changes</button>
                                        <button onClick={() => setIsEditing(false)} className="hero-btn hero-btn-ghost">Cancel</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => togglePinMutation.mutate(activeNote)} className="hero-btn-ghost" title={activeNote.is_pinned ? "Unpin" : "Pin"}>
                                            <Pin size={18} style={{ fill: activeNote.is_pinned ? 'currentColor' : 'none' }} />
                                        </button>
                                        <button onClick={() => { if (confirm('Delete this note?')) deleteMutation.mutate(activeNote.id) }} className="hero-btn-ghost text-destructive" title="Delete">
                                            <Trash2 size={18} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Editor / Viewer Container */}
                        <div className="note-content-area" style={{ flex: 1, display: 'flex', background: 'var(--bg-main)', overflow: 'hidden' }}>
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
                                            <div style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                                    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '0.75rem', background: 'var(--bg-main)', padding: '0.75rem 0.9rem' }}>
                                                        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                                                            Platform
                                                        </div>
                                                        <div className="filter-group">
                                                            <select
                                                                value={editPlatform || 'General'}
                                                                onChange={e => setEditPlatform(e.target.value)}
                                                                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                                                            >
                                                                <option value="General">General</option>
                                                                <option value="Klook">Klook</option>
                                                                <option value="Trip">Trip</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '0.75rem', background: 'var(--bg-main)', padding: '0.75rem 0.9rem' }}>
                                                        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                                                            Tags (comma separated)
                                                        </div>
                                                        <div className="filter-group">
                                                            <input
                                                                value={editTags}
                                                                onChange={e => setEditTags(e.target.value)}
                                                                placeholder="e.g. Strategy, Q1, Planning"
                                                                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="filter-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                    <label style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Content</label>
                                                    <RichTextEditor
                                                        value={editContent}
                                                        onChange={setEditContent}
                                                        placeholder="Write your note..."
                                                        minHeight={450}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ flex: 1, padding: '3.5rem 4rem' }}>
                                                <div
                                                    style={{
                                                        color: 'var(--text-main)',
                                                        lineHeight: 1.85,
                                                        cursor: 'text',
                                                        fontSize: '1.05rem'
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
                                width: '280px',
                                borderLeft: '1px solid var(--border-subtle)',
                                padding: '2rem 1.5rem',
                                background: 'var(--bg-card)',
                                overflowY: 'auto',
                                position: 'sticky',
                                top: '0',
                                height: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2.5rem',
                                boxShadow: '-5px 0 15px rgba(0,0,0,0.02)'
                            }}>
                                {/* Meta Section */}
                                <div>
                                    <h4 style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', letterSpacing: '0.05em' }}>Information</h4>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Platform</div>
                                            <span className="hero-badge" style={{ background: 'hsla(var(--primary) / 0.1)', color: 'hsl(var(--primary))', fontWeight: 700 }}>
                                                {activeNote.platform}
                                            </span>
                                        </div>

                                        <div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Tags</div>
                                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                {activeNote.tags?.length ? activeNote.tags.map(t => (
                                                    <span key={t} className="hero-badge" style={{ background: 'var(--bg-subtle)', color: 'var(--text-dim)', fontSize: '0.7rem' }}>#{t}</span>
                                                )) : (
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>No tags</span>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Last Updated</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                                                {new Date(activeNote.updated).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

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
