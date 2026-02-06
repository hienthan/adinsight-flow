import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, X, AlertTriangle } from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { Campaign, CampaignPlatform } from '../../types/campaign';

interface CampaignFormProps {
    campaignId?: string;
    onCancel?: () => void;
    onSuccess?: (campaign: Campaign) => void;
}

export default function CampaignForm({ campaignId, onCancel, onSuccess }: CampaignFormProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState<Partial<Campaign>>({
        name: '',
        status: 'active',
        platform: '',
        cpc: 0,
        max_daily_budget: 0,
        keywords: [],
        description: '',
        general_notes: '',
        created_date: new Date().toISOString().split('T')[0],
    });
    const [keywordInput, setKeywordInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch platforms for the dropdown
    const { data: platforms = [] } = useQuery<CampaignPlatform[]>({
        queryKey: ['platforms'],
        queryFn: async () => {
            return await pb.collection('campaign_platforms').getFullList<CampaignPlatform>({
                sort: 'display_name',
            });
        },
    });

    // Fetch campaign data if editing
    const { data: existingCampaign } = useQuery<Campaign>({
        queryKey: ['campaign', campaignId],
        queryFn: async () => {
            if (!campaignId) return null as any;
            return await pb.collection('campaigns').getOne<Campaign>(campaignId);
        },
        enabled: !!campaignId,
    });

    // Initialize form with existing data
    useEffect(() => {
        if (existingCampaign) {
            // Ensure keywords is an array
            const keywords = Array.isArray(existingCampaign.keywords) ? existingCampaign.keywords : [];

            setFormData({
                ...existingCampaign,
                keywords,
                created_date: existingCampaign.created_date.split('T')[0],
            });
        }
    }, [existingCampaign]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) : value,
        }));
    };

    const handleAddKeyword = (e: React.FormEvent | React.MouseEvent) => {
        e.preventDefault();
        const currentKeywords = Array.isArray(formData.keywords) ? formData.keywords : [];
        if (keywordInput.trim() && !currentKeywords.includes(keywordInput.trim())) {
            setFormData((prev) => ({
                ...prev,
                keywords: [...currentKeywords, keywordInput.trim()],
            }));
            setKeywordInput('');
        }
    };

    const removeKeyword = (kw: string) => {
        const currentKeywords = Array.isArray(formData.keywords) ? formData.keywords : [];
        setFormData((prev) => ({
            ...prev,
            keywords: currentKeywords.filter((k: string) => k !== kw),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!formData.platform) throw new Error('Please select a platform');
            if (!formData.name) throw new Error('Please enter a campaign name');

            let savedRecord: Campaign;

            if (campaignId && existingCampaign) {
                // --- CHANGE DETECTION ---
                const trackedFields: (keyof Campaign)[] = ['cpc', 'max_daily_budget', 'keywords', 'status'];
                const changes: any[] = [];

                trackedFields.forEach((field) => {
                    const oldValue = existingCampaign[field];
                    const newValue = formData[field];

                    // Simple comparison for numbers/strings/arrays
                    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                        changes.push({
                            field_changed: field,
                            old_value: oldValue,
                            new_value: newValue,
                        });
                    }
                });

                // 1. Update campaign
                savedRecord = await pb.collection('campaigns').update<Campaign>(campaignId, formData);

                // 2. Log changes if any
                for (const change of changes) {
                    await pb.collection('campaign_changes').create({
                        campaign: campaignId,
                        change_date: new Date().toISOString(),
                        ...change,
                        metadata: { auto_detected: true }
                    });
                }
            } else {
                // --- CREATE NEW ---
                savedRecord = await pb.collection('campaigns').create<Campaign>(formData as any);
            }

            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });

            if (onSuccess) {
                onSuccess(savedRecord);
            } else {
                navigate('/camp-tracking');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to save campaign');
        } finally {
            setLoading(false);
        }
    };

    const currentKeywords = Array.isArray(formData.keywords) ? formData.keywords : [];

    return (
        <form onSubmit={handleSubmit} className="animate-fade">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* Error message */}
                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid #ef4444',
                        color: '#ef4444',
                        padding: '1rem',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                    }}>
                        <AlertTriangle size={18} />
                        {error}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    {/* Campaign Name */}
                    <div className="filter-group">
                        <label>Campaign Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name || ''}
                            onChange={handleChange}
                            placeholder="e.g. Hong Kong Disneyland - Summer 2024"
                            required
                        />
                    </div>

                    {/* Platform */}
                    <div className="filter-group">
                        <label>Platform</label>
                        <select
                            name="platform"
                            value={formData.platform || ''}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select Platform...</option>
                            {platforms.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.display_name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                    {/* Status */}
                    <div className="filter-group">
                        <label>Status</label>
                        <select name="status" value={formData.status || 'active'} onChange={handleChange}>
                            <option value="active">Active</option>
                            <option value="paused">Paused</option>
                            <option value="testing">Testing</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>

                    {/* Start Date */}
                    <div className="filter-group">
                        <label>Start Date</label>
                        <input
                            type="date"
                            name="created_date"
                            value={formData.created_date || ''}
                            onChange={handleChange}
                        />
                    </div>

                    {/* CPC */}
                    <div className="filter-group">
                        <label>CPC ($)</label>
                        <input
                            type="number"
                            name="cpc"
                            value={formData.cpc || 0}
                            onChange={handleChange}
                            step="0.01"
                            min="0"
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    {/* Daily Budget */}
                    <div className="filter-group">
                        <label>Max Daily Budget ($)</label>
                        <input
                            type="number"
                            name="max_daily_budget"
                            value={formData.max_daily_budget || 0}
                            onChange={handleChange}
                            min="0"
                        />
                    </div>

                    {/* Keywords Tagging */}
                    <div className="filter-group">
                        <label>Keywords</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="text"
                                value={keywordInput}
                                onChange={(e) => setKeywordInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword(e)}
                                placeholder="Add keyword..."
                                style={{ flex: 1 }}
                            />
                            <button
                                type="button"
                                onClick={handleAddKeyword}
                                style={{ padding: '0 1rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-main)' }}
                            >
                                Add
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {currentKeywords.map((kw: string) => (
                                <span
                                    key={kw}
                                    className="badge"
                                    style={{ background: 'var(--secondary)', color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                >
                                    {kw}
                                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeKeyword(kw)} />
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="filter-group">
                    <label>Strategy & Objective (Description)</label>
                    <textarea
                        name="description"
                        value={formData.description || ''}
                        onChange={handleChange}
                        placeholder="What is this campaign trying to achieve?"
                        style={{
                            minHeight: '100px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            color: 'var(--text-main)',
                            resize: 'vertical'
                        }}
                    />
                </div>

                {/* Notes */}
                <div className="filter-group">
                    <label>General Notes</label>
                    <textarea
                        name="general_notes"
                        value={formData.general_notes || ''}
                        onChange={handleChange}
                        placeholder="Observations, ad copy variations, performance notes..."
                        style={{
                            minHeight: '100px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            color: 'var(--text-main)',
                            resize: 'vertical'
                        }}
                    />
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                    <button
                        type="button"
                        onClick={onCancel || (() => navigate(-1))}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: 'transparent',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-main)',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '0.75rem 2rem',
                            background: 'var(--accent)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontWeight: 600
                        }}
                    >
                        <Save size={18} />
                        {loading ? 'Saving...' : (campaignId ? 'Update Campaign' : 'Create Campaign')}
                    </button>
                </div>
            </div>
        </form>
    );
}
