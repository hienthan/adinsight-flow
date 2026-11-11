import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Check, ChevronDown, Search, X } from 'lucide-react';
import { getCountryOptions } from '../../hooks/useCountryOptions';
import type { Campaign, CampaignPlatform, CampaignTestTrack } from '../../types/campaign';
import { ModalHero, SafeButton, SurfaceCard } from '../../components/common/ui';
import { buildTrackKey, buildTrackTitle, formatPlatformLabel, formatSlug, TEST_TYPE_LABELS } from './campaignTestTrackingShared';
import {
    CAMP_TEST_MODAL_CLASS,
    CAMP_TEST_MODAL_CONTROL_STYLE,
    CAMP_TEST_MODAL_TEXTAREA_STYLE,
    CAMP_TEST_THEME_CSS,
} from './campTestTrackingTheme';

interface CampTestTrackModalProps {
    open: boolean;
    mode: 'create' | 'edit';
    initialTrack?: CampaignTestTrack | null;
    seed?: Partial<FormState> | null;
    platforms: CampaignPlatform[];
    campaigns: Campaign[];
    existingTracks: CampaignTestTrack[];
    isSaving: boolean;
    onClose: () => void;
    onOpenExistingTrack?: (track: CampaignTestTrack) => void;
    onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

type FormState = {
    platform: string;
    lane_scope: CampaignTestTrack['lane_scope'];
    source_market: string;
    destination_country: string;
    destination_city: string;
    pattern_topic: string;
    category: string;
    test_type: CampaignTestTrack['test_type'];
    status: CampaignTestTrack['status'];
    result: '' | NonNullable<CampaignTestTrack['result']>;
    priority: '' | NonNullable<CampaignTestTrack['priority']>;
    cookie_test_state: NonNullable<CampaignTestTrack['cookie_test_state']>;
    next_action: string;
    summary_note: string;
    failure_note: string;
    do_not_retest: boolean;
    linked_campaigns: string[];
    started_at: string;
    last_reviewed_at: string;
    owner: string;
};

const INITIAL_FORM: FormState = {
    platform: '',
    lane_scope: 'destination',
    source_market: 'US',
    destination_country: '',
    destination_city: '',
    pattern_topic: '',
    category: '',
    test_type: 'topic_validation',
    status: 'planned',
    result: '',
    priority: '',
    cookie_test_state: 'not_applicable',
    next_action: '',
    summary_note: '',
    failure_note: '',
    do_not_retest: false,
    linked_campaigns: [],
    started_at: '',
    last_reviewed_at: '',
    owner: '',
};

const slugify = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

const normalizeMarketCode = (value: string) =>
    value
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '');

const isUniqueValidationError = (error: unknown) =>
    typeof error === 'object'
    && error !== null
    && 'response' in error
    && typeof (error as { response?: unknown }).response === 'object'
    && (error as { response?: { data?: { track_key?: { code?: string } } } }).response?.data?.track_key?.code === 'validation_not_unique';

const CONTROL_STYLE = CAMP_TEST_MODAL_CONTROL_STYLE;
const TEXTAREA_STYLE = CAMP_TEST_MODAL_TEXTAREA_STYLE;

const REAL_COUNTRY_OPTIONS = getCountryOptions().map((option) => ({
    label: option.label,
    value: option.label,
}));

