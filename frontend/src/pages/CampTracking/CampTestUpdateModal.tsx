import { useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { CampaignTestTrack, CampaignTestUpdate } from '../../types/campaign';
import { ModalHero, SafeButton, SurfaceCard } from '../../components/common/ui';
import { formatDestination, formatPlatform, formatSlug } from './campaignTestTrackingShared';

interface CampTestUpdateModalProps {
    open: boolean;
    mode: 'create' | 'edit';
    track: CampaignTestTrack;
    initialUpdate?: CampaignTestUpdate | null;
    isSaving: boolean;
    onClose: () => void;
    onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

type UpdateFormState = {
    update_type: CampaignTestUpdate['update_type'];
    status_snapshot: '' | CampaignTestTrack['status'];
    result_snapshot: '' | NonNullable<CampaignTestTrack['result']>;
    note: string;
    important_flag: boolean;
};

const INITIAL_FORM: UpdateFormState = {
    update_type: 'general_note',
    status_snapshot: '',
    result_snapshot: '',
    note: '',
    important_flag: false,
};

export default function CampTestUpdateModal({
    open,
    mode,
    track,
    initialUpdate,
    isSaving,
    onClose,
    onSubmit,
}: CampTestUpdateModalProps) {
    const [form, setForm] = useState<UpdateFormState>(INITIAL_FORM);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        if (mode === 'edit' && initialUpdate) {
            setForm({
                update_type: initialUpdate.update_type,
                status_snapshot: initialUpdate.status_snapshot || '',
                result_snapshot: initialUpdate.result_snapshot || '',
                note: initialUpdate.note || '',
                important_flag: Boolean(initialUpdate.important_flag),
            });
        } else {
            setForm({
                update_type: 'general_note',
                status_snapshot: track.status,
                result_snapshot: track.result || '',
                note: '',
                important_flag: false,
            });
        }
        setError('');
    }, [initialUpdate, mode, open, track.result, track.status]);

    if (!open) return null;

    const updateField = <K extends keyof UpdateFormState>(key: K, value: UpdateFormState[K]) => {
        setForm((previous) => ({ ...previous, [key]: value }));
    };

    const handleSubmit = async () => {
        if (!form.note.trim()) {
            setError('Update note is required.');
            return;
        }

        setError('');
        await onSubmit({
            test_track: track.id,
            update_type: form.update_type,
            status_snapshot: form.status_snapshot || null,
            result_snapshot: form.result_snapshot || null,
            source_market_snapshot: track.source_market,
            destination_country_snapshot: track.destination_country,
            destination_city_snapshot: track.destination_city || '',
            pattern_topic_snapshot: track.pattern_topic,
            category_snapshot: track.category || '',
            note: form.note,
            linked_campaigns_snapshot: (track.expand?.linked_campaigns || []).map((campaign) => ({
                id: campaign.id,
                name: campaign.name,
            })),
            important_flag: form.important_flag,
            metadata: initialUpdate?.metadata || {},
        });
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 125 }}>
            <div
                onClick={onClose}
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(2, 6, 23, 0.36)',
                    backdropFilter: 'blur(6px)',
                }}
            />

            <div style={{
                position: 'absolute',
                inset: '10vh 14vw',
                overflow: 'hidden',
                borderRadius: '28px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-main)',
                boxShadow: 'var(--shadow-large)',
                display: 'flex',
                flexDirection: 'column',
            }}>
                <div style={{ padding: '1.1rem 1.1rem 0' }}>
                    <ModalHero
                        accent="#0f766e"
                        eyebrow="Lane Update"
                        title={mode === 'edit' ? 'Edit Timeline Update' : 'Add Timeline Update'}
                        subtitle={`${formatPlatform(track)} · ${track.source_market} -> ${formatDestination(track)} · ${formatSlug(track.pattern_topic)}`}
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
                    />
                </div>

                <div style={{ padding: '1.1rem', overflowY: 'auto', display: 'grid', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.85rem' }}>
                        <Field label="Update Type">
                            <select value={form.update_type} onChange={(event) => updateField('update_type', event.target.value as UpdateFormState['update_type'])}>
                                {['launch_note', 'performance_review', 'hypothesis_update', 'failure_note', 'winner_note', 'pause_note', 'retest_note', 'general_note'].map((value) => (
                                    <option key={value} value={value}>{formatSlug(value)}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Status Snapshot">
                            <select value={form.status_snapshot} onChange={(event) => updateField('status_snapshot', event.target.value as UpdateFormState['status_snapshot'])}>
                                <option value="">None</option>
                                {['planned', 'testing', 'live', 'watching', 'failed', 'paused', 'archived'].map((value) => (
                                    <option key={value} value={value}>{formatSlug(value)}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Result Snapshot">
                            <select value={form.result_snapshot} onChange={(event) => updateField('result_snapshot', event.target.value as UpdateFormState['result_snapshot'])}>
                                <option value="">None</option>
                                {['positive', 'neutral', 'mixed', 'negative'].map((value) => (
                                    <option key={value} value={value}>{formatSlug(value)}</option>
                                ))}
                            </select>
                        </Field>
                    </div>

                    <Field label="Note" required>
                        <textarea
                            value={form.note}
                            onChange={(event) => updateField('note', event.target.value)}
                            rows={10}
                            placeholder="What changed, what was observed, and what we should do next..."
                        />
                    </Field>

                    <SurfaceCard variant="inset" radius="18px" padding="1rem">
                        <label style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center', fontWeight: 700, color: 'var(--text-main)' }}>
                            <input
                                type="checkbox"
                                checked={form.important_flag}
                                onChange={(event) => updateField('important_flag', event.target.checked)}
                            />
                            Mark this update as important
                        </label>
                    </SurfaceCard>

                    {error ? <div style={{ color: '#b91c1c', fontWeight: 700 }}>{error}</div> : null}
                </div>

                <div style={{ padding: '0 1.1rem 1.1rem', display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
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
                        disabled={isSaving}
                        style={{
                            borderRadius: '14px',
                            border: '1px solid #0f766e',
                            background: 'linear-gradient(135deg, #0f766e 0%, #0891b2 100%)',
                            color: '#fff',
                            fontWeight: 800,
                            padding: '0.9rem 1.15rem',
                            minWidth: '150px',
                            opacity: isSaving ? 0.8 : 1,
                        }}
                    >
                        {isSaving ? 'Saving...' : mode === 'edit' ? 'Save Update' : 'Add Update'}
                    </SafeButton>
                </div>
            </div>
        </div>
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
        <label style={{ display: 'grid', gap: '0.45rem' }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {label}{required ? ' *' : ''}
            </div>
            {children}
        </label>
    );
}
