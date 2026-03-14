import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { MultiSelectDropdown } from '../../components/common/MultiSelectDropdown';
import { SafeButton } from '../../components/common/ui';
import type { CountryOption } from '../../hooks/useCountryOptions';
import type { Campaign, CampaignPlatform } from '../../types/campaign';
import type { CampaignRouteFormValues } from './types';
import { DEFAULT_ROUTE_FORM_VALUES, DEFAULT_SEASONAL_TAGS, buildRouteName } from './utils';

interface RouteFormModalProps {
    open: boolean;
    title: string;
    countryOptions: CountryOption[];
    platforms: CampaignPlatform[];
    campaigns: Campaign[];
    initialValues?: CampaignRouteFormValues;
    onClose: () => void;
    onSubmit: (values: CampaignRouteFormValues) => Promise<void> | void;
    isSaving?: boolean;
}

export default function RouteFormModal({
    open,
    title,
    countryOptions,
    platforms,
    campaigns,
    initialValues,
    onClose,
    onSubmit,
    isSaving = false,
}: RouteFormModalProps) {
    const [formValues, setFormValues] = useState<CampaignRouteFormValues>(DEFAULT_ROUTE_FORM_VALUES);

    useEffect(() => {
        if (!open) return;
        setFormValues(initialValues || DEFAULT_ROUTE_FORM_VALUES);
    }, [initialValues, open]);

    const selectedCountry = useMemo(
        () => countryOptions.find((option) => option.value === formValues.destination_country),
        [countryOptions, formValues.destination_country],
    );

    useEffect(() => {
        if (!selectedCountry) return;
        setFormValues((previous) => {
            if (previous.destination_country_code === selectedCountry.code) {
                return previous;
            }

            return {
                ...previous,
                destination_country_code: selectedCountry.code,
                destination_label: previous.destination_city
                    ? `${previous.destination_city}, ${selectedCountry.label}`
                    : selectedCountry.label,
            };
        });
    }, [selectedCountry]);

    useEffect(() => {
        if (!formValues.platform) return;
        const allowedCampaignIds = new Set(
            campaigns
                .filter((campaign) => campaign.platform === formValues.platform)
                .map((campaign) => campaign.id),
        );

        setFormValues((previous) => {
            const filteredCampaigns = previous.campaigns.filter((campaignId) => allowedCampaignIds.has(campaignId));
            if (filteredCampaigns.length === previous.campaigns.length) {
                return previous;
            }

            return {
                ...previous,
                campaigns: filteredCampaigns,
            };
        });
    }, [campaigns, formValues.platform]);

    const updateField = <K extends keyof CampaignRouteFormValues>(key: K, value: CampaignRouteFormValues[K]) => {
        setFormValues((previous) => {
            const next = { ...previous, [key]: value };
            if (key === 'destination_city' || key === 'destination_country') {
                next.destination_label = next.destination_city
                    ? `${next.destination_city}, ${next.destination_country}`
                    : next.destination_country;
            }
            return next;
        });
    };

    const visibleCampaigns = useMemo(() => {
        if (!formValues.platform) return campaigns;
        return campaigns.filter((campaign) => campaign.platform === formValues.platform);
    }, [campaigns, formValues.platform]);

    const campaignOptions = visibleCampaigns.map((campaign) => ({
        label: campaign.name,
        value: campaign.id,
    }));

    const routePreview = buildRouteName(
        formValues.source_market,
        formValues.destination_country || 'Destination',
        formValues.destination_city || undefined,
    );

    if (!open) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 120 }}>
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(2, 6, 23, 0.4)', backdropFilter: 'blur(5px)' }} />

            <div style={{
                position: 'absolute',
                inset: '5vh auto auto 50%',
                transform: 'translateX(-50%)',
                width: 'min(880px, calc(100vw - 2rem))',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: 'var(--bg-content)',
                borderRadius: '24px',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-large)',
                padding: '1.5rem',
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                    <div>
                        <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Outbound Route
                        </div>
                        <h2 style={{ marginTop: '0.35rem', fontSize: '1.75rem', letterSpacing: '-0.04em' }}>{title}</h2>
                        <div style={{ marginTop: '0.55rem', color: 'var(--text-dim)', fontWeight: 700 }}>
                            {routePreview}
                        </div>
                    </div>

                    <SafeButton
                        onClick={onClose}
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '999px',
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--bg-main)',
                            display: 'grid',
                            placeItems: 'center',
                        }}
                    >
                        <X size={16} />
                    </SafeButton>
                </div>

                <div style={{ marginTop: '1.4rem', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
                    <Field label="Platform">
                        <select value={formValues.platform} onChange={(event) => updateField('platform', event.target.value)} style={selectStyle}>
                            <option value="">Unassigned</option>
                            {platforms.map((platform) => (
                                <option key={platform.id} value={platform.id}>
                                    {platform.display_name}
                                </option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Source Market">
                        <select value={formValues.source_market} onChange={(event) => updateField('source_market', event.target.value)} style={selectStyle}>
                            {['HK', 'TW', 'ID', 'SG', 'MY', 'VN', 'PH'].map((market) => (
                                <option key={market} value={market}>
                                    {market}
                                </option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Destination Country">
                        <select value={formValues.destination_country} onChange={(event) => updateField('destination_country', event.target.value)} style={selectStyle}>
                            <option value="">Select destination</option>
                            {countryOptions.map((country) => (
                                <option key={country.code} value={country.value}>
                                    {country.label}
                                </option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Destination Country Code">
                        <input value={formValues.destination_country_code} readOnly style={{ ...inputStyle, color: 'var(--text-dim)', background: 'rgba(148,163,184,0.06)' }} />
                    </Field>

                    <Field label="Destination City">
                        <input
                            value={formValues.destination_city}
                            onChange={(event) => updateField('destination_city', event.target.value)}
                            placeholder="Optional"
                            style={inputStyle}
                        />
                    </Field>

                    <Field label="Status">
                        <select value={formValues.status} onChange={(event) => updateField('status', event.target.value as CampaignRouteFormValues['status'])} style={selectStyle}>
                            <option value="active">Active</option>
                            <option value="planned">Planned</option>
                            <option value="paused">Paused</option>
                            <option value="archived">Archived</option>
                        </select>
                    </Field>

                    <Field label="Priority">
                        <select value={formValues.priority} onChange={(event) => updateField('priority', event.target.value as CampaignRouteFormValues['priority'])} style={selectStyle}>
                            <option value="">None</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </select>
                    </Field>

                    <Field label="Owner">
                        <input
                            value={formValues.owner}
                            onChange={(event) => updateField('owner', event.target.value)}
                            placeholder="Optional"
                            style={inputStyle}
                        />
                    </Field>

                    <Field label="Start Date">
                        <input type="date" value={formValues.start_date} onChange={(event) => updateField('start_date', event.target.value)} style={inputStyle} />
                    </Field>

                    <Field label="End Date">
                        <input type="date" value={formValues.end_date} onChange={(event) => updateField('end_date', event.target.value)} style={inputStyle} />
                    </Field>

                    <Field label="Last Reviewed">
                        <input type="date" value={formValues.last_reviewed_date} onChange={(event) => updateField('last_reviewed_date', event.target.value)} style={inputStyle} />
                    </Field>

                    <Field label="Budget Hint">
                        <input value={formValues.budget_hint} onChange={(event) => updateField('budget_hint', event.target.value)} placeholder="Optional" style={inputStyle} />
                    </Field>

                    <Field label="Target ROAS Hint">
                        <input value={formValues.target_roas_hint} onChange={(event) => updateField('target_roas_hint', event.target.value)} placeholder="Optional" style={inputStyle} />
                    </Field>

                    <Field label="Core Route">
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', fontWeight: 700, color: 'var(--text-main)', paddingTop: '0.6rem' }}>
                            <input
                                type="checkbox"
                                checked={formValues.is_core_route}
                                onChange={(event) => updateField('is_core_route', event.target.checked)}
                            />
                            Mark as strategic route
                        </label>
                    </Field>
                </div>

                <div style={{ marginTop: '1.1rem', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
                    <Field label="Campaigns">
                        <MultiSelectDropdown
                            options={campaignOptions}
                            value={formValues.campaigns.join('|')}
                            onChange={(value) => updateField('campaigns', value.split('|').filter(Boolean))}
                            placeholder={formValues.platform ? 'Attach platform campaigns' : 'Select platform first or show all'}
                            width="100%"
                            showSearch
                        />
                    </Field>

                    <Field label="Seasonal Tags">
                        <MultiSelectDropdown
                            options={DEFAULT_SEASONAL_TAGS.map((tag) => ({ label: tag, value: tag }))}
                            value={formValues.seasonal_tags.join('|')}
                            onChange={(value) => updateField('seasonal_tags', value.split('|').filter(Boolean))}
                            placeholder="Select tags"
                            width="100%"
                        />
                    </Field>
                </div>

                <Field label="Notes" style={{ marginTop: '1rem' }}>
                    <textarea
                        value={formValues.notes}
                        onChange={(event) => updateField('notes', event.target.value)}
                        placeholder="Operational note, route rationale, seasonality..."
                        style={{
                            ...inputStyle,
                            minHeight: '150px',
                            resize: 'vertical',
                            lineHeight: 1.6,
                        }}
                    />
                </Field>

                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <SafeButton
                        onClick={onClose}
                        style={{
                            borderRadius: '14px',
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--bg-main)',
                            color: 'var(--text-dim)',
                            fontWeight: 800,
                            padding: '0.9rem 1.15rem',
                        }}
                    >
                        Cancel
                    </SafeButton>
                    <SafeButton
                        onClick={() => onSubmit(formValues)}
                        disabled={isSaving || !formValues.destination_country}
                        style={{
                            borderRadius: '14px',
                            border: '1px solid hsl(var(--primary))',
                            background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, #2563eb 100%)',
                            color: 'white',
                            fontWeight: 800,
                            padding: '0.9rem 1.2rem',
                            opacity: isSaving || !formValues.destination_country ? 0.6 : 1,
                        }}
                    >
                        {isSaving ? 'Saving...' : 'Save Route'}
                    </SafeButton>
                </div>
            </div>
        </div>
    );
}

function Field({
    label,
    children,
    style,
}: {
    label: string;
    children: ReactNode;
    style?: CSSProperties;
}) {
    return (
        <div style={style}>
            <label style={{ display: 'block', marginBottom: '0.45rem', color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {label}
            </label>
            {children}
        </div>
    );
}

const inputStyle: CSSProperties = {
    width: '100%',
    borderRadius: '14px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--bg-main)',
    color: 'var(--text-main)',
    padding: '0.85rem 0.95rem',
    outline: 'none',
    fontWeight: 500,
    fontFamily: 'var(--font-main)',
};

const selectStyle: CSSProperties = {
    ...inputStyle,
    appearance: 'none',
};