export default function CampTestTrackModal({
    open,
    mode,
    initialTrack,
    seed,
    platforms,
    campaigns,
    existingTracks,
    isSaving,
    onClose,
    onOpenExistingTrack,
    onSubmit,
}: CampTestTrackModalProps) {
    const [form, setForm] = useState<FormState>(INITIAL_FORM);
    const [error, setError] = useState('');
    const [campaignSearch, setCampaignSearch] = useState('');
    const [advancedOpen, setAdvancedOpen] = useState(false);

    useEffect(() => {
        if (!open) return;
        if (mode === 'edit' && initialTrack) {
            setForm({
                platform: initialTrack.platform,
                lane_scope: initialTrack.lane_scope || 'destination',
                source_market: initialTrack.source_market,
                destination_country: formatSlug(initialTrack.destination_country),
                destination_city: initialTrack.destination_city ? formatSlug(initialTrack.destination_city) : '',
                pattern_topic: formatSlug(initialTrack.pattern_topic),
                category: initialTrack.category ? formatSlug(initialTrack.category) : '',
                test_type: initialTrack.test_type,
                status: initialTrack.status,
                result: initialTrack.result || '',
                priority: initialTrack.priority || '',
                cookie_test_state: initialTrack.cookie_test_state || 'not_applicable',
                next_action: initialTrack.next_action || '',
                summary_note: initialTrack.summary_note || '',
                failure_note: initialTrack.failure_note || '',
                do_not_retest: Boolean(initialTrack.do_not_retest),
                linked_campaigns: initialTrack.linked_campaigns || [],
                started_at: initialTrack.started_at?.slice(0, 10) || '',
                last_reviewed_at: initialTrack.last_reviewed_at?.slice(0, 10) || '',
                owner: initialTrack.owner || '',
            });
        } else {
            setForm({
                ...INITIAL_FORM,
                ...seed,
            });
        }
        setError('');
        setCampaignSearch('');
        setAdvancedOpen(Boolean(initialTrack?.started_at || initialTrack?.last_reviewed_at || initialTrack?.failure_note));
    }, [initialTrack, mode, open, seed]);

    const selectedPlatform = useMemo(
        () => platforms.find((platform) => platform.id === form.platform),
        [form.platform, platforms],
    );

    const normalizedValues = useMemo(() => ({
        sourceMarket: normalizeMarketCode(form.source_market),
        destinationCountry: slugify(form.destination_country),
        destinationCity: slugify(form.destination_city),
        patternTopic: slugify(form.pattern_topic),
        category: slugify(form.category),
    }), [form.category, form.destination_city, form.destination_country, form.pattern_topic, form.source_market]);

    const preview = useMemo(() => {
        const destinationReady = form.lane_scope === 'market_only' || Boolean(normalizedValues.destinationCountry);
        if (!form.platform || !destinationReady || !normalizedValues.patternTopic || !normalizedValues.sourceMarket) {
            return {
                trackKey: '',
                title: '',
            };
        }
        return {
            trackKey: buildTrackKey({
                laneScope: form.lane_scope,
                platformId: form.platform,
                sourceMarket: normalizedValues.sourceMarket,
                destinationCountry: normalizedValues.destinationCountry,
                destinationCity: normalizedValues.destinationCity,
                patternTopic: normalizedValues.patternTopic,
            }),
            title: buildTrackTitle({
                laneScope: form.lane_scope,
                platformLabel: formatPlatformLabel(selectedPlatform),
                sourceMarket: normalizedValues.sourceMarket,
                destinationCountry: normalizedValues.destinationCountry,
                destinationCity: normalizedValues.destinationCity,
                patternTopic: normalizedValues.patternTopic,
            }),
        };
    }, [form.lane_scope, form.platform, normalizedValues.destinationCity, normalizedValues.destinationCountry, normalizedValues.patternTopic, normalizedValues.sourceMarket, selectedPlatform]);

    const duplicateTrack = useMemo(() => {
        if (!preview.trackKey) return null;
        return existingTracks.find((track) => (
            track.track_key === preview.trackKey
            && track.id !== initialTrack?.id
        )) || null;
    }, [existingTracks, initialTrack?.id, preview.trackKey]);

    const scopedCampaigns = useMemo(() => {
        const keyword = campaignSearch.trim().toLowerCase();
        return campaigns
            .filter((campaign) => !form.platform || campaign.platform === form.platform)
            .filter((campaign) => {
                if (!keyword) return true;
                return [
                    campaign.name,
                    campaign.status,
                    campaign.priority || '',
                ].join(' ').toLowerCase().includes(keyword);
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [campaignSearch, campaigns, form.platform]);

    const destinationCountryOptions = useMemo(() => {
        const options = [...REAL_COUNTRY_OPTIONS];
        const normalizedCurrent = form.destination_country.trim();
        if (
            normalizedCurrent
            && !options.some((option) => option.label.toLowerCase() === normalizedCurrent.toLowerCase())
        ) {
            options.unshift({ label: normalizedCurrent, value: normalizedCurrent });
        }
        return options;
    }, [form.destination_country]);

    const categoryOptions = useMemo(() => {
        const options = new Set<string>();
        existingTracks.forEach((track) => {
            if (track.category) options.add(track.category);
        });
        if (initialTrack?.category) options.add(initialTrack.category);
        return Array.from(options).sort((a, b) => formatSlug(a).localeCompare(formatSlug(b)));
    }, [existingTracks, initialTrack?.category]);

    const patternTopicOptions = useMemo(() => {
        const options = new Set<string>();
        existingTracks.forEach((track) => {
            if (track.pattern_topic) options.add(track.pattern_topic);
        });
        if (initialTrack?.pattern_topic) options.add(initialTrack.pattern_topic);
        return Array.from(options).sort((a, b) => formatSlug(a).localeCompare(formatSlug(b)));
    }, [existingTracks, initialTrack?.pattern_topic]);

    if (!open) return null;

    const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((previous) => ({ ...previous, [key]: value }));
        if (error) setError('');
    };

    const toggleLinkedCampaign = (campaignId: string) => {
        setForm((previous) => ({
            ...previous,
            linked_campaigns: previous.linked_campaigns.includes(campaignId)
                ? previous.linked_campaigns.filter((id) => id !== campaignId)
                : [...previous.linked_campaigns, campaignId],
        }));
    };

    const handleSubmit = async () => {
        const requiresDestination = form.lane_scope === 'destination';
        if (!form.platform || !normalizedValues.sourceMarket || !normalizedValues.patternTopic || (requiresDestination && !normalizedValues.destinationCountry)) {
            setError(requiresDestination
                ? 'Platform, source market, destination country, and pattern topic are required.'
                : 'Platform, source market, and pattern topic are required.');
            return;
        }

        if (duplicateTrack) {
            setError(`This lane already exists as "${duplicateTrack.title}". Open the existing lane instead of creating a duplicate.`);
            return;
        }

        setError('');

        try {
            await onSubmit({
                track_key: preview.trackKey,
                title: preview.title,
                platform: form.platform,
                lane_scope: form.lane_scope,
                source_market: normalizedValues.sourceMarket,
                destination_country: form.lane_scope === 'market_only' ? '' : normalizedValues.destinationCountry,
                destination_city: form.lane_scope === 'market_only' ? '' : normalizedValues.destinationCity,
                pattern_topic: normalizedValues.patternTopic,
                category: normalizedValues.category,
                test_type: form.test_type,
                status: form.status,
                result: form.result || null,
                priority: form.priority || null,
                cookie_test_state: form.cookie_test_state,
                next_action: form.next_action.trim(),
                summary_note: form.summary_note,
                failure_note: form.failure_note,
                do_not_retest: form.do_not_retest,
                linked_campaigns: form.linked_campaigns,
                started_at: form.started_at || '',
                last_reviewed_at: form.last_reviewed_at || '',
                owner: form.owner.trim(),
                main_tags: [
                    form.lane_scope,
                    normalizedValues.sourceMarket.toLowerCase(),
                    form.lane_scope === 'market_only' ? 'no_destination' : normalizedValues.destinationCountry,
                    normalizedValues.patternTopic,
                    normalizedValues.category,
                ].filter(Boolean),
                metadata: initialTrack?.metadata || {},
            });
        } catch (submitError) {
            if (isUniqueValidationError(submitError)) {
                setError('This lane key is already taken. Refresh the list or open the existing lane to continue.');
                return;
            }
            setError(submitError instanceof Error ? submitError.message : 'Failed to save lane.');
        }
    };

    return (
        <div className={CAMP_TEST_MODAL_CLASS} style={{ position: 'fixed', inset: 0, zIndex: 120 }}>
            <style>{CAMP_TEST_THEME_CSS}</style>
            <div
                onClick={onClose}
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(2, 6, 23, 0.4)',
                    backdropFilter: 'blur(8px)',
                }}
            />

            <div style={{
                position: 'absolute',
                inset: '2vh 2.5vw',
                overflow: 'hidden',
                borderRadius: '28px',
                border: '1px solid var(--border-subtle)',
                background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-main) 88%, #f8fafc 12%) 0%, var(--bg-main) 100%)',
                boxShadow: 'var(--shadow-large)',
                display: 'flex',
                flexDirection: 'column',
            }}>
                <div style={{ padding: '0.9rem 0.95rem 0' }}>
                    <ModalHero
                        accent="#7c3aed"
                        eyebrow="Camp Tracking"
                        title={mode === 'edit' ? 'Edit Lane Record' : 'Create Lane Record'}
                        subtitle="Fast lane setup with deterministic keys and duplicate protection."
                        actions={(
                            <SafeButton
                                onClick={onClose}
                                style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '999px',
                                    border: '1px solid var(--border-subtle)',
                                    background: 'var(--bg-main)',
                                    display: 'grid',
                                    placeItems: 'center',
                                }}
                            >
                                <X size={16} />
                            </SafeButton>
                        )}
                        compact
                    >
                        <SurfaceCard
                            variant="soft"
                            radius="18px"
                            padding="0.75rem 0.9rem"
                            style={{
                                border: '1px solid rgba(124, 58, 237, 0.14)',
                                background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(37, 99, 235, 0.04) 100%)',
                            }}
                        >
                            <div style={{ display: 'grid', gap: '0.28rem' }}>
                                <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                    Deterministic Preview
                                </div>
                                <div style={{ minHeight: '1.2rem', color: 'var(--text-main)', fontWeight: 800, lineHeight: 1.35 }}>
                                    {preview.title || 'Complete the required fields to generate a lane title.'}
                                </div>
                                <div style={{ minHeight: '1rem', color: preview.trackKey ? 'var(--text-dim)' : 'var(--text-muted)', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                                    {preview.trackKey || 'Track key will appear here once the required lane identity fields are valid.'}
                                </div>
                            </div>
                        </SurfaceCard>
                    </ModalHero>
                </div>

                <div style={{ padding: '0.95rem', overflowY: 'auto', display: 'grid', gap: '0.8rem' }}>
                    <SectionCard
                        title="Lane Identity"
                        tone="violet"
                    >
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem' }}>
                            <Field label="Platform" required>
                                <select className="camp-test-filter-control" value={form.platform} onChange={(event) => updateField('platform', event.target.value)} style={CONTROL_STYLE}>
                                    <option value="">Select platform</option>
                                    {platforms.map((platform) => (
                                        <option key={platform.id} value={platform.id}>{platform.display_name}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Lane Scope" required>
                                <select className="camp-test-filter-control" value={form.lane_scope} onChange={(event) => updateField('lane_scope', event.target.value as FormState['lane_scope'])} style={CONTROL_STYLE}>
                                    <option value="destination">Destination</option>
                                    <option value="market_only">Market Only</option>
                                </select>
                            </Field>
                            <Field label="Source Market" required>
                                <input className="camp-test-filter-control" value={form.source_market} onChange={(event) => updateField('source_market', event.target.value.toUpperCase())} placeholder="MY, SG, HK..." style={CONTROL_STYLE} />
                            </Field>
                            {form.lane_scope === 'destination' ? (
                                <>
                                    <Field label="Destination Country" required>
                                        <SearchableSingleSelect
                                            options={destinationCountryOptions}
                                            value={form.destination_country}
                                            onChange={(value) => updateField('destination_country', value)}
                                            placeholder="Select country"
                                        />
                                    </Field>
                                    <Field label="Destination City">
                                        <input className="camp-test-filter-control" value={form.destination_city} onChange={(event) => updateField('destination_city', event.target.value)} placeholder="Optional: Kuala Lumpur" style={CONTROL_STYLE} />
                                    </Field>
                                </>
                            ) : null}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem' }}>
                            <Field label="Pattern Topic" required>
                                <input
                                    className="camp-test-filter-control"
                                    list="lane-pattern-topic-options"
                                    value={form.pattern_topic}
                                    onChange={(event) => updateField('pattern_topic', event.target.value)}
                                    placeholder="eSim / arrival_card / ticket"
                                    style={CONTROL_STYLE}
                                />
                                <datalist id="lane-pattern-topic-options">
                                    {patternTopicOptions.map((value) => (
                                        <option key={value} value={formatSlug(value)} />
                                    ))}
                                </datalist>
                            </Field>
                            <Field label="Category">
                                <input
                                    className="camp-test-filter-control"
                                    list="lane-category-options"
                                    value={form.category}
                                    onChange={(event) => updateField('category', event.target.value)}
                                    placeholder="Utility / ticket / tour"
                                    style={CONTROL_STYLE}
                                />
                                <datalist id="lane-category-options">
                                    {categoryOptions.map((value) => (
                                        <option key={value} value={formatSlug(value)} />
                                    ))}
                                </datalist>
                            </Field>
                            <Field label="Test Type">
                                <select className="camp-test-filter-control" value={form.test_type} onChange={(event) => updateField('test_type', event.target.value as FormState['test_type'])} style={CONTROL_STYLE}>
                                    {Object.entries(TEST_TYPE_LABELS).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Owner">
                                <input className="camp-test-filter-control" value={form.owner} onChange={(event) => updateField('owner', event.target.value)} placeholder="Owner" style={CONTROL_STYLE} />
                            </Field>
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Execution State"
                        tone="teal"
                    >
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem' }}>
                            <Field label="Status">
                                <select className="camp-test-filter-control" value={form.status} onChange={(event) => updateField('status', event.target.value as FormState['status'])} style={CONTROL_STYLE}>
                                    {['planned', 'testing', 'live', 'watching', 'failed', 'paused', 'archived'].map((value) => (
                                        <option key={value} value={value}>{formatSlug(value)}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Result">
                                <select className="camp-test-filter-control" value={form.result} onChange={(event) => updateField('result', event.target.value as FormState['result'])} style={CONTROL_STYLE}>
                                    <option value="">None</option>
                                    {['positive', 'neutral', 'mixed', 'negative'].map((value) => (
                                        <option key={value} value={value}>{formatSlug(value)}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Priority">
                                <select className="camp-test-filter-control" value={form.priority} onChange={(event) => updateField('priority', event.target.value as FormState['priority'])} style={CONTROL_STYLE}>
                                    <option value="">None</option>
                                    {['normal', 'medium', 'high', 'critical'].map((value) => (
                                        <option key={value} value={value}>{formatSlug(value)}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Cookie State">
                                <select className="camp-test-filter-control" value={form.cookie_test_state} onChange={(event) => updateField('cookie_test_state', event.target.value as FormState['cookie_test_state'])} style={CONTROL_STYLE}>
                                    {['not_applicable', 'on', 'off', 'mixed'].map((value) => (
                                        <option key={value} value={value}>{formatSlug(value)}</option>
                                    ))}
                                </select>
                            </Field>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem', alignItems: 'end' }}>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                height: '42px',
                                padding: '0 0.95rem',
                                borderRadius: '14px',
                                border: '1px solid var(--border-subtle)',
                                background: 'var(--bg-content)',
                                fontWeight: 700,
                                color: 'var(--text-main)',
                            }}>
                                <input
                                    type="checkbox"
                                    checked={form.do_not_retest}
                                    onChange={(event) => updateField('do_not_retest', event.target.checked)}
                                />
                                Do not retest
                            </label>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                                Optional dates and failure notes are hidden by default.
                            </div>
                            <SafeButton
                                onClick={() => setAdvancedOpen((prev) => !prev)}
                                style={{
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-subtle)',
                                    background: 'var(--bg-overlay)',
                                    color: 'var(--text-main)',
                                    fontWeight: 800,
                                    padding: '0.5rem 0.75rem',
                                }}
                            >
                                {advancedOpen ? 'Hide Advanced' : 'Show Advanced'}
                            </SafeButton>
                        </div>

                        {advancedOpen ? (
                            <div style={{ display: 'grid', gap: '0.65rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem' }}>
                                    <Field label="Started At">
                                        <input className="camp-test-filter-control" type="date" value={form.started_at} onChange={(event) => updateField('started_at', event.target.value)} style={CONTROL_STYLE} />
                                    </Field>
                                    <Field label="Last Reviewed">
                                        <input className="camp-test-filter-control" type="date" value={form.last_reviewed_at} onChange={(event) => updateField('last_reviewed_at', event.target.value)} style={CONTROL_STYLE} />
                                    </Field>
                                </div>
                                <Field label="Failure Note">
                                    <textarea className="camp-test-filter-control" value={form.failure_note} onChange={(event) => updateField('failure_note', event.target.value)} rows={3} placeholder="Optional failure context..." style={TEXTAREA_STYLE} />
                                </Field>
                            </div>
                        ) : null}
                    </SectionCard>

                    <SectionCard
                        title="Notes And Linking"
                        tone="amber"
                    >
                        <Field label="Next Action">
                            <input className="camp-test-filter-control" value={form.next_action} onChange={(event) => updateField('next_action', event.target.value)} placeholder="Next action..." style={CONTROL_STYLE} />
                        </Field>

                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.95fr) minmax(320px, 1.05fr)', gap: '0.8rem' }}>
                            <SurfaceCard
                                variant="inset"
                                radius="18px"
                                padding="0.85rem"
                                style={{
                                    border: '1px solid rgba(245, 158, 11, 0.14)',
                                    background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.06) 0%, var(--bg-content) 100%)',
                                    display: 'grid',
                                    gap: '0.65rem',
                                    alignContent: 'start',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                            Linked Campaigns
                                        </div>
                                        <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', marginTop: '0.12rem' }}>Filtered by platform.</div>
                                    </div>
                                    <div style={{
                                        padding: '0.28rem 0.55rem',
                                        borderRadius: '999px',
                                        background: 'rgba(37, 99, 235, 0.08)',
                                        border: '1px solid rgba(37, 99, 235, 0.14)',
                                        color: '#2563eb',
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                    }}>
                                        {form.linked_campaigns.length} linked
                                    </div>
                                </div>

                                <div style={{ position: 'relative' }}>
                                    <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                                    <input
                                        className="camp-test-filter-control"
                                        value={campaignSearch}
                                        onChange={(event) => setCampaignSearch(event.target.value)}
                                        placeholder="Search campaign name..."
                                        style={{ ...CONTROL_STYLE, width: '100%', paddingLeft: '2.25rem' }}
                                    />
                                </div>

                                <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'grid', gap: '0.42rem', paddingRight: '0.15rem' }}>
                                    {scopedCampaigns.map((campaign) => {
                                        const checked = form.linked_campaigns.includes(campaign.id);
                                        return (
                                            <label
                                                key={campaign.id}
                                                style={{
                                                    display: 'flex',
                                                    gap: '0.6rem',
                                                    alignItems: 'flex-start',
                                                    padding: '0.58rem 0.72rem',
                                                    borderRadius: '12px',
                                                    border: checked ? '1px solid hsl(var(--primary))' : '1px solid var(--border-subtle)',
                                                    background: checked ? 'hsla(var(--primary) / 0.08)' : 'var(--bg-content)',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleLinkedCampaign(campaign.id)}
                                                    style={{ marginTop: '0.15rem' }}
                                                />
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{campaign.name}</div>
                                                    <div style={{ color: 'var(--text-dim)', fontSize: '0.76rem', marginTop: '0.15rem' }}>
                                                        {formatSlug(campaign.status)}{campaign.priority ? ` · ${formatSlug(campaign.priority)}` : ''}
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                    {scopedCampaigns.length === 0 ? (
                                        <div style={{ color: 'var(--text-dim)', fontWeight: 650 }}>
                                            {form.platform ? 'No campaigns match the current platform and search.' : 'Select a platform first to narrow the campaign scope.'}
                                        </div>
                                    ) : null}
                                </div>
                            </SurfaceCard>

                            <div style={{ display: 'grid', gap: '0.65rem', alignContent: 'start' }}>
                                <Field label="Summary Note">
                                    <textarea className="camp-test-filter-control" value={form.summary_note} onChange={(event) => updateField('summary_note', event.target.value)} rows={5} placeholder="Current state, why this lane exists, what we are watching..." style={TEXTAREA_STYLE} />
                                </Field>
                            </div>
                        </div>
                    </SectionCard>

                    {duplicateTrack ? (
                        <SurfaceCard
                            variant="soft"
                            radius="16px"
                            padding="0.95rem 1rem"
                            style={{
                                border: '1px solid rgba(245, 158, 11, 0.18)',
                                background: 'rgba(245, 158, 11, 0.08)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem' }}>
                                    <AlertTriangle size={18} style={{ color: '#b45309', flex: '0 0 auto', marginTop: '0.1rem' }} />
                                    <div>
                                        <div style={{ color: 'var(--text-main)', fontWeight: 800 }}>This lane already exists.</div>
                                        <div style={{ color: 'var(--text-dim)', marginTop: '0.2rem', lineHeight: 1.5 }}>
                                            {duplicateTrack.title}
                                        </div>
                                    </div>
                                </div>
                                {onOpenExistingTrack ? (
                                    <SafeButton
                                        onClick={() => onOpenExistingTrack(duplicateTrack)}
                                        style={{
                                            borderRadius: '12px',
                                            border: '1px solid rgba(245, 158, 11, 0.26)',
                                            background: '#fff',
                                            color: '#b45309',
                                            fontWeight: 800,
                                            padding: '0.62rem 0.88rem',
                                        }}
                                    >
                                        Open Existing Lane
                                    </SafeButton>
                                ) : null}
                            </div>
                        </SurfaceCard>
                    ) : null}

                    {error ? (
                        <SurfaceCard
                            variant="soft"
                            radius="16px"
                            padding="0.95rem 1rem"
                            style={{
                                border: '1px solid rgba(239, 68, 68, 0.18)',
                                background: 'rgba(239, 68, 68, 0.08)',
                                color: '#b91c1c',
                                fontWeight: 700,
                            }}
                        >
                            {error}
                        </SurfaceCard>
                    ) : null}
                </div>

                <div style={{
                    padding: '0.8rem 0.95rem 0.95rem',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '0.75rem',
                    borderTop: '1px solid var(--border-subtle)',
                    background: 'color-mix(in srgb, var(--bg-main) 88%, #f8fafc 12%)',
                }}>
                    <SafeButton
                        onClick={onClose}
                        style={{
                            borderRadius: '14px',
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--bg-content)',
                            color: 'var(--text-main)',
                            fontWeight: 800,
                            padding: '0.9rem 1.1rem',
                        }}
                    >
                        Cancel
                    </SafeButton>
                    <SafeButton
                        onClick={handleSubmit}
                        disabled={isSaving || Boolean(duplicateTrack)}
                        style={{
                            borderRadius: '14px',
                            border: '1px solid hsl(var(--primary))',
                            background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, #2563eb 100%)',
                            color: '#fff',
                            fontWeight: 800,
                            padding: '0.9rem 1.15rem',
                            minWidth: '160px',
                            opacity: (isSaving || duplicateTrack) ? 0.75 : 1,
                        }}
                    >
                        {isSaving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Lane'}
                    </SafeButton>
                </div>
            </div>
        </div>
    );
}

function SectionCard({
    title,
    tone,
    children,
}: {
    title: string;
    tone: 'violet' | 'teal' | 'amber';
    children: ReactNode;
}) {
    const tones = {
        violet: {
            border: 'rgba(124, 58, 237, 0.16)',
            background: 'linear-gradient(180deg, rgba(124, 58, 237, 0.05) 0%, var(--bg-content) 100%)',
        },
        teal: {
            border: 'rgba(15, 118, 110, 0.16)',
            background: 'linear-gradient(180deg, rgba(15, 118, 110, 0.05) 0%, var(--bg-content) 100%)',
        },
        amber: {
            border: 'rgba(245, 158, 11, 0.16)',
            background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.05) 0%, var(--bg-content) 100%)',
        },
    } as const;

    const styleDef = tones[tone];

    return (
        <SurfaceCard
            variant="soft"
            radius="22px"
            padding="0.8rem"
            style={{
                border: `1px solid ${styleDef.border}`,
                background: styleDef.background,
                display: 'grid',
                gap: '0.7rem',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {title}
                </div>
            </div>
            {children}
        </SurfaceCard>
    );
}

function Field({
    label,
    children,
    required = false,
}: {
    label: string;
    children: ReactNode;
    required?: boolean;
}) {
    return (
        <label style={{ display: 'grid', gap: '0.32rem' }}>
            <div style={{ fontSize: '0.71rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {label}{required ? ' *' : ''}
            </div>
            {children}
        </label>
    );
}

function SearchableSingleSelect({
    options,
    value,
    onChange,
    placeholder,
}: {
    options: Array<{ label: string; value: string }>;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0, width: 280 });

    const selectedOption = options.find((option) => option.value === value) || null;
    const filteredOptions = useMemo(() => {
        const keyword = searchQuery.trim().toLowerCase();
        if (!keyword) return options;
        return options.filter((option) => option.label.toLowerCase().includes(keyword));
    }, [options, searchQuery]);

    useEffect(() => {
        if (!isOpen) return;

        const updatePanelPosition = () => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            setPanelPosition({
                top: rect.bottom + 8,
                left: rect.left,
                width: Math.max(rect.width, 280),
            });
        };

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const clickedTrigger = containerRef.current?.contains(target);
            const clickedPanel = panelRef.current?.contains(target);
            if (!clickedTrigger && !clickedPanel) {
                setIsOpen(false);
            }
        };

        updatePanelPosition();
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('resize', updatePanelPosition);
        window.addEventListener('scroll', updatePanelPosition, true);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', updatePanelPosition);
            window.removeEventListener('scroll', updatePanelPosition, true);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) setSearchQuery('');
    }, [isOpen]);

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                style={{
                    ...CONTROL_STYLE,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.7rem 0.9rem',
                    color: selectedOption ? 'var(--text-main)' : 'var(--text-dim)',
                    fontWeight: selectedOption ? 700 : 500,
                }}
            >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedOption?.label || placeholder}
                </span>
                <ChevronDown size={16} style={{ color: 'var(--text-dim)', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
            </button>

            {isOpen && typeof document !== 'undefined' && createPortal(
                <div
                    ref={panelRef}
                    style={{
                        position: 'fixed',
                        top: panelPosition.top,
                        left: panelPosition.left,
                        width: panelPosition.width,
                        maxWidth: 'min(420px, calc(100vw - 24px))',
                        zIndex: 1000,
                        borderRadius: '16px',
                        border: '1px solid color-mix(in srgb, var(--border-subtle) 62%, rgba(59, 130, 246, 0.32) 38%)',
                        background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 98%, white 2%) 0%, color-mix(in srgb, var(--bg-content) 94%, var(--bg-main) 6%) 100%)',
                        boxShadow: '0 28px 46px -30px rgba(15, 23, 42, 0.64)',
                        padding: '0.45rem',
                    }}
                >
                    <div style={{ position: 'relative', padding: '0.15rem 0.15rem 0.55rem', borderBottom: '1px solid var(--border-subtle)' }}>
                        <Search size={14} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                        <input
                            className="camp-test-filter-control"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search country..."
                            style={{ ...CONTROL_STYLE, paddingLeft: '2.2rem' }}
                        />
                    </div>

                    <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'grid', gap: '0.25rem', paddingTop: '0.35rem' }}>
                        {filteredOptions.length === 0 ? (
                            <div style={{ padding: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.82rem' }}>
                                No country matches
                            </div>
                        ) : filteredOptions.map((option) => {
                            const isSelected = option.value === value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        width: '100%',
                                        textAlign: 'left',
                                        padding: '0.68rem 0.75rem',
                                        borderRadius: '12px',
                                        border: isSelected ? '1px solid hsl(var(--primary))' : '1px solid transparent',
                                        background: isSelected ? 'hsla(var(--primary) / 0.08)' : 'transparent',
                                        color: 'var(--text-main)',
                                        fontWeight: isSelected ? 800 : 650,
                                    }}
                                >
                                    <span style={{ width: '16px', display: 'inline-flex', justifyContent: 'center' }}>
                                        {isSelected ? <Check size={14} /> : null}
                                    </span>
                                    <span>{option.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>,
                document.body,
            )}
        </div>
    );
}
