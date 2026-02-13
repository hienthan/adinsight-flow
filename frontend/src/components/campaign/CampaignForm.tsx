import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ShieldCheck, Lock } from 'lucide-react';
import { pb, formatDateForInput } from '../../lib/pocketbase';
import { Campaign, CampaignPlatform } from '../../types/campaign';

interface CampaignFormProps {
    campaignId?: string;
    onCancel?: () => void;
    onSuccess?: (campaign: Campaign) => void;
    formId?: string;
    hideActions?: boolean;
    onDirtyChange?: (isDirty: boolean) => void;
    onSubmittingChange?: (isSubmitting: boolean) => void;
}

const getLocalDateInputValue = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const normalizeForComparison = (field: keyof Campaign, value: any) => {
    if (field === 'created_date') return formatDateForInput(value || '');
    if (field === 'is_dsa') return Boolean(value);
    if (field === 'cpc' || field === 'max_daily_budget') return value === null || value === undefined ? null : Number(value);
    if (field === 'name' || field === 'status' || field === 'platform' || field === 'keywords' || field === 'description' || field === 'general_notes') {
        return (value ?? '').toString().trim();
    }
    return value;
};

const toComparableNumber = (value: any): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};

export default function CampaignForm({
    campaignId,
    onCancel,
    onSuccess,
    formId,
    hideActions = false,
    onDirtyChange,
    onSubmittingChange,
}: CampaignFormProps) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const queryClient = useQueryClient();

    const platformIdFromUrl = searchParams.get('platformId');

    const [formData, setFormData] = useState<Partial<Campaign>>({
        name: '',
        status: 'active',
        platform: platformIdFromUrl || '',
        cpc: 0,
        max_daily_budget: 0,
        keywords: '',
        chatgpt_metadata: '',
        description: '',
        general_notes: '',
        is_dsa: true, // Default to true
        created_date: getLocalDateInputValue(),
    });
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
            setFormData({
                ...existingCampaign,
                created_date: formatDateForInput(existingCampaign.created_date),
            });
        } else if (platformIdFromUrl) {
            setFormData(prev => ({ ...prev, platform: platformIdFromUrl }));
        }
    }, [existingCampaign, platformIdFromUrl]);

    const hasFormChanges = useMemo(() => {
        if (!campaignId || !existingCampaign) return true;
        const editableFields: (keyof Campaign)[] = [
            'name',
            'status',
            'platform',
            'cpc',
            'max_daily_budget',
            'keywords',
            'description',
            'general_notes',
            'is_dsa',
            'created_date',
        ];
        return editableFields.some((field) => {
            const oldValue = normalizeForComparison(field, existingCampaign[field]);
            const newValue = normalizeForComparison(field, formData[field]);
            return JSON.stringify(oldValue) !== JSON.stringify(newValue);
        });
    }, [campaignId, existingCampaign, formData]);

    useEffect(() => {
        onDirtyChange?.(hasFormChanges);
    }, [hasFormChanges, onDirtyChange]);

    useEffect(() => {
        onSubmittingChange?.(loading);
    }, [loading, onSubmittingChange]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
            return;
        }
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) : value,
        }));
    };

    // Keyword tag logic removed as keywords is now a long-form text field

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
                const trackedFields: (keyof Campaign)[] = ['cpc', 'max_daily_budget', 'keywords'];
                const changes: any[] = [];
                trackedFields.forEach((field) => {
                    const oldValue = existingCampaign[field];
                    const newValue = formData[field];

                    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                        changes.push({
                            field_changed: field,
                            old_value: oldValue,
                            new_value: newValue,
                        });
                    }
                });

                if (!hasFormChanges) {
                    setLoading(false);
                    return;
                }

                const previousCpc = toComparableNumber(existingCampaign.cpc);
                const nextCpc = toComparableNumber(formData.cpc);
                const cpcDiff = previousCpc !== null && nextCpc !== null ? nextCpc - previousCpc : 0;
                const cpcChanged = Math.abs(cpcDiff) >= 0.0001;
                const reviewOutcome: Campaign['last_review_outcome'] =
                    cpcChanged
                        ? (cpcDiff > 0 ? 'cpc_increase' : 'cpc_reduce')
                        : (hasFormChanges ? 'updated' : 'no_change');

                const updatePayload = {
                    ...formData,
                    last_reviewed_date: getLocalDateInputValue(),
                    last_review_outcome: reviewOutcome,
                };
                savedRecord = await pb.collection('campaigns').update<Campaign>(campaignId, updatePayload);

                for (const change of changes) {
                    await pb.collection('campaign_changes').create({
                        campaign: campaignId,
                        change_date: new Date().toISOString(),
                        ...change,
                        metadata: { auto_detected: true }
                    });
                }
            } else {
                savedRecord = await pb.collection('campaigns').create<Campaign>(formData as any);
            }

            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });

            if (onSuccess) onSuccess(savedRecord);
            else navigate('/camp-tracking');
        } catch (err: any) {
            setError(err.message || 'Failed to save campaign');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form id={formId} onSubmit={handleSubmit} className="animate-fade">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

                {error && (
                    <div className="hero-badge" style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid #ef444430',
                        color: '#ef4444',
                        padding: '0.85rem',
                        textTransform: 'none',
                        fontSize: '0.8rem',
                        width: '100%'
                    }}>
                        <AlertTriangle size={16} />
                        {error}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div className="filter-group">
                        <label>Campaign Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name || ''}
                            onChange={handleChange}
                            placeholder="e.g. HK Experiences - Summer Sales"
                            required
                        />
                    </div>

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
                                <option key={p.id} value={p.id}>{p.display_name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
                    <div className="filter-group">
                        <label>Status</label>
                        <select name="status" value={formData.status || 'active'} onChange={handleChange}>
                            <option value="active">Active</option>
                            <option value="paused">Paused</option>
                            <option value="testing">Testing</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Start Date</label>
                        <input
                            type="date"
                            name="created_date"
                            value={formData.created_date || ''}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="filter-group">
                        <label>DSA Support</label>
                        <div
                            className={`hero-card ${formData.is_dsa ? 'active' : ''}`}
                            onClick={() => setFormData(f => ({ ...f, is_dsa: !f.is_dsa }))}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.55rem 1rem',
                                cursor: 'pointer',
                                background: formData.is_dsa ? 'var(--accent-glow)' : 'var(--bg-content)',
                                borderColor: formData.is_dsa ? 'hsl(var(--primary))' : 'var(--border-subtle)',
                                userSelect: 'none'
                            }}
                        >
                            {formData.is_dsa ? <ShieldCheck size={18} color="hsl(var(--primary))" /> : <Lock size={18} color="var(--text-dim)" />}
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: formData.is_dsa ? 'hsl(var(--primary))' : 'var(--text-dim)' }}>
                                {formData.is_dsa ? 'DSA Active' : 'Manual only'}
                            </span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div className="filter-group">
                        <label>CPC ($)</label>
                        <input
                            type="number"
                            name="cpc"
                            value={formData.cpc || 0}
                            onChange={handleChange}
                            min="0"
                            placeholder="000"
                        />
                    </div>
                    <div className="filter-group">
                        <label>Max Daily Budget ($)</label>
                        <input
                            type="number"
                            name="max_daily_budget"
                            value={formData.max_daily_budget || 0}
                            onChange={handleChange}
                            min="0"
                            placeholder="000"
                        />
                    </div>
                </div>

                {!formData.is_dsa && (
                    <div className="filter-group">
                        <label>Active Keywords (Running)</label>
                        <textarea
                            name="keywords"
                            value={formData.keywords || ''}
                            onChange={handleChange}
                            placeholder="Enter list of running keywords..."
                            style={{ minHeight: '120px' }}
                        />
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div className="filter-group">
                        <label>Strategy & Objective</label>
                        <textarea
                            name="description"
                            value={formData.description || ''}
                            onChange={handleChange}
                            placeholder="Objective, target audience..."
                            style={{ minHeight: '90px' }}
                        />
                    </div>
                    <div className="filter-group">
                        <label>Internal Notes</label>
                        <textarea
                            name="general_notes"
                            value={formData.general_notes || ''}
                            onChange={handleChange}
                            placeholder="Implementation details..."
                            style={{ minHeight: '90px' }}
                        />
                    </div>
                </div>

                {!hideActions && (
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={onCancel || (() => navigate(-1))}
                            className="hero-btn hero-btn-ghost"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || (!!campaignId && !hasFormChanges)}
                            className="hero-btn hero-btn-primary"
                            style={{ minWidth: '140px' }}
                        >
                            {loading ? 'Saving...' : (campaignId ? 'Update' : 'Create Campaign')}
                        </button>
                    </div>
                )}
            </div>
        </form>
    );
}
