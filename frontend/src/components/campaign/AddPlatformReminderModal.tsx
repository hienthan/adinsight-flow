import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Bell, Save, AlertTriangle } from 'lucide-react';
import { pb, formatDateForInput } from '../../lib/pocketbase';
import { CampaignPlatform } from '../../types/campaign';

interface AddPlatformReminderModalProps {
    platformId: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function AddPlatformReminderModal({ platformId, isOpen, onClose }: AddPlatformReminderModalProps) {
    const queryClient = useQueryClient();
    const shouldCloseOnBackdropClickRef = useRef(false);
    const [formData, setFormData] = useState({
        due_date: formatDateForInput(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()), // Default 3 days from now
        message: '',
        priority: 'medium'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch platform name for the header
    const { data: platform } = useQuery<CampaignPlatform>({
        queryKey: ['campaign-platform', platformId],
        queryFn: async () => {
            return await pb.collection('campaign_platforms').getOne<CampaignPlatform>(platformId);
        },
        enabled: !!platformId && isOpen
    });

    const quickOptions = ['RSA', 'DSA', '!URL'];

    const handleQuickOption = (opt: string) => {
        setFormData(prev => {
            let newMessage = prev.message.trim();
            if (newMessage) {
                newMessage = newMessage.endsWith(',') ? `${newMessage} ${opt}` : `${newMessage}, ${opt}`;
            } else {
                newMessage = opt;
            }
            return { ...prev, message: newMessage };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.message) {
            setError('Please enter a reminder message');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await pb.collection('campaign_reminders').create({
                campaign: null,
                platform: platformId,
                reminder_date: new Date(formData.due_date).toISOString(),
                message: formData.message,
                priority: formData.priority,
                status: 'pending',
                check_metrics: []
            });

            queryClient.invalidateQueries({ queryKey: ['platform-notes'] });
            queryClient.invalidateQueries({ queryKey: ['reminders'] });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create reminder');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
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
            right: 0,
            bottom: 0,
            background: 'rgba(2, 6, 23, 0.75)',
            /* GPU hack removed */
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '1.5rem'
        }}
            onMouseDown={(e) => {
                shouldCloseOnBackdropClickRef.current = e.target === e.currentTarget;
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget && shouldCloseOnBackdropClickRef.current) {
                    onClose();
                }
                shouldCloseOnBackdropClickRef.current = false;
            }}
        >
            <div
                className="hero-card animate-scale-in"
                style={{
                    width: '100%',
                    maxWidth: '520px',
                    padding: 0,
                    overflow: 'hidden',
                    background: 'var(--bg-content)',
                    borderRadius: '2rem',
                    boxShadow: 'var(--shadow-large)',
                    pointerEvents: 'auto',
                    /* GPU hack removed */
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div style={{
                    padding: '2rem 2.5rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--bg-overlay)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '0.6rem', background: 'var(--accent-glow)', borderRadius: '12px', color: 'hsl(var(--primary))' }}>
                            <Bell size={24} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.01em' }}>Add Platform Reminder</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                Platform: <span style={{ color: platform?.color || 'hsl(var(--primary))', fontWeight: 700 }}>{platform?.display_name || 'Loading...'}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="hero-btn-ghost"
                        style={{ padding: '0.5rem', borderRadius: '10px' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSubmit} style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                    {error && (
                        <div className="hero-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', width: '100%', textTransform: 'none', padding: '0.8rem 1rem', display: 'flex', gap: '0.6rem', fontSize: '0.85rem', fontWeight: 700 }}>
                            <AlertTriangle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="filter-group">
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Reminder Message</label>
                        <input
                            type="text"
                            className="hero-input"
                            placeholder="e.g. Check performance after CPC increase"
                            value={formData.message}
                            onChange={e => setFormData({ ...formData, message: e.target.value })}
                            autoFocus
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="filter-group">
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Due Date</label>
                            <input
                                type="date"
                                className="hero-input"
                                value={formData.due_date}
                                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                            />
                        </div>
                        <div className="filter-group">
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Priority</label>
                            <select
                                className="hero-select"
                                value={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                            </select>
                        </div>
                    </div>

                    <div className="filter-group">
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '1rem', display: 'block' }}>Quick Options</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                            {quickOptions.map(opt => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => handleQuickOption(opt)}
                                    className="hero-badge"
                                    style={{
                                        padding: '0.6rem 1rem',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        background: 'var(--bg-overlay)',
                                        color: 'var(--text-dim)',
                                        border: '1px solid var(--border-subtle)'
                                    }}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="hero-btn hero-btn-secondary"
                            style={{ padding: '0.8rem 1.5rem' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="hero-btn hero-btn-primary"
                            style={{
                                padding: '0.8rem 2rem',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            <Save size={18} />
                            {loading ? 'Saving...' : 'Create Reminder'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
