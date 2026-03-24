import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Bell, Save, AlertTriangle } from 'lucide-react';
import { pb, formatDateForInput } from '../../lib/pocketbase';
import { Campaign } from '../../types/campaign';
import { FilterChip, SafeButton, SurfaceCard, SectionHeader } from '../common/ui';

interface AddReminderModalProps {
    campaignId: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function AddReminderModal({ campaignId, isOpen, onClose }: AddReminderModalProps) {
    const queryClient = useQueryClient();
    const shouldCloseOnBackdropClickRef = useRef(false);
    const [formData, setFormData] = useState({
        reminder_date: formatDateForInput(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()), // Default 3 days from now
        message: '',
        priority: 'medium',
        check_metrics: [] as string[]
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch campaign name for the header
    const { data: campaign } = useQuery<Campaign>({
        queryKey: ['campaign', campaignId],
        queryFn: async () => {
            return await pb.collection('campaigns').getOne<Campaign>(campaignId);
        },
        enabled: !!campaignId && isOpen
    });

    const availableMetrics = ['TRAFFIC', 'CONVERSIONS', 'IS', 'CPC', 'ROAS', 'CONV DELAY', 'mCPC KEYS', 'RSA', 'rLink', '!URL'];

    const toggleMetric = (metric: string) => {
        setFormData(prev => {
            const isSelected = prev.check_metrics.includes(metric);
            const newMetrics = isSelected
                ? prev.check_metrics.filter(m => m !== metric)
                : [...prev.check_metrics, metric];

            let newMessage = prev.message.trim();
            if (!isSelected) {
                if (newMessage) {
                    newMessage = newMessage.endsWith(',') ? `${newMessage} ${metric}` : `${newMessage}, ${metric}`;
                } else {
                    newMessage = metric;
                }
            } else {
                const escapedMetric = metric.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                newMessage = newMessage.replace(new RegExp(escapedMetric, 'gi'), '').trim();
                newMessage = newMessage.replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/,\s*$/, '').trim();
            }

            return {
                ...prev,
                check_metrics: newMetrics,
                message: newMessage
            };
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
                campaign: campaignId,
                reminder_date: formData.reminder_date,
                message: formData.message,
                priority: formData.priority,
                check_metrics: formData.check_metrics,
                status: 'pending'
            });

            queryClient.invalidateQueries({ queryKey: ['campaign-reminders', campaignId] });
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
            zIndex: 1100,
            padding: '1rem'
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
            <SurfaceCard
                className="animate-scale-in"
                radius="2rem"
                padding={0}
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: '500px',
                    pointerEvents: 'auto',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-large)',
                }}
            >
                <div style={{
                    padding: '1.2rem 1.4rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: 'var(--bg-overlay)'
                }}>
                    <SectionHeader
                        title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ padding: '0.45rem', background: 'var(--accent-glow)', borderRadius: '10px', color: 'hsl(var(--primary))' }}>
                                    <Bell size={20} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.01em' }}>Add Reminder</h3>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                        Campaign: <span style={{ color: 'hsl(var(--primary))', fontWeight: 700 }}>{campaign?.name || 'Loading...'}</span>
                                    </p>
                                </div>
                            </div>
                        }
                        actions={
                            <SafeButton
                                onClick={onClose}
                                className="hero-btn-ghost"
                                style={{ padding: '0.35rem', borderRadius: '8px' }}
                            >
                                <X size={18} />
                            </SafeButton>
                        }
                    />
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '1.2rem 1.4rem 1.3rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {error && (
                        <div className="hero-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', width: '100%', textTransform: 'none', padding: '0.65rem 0.8rem', display: 'flex', gap: '0.5rem', fontSize: '0.78rem', fontWeight: 700 }}>
                            <AlertTriangle size={14} />
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                        <div className="filter-group">
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Due Date</label>
                            <input
                                type="date"
                                className="hero-input"
                                value={formData.reminder_date}
                                onChange={e => setFormData({ ...formData, reminder_date: e.target.value })}
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
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.6rem', display: 'block' }}>Metrics to Monitor</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {availableMetrics.map(metric => (
                                <FilterChip
                                    key={metric}
                                    onClick={() => toggleMetric(metric)}
                                    active={formData.check_metrics.includes(metric)}
                                    activeBackground="hsl(var(--primary))"
                                    inactiveBackground="var(--bg-overlay)"
                                    activeBorder="hsl(var(--primary))"
                                    inactiveBorder="var(--border-subtle)"
                                    activeColor="white"
                                    inactiveColor="var(--text-dim)"
                                    activeShadow="0 4px 12px hsla(var(--primary) / 0.3)"
                                    style={{
                                        padding: '0.45rem 0.8rem',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                    }}
                                >
                                    {metric}
                                </FilterChip>
                            ))}
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div style={{ display: 'flex', gap: '0.7rem', marginTop: '0.4rem', justifyContent: 'flex-end' }}>
                        <SafeButton
                            type="button"
                            onClick={onClose}
                            className="hero-btn hero-btn-secondary"
                            style={{ padding: '0.62rem 1rem' }}
                        >
                            Cancel
                        </SafeButton>
                        <SafeButton
                            type="submit"
                            disabled={loading}
                            className="hero-btn hero-btn-primary"
                            style={{
                                padding: '0.62rem 1.2rem',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            <Save size={16} />
                            {loading ? 'Saving...' : 'Create Reminder'}
                        </SafeButton>
                    </div>
                </form>
            </SurfaceCard>
        </div>
    );

    return createPortal(modalContent, document.body);
}
