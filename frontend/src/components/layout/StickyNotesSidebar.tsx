import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ChevronRight,
    Pin,
    Eye,
    EyeOff,
    Check,
    Loader2,
    StickyNote
} from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { CampaignPlatform } from '../../types/campaign';
import RichTextEditor from '../common/RichTextEditor';
import { htmlToPlainText } from '../../lib/noteHtml';

interface StickyNotesSidebarProps {
    open: boolean;
    pinned: boolean; // Sidebar itself is pinned
    onToggle: () => void;
    onPinToggle: () => void;
}

export default function StickyNotesSidebar({ open, pinned, onToggle, onPinToggle }: StickyNotesSidebarProps) {
    const queryClient = useQueryClient();
    const sidebarRef = useRef<HTMLElement>(null);
    const [expandedPlatformId, setExpandedPlatformId] = useState<string | null>(null);
    const [showEmpty, setShowEmpty] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);

    // Fetch Platforms
    const { data: platforms = [], isLoading } = useQuery<CampaignPlatform[]>({
        queryKey: ['campaign-platforms-sticky'],
        queryFn: async () => {
            return await pb.collection('campaign_platforms').getFullList<CampaignPlatform>({
                sort: 'display_name',
            });
        },
    });

    // Mutations
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<CampaignPlatform> }) => {
            return await pb.collection('campaign_platforms').update(id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campaign-platforms-sticky'] });
            setTimeout(() => setSavingId(null), 1000);
        }
    });

    const togglePin = (platform: CampaignPlatform, e: React.MouseEvent) => {
        e.stopPropagation();
        updateMutation.mutate({
            id: platform.id,
            data: { is_pinned: !platform.is_pinned }
        });
    };

    const handleSaveNote = useCallback((id: string, content: string) => {
        setSavingId(id);
        updateMutation.mutate({
            id,
            data: { sticky_note: content }
        });
    }, [updateMutation]);

    // Sorting Logic
    const sortedPlatforms = useMemo(() => {
        return [...platforms].sort((a, b) => {
            if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
            const aHasNote = !!a.sticky_note?.trim();
            const bHasNote = !!b.sticky_note?.trim();
            if (aHasNote !== bHasNote) return aHasNote ? -1 : 1;
            return a.display_name.localeCompare(b.display_name);
        });
    }, [platforms]);

    const pinnedPlatforms = sortedPlatforms.filter(p => p.is_pinned);
    const otherPlatforms = sortedPlatforms.filter(p => !p.is_pinned && (showEmpty || !!p.sticky_note?.trim()));

    // Hotkey and Click-outside support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
                e.preventDefault();
                onToggle();
            }
        };

        const handleClickOutside = (e: MouseEvent) => {
            if (open && !pinned && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
                onToggle();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('mousedown', handleClickOutside);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousedown', handleClickOutside);
        };
    }, [open, onToggle]);

    return (
        <aside
            ref={sidebarRef}
            className={`sticky-sidebar ${open ? 'expanded' : 'collapsed'}`}
            style={{
                position: 'fixed',
                right: 0,
                top: 0,
                height: '100vh',
                width: open ? '420px' : '48px',
                background: 'var(--bg-card)',
                borderLeft: '1px solid var(--border-subtle)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: open ? '-10px 0 30px rgba(0,0,0,0.1)' : 'none'
            }}
        >
            {/* Toggle Tab */}
            <div
                onClick={onToggle}
                style={{
                    position: 'absolute',
                    left: '-12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '24px',
                    height: '48px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: pinned ? 'not-allowed' : 'pointer',
                    boxShadow: 'var(--shadow-soft)',
                    zIndex: 10,
                    color: pinned ? 'var(--text-muted)' : 'var(--text-dim)',
                    opacity: pinned ? 0.5 : 1
                }}
            >
                {open ? <ChevronRight size={14} /> : <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />}
            </div>

            {!open && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '1.5rem', gap: '1rem' }}>
                    <div style={{ padding: '0.5rem', color: 'hsl(var(--primary))', opacity: 0.8 }}>
                        <StickyNote size={20} />
                    </div>
                    <div style={{ height: '1px', width: '24px', background: 'var(--border-subtle)' }} />
                    {pinnedPlatforms.slice(0, 8).map(p => (
                        <div
                            key={p.id}
                            title={p.display_name}
                            onClick={onToggle}
                            style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '6px',
                                background: p.color,
                                cursor: 'pointer',
                                opacity: 0.8
                            }}
                        />
                    ))}
                </div>
            )}

            {open && (
                <>
                    <div style={{
                        padding: '1.25rem 1.5rem',
                        borderBottom: '1px solid var(--border-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <button
                                onClick={onPinToggle}
                                className="hero-btn-ghost"
                                style={{
                                    padding: '0.4rem',
                                    color: pinned ? 'hsl(var(--primary))' : 'var(--text-dim)',
                                    background: pinned ? 'hsla(var(--primary) / 0.1)' : 'transparent',
                                    borderRadius: '8px'
                                }}
                                title={pinned ? "Unpin Sidebar" : "Pin Sidebar"}
                            >
                                <Pin size={18} style={{ fill: pinned ? 'currentColor' : 'none' }} />
                            </button>
                            <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Sticky Hub</h2>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                                onClick={() => setShowEmpty(!showEmpty)}
                                className={`hero-btn-ghost ${showEmpty ? 'text-primary' : ''}`}
                                style={{ padding: '0.4rem' }}
                            >
                                {showEmpty ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                            <button onClick={onToggle} className="hero-btn-ghost" style={{ padding: '0.4rem' }}>
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
                        {isLoading ? (
                            <div style={{ padding: '4rem 0', textAlign: 'center' }}>
                                <Loader2 className="animate-spin" size={24} style={{ color: 'var(--text-muted)', margin: '0 auto' }} />
                            </div>
                        ) : (
                            <>
                                {pinnedPlatforms.length > 0 && (
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Pin size={10} style={{ fill: 'currentColor' }} /> Pinned Platforms
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {pinnedPlatforms.map(p => (
                                                <PlatformStickyCard
                                                    key={p.id}
                                                    platform={p}
                                                    isExpanded={expandedPlatformId === p.id}
                                                    onToggle={() => setExpandedPlatformId(expandedPlatformId === p.id ? null : p.id)}
                                                    onPin={(e) => togglePin(p, e)}
                                                    onSave={(content) => handleSaveNote(p.id, content)}
                                                    isSaving={savingId === p.id}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                                        {pinnedPlatforms.length > 0 ? 'Other Platforms' : 'All Platforms'}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {otherPlatforms.map(p => (
                                            <PlatformStickyCard
                                                key={p.id}
                                                platform={p}
                                                isExpanded={expandedPlatformId === p.id}
                                                onToggle={() => setExpandedPlatformId(expandedPlatformId === p.id ? null : p.id)}
                                                onPin={(e) => togglePin(p, e)}
                                                onSave={(content) => handleSaveNote(p.id, content)}
                                                isSaving={savingId === p.id}
                                            />
                                        ))}
                                        {otherPlatforms.length === 0 && !showEmpty && (
                                            <div style={{ padding: '2rem 1rem', textAlign: 'center', background: 'var(--bg-main)', borderRadius: '12px', border: '1px dashed var(--border-subtle)' }}>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>No active sticky notes</div>
                                                <button onClick={() => setShowEmpty(true)} className="hero-btn hero-btn-ghost" style={{ fontSize: '0.75rem' }}>Show empty platforms to add</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}
        </aside>
    );
}

interface CardProps {
    platform: CampaignPlatform;
    isExpanded: boolean;
    onToggle: () => void;
    onPin: (e: React.MouseEvent) => void;
    onSave: (content: string) => void;
    isSaving: boolean;
}

function PlatformStickyCard({ platform, isExpanded, onToggle, onPin, onSave, isSaving }: CardProps) {
    const [localContent, setLocalContent] = useState(platform.sticky_note || '');
    const previewText = useMemo(() => htmlToPlainText(platform.sticky_note || ''), [platform.sticky_note]);

    useEffect(() => {
        if (!isExpanded) {
            setLocalContent(platform.sticky_note || '');
        }
    }, [isExpanded, platform.sticky_note]);

    useEffect(() => {
        if (!isExpanded || localContent === platform.sticky_note) return;
        const timer = setTimeout(() => {
            onSave(localContent);
        }, 800);
        return () => clearTimeout(timer);
    }, [localContent, isExpanded, platform.sticky_note, onSave]);

    return (
        <div style={{
            background: isExpanded ? 'var(--bg-main)' : 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            overflow: 'hidden',
            transition: 'all 0.2s ease',
            boxShadow: isExpanded ? 'inset 0 2px 4px rgba(0,0,0,0.02)' : 'var(--shadow-soft)'
        }}>
            <div
                onClick={onToggle}
                style={{
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    position: 'relative'
                }}
            >
                <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '4px', background: platform.color, borderRadius: '0 4px 4px 0' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isExpanded ? '0' : '0.25rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {platform.display_name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {isSaving && <Loader2 size={12} className="animate-spin text-primary" />}
                            <button
                                onClick={onPin}
                                className="hero-btn-ghost"
                                style={{ padding: '0.2rem', color: platform.is_pinned ? 'var(--accent)' : 'var(--text-muted)' }}
                            >
                                <Pin size={12} style={{ fill: platform.is_pinned ? 'currentColor' : 'none' }} />
                            </button>
                        </div>
                    </div>
                    {!isExpanded && (
                        <div style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-dim)',
                            lineHeight: 1.4,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            fontStyle: previewText ? 'normal' : 'italic'
                        }}>
                            {previewText || 'No sticky note...'}
                        </div>
                    )}
                </div>
                <div style={{ color: 'var(--text-muted)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'none' }}>
                    <ChevronRight size={14} />
                </div>
            </div>

            {isExpanded && (
                <div style={{ padding: '0 1rem 1rem 1rem' }}>
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                        <RichTextEditor
                            value={localContent}
                            onChange={setLocalContent}
                            placeholder={`Strategy for ${platform.display_name}...`}
                            minHeight={160}
                            maxHeight={400}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Auto-saves as you type</span>
                            {isSaving ? (
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Loader2 size={10} className="animate-spin" /> Saving...
                                </span>
                            ) : (
                                <span style={{ fontSize: '0.65rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Check size={10} /> Saved
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
