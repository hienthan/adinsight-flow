import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ChevronRight,
    Pin,
    Eye,
    EyeOff,
    Check,
    Loader2,
    StickyNote,
    Bell,
    Plus,
    ChevronDown
} from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { CampaignPlatform, CampaignReminder } from '../../types/campaign';
import RichTextEditor from '../common/RichTextEditor';
import { htmlToPlainText } from '../../lib/noteHtml';
import ReminderItem from '../tracking/ReminderItem';
import AddPlatformReminderModal from '../campaign/AddPlatformReminderModal';
import {
    SAFE_BUTTON_SELECTORS,
    SAFE_CARD_SELECTORS,
    createSafeInteractionScopeCss,
} from '../../lib/uiMotion';
import { SafeButton } from '../common/ui/SafeButton';
import { SurfaceCard } from '../common/ui/SurfaceCard';
import { SectionHeader } from '../common/ui/SectionHeader';

// --- UI HELPERS ---

const getInitials = (displayName: string) => {
    const name = (displayName || '').toLowerCase();
    if (name.includes('traveloka')) return 'TK';
    if (name.includes('klook')) return 'K';
    if (name.includes('trip')) return 'TR';
    return name.substring(0, 2).toUpperCase();
};

const hexToRgba = (hex: string = '#000000', opacity: number = 1) => {
    if (!hex?.startsWith('#')) return hex;
    const r = parseInt(hex.slice(1, 3), 16) || 0;
    const g = parseInt(hex.slice(3, 5), 16) || 0;
    const b = parseInt(hex.slice(5, 7), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const hexToRgbValues = (hex: string = '#000000') => {
    if (!hex?.startsWith('#')) return '0, 0, 0';
    const r = parseInt(hex.slice(1, 3), 16) || 0;
    const g = parseInt(hex.slice(3, 5), 16) || 0;
    const b = parseInt(hex.slice(5, 7), 16) || 0;
    return `${r}, ${g}, ${b}`;
};

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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalPlatformId, setModalPlatformId] = useState<string>('');

    // Fetch Platforms
    const { data: platforms = [], isLoading } = useQuery<CampaignPlatform[]>({
        queryKey: ['campaign-platforms-sticky'],
        queryFn: async () => {
            return await pb.collection('campaign_platforms').getFullList<CampaignPlatform>({
                sort: 'display_name',
            });
        },
        staleTime: 1000 * 60 * 60 * 4, // 4 hours
    });

    // Fetch Platform Reminders (Now from campaign_reminders)
    const { data: allNotes = [] } = useQuery<CampaignReminder[]>({
        queryKey: ['platform-notes'],
        queryFn: async () => {
            return await pb.collection('campaign_reminders').getFullList<CampaignReminder>({
                filter: 'status = "pending" && campaign = null',
                sort: 'reminder_date',
                expand: 'platform'
            });
        },
        staleTime: 1000 * 60 * 60 * 4, // 4 hours
    });

    // Helper to get counts for indicators
    const getReminderStats = (platformId: string) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const todayStr = now.toISOString().split('T')[0];

        const platformNotes = allNotes.filter(n => n.platform === platformId && n.status === 'pending');

        let overdue = 0;
        let today = 0;
        let upcoming = 0;

        platformNotes.forEach(note => {
            if (!note.reminder_date) return;
            const dueDate = new Date(note.reminder_date);
            dueDate.setHours(0, 0, 0, 0);
            const dueStr = dueDate.toISOString().split('T')[0];

            if (dueStr < todayStr) overdue++;
            else if (dueStr === todayStr) today++;
            else upcoming++;
        });

        return { overdue, today, upcoming, total: platformNotes.length };
    };

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
            // First sort by order
            if ((a.order || 0) !== (b.order || 0)) return (a.order || 0) - (b.order || 0);
            // Then by display_name
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
    }, [open, onToggle, pinned]);

    // Reset expansion state when sidebar closes
    useEffect(() => {
        if (!open) {
            setExpandedPlatformId(null);
        }
    }, [open]);

    return (
        <aside
            ref={sidebarRef}
            className={`sticky-sidebar sticky-sidebar-shell ${open ? 'expanded' : 'collapsed'}`}
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
            <style>{`
                ${createSafeInteractionScopeCss('.sticky-sidebar-shell', SAFE_BUTTON_SELECTORS)}
                ${createSafeInteractionScopeCss('.sticky-sidebar-shell', SAFE_CARD_SELECTORS)}
            `}</style>
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
                    {pinnedPlatforms.slice(0, 8).map(p => {
                        const stats = getReminderStats(p.id);
                        const initials = getInitials(p.display_name);
                        const count = stats.overdue || stats.today || stats.upcoming || 0;
                        const badgeColor = stats.overdue > 0 ? '#ef4444' : stats.today > 0 ? '#fbbf24' : '#22c55e';

                        return (
                            <div
                                key={p.id}
                                title={p.display_name}
                                onClick={() => {
                                    setExpandedPlatformId(p.id);
                                    if (!open) onToggle();
                                    else if (expandedPlatformId === p.id) setExpandedPlatformId(null);
                                }}
                                style={{
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '50%',
                                    background: hexToRgba(p.color, 0.12),
                                    color: p.color,
                                    cursor: 'pointer',
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.68rem',
                                    fontWeight: 900,
                                    border: `1px solid ${hexToRgba(p.color, 0.2)}`,
                                    // @ts-ignore
                                    '--pulse-color': hexToRgbValues(p.color)
                                } as any}
                            >
                                {initials}
                                {count > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '-4px',
                                        right: '-4px',
                                        background: badgeColor,
                                        borderRadius: '50%',
                                        width: '12px',
                                        height: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontSize: '7px',
                                        fontWeight: 900,
                                        border: '1px solid var(--bg-card)',
                                        zIndex: 1
                                    }}>
                                        {count}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {open && (
                <>
                    <div style={{
                        padding: '1.25rem 1.5rem',
                        borderBottom: '1px solid var(--border-subtle)',
                    }}>
                        <SectionHeader
                            title="Sticky Hub"
                            actions={<>
                            <SafeButton
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
                            </SafeButton>
                            <SafeButton
                                onClick={() => setShowEmpty(!showEmpty)}
                                className={`hero-btn-ghost ${showEmpty ? 'text-primary' : ''}`}
                                style={{ padding: '0.4rem' }}
                            >
                                {showEmpty ? <Eye size={16} /> : <EyeOff size={16} />}
                            </SafeButton>
                            <SafeButton onClick={onToggle} className="hero-btn-ghost" style={{ padding: '0.4rem' }}>
                                <ChevronRight size={18} />
                            </SafeButton>
                            </>}
                        />
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
                                        <SectionHeader
                                            title={<span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Pin size={10} style={{ fill: 'currentColor' }} /> Pinned Platforms</span>}
                                            style={{ marginBottom: '0.75rem' }}
                                        />
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
                                                    allNotes={allNotes}
                                                    onAddReminder={(id) => {
                                                        setModalPlatformId(id);
                                                        setIsModalOpen(true);
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <SectionHeader
                                        title={<span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                                            {pinnedPlatforms.length > 0 ? 'Other Platforms' : 'All Platforms'}
                                        </span>}
                                        style={{ marginBottom: '0.75rem' }}
                                    />
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
                                                allNotes={allNotes}
                                                onAddReminder={(id) => {
                                                    setModalPlatformId(id);
                                                    setIsModalOpen(true);
                                                }}
                                            />
                                        ))}
                                        {otherPlatforms.length === 0 && !showEmpty && (
                                            <div style={{ padding: '2rem 1rem', textAlign: 'center', background: 'var(--bg-main)', borderRadius: '12px', border: '1px dashed var(--border-subtle)' }}>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>No active sticky notes</div>
                                                <SafeButton onClick={() => setShowEmpty(true)} className="hero-btn hero-btn-ghost" style={{ fontSize: '0.75rem' }}>Show empty platforms to add</SafeButton>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}

            <AddPlatformReminderModal
                platformId={modalPlatformId}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
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
    allNotes: CampaignReminder[];
    onAddReminder: (platformId: string) => void;
}

function PlatformStickyCard({ platform, isExpanded, onToggle, onPin, onSave, isSaving, allNotes, onAddReminder }: CardProps) {
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
        <SurfaceCard
            variant={isExpanded ? 'inset' : 'soft'}
            padding={0}
            radius="12px"
            style={{
                overflow: 'hidden',
                boxShadow: isExpanded ? 'inset 0 2px 4px rgba(0,0,0,0.02)' : 'var(--shadow-soft)'
            }}
        >
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
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {platform.display_name}
                            {allNotes.filter(n => n.platform === platform.id && n.status === 'pending').length > 0 && (
                                <div style={{
                                    padding: '1px 4px',
                                    borderRadius: '3px',
                                    background: hexToRgba(platform.color, 0.1),
                                    color: platform.color,
                                    fontSize: '0.62rem',
                                    fontWeight: 900,
                                    border: `1px solid ${hexToRgba(platform.color, 0.15)}`
                                }}>
                                    {getInitials(platform.display_name)}
                                </div>
                            )}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {isSaving && <Loader2 size={12} className="animate-spin text-primary" />}
                            <SafeButton
                                onClick={onPin}
                                className="hero-btn-ghost"
                                style={{ padding: '0.2rem', color: platform.is_pinned ? 'var(--accent)' : 'var(--text-muted)' }}
                            >
                                <Pin size={12} style={{ fill: platform.is_pinned ? 'currentColor' : 'none' }} />
                            </SafeButton>
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
                            variant="minimal"
                            minHeight={160}
                            maxHeight={400}
                        />

                        {/* Reminders Section */}
                        <PlatformRemindersSection
                            platformNotes={allNotes.filter(n => n.platform === platform.id)}
                            platformColor={platform.color}
                            onAdd={() => onAddReminder(platform.id)}
                        />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
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
        </SurfaceCard>
    );
}

function PlatformRemindersSection({ platformNotes, platformColor, onAdd }: { platformNotes: CampaignReminder[], platformColor?: string, onAdd: () => void }) {
    const queryClient = useQueryClient();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            return await pb.collection('campaign_reminders').update(id, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['platform-notes'] });
            queryClient.invalidateQueries({ queryKey: ['reminders'] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return await pb.collection('campaign_reminders').delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['platform-notes'] });
            queryClient.invalidateQueries({ queryKey: ['reminders'] });
        }
    });

    return (
        <SurfaceCard variant="inset" padding="0.45rem" style={{ marginTop: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isCollapsed ? 0 : '0.25rem' }}>
                <SafeButton
                    type="button"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="hero-btn hero-btn-ghost"
                    style={{ padding: '0.15rem 0.3rem', gap: '0.3rem', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-dim)' }}
                >
                    {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                    <Bell size={13} style={{ color: platformColor || 'hsl(var(--primary))' }} />
                    Reminders
                </SafeButton>
                <SafeButton
                    type="button"
                    onClick={onAdd}
                    className="hero-btn hero-btn-ghost"
                    style={{ padding: '0.15rem 0.35rem', fontSize: '0.7rem' }}
                >
                    <Plus size={12} />
                    Add
                </SafeButton>
            </div>

            {!isCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto' }}>
                    {platformNotes.length === 0 ? (
                        <div style={{
                            padding: '0.75rem',
                            textAlign: 'center',
                            color: 'var(--text-dim)',
                            fontSize: '0.7rem',
                            border: '1px dashed var(--border-subtle)',
                            borderRadius: '8px'
                        }}>
                            No pending platform reminders.
                        </div>
                    ) : (
                        platformNotes.map(note => (
                            <ReminderItem
                                key={note.id}
                                reminder={note}
                                onDelete={() => deleteMutation.mutate(note.id)}
                                onToggle={(id, status) => updateStatusMutation.mutate({ id, status })}
                                platformColor={platformColor}
                                compact={true}
                            />
                        ))
                    )}
                </div>
            )}

        </SurfaceCard>
    )
}
