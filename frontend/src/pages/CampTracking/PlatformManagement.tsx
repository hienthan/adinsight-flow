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
import LazyRichTextEditor from '../../components/common/LazyRichTextEditor';
import { SafeButton, SectionHeader, SurfaceCard, toAlphaColor, extractBaseColor, isGradientColor } from '../../components/common/ui';

interface ColorOption {
    value: string;
    label: string;
    gradient?: boolean;
}

interface ColorCategory {
    id: string;
    title: string;
    colors: ColorOption[];
}

const COLOR_CATEGORIES: ColorCategory[] = [
    {
        id: 'special-effects',
        title: 'Special Gradients & Effects (Hiệu ứng đặc biệt)',
        colors: [
            { value: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', label: 'Cosmic Aurora', gradient: true },
            { value: 'linear-gradient(135deg, #f97316 0%, #f43f5e 100%)', label: 'Sunset Blaze', gradient: true },
            { value: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)', label: 'Cyber Blue', gradient: true },
            { value: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)', label: 'Electric Emerald', gradient: true },
            { value: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)', label: 'Golden Flare', gradient: true },
            { value: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', label: 'Mystic Twilight', gradient: true },
            { value: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)', label: 'Rose Gold', gradient: true },
            { value: 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)', label: 'Tropical Mint', gradient: true },
            { value: 'linear-gradient(135deg, #22c55e 0%, #a3e635 100%)', label: 'Cyber Matrix', gradient: true },
            { value: 'linear-gradient(135deg, #3b82f6 0%, #1e1b4b 100%)', label: 'Deep Cosmos', gradient: true },
        ],
    },
    {
        id: 'vibrant-neon',
        title: 'Vibrant & Neon (Nổi bật & tương phản cao)',
        colors: [
            { value: '#00f2fe', label: 'Electric Cyan' },
            { value: '#10e760', label: 'Cyber Lime' },
            { value: '#ff007f', label: 'Neon Fuchsia' },
            { value: '#facc15', label: 'Laser Yellow' },
            { value: '#a855f7', label: 'Vivid Violet' },
            { value: '#ff5722', label: 'Bright Coral' },
            { value: '#06b6d4', label: 'Aqua Marine' },
            { value: '#4f46e5', label: 'Electric Indigo' },
        ],
    },
    {
        id: 'core-solid',
        title: 'Core Brand Palettes (Màu chuẩn thương hiệu)',
        colors: [
            { value: '#3b82f6', label: 'Bright Blue' },
            { value: '#2563eb', label: 'Royal Blue' },
            { value: '#ef4444', label: 'Crimson Red' },
            { value: '#10b981', label: 'Emerald' },
            { value: '#f59e0b', label: 'Amber' },
            { value: '#f97316', label: 'Orange' },
            { value: '#8b5cf6', label: 'Violet' },
            { value: '#ec4899', label: 'Pink' },
            { value: '#6366f1', label: 'Indigo' },
            { value: '#14b8a6', label: 'Teal' },
            { value: '#e11d48', label: 'Crimson' },
            { value: '#334155', label: 'Slate' },
        ],
    },
    {
        id: 'jewel-deep',
        title: 'Jewel & Deep Tones (Màu trầm & sang trọng)',
        colors: [
            { value: '#9333ea', label: 'Imperial Purple' },
            { value: '#1d4ed8', label: 'Midnight Navy' },
            { value: '#047857', label: 'Forest Pine' },
            { value: '#b45309', label: 'Bronze Ochre' },
            { value: '#be185d', label: 'Deep Rose' },
            { value: '#0f766e', label: 'Dark Teal' },
            { value: '#991b1b', label: 'Bordeaux' },
            { value: '#1e293b', label: 'Graphite' },
        ],
    },
];

const COLOR_PRESETS = COLOR_CATEGORIES.flatMap(c => c.colors.map(col => col.value));

const PAGE_HEADER_STYLE = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2.5rem',
    marginTop: '1rem',
    padding: '0 0.5rem',
} as const;

const CONTENT_LAYOUT_STYLE = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '2rem',
    alignItems: 'start',
} as const;

