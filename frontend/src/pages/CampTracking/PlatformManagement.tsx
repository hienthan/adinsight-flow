import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useQueryClient } from '@tanstack/react-query';
import {
    ChevronLeft,
    Plus,
    Trash2,
    Globe,
    Palette,
    Loader2
} from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { CampaignPlatform } from '../../types/campaign';
import RichTextEditor from '../../components/common/RichTextEditor';
import { SafeButton, SectionHeader, SurfaceCard } from '../../components/common/ui';

const COLOR_PRESETS = [
    '#3b82f6', // Bright Blue
    '#ef4444', // Red
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#6366f1', // Indigo
    '#14b8a6', // Teal
    '#334155', // Slate
    '#e11d48', // Crimson
];

export default function PlatformManagement() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [platforms, setPlatforms] = useState<CampaignPlatform[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const persistenceTimeoutRef = useRef<any>(null);

    // Form state
    const [formData, setFormData] = useState({
        id: '',
        display_name: '',
        platform_name: '',
        color: COLOR_PRESETS[0],
        metadata: ''
    });
    const [isEditing, setIsEditing] = useState(false);
    const [viewMode, setViewMode] = useState(true);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if (!isEditing) {
            setIsDirty(formData.display_name !== '' || formData.platform_name !== '');
            return;
        }

        const original = platforms.find(p => p.id === formData.id);
        if (original) {
            const dirty =
                formData.display_name !== original.display_name ||
                formData.platform_name !== original.platform_name ||
                formData.color !== original.color;
            setIsDirty(dirty);
        }
    }, [formData, platforms, isEditing]);

    useEffect(() => {
        fetchPlatforms();
    }, []);

    useEffect(() => {
        if (loading) return;
        if (platforms.length === 0) return;
        if (formData.id) return;
        handleSelect(platforms[0]);
    }, [loading, platforms]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !viewMode) {
                setViewMode(true);
                setIsEditing(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [viewMode]);

    useEffect(() => {
        return () => {
            if (persistenceTimeoutRef.current) clearTimeout(persistenceTimeoutRef.current);
        };
    }, []);

    const fetchPlatforms = async () => {
        try {
            setLoading(true);
            const records = await pb.collection('campaign_platforms').getFullList<CampaignPlatform>({
                sort: 'order,display_name',
            });
            setPlatforms(records);
        } catch (err) {
            console.error('Failed to fetch platforms:', err);
            setError('Could not load platforms.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (platform: CampaignPlatform) => {
        setFormData({
            id: platform.id,
            display_name: platform.display_name,
            platform_name: platform.platform_name,
            color: platform.color,
            metadata: platform.metadata || ''
        });
        setIsEditing(true);
        setViewMode(true);
        setError(null);
        setSuccess(null);
    };

    const handleCancel = () => {
        if (isEditing) {
            const current = platforms.find(p => p.id === formData.id);
            if (current) {
                setFormData({
                    id: current.id,
                    display_name: current.display_name,
                    platform_name: current.platform_name,
                    color: current.color,
                    metadata: current.metadata || ''
                });
            }
        } else {
            setFormData({ id: '', display_name: '', platform_name: '', color: COLOR_PRESETS[0], metadata: '' });
            setIsEditing(false);
            setViewMode(true);
        }
        setError(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
            ...(name === 'display_name' && !isEditing ? { platform_name: value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') } : {})
        }));
    };

    const onDragEnd = (result: any) => {
        if (!result.destination) return;

        const items = Array.from(platforms);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setPlatforms(items);

        // Persistence logic
        if (persistenceTimeoutRef.current) clearTimeout(persistenceTimeoutRef.current);
        persistenceTimeoutRef.current = setTimeout(async () => {
            try {
                const updates = items.map((platform, index) => {
                    const newPos = index + 1;
                    if (platform.order !== newPos) {
                        return pb.collection('campaign_platforms').update(platform.id, { order: newPos });
                    }
                    return null;
                }).filter(Boolean);

                if (updates.length > 0) {
                    await Promise.all(updates);
                    queryClient.invalidateQueries({ queryKey: ['platforms'] });
                }
            } catch (err) {
                console.error('Failed to sync order:', err);
            }
        }, 500);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            if (isEditing && formData.id) {
                const updated = await pb.collection('campaign_platforms').update(formData.id, formData);
                setPlatforms(prev => prev.map(p => p.id === formData.id ? updated as any : p));
                setSuccess(`Platform "${formData.display_name}" updated.`);
            } else {
                const maxOrder = platforms.length > 0 ? Math.max(...platforms.map(p => p.order || 0)) : 0;
                const newPlatform = await pb.collection('campaign_platforms').create({ ...formData, order: maxOrder + 1 });
                setPlatforms(prev => [...prev, newPlatform as any]);
                setSuccess(`Platform "${formData.display_name}" created.`);
                handleSelect(newPlatform as any);
            }
            queryClient.invalidateQueries({ queryKey: ['platforms'] });
        } catch (err: any) {
            setError(err.message || 'Failed to save platform.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

        try {
            await pb.collection('campaign_platforms').delete(id);
            setPlatforms(prev => prev.filter(p => p.id !== id));
            if (formData.id === id) {
                setFormData({ id: '', display_name: '', platform_name: '', color: COLOR_PRESETS[0], metadata: '' });
                setIsEditing(false);
            }
            setSuccess(`Platform "${name}" deleted.`);
            queryClient.invalidateQueries({ queryKey: ['platforms'] });
        } catch (err: any) {
            setError(err.message || 'Failed to delete platform.');
        }
    };

    return (
        <div className="page-container" style={{ background: 'var(--bg-main)', minHeight: '100vh', padding: '1rem 2rem 4rem 2rem' }}>
            {/* Header Area */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2.5rem',
                marginTop: '1rem',
                padding: '0 0.5rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <SafeButton
                        onClick={() => navigate('/camp-tracking')}
                        className="hero-btn-ghost"
                        style={{ padding: '0.65rem', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--bg-overlay)' }}
                    >
                        <ChevronLeft size={22} />
                    </SafeButton>
                    <div>
                        <h1 style={{
                            fontSize: 'var(--text-3xl)',
                            fontWeight: 800,
                            color: 'hsl(var(--primary))',
                            letterSpacing: '-0.03em',
                            margin: 0,
                            lineHeight: 1.2
                        }}>
                            Platforms
                        </h1>
                        <p style={{
                            color: 'var(--text-dim)',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            marginTop: '0.4rem',
                            opacity: 0.8
                        }}>
                            Governance & Strategic Attribution Guidelines
                        </p>
                    </div>
                </div>

                <SafeButton
                    className="hero-btn hero-btn-primary"
                    onClick={() => {
                        setFormData({ id: '', display_name: '', platform_name: '', color: COLOR_PRESETS[0], metadata: '' });
                        setIsEditing(false);
                        setViewMode(false);
                    }}
                    style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '14px',
                        fontSize: '0.95rem'
                    }}
                >
                    <Plus size={20} strokeWidth={3} />
                    Add Platform
                </SafeButton>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'start' }}>
                {/* Sidebar: Platform List - Fixed width */}
                <SurfaceCard className="no-lift" style={{
                    width: '320px',
                    flexShrink: 0,
                    boxShadow: 'var(--shadow-glass)',
                    borderRadius: '1.5rem',
                    position: 'sticky',
                    top: '1rem'
                }}>
                    <SectionHeader
                        title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ padding: '0.5rem', background: 'var(--accent-glow)', borderRadius: '10px', color: 'hsl(var(--primary))' }}>
                                    <Globe size={20} strokeWidth={2.5} />
                                </div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Channels</h3>
                            </div>
                        }
                        style={{ marginBottom: '1.5rem' }}
                    />

                    {loading ? (
                        <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><Loader2 className="animate-spin" /></div>
                    ) : (
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId="platforms-list" direction="vertical">
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {platforms.map((platform, index) => (
                                            <Draggable key={platform.id} draggableId={platform.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        onClick={() => handleSelect(platform)}
                                                        style={{
                                                            ...provided.draggableProps.style,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            padding: '0.75rem 1rem',
                                                            background: platform.id === formData.id ? 'var(--accent-glow)' : 'var(--bg-overlay)',
                                                            border: platform.id === formData.id ? '1px solid hsl(var(--primary))' : '1px solid var(--border-subtle)',
                                                            borderRadius: '12px',
                                                            boxShadow: snapshot.isDragging ? 'var(--shadow-lg)' : 'none',
                                                            cursor: 'grab'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
                                                            <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: platform.color, flexShrink: 0, boxShadow: `0 0 10px ${platform.color}44` }} />
                                                            <span style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: platform.id === formData.id ? 'hsl(var(--primary))' : 'var(--text-main)' }}>
                                                                {platform.display_name}
                                                            </span>
                                                        </div>
                                                        <SafeButton
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(platform.id, platform.display_name); }}
                                                            style={{ border: 'none', background: 'none', color: '#ef4444', opacity: 0.5, cursor: 'pointer', padding: '4px' }}
                                                        >
                                                            <Trash2 size={13} />
                                                        </SafeButton>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    )}
                </SurfaceCard>

                {/* Content Area - Responsive Wrapping */}
                <div style={{
                    flex: 1,
                    minWidth: '400px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1.5rem',
                    alignItems: 'start'
                }}>
                    <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>

                        {/* 1. Identity Card */}
                        <SurfaceCard className="no-lift" style={{
                            flex: '0 1 400px',
                            border: isEditing ? '1px solid hsla(var(--primary) / 0.25)' : '1px solid var(--border-subtle)',
                            boxShadow: 'var(--shadow-glass)',
                            borderRadius: '1.5rem',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ padding: '0.6rem', background: 'var(--accent-glow)', borderRadius: '12px', color: 'hsl(var(--primary))' }}>
                                        <Palette size={22} strokeWidth={2.5} />
                                    </div>
                                    <h3 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0, letterSpacing: '-0.03em' }}>Identity</h3>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {(!viewMode || isDirty || !isEditing) && (
                                        <>
                                            <SafeButton
                                                type="button"
                                                onClick={handleCancel}
                                                className="hero-btn-ghost"
                                                style={{ padding: '0.6rem 1.2rem', borderRadius: '10px' }}
                                            >
                                                Cancel
                                            </SafeButton>
                                            <SafeButton
                                                type="submit"
                                                disabled={submitting || (isEditing && !isDirty)}
                                                className="hero-btn-primary"
                                                style={{
                                                    padding: '0.6rem 1.2rem',
                                                    borderRadius: '10px',
                                                    opacity: (submitting || (isEditing && !isDirty)) ? 0.6 : 1
                                                }}
                                            >
                                                {submitting ? 'Saving' : (isEditing ? 'Update' : 'Save')}
                                            </SafeButton>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div className="filter-group">
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Name</label>
                                    <input type="text" name="display_name" value={formData.display_name} onChange={handleInputChange} className="hero-input" style={{ width: '100%' }} />
                                </div>
                                <div className="filter-group">
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Slug</label>
                                    <input type="text" name="platform_name" value={formData.platform_name} onChange={handleInputChange} disabled={isEditing} className="hero-input" style={{ width: '100%' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Brand Color</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                                        {COLOR_PRESETS.map(c => (
                                            <SafeButton
                                                key={c}
                                                type="button"
                                                onClick={() => setFormData(p => ({ ...p, color: c }))}
                                                style={{
                                                    width: '32px', height: '32px', borderRadius: '8px', background: c,
                                                    border: formData.color === c ? '3px solid var(--text-main)' : '1px solid var(--border-subtle)',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <span style={{ display: 'none' }}>{c}</span>
                                            </SafeButton>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </SurfaceCard>

                        {/* 2. Strategic Notes */}
                        <SurfaceCard className="no-lift" style={{
                            flex: '1 1 600px',
                            boxShadow: 'var(--shadow-glass)',
                            borderRadius: '1.5rem',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ padding: '0.6rem', background: 'var(--accent-glow)', borderRadius: '12px', color: 'hsl(var(--primary))' }}>
                                        <Globe size={22} strokeWidth={2.5} />
                                    </div>
                                    <h3 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0, letterSpacing: '-0.03em' }}>Strategic Notes</h3>
                                </div>
                                {viewMode && isEditing && (
                                    <SafeButton type="button" onClick={() => setViewMode(false)} className="hero-btn-ghost" style={{ fontSize: '0.8rem' }}>
                                        Edit Alignment
                                    </SafeButton>
                                )}
                            </div>

                            {viewMode ? (
                                <div
                                    onDoubleClick={() => setViewMode(false)}
                                    style={{
                                        flex: 1,
                                        padding: '1.5rem', background: 'var(--bg-overlay)', borderRadius: '1rem', border: '1px solid var(--border-subtle)',
                                        minHeight: '260px', cursor: 'text', lineHeight: 1.6
                                    }}
                                    dangerouslySetInnerHTML={{ __html: formData.metadata || '<p style="font-style:italic; opacity:0.5">Double click to add strategic guidelines...</p>' }}
                                />
                            ) : (
                                <div style={{ flex: 1 }}>
                                    <RichTextEditor
                                        value={formData.metadata}
                                        onChange={html => setFormData(p => ({ ...p, metadata: html }))}
                                        minHeight={300}
                                    />
                                </div>
                            )}
                        </SurfaceCard>
                    </form>
                </div>
            </div>
            {error && <div className="hero-badge animate-fade" style={{ marginTop: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>{error}</div>}
            {success && <div className="hero-badge animate-fade" style={{ marginTop: '1rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>{success}</div>}
        </div>
    );
}
