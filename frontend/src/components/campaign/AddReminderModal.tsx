import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Bell, Save, AlertTriangle } from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { Campaign } from '../../types/campaign';

interface AddReminderModalProps {
    campaignId: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function AddReminderModal({ campaignId, isOpen, onClose }: AddReminderModalProps) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        reminder_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 3 days from now
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
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem'
        }} onClick={onClose}>
            <div
                style={{
                    background: 'var(--bg-card)',
                    width: '100%',
                    maxWidth: '500px',
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
                    overflow: 'hidden',
                    animation: 'scaleIn 0.2s ease-out'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--secondary)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Bell size={20} color="var(--accent)" />
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Add Reminder</h3>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                For: {campaign?.name || 'Loading...'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {error && (
                        <div style={{ background: '#ef444415', border: '1px solid #ef4444', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertTriangle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="filter-group">
                        <label>Reminder Message</label>
                        <input
                            type="text"
                            placeholder="e.g. Check performance after CPC increase"
                            value={formData.message}
                            onChange={e => setFormData({ ...formData, message: e.target.value })}
                            autoFocus
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="filter-group">
                            <label>Due Date</label>
                            <input
                                type="date"
                                value={formData.reminder_date}
                                onChange={e => setFormData({ ...formData, reminder_date: e.target.value })}
                            />
                        </div>
                        <div className="filter-group">
                            <label>Priority</label>
                            <select
                                value={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>

                    <div className="filter-group">
                        <label>Metrics to Check</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {availableMetrics.map(metric => (
                                <button
                                    key={metric}
                                    type="button"
                                    onClick={() => toggleMetric(metric)}
                                    style={{
                                        padding: '0.4rem 0.75rem',
                                        borderRadius: '20px',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        background: formData.check_metrics.includes(metric) ? 'var(--accent)' : 'var(--secondary)',
                                        color: formData.check_metrics.includes(metric) ? 'white' : 'var(--text-dim)',
                                        border: '1px solid var(--border-color)'
                                    }}
                                >
                                    {metric}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '0.75rem 1.25rem',
                                background: 'transparent',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-main)',
                                borderRadius: '10px',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: 'var(--accent)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontWeight: 700
                            }}
                        >
                            <Save size={18} />
                            {loading ? 'Adding...' : 'Save Reminder'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