const FORM_LAYOUT_STYLE = {
    width: '100%',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1.5rem',
} as const;

const EMPTY_PLATFORM_FORM = {
    id: '',
    display_name: '',
    platform_name: '',
    color: COLOR_PRESETS[0],
    metadata: ''
};

const PLATFORM_FORM_FIELDS = [
    { name: 'display_name', label: 'Name', disabled: false },
    { name: 'platform_name', label: 'Slug', disabled: true },
] as const;

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
        ...EMPTY_PLATFORM_FORM
    });
    const [isEditing, setIsEditing] = useState(false);
    const [viewMode, setViewMode] = useState(true);
    const [isDirty, setIsDirty] = useState(false);
    const [activeColorTab, setActiveColorTab] = useState('special-effects');

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
            setFormData({ ...EMPTY_PLATFORM_FORM });
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
                const { id, ...dataToSave } = formData;
                const updated = await pb.collection('campaign_platforms').update(formData.id, dataToSave);
                setPlatforms(prev => prev.map(p => p.id === formData.id ? updated as any : p));
                setSuccess(`Platform "${formData.display_name}" updated.`);
            } else {
                const { id, ...dataToSave } = formData;
                const maxOrder = platforms.length > 0 ? Math.max(...platforms.map(p => p.order || 0)) : 0;
                const newPlatform = await pb.collection('campaign_platforms').create({ ...dataToSave, order: maxOrder + 1 });
                setPlatforms(prev => [...prev, newPlatform as any]);
                setSuccess(`Platform "${formData.display_name}" created.`);
                handleSelect(newPlatform as any);
            }
            queryClient.invalidateQueries({ queryKey: ['platforms'] });
        } catch (err: any) {
            const fieldErrors = err?.data?.data ? Object.entries(err.data.data).map(([field, item]: any) => `${field}: ${item.message || item.code}`).join(', ') : '';
            setError(fieldErrors ? `Validation error: ${fieldErrors}` : (err.message || 'Failed to save platform.'));
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
                setFormData({ ...EMPTY_PLATFORM_FORM });
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
            <div style={PAGE_HEADER_STYLE}>
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
                        setFormData({ ...EMPTY_PLATFORM_FORM });
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

            <div style={CONTENT_LAYOUT_STYLE}>
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
                                                            <div style={{
                                                                width: '14px',
                                                                height: '14px',
                                                                borderRadius: '4px',
                                                                background: platform.color,
                                                                flexShrink: 0,
                                                                boxShadow: `0 0 10px ${toAlphaColor(platform.color, 0.55)}`,
                                                                border: '1px solid rgba(255,255,255,0.15)'
                                                            }} />
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
                    <form onSubmit={handleSubmit} style={FORM_LAYOUT_STYLE}>

                        {/* 1. Identity Card */}
                        <SurfaceCard className="no-lift" style={{
                            flex: '0 1 480px',
                            border: isEditing ? '1px solid hsla(var(--primary) / 0.25)' : '1px solid var(--border-subtle)',
                            boxShadow: 'var(--shadow-glass)',
                            borderRadius: '1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            {/* Glowing top accent based on selected color */}
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '3px',
                                background: formData.color || '#3b82f6',
                                boxShadow: `0 0 14px ${toAlphaColor(formData.color || '#3b82f6', 0.8)}`
                            }} />

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
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

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {PLATFORM_FORM_FIELDS.map((field) => (
                                    <div className="filter-group" key={field.name}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                            {field.label}
                                        </label>
                                        <input
                                            type="text"
                                            name={field.name}
                                            value={formData[field.name]}
                                            onChange={handleInputChange}
                                            disabled={field.name === 'platform_name' && isEditing}
                                            className="hero-input"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                ))}

                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                            Brand Color & Effects
                                        </label>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                                            {isGradientColor(formData.color) ? 'Custom Gradient' : formData.color}
                                        </span>
                                    </div>

                                    {/* Palette Category Pills */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '0.85rem' }}>
                                        {COLOR_CATEGORIES.map(cat => {
                                            const isActive = activeColorTab === cat.id;
                                            return (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => setActiveColorTab(cat.id)}
                                                    style={{
                                                        padding: '0.35rem 0.65rem',
                                                        borderRadius: '8px',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 700,
                                                        border: isActive ? '1px solid hsl(var(--primary))' : '1px solid var(--border-subtle)',
                                                        background: isActive ? 'var(--accent-glow)' : 'var(--bg-overlay)',
                                                        color: isActive ? 'hsl(var(--primary))' : 'var(--text-muted)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                >
                                                    {cat.id === 'special-effects' && '✨ '}
                                                    {cat.id === 'vibrant-neon' && '⚡ '}
                                                    {cat.id === 'core-solid' && '🎨 '}
                                                    {cat.id === 'jewel-deep' && '💎 '}
                                                    {cat.title.split(' (')[0]}
                                                </button>
                                            );
                                        })}
                                        <button
                                            type="button"
                                            onClick={() => setActiveColorTab('custom')}
                                            style={{
                                                padding: '0.35rem 0.65rem',
                                                borderRadius: '8px',
                                                fontSize: '0.72rem',
                                                fontWeight: 700,
                                                border: activeColorTab === 'custom' ? '1px solid hsl(var(--primary))' : '1px solid var(--border-subtle)',
                                                background: activeColorTab === 'custom' ? 'var(--accent-glow)' : 'var(--bg-overlay)',
                                                color: activeColorTab === 'custom' ? 'hsl(var(--primary))' : 'var(--text-muted)',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            ⚙️ Custom
                                        </button>
                                    </div>

                                    {/* Swatches Grid for active category */}
                                    {activeColorTab !== 'custom' ? (
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
                                            gap: '8px',
                                            padding: '0.75rem',
                                            borderRadius: '12px',
                                            background: 'var(--bg-overlay)',
                                            border: '1px solid var(--border-subtle)'
                                        }}>
                                            {COLOR_CATEGORIES.find(c => c.id === activeColorTab)?.colors.map(col => {
                                                const isSelected = formData.color === col.value;
                                                return (
                                                    <SafeButton
                                                        key={col.value}
                                                        type="button"
                                                        title={col.label}
                                                        onClick={() => setFormData(p => ({ ...p, color: col.value }))}
                                                        style={{
                                                            height: '38px',
                                                            borderRadius: '9px',
                                                            background: col.value,
                                                            border: isSelected ? '3px solid #ffffff' : '1px solid rgba(255,255,255,0.15)',
                                                            boxShadow: isSelected
                                                                ? `0 0 16px ${toAlphaColor(col.value, 0.9)}`
                                                                : `0 2px 6px ${toAlphaColor(col.value, 0.25)}`,
                                                            cursor: 'pointer',
                                                            transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                                                            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                                                        }}
                                                    >
                                                        <span style={{ display: 'none' }}>{col.label}</span>
                                                    </SafeButton>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.65rem',
                                            padding: '0.85rem',
                                            borderRadius: '12px',
                                            background: 'var(--bg-overlay)',
                                            border: '1px solid var(--border-subtle)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <input
                                                    type="color"
                                                    value={extractBaseColor(formData.color)}
                                                    onChange={(e) => setFormData(p => ({ ...p, color: e.target.value }))}
                                                    style={{
                                                        width: '42px',
                                                        height: '40px',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        border: '1px solid var(--border-subtle)',
                                                        background: 'transparent',
                                                        padding: 0
                                                    }}
                                                />
                                                <input
                                                    type="text"
                                                    value={formData.color}
                                                    onChange={(e) => setFormData(p => ({ ...p, color: e.target.value }))}
                                                    placeholder="#hex or linear-gradient(...)"
                                                    className="hero-input"
                                                    style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.82rem' }}
                                                />
                                            </div>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                Enter any hex code (e.g. #06b6d4) or CSS linear-gradient.
                                            </span>
                                        </div>
                                    )}

                                    {/* Real-time Preview in CampOverview */}
                                    <div style={{
                                        marginTop: '1.25rem',
                                        padding: '0.85rem 1rem',
                                        borderRadius: '14px',
                                        background: 'var(--bg-overlay)',
                                        border: `1px solid ${toAlphaColor(formData.color || '#3b82f6', 0.25)}`,
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            height: '2.5px',
                                            background: formData.color || '#3b82f6',
                                            boxShadow: `0 0 10px ${toAlphaColor(formData.color || '#3b82f6', 0.7)}`
                                        }} />
                                        <div style={{
                                            fontSize: '0.65rem',
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            color: 'var(--text-muted)',
                                            letterSpacing: '0.08em',
                                            marginBottom: '0.6rem'
                                        }}>
                                            CampOverview Preview
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '0.6rem 0.8rem',
                                            borderRadius: '10px',
                                            background: toAlphaColor(formData.color || '#3b82f6', 0.08),
                                            border: `1px solid ${toAlphaColor(formData.color || '#3b82f6', 0.2)}`
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                                                <div style={{
                                                    width: '8px',
                                                    height: '24px',
                                                    borderRadius: '999px',
                                                    background: formData.color || '#3b82f6',
                                                    boxShadow: `0 0 14px ${toAlphaColor(formData.color || '#3b82f6', 0.65)}`,
                                                    flexShrink: 0
                                                }} />
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{
                                                        fontSize: '0.95rem',
                                                        fontWeight: 800,
                                                        color: 'var(--text-main)',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '-0.02em',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}>
                                                        {formData.display_name || 'Channel Name'}
                                                    </div>
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                                        Campaign Lane
                                                    </span>
                                                </div>
                                            </div>
                                            <span style={{
                                                fontSize: '0.7rem',
                                                fontWeight: 800,
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '999px',
                                                background: formData.color?.includes('gradient(') ? formData.color : toAlphaColor(formData.color || '#3b82f6', 0.16),
                                                color: formData.color?.includes('gradient(') ? '#ffffff' : extractBaseColor(formData.color || '#3b82f6'),
                                                border: `1px solid ${toAlphaColor(formData.color || '#3b82f6', 0.35)}`,
                                                boxShadow: `0 0 10px ${toAlphaColor(formData.color || '#3b82f6', 0.3)}`,
                                                flexShrink: 0
                                            }}>
                                                Preview
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </SurfaceCard>

                        {/* 2. Strategic Notes */}
                        <SurfaceCard className="no-lift" style={{
                            flex: '1 1 600px',
                            boxShadow: 'var(--shadow-glass)',
                            borderRadius: '1.25rem',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <div style={{ padding: '0.45rem', background: 'var(--accent-glow)', borderRadius: '10px', color: 'hsl(var(--primary))' }}>
                                        <Globe size={18} strokeWidth={2.5} />
                                    </div>
                                    <h3 style={{ fontSize: '1.08rem', fontWeight: 900, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Strategic Notes</h3>
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
                                        padding: '1rem 1.1rem', background: 'var(--bg-overlay)', borderRadius: '0.9rem', border: '1px solid var(--border-subtle)',
                                        minHeight: '260px', cursor: 'text', lineHeight: 1.6
                                    }}
                                    dangerouslySetInnerHTML={{ __html: formData.metadata || '<p style="font-style:italic; opacity:0.5">Double click to add strategic guidelines...</p>' }}
                                />
                            ) : (
                                <div style={{ flex: 1 }}>
                                    <LazyRichTextEditor
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
