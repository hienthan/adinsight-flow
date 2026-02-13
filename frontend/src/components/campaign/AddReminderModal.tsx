import React, { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Bell, Save, AlertTriangle } from 'lucide-react';
import { pb, formatDateForInput } from '../../lib/pocketbase';
import { Campaign } from '../../types/campaign';

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

    const availableMetrics = ['traffic', 'conversions', 'IS (Impression Share)', 'CPC', 'ROAS', 'Budget Burn Rate'];

    const toggleMetric = (metric: string) => {
        setFormData(prev => ({
            ...prev,
            check_metrics: prev.check_metrics.includes(metric)
                ? prev.check_metrics.filter(m => m !== metric)
                : [...prev.check_metrics, metric]
        }));
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

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'var(--bg-card-glass)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
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
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
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
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.01em' }}>Add Reminder</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                Campaign: <span style={{ color: 'hsl(var(--primary))', fontWeight: 700 }}>{campaign?.name || 'Loading...'}</span>
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
                                <option value="low">Low Priority</option>
                                <option value="medium">Medium Priority</option>
                                <option value="high">High Priority</option>
                            </select>
                        </div>
                    </div>

                    <div className="filter-group">
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '1rem', display: 'block' }}>Metrics to Monitor</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                            {availableMetrics.map(metric => (
                                <button
                                    key={metric}
                                    type="button"
                                    onClick={() => toggleMetric(metric)}
                                    className={`hero-badge ${formData.check_metrics.includes(metric) ? 'active' : ''}`}
                                    style={{
                                        padding: '0.6rem 1rem',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        background: formData.check_metrics.includes(metric) ? 'hsl(var(--primary))' : 'var(--bg-overlay)',
                                        color: formData.check_metrics.includes(metric) ? 'white' : 'var(--text-dim)',
                                        border: formData.check_metrics.includes(metric) ? '1px solid hsl(var(--primary))' : '1px solid var(--border-subtle)',
                                        boxShadow: formData.check_metrics.includes(metric) ? '0 4px 12px hsla(var(--primary) / 0.3)' : 'none'
                                    }}
                                >
                                    {metric}
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
}
