import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Maximize2 } from 'lucide-react';
import { pb, formatDateForInput } from '../../lib/pocketbase';
import { Campaign, CampaignPlatform } from '../../types/campaign';
import LazyRichTextEditor from '../common/LazyRichTextEditor';
import { normalizeHtmlForCompare } from '../../lib/noteHtml';
import MetadataModal from './MetadataModal';
import { SurfaceCard } from '../common/ui';

interface CampaignFormProps {
    campaignId?: string;
    onCancel?: () => void;
    onSuccess?: (campaign: Campaign) => void;
    formId?: string;
    hideActions?: boolean;
    layoutVariant?: 'default' | 'modal';
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
    if (field === 'is_testing') return Boolean(value);
    if (field === 'is_case_study') return Boolean(value);
    if (field === 'is_portfolio') return Boolean(value);
    if (field === 'priority') return value || 'normal';
    if (field === 'leads') return value || 'all';
    if (field === 'cpc' || field === 'max_daily_budget' || field === 'target_cpa' || field === 'target_roas') {
        const val = toComparableNumber(value);
        return val === 0 ? null : val; // Normalize 0 to null for stable comparison with DB
    }
    if (field === 'general_notes' || field === 'metadata') return normalizeHtmlForCompare((value ?? '').toString());
    if (field === 'bidding_strategy') {
        const val = (value ?? '').toString().trim();
        return val === '' ? 'max_clicks' : val;
    }
    if (field === 'name' || field === 'status' || field === 'platform' || field === 'keywords' || field === 'description') {
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
    layoutVariant = 'default',
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
        bidding_strategy: 'max_clicks',
        target_cpa: 0,
        target_roas: 0,
        keywords: '',
        chatgpt_metadata: '',
        metadata: '',
        description: '',
        general_notes: '',
        is_dsa: true,
        is_testing: false,
        is_case_study: false,
        is_portfolio: false,
        leads: 'all',
        priority: 'normal',
        created_date: getLocalDateInputValue(),
    });
    const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isModalLayout = layoutVariant === 'modal';

    const { data: platforms = [] } = useQuery<CampaignPlatform[]>({
        queryKey: ['platforms'],
        queryFn: async () => {
            return await pb.collection('campaign_platforms').getFullList<CampaignPlatform>({
                sort: 'order,display_name',
            });
        },
    });

    const isLeadsSupportedPlatform = React.useMemo(() => {
        const selectedPlatformId = formData.platform;
        if (!selectedPlatformId) return false;
        const selectedPlat = platforms.find(p => p.id === selectedPlatformId);
        const platName = selectedPlat?.platform_name?.toLowerCase();
        return platName === 'tripdirect' || platName === 'huytrip';
    }, [formData.platform, platforms]);

    const { data: existingCampaign } = useQuery<Campaign>({
        queryKey: ['campaign', campaignId],
        queryFn: async () => {
            if (!campaignId) return null as any;
            return await pb.collection('campaigns').getOne<Campaign>(campaignId);
        },
        enabled: !!campaignId,
    });

    useEffect(() => {
        if (existingCampaign) {
            setFormData({
                ...existingCampaign,
                created_date: formatDateForInput(existingCampaign.created_date),
                is_testing: Boolean(existingCampaign.is_testing),
                is_case_study: Boolean(existingCampaign.is_case_study),
                is_portfolio: Boolean(existingCampaign.is_portfolio),
                leads: existingCampaign.leads || 'all',
                priority: existingCampaign.priority || 'normal'
            });
        } else if (platformIdFromUrl) {
            setFormData(prev => ({ ...prev, platform: platformIdFromUrl }));
        }
    }, [existingCampaign, platformIdFromUrl]);

    const hasFormChanges = useMemo(() => {
        if (!campaignId) return true;
        // While loading or before data is synced to formData, don't consider it dirty
        if (!existingCampaign || formData.id !== campaignId) return false;
        const editableFields: (keyof Campaign)[] = [
            'name',
            'status',
            'platform',
            'cpc',
            'max_daily_budget',
            'bidding_strategy',
            'target_cpa',
            'target_roas',
            'keywords',
            'description',
            'metadata',
            'general_notes',
            'is_dsa',
            'is_testing',
            'is_case_study',
            'is_portfolio',
            'leads',
            'priority',
            'created_date',
        ];
        return editableFields.some((field) => {
            const oldValue = normalizeForComparison(field, existingCampaign[field]);
            const newValue = normalizeForComparison(field, formData[field]);
            return oldValue !== newValue && JSON.stringify(oldValue) !== JSON.stringify(newValue);
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
        if (name === 'platform') {
            const selectedPlat = platforms.find(p => p.id === value);
            const platName = selectedPlat?.platform_name?.toLowerCase();
            const supportsLeads = platName === 'tripdirect' || platName === 'huytrip';
            setFormData(prev => ({
                ...prev,
                platform: value,
                leads: supportsLeads ? prev.leads || 'all' : 'all'
            }));
            return;
        }
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value,
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
                const trackedFields: (keyof Campaign)[] = ['cpc', 'max_daily_budget', 'bidding_strategy', 'target_cpa', 'target_roas', 'description', 'leads', 'is_portfolio'];
                const changes: any[] = [];
                trackedFields.forEach((field) => {
                    const oldValue = normalizeForComparison(field, existingCampaign[field]);
                    const newValue = normalizeForComparison(field, formData[field]);
                    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                        changes.push({
                            field_changed: field,
                            old_value: existingCampaign[field],
                            new_value: formData[field],
                        });
                    }
                });

                if (!hasFormChanges) {
                    setLoading(false);
                    return;
                }

                const strategy = formData.bidding_strategy || 'max_clicks';
                let primaryChanged = false;
                let isIncrease = false;

                if (strategy === 'target_cpa') {
                    const prevCpa = toComparableNumber(existingCampaign.target_cpa);
                    const nextCpa = toComparableNumber(formData.target_cpa);
                    const cpaDiff = prevCpa !== null && nextCpa !== null ? nextCpa - prevCpa : 0;
                    primaryChanged = Math.abs(cpaDiff) >= 0.0001;
                    isIncrease = cpaDiff > 0;
                } else if (strategy === 'target_roas') {
                    const prevRoas = toComparableNumber(existingCampaign.target_roas);
                    const nextRoas = toComparableNumber(formData.target_roas);
                    const roasDiff = prevRoas !== null && nextRoas !== null ? nextRoas - prevRoas : 0;
                    primaryChanged = Math.abs(roasDiff) >= 0.0001;
                    isIncrease = roasDiff > 0;
                } else {
                    const prevCpc = toComparableNumber(existingCampaign.cpc);
                    const nextCpc = toComparableNumber(formData.cpc);
                    const cpcDiff = prevCpc !== null && nextCpc !== null ? nextCpc - prevCpc : 0;
                    primaryChanged = Math.abs(cpcDiff) >= 0.0001;
                    isIncrease = cpcDiff > 0;
                }

                const reviewOutcome: Campaign['last_review_outcome'] =
                    primaryChanged
                        ? (isIncrease ? 'cpc_increase' : 'cpc_reduce')
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
            queryClient.invalidateQueries({ queryKey: ['campaign-changes', campaignId] });
            queryClient.invalidateQueries({ queryKey: ['all-changes'] });

            if (onSuccess) onSuccess(savedRecord);
            else navigate('/camp-tracking');
        } catch (err: any) {
            setError(err.message || 'Failed to save campaign');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form id={formId} onSubmit={handleSubmit} className="animate-fade campaign-form-shell">
            <style>{`
                .campaign-form-shell .filter-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.45rem;
                }
                .campaign-form-shell label {
                    font-size: 0.72rem;
                    font-weight: 800;
                    color: var(--text-dim);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .campaign-form-shell input,
                .campaign-form-shell select,
                .campaign-form-shell textarea {
                    width: 100%;
                    border-radius: 14px;
                    border: 1px solid color-mix(in srgb, var(--border-subtle) 78%, rgba(59, 130, 246, 0.18) 22%);
                    background: linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 97%, white 3%) 0%, color-mix(in srgb, var(--bg-content) 90%, var(--bg-main) 10%) 100%);
                    color: var(--text-main);
                    box-shadow: inset 0 1px 0 color-mix(in srgb, white 54%, transparent), 0 14px 28px -24px rgba(15, 23, 42, 0.42);
                    transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
                }
                .campaign-form-shell input,
                .campaign-form-shell select {
                    min-height: 42px;
                    padding: 0.72rem 0.9rem;
                }
                .campaign-form-shell textarea {
                    min-height: 100px;
                    padding: 0.85rem 0.95rem;
                    resize: vertical;
                    line-height: 1.55;
                }
                .campaign-form-shell input::placeholder,
                .campaign-form-shell textarea::placeholder {
                    color: var(--text-muted);
                }
                .campaign-form-shell input:focus,
                .campaign-form-shell select:focus,
                .campaign-form-shell textarea:focus {
                    outline: none;
                    border-color: rgba(59, 130, 246, 0.42);
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.08), inset 0 1px 0 color-mix(in srgb, white 58%, transparent);
                }
                .campaign-form-shell .form-section-title {
                    font-size: 0.78rem;
                    font-weight: 900;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    color: var(--text-main);
                }
                .campaign-form-shell .form-section-copy {
                    margin-top: 0.2rem;
                    font-size: 0.8rem;
                    color: var(--text-dim);
                    line-height: 1.45;
                }
                .campaign-form-shell input[type="checkbox"] {
                    width: 18px;
                    min-width: 18px;
                    height: 18px;
                    min-height: 18px;
                    padding: 0;
                    margin: 0;
                    box-shadow: none;
                    background: transparent;
                    border: none;
                    accent-color: #2563eb;
                    cursor: pointer;
                }
                .dark .campaign-form-shell input:not([type="checkbox"]),
                .dark .campaign-form-shell select,
                .dark .campaign-form-shell textarea {
                    background: linear-gradient(180deg, rgba(15,23,42,0.84) 0%, rgba(2,6,23,0.94) 100%);
                    border-color: rgba(148, 163, 184, 0.18);
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 14px 28px -24px rgba(0, 0, 0, 0.5);
                }
                .dark .campaign-form-shell input::placeholder,
                .dark .campaign-form-shell textarea::placeholder {
                    color: rgba(248, 250, 252, 0.5);
                }
                .dark .campaign-form-shell select option {
                    background: #020617;
                    color: #f8fafc;
                }
            `}</style>
            <div style={{ display: 'flex', flexDirection: 'column', gap: isModalLayout ? '0.55rem' : '1.2rem' }}>

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

                <SurfaceCard
                    padding={isModalLayout ? '0.72rem' : '1.1rem'}
                    radius={isModalLayout ? '1.1rem' : '1.35rem'}
                    style={{
                        background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.06) 0%, var(--bg-content) 100%)',
                        border: '1px solid color-mix(in srgb, var(--border-subtle) 80%, rgba(59, 130, 246, 0.18) 20%)',
                    }}
                >
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isLeadsSupportedPlatform
                            ? (isModalLayout ? 'minmax(180px, 2fr) minmax(110px, 1.2fr) minmax(80px, 0.8fr) 92px 82px' : 'minmax(200px, 2fr) minmax(130px, 1.2fr) minmax(90px, 0.8fr) 100px 90px')
                            : (isModalLayout ? 'minmax(180px, 2fr) minmax(120px, 1fr) 92px 82px' : 'minmax(200px, 2fr) minmax(140px, 1fr) 100px 90px'),
                        gap: isModalLayout ? '0.6rem' : '1rem'
                    }}>
                        <div className="filter-group">
                            <label>Campaign Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name || ''}
                                onChange={handleChange}
                                placeholder="e.g. Summer Sales"
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
                                <option value="">Select...</option>
                                {platforms.map((p) => (
                                    <option key={p.id} value={p.id}>{p.display_name}</option>
                                ))}
                            </select>
                        </div>
                        {isLeadsSupportedPlatform && (
                            <div className="filter-group">
                                <label>Leads</label>
                                <select
                                    name="leads"
                                    value={formData.leads || 'all'}
                                    onChange={handleChange}
                                >
                                    <option value="all">All</option>
                                    <option value="t1">T1: 3</option>
                                    <option value="t2">T2: 2</option>
                                    <option value="p1">P1: 4</option>
                                    <option value="p2">P2: 2.5</option>
                                </select>
                            </div>
                        )}
                        <div className="filter-group">
                            <label>Status</label>
                            <select
                                name="status"
                                value={formData.status || 'active'}
                                onChange={handleChange}
                            >
                                <option value="active">Active</option>
                                <option value="paused">Paused</option>
                                <option value="testing">Test</option>
                                <option value="archived">Arch</option>
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Pri</label>
                            <select
                                name="priority"
                                value={formData.priority || 'normal'}
                                onChange={handleChange}
                                style={{
                                    color: formData.priority === 'critical' ? '#d946ef' : (formData.priority === 'high' ? '#ef4444' : (formData.priority === 'medium' ? '#f59e0b' : 'inherit')),
                                    fontWeight: formData.priority !== 'normal' ? 800 : 500
                                }}
                            >
                                <option value="normal">Normal</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                            </select>
                        </div>
                    </div>
                </SurfaceCard>

                <SurfaceCard
                    padding={isModalLayout ? '0.72rem' : '1.1rem'}
                    radius={isModalLayout ? '1.1rem' : '1.35rem'}
                    style={{
                        background: formData.is_portfolio
                            ? 'linear-gradient(180deg, rgba(37, 99, 235, 0.09) 0%, var(--bg-content) 100%)'
                            : 'linear-gradient(180deg, rgba(20, 184, 166, 0.06) 0%, var(--bg-content) 100%)',
                        border: formData.is_portfolio
                            ? '1px solid color-mix(in srgb, var(--border-subtle) 68%, rgba(37, 99, 235, 0.4) 32%)'
                            : '1px solid color-mix(in srgb, var(--border-subtle) 82%, rgba(20, 184, 166, 0.18) 18%)',
                        transition: 'background 0.3s ease, border-color 0.3s ease',
                    }}
                >
                    <div style={{ display: 'grid', gridTemplateColumns: isModalLayout ? '2.1fr 1.5fr 1.5fr 0.9fr 0.9fr 0.9fr 1fr' : '2.3fr 1.6fr 1.6fr 1fr 1fr 1fr 1.1fr', gap: isModalLayout ? '0.6rem' : '1rem' }}>
                        <div className="filter-group">
                            <label>Bidding Strategy</label>
                            <select
                                name="bidding_strategy"
                                value={formData.bidding_strategy || 'max_clicks'}
                                onChange={handleChange}
                                style={{ fontWeight: 700 }}
                            >
                                <option value="max_clicks">CPC</option>
                                <option value="manual_cpc">mCPC</option>
                                <option value="target_cpa">tCPA</option>
                                <option value="target_roas">tROAS</option>
                                <option value="max_conversions">Max Conv</option>
                                <option value="max_conversion_value">Max Value</option>
                            </select>
                        </div>
                        {(!formData.bidding_strategy || formData.bidding_strategy === 'max_clicks' || formData.bidding_strategy === 'manual_cpc') ? (
                            <div className="filter-group">
                                <label>CPC Limit ($)</label>
                                <input
                                    type="number"
                                    name="cpc"
                                    step="0.01"
                                    value={formData.cpc ?? 0}
                                    onChange={handleChange}
                                    min="0"
                                />
                            </div>
                        ) : formData.bidding_strategy === 'target_cpa' ? (
                            <div className="filter-group">
                                <label>Target CPA ($)</label>
                                <input
                                    type="number"
                                    name="target_cpa"
                                    step="0.01"
                                    value={formData.target_cpa ?? 0}
                                    onChange={handleChange}
                                    min="0"
                                />
                            </div>
                        ) : formData.bidding_strategy === 'target_roas' ? (
                            <div className="filter-group">
                                <label>Target ROAS (%)</label>
                                <input
                                    type="number"
                                    name="target_roas"
                                    step="1"
                                    value={formData.target_roas ?? 0}
                                    onChange={handleChange}
                                    min="0"
                                    placeholder="e.g. 350"
                                />
                            </div>
                        ) : (
                            <div className="filter-group">
                                <label>Target Value</label>
                                <input
                                    type="text"
                                    disabled
                                    value="N/A (Auto)"
                                    style={{ opacity: 0.5, cursor: 'not-allowed' }}
                                />
                            </div>
                        )}
                        <div className="filter-group">
                            <label>Daily Budget ($)</label>
                            <input
                                type="number"
                                name="max_daily_budget"
                                step="1"
                                value={formData.max_daily_budget ?? 0}
                                onChange={handleChange}
                                min="0"
                            />
                        </div>

                        <div className="filter-group">
                            <label style={{ textAlign: 'center', display: 'block' }}>DSA Support</label>
                            <div style={{ height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <input
                                    type="checkbox"
                                    name="is_dsa"
                                    checked={Boolean(formData.is_dsa)}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        <div className="filter-group">
                            <label style={{ textAlign: 'center', display: 'block' }}>Testing</label>
                            <div style={{ height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <input
                                    type="checkbox"
                                    name="is_testing"
                                    checked={Boolean(formData.is_testing)}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        <div className="filter-group">
                            <label style={{ textAlign: 'center', display: 'block' }}>Case Study</label>
                            <div style={{ height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <input
                                    type="checkbox"
                                    name="is_case_study"
                                    checked={Boolean(formData.is_case_study)}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        <div className="filter-group" style={{
                            padding: '0.15rem 0.35rem',
                            borderRadius: '8px',
                            background: formData.is_portfolio ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                            border: formData.is_portfolio ? '1px solid rgba(37, 99, 235, 0.28)' : '1px solid transparent',
                            transition: 'all 0.25s ease',
                        }}>
                            <label
                                style={{
                                    textAlign: 'center',
                                    display: 'block',
                                    color: formData.is_portfolio ? '#3b82f6' : undefined,
                                    fontWeight: formData.is_portfolio ? 800 : 700,
                                }}
                                title="Google Ads Portfolio Bidding Strategy"
                            >
                                Portfolio
                            </label>
                            <div style={{ height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <input
                                    type="checkbox"
                                    name="is_portfolio"
                                    checked={Boolean(formData.is_portfolio)}
                                    onChange={handleChange}
                                    style={{ cursor: 'pointer', accentColor: '#2563eb' }}
                                />
                            </div>
                        </div>
                    </div>
                </SurfaceCard>

                {!isModalLayout && (
                    <SurfaceCard padding="1rem" radius="1.2rem" variant="inset">
                        <div className="filter-group">
                            <label>Start Date</label>
                            <input
                                type="date"
                                name="created_date"
                                value={formData.created_date || ''}
                                onChange={handleChange}
                                style={{ width: 'fit-content' }}
                            />
                        </div>
                    </SurfaceCard>
                )}

                {!formData.is_dsa && (
                    <SurfaceCard padding={isModalLayout ? '0.72rem' : '0.9rem'} radius={isModalLayout ? '1.1rem' : '1.35rem'} variant="soft">
                        <div className="filter-group">
                            <label>Active Keywords (Running)</label>
                            <textarea
                                name="keywords"
                                value={formData.keywords || ''}
                                onChange={handleChange}
                                placeholder="Enter list of running keywords..."
                                style={{ minHeight: isModalLayout ? '72px' : '100px' }}
                            />
                        </div>
                    </SurfaceCard>
                )}

                <SurfaceCard padding={isModalLayout ? '0.72rem' : '0.9rem'} radius={isModalLayout ? '1.1rem' : '1.35rem'} variant="soft">
                    <div className="filter-group">
                        <label>Strategy & Objective</label>
                        <textarea
                            name="description"
                            value={formData.description || ''}
                            onChange={handleChange}
                            placeholder="Objective, target audience..."
                            style={{ minHeight: isModalLayout ? '68px' : '96px' }}
                        />
                    </div>
                </SurfaceCard>

                <>
                    <SurfaceCard padding={isModalLayout ? '0.72rem' : '0.9rem'} radius={isModalLayout ? '1.1rem' : '1.35rem'} variant="soft">
                        <div className="filter-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                <label style={{ marginBottom: 0 }}>Metadata / Configs</label>
                                <button
                                    type="button"
                                    onClick={() => setIsMetadataModalOpen(true)}
                                    className="hero-btn hero-btn-ghost"
                                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', gap: '0.3rem' }}
                                >
                                    <Maximize2 size={13} />
                                    Full Editor
                                </button>
                            </div>
                            <LazyRichTextEditor
                                value={(formData.metadata || '').toString()}
                                onChange={(nextHtml) => setFormData((prev) => ({ ...prev, metadata: nextHtml }))}
                                placeholder="Detailed metadata configuration..."
                                minHeight={isModalLayout ? 58 : 100}
                                maxHeight={isModalLayout ? 96 : 240}
                                showToolbar={!isModalLayout}
                            />
                        </div>
                    </SurfaceCard>

                    <SurfaceCard padding={isModalLayout ? '0.72rem' : '0.9rem'} radius={isModalLayout ? '1.1rem' : '1.35rem'} variant="soft">
                        <div className="filter-group">
                            <label>Internal Notes</label>
                            <LazyRichTextEditor
                                value={(formData.general_notes || '').toString()}
                                onChange={(nextHtml) => setFormData((prev) => ({ ...prev, general_notes: nextHtml }))}
                                placeholder="Implementation details, checkpoints, governance..."
                                minHeight={isModalLayout ? 58 : 100}
                                maxHeight={isModalLayout ? 96 : 240}
                                showToolbar={!isModalLayout}
                            />
                        </div>
                    </SurfaceCard>

                    <MetadataModal
                        isOpen={isMetadataModalOpen}
                        onClose={() => setIsMetadataModalOpen(false)}
                        campaignName={formData.name}
                        initialContent={(formData.metadata || '').toString()}
                        onSave={(newContent) => setFormData(prev => ({ ...prev, metadata: newContent }))}
                    />
                </>

                {!hideActions && (
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem', justifyContent: 'flex-end' }}>
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
                            style={{ minWidth: '130px' }}
                        >
                            {loading ? 'Saving...' : (campaignId ? 'Update' : 'Create')}
                        </button>
                    </div>
                )}
            </div>
        </form>
    );
}
