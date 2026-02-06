import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    Plus,
    Trash2,
    Globe,
    Palette,
    AlertTriangle,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { CampaignPlatform } from '../../types/campaign';

const COLOR_PRESETS = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
    '#6366f1', // indigo
    '#14b8a6', // teal
];

export default function PlatformManagement() {
    const navigate = useNavigate();
    const [platforms, setPlatforms] = useState<CampaignPlatform[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        display_name: '',
        platform_name: '',
        color: COLOR_PRESETS[0]
    });

    useEffect(() => {
        fetchPlatforms();
    }, []);

    const fetchPlatforms = async () => {
        try {
            setLoading(true);
            const records = await pb.collection('campaign_platforms').getFullList<CampaignPlatform>({
                sort: 'display_name',
            });
            setPlatforms(records);
        } catch (err: any) {
            console.error('Failed to fetch platforms:', err);
            setError('Failed to load platforms');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
            // Auto-generate platform_name (slug) from display_name if not manually touched
            ...(name === 'display_name' ? { platform_name: value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-p_]/g, '') } : {})
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const newPlatform = await pb.collection('campaign_platforms').create(formData);
            setPlatforms(prev => [...prev, newPlatform as any].sort((a, b) => a.display_name.localeCompare(b.display_name)));
            setFormData({ display_name: '', platform_name: '', color: COLOR_PRESETS[0] });
            setSuccess(`Platform "${formData.display_name}" created successfully!`);

            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            console.error('Failed to create platform:', err);
            setError(err.message || 'Failed to create platform');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete "${name}"? This might affect existing campaigns.`)) {
            return;
        }

        try {
            await pb.collection('campaign_platforms').delete(id);
            setPlatforms(prev => prev.filter(p => p.id !== id));
            setSuccess(`Platform "${name}" deleted.`);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            console.error('Failed to delete platform:', err);
            setError('Failed to delete platform. It might be in use.');
        }
    };

    return (
        <div className="page-container">
            {/* Header */}
            <div style={{ marginBottom: '1.5rem' }}>
                <button
                    onClick={() => navigate(-1)}
                    className="hero-btn hero-btn-ghost"
                    style={{ padding: '0.4rem 0.75rem', marginLeft: '-0.75rem', marginBottom: '1rem' }}
                >
                    <ChevronLeft size={18} />
                    <span>Back to Overview</span>
                </button>

                <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, letterSpacing: '-0.03em', color: 'hsl(var(--primary))' }}>
                    Platform Management
                </h1>
                <p style={{ color: 'var(--text-dim)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                    Configure platforms and visual identifiers for your campaigns
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem' }}>
                {/* Platform List */}
                <div className="hero-card" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                        <div style={{ padding: '0.6rem', background: 'var(--accent-glow)', borderRadius: '12px', color: 'hsl(var(--primary))' }}>
                            <Globe size={20} />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.01em' }}>Active Platforms</h3>
                    </div>

                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                            <Loader2 size={32} className="animate-spin" style={{ color: 'hsl(var(--primary))' }} />
                        </div>
                    ) : platforms.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)', fontSize: '0.95rem' }}>
                            No platforms found. Add one on the right!
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {platforms.map(platform => (
                                <div
                                    key={platform.id}
                                    className="hero-card"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '1.25rem',
                                        background: 'var(--bg-overlay)',
                                        border: '1px solid var(--border-subtle)',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                        <div
                                            style={{
                                                width: '14px',
                                                height: '14px',
                                                borderRadius: '50%',
                                                background: platform.color,
                                                boxShadow: `0 0 12px ${platform.color}60`
                                            }}
                                        />
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)', letterSpacing: '-0.01em' }}>{platform.display_name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', fontWeight: 600 }}>
                                                SLUG: {platform.platform_name}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleDelete(platform.id, platform.display_name)}
                                        className="hero-btn-ghost"
                                        style={{
                                            padding: '0.6rem',
                                            borderRadius: '0.75rem',
                                            color: '#ef4444',
                                        }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Create Form */}
                <div className="hero-card" style={{ height: 'fit-content', padding: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                        <div style={{ padding: '0.6rem', background: 'var(--accent-glow)', borderRadius: '12px', color: 'hsl(var(--primary))' }}>
                            <Plus size={20} />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.01em' }}>Create Platform</h3>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {error && (
                            <div className="hero-badge animate-fade" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', width: '100%', textTransform: 'none', padding: '0.8rem 1rem', display: 'flex', gap: '0.6rem', fontSize: '0.85rem', fontWeight: 700 }}>
                                <AlertTriangle size={16} />
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="hero-badge animate-fade" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', width: '100%', textTransform: 'none', padding: '0.8rem 1rem', display: 'flex', gap: '0.6rem', fontSize: '0.85rem', fontWeight: 700 }}>
                                <CheckCircle2 size={16} />
                                {success}
                            </div>
                        )}

                        <div className="filter-group">
                            <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Display Name</label>
                            <input
                                type="text"
                                className="hero-input"
                                name="display_name"
                                value={formData.display_name}
                                onChange={handleInputChange}
                                placeholder="e.g. Google Ads"
                                required
                            />
                        </div>

                        <div className="filter-group">
                            <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Internal Key</label>
                            <input
                                type="text"
                                className="hero-input"
                                name="platform_name"
                                value={formData.platform_name}
                                onChange={handleInputChange}
                                placeholder="e.g. google_ads"
                                required
                            />
                        </div>

                        <div className="filter-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                                <Palette size={14} />
                                Brand Identity
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                                {COLOR_PRESETS.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, color: c }))}
                                        style={{
                                            height: '2.25rem',
                                            borderRadius: '0.5rem',
                                            background: c,
                                            border: formData.color === c ? '2px solid var(--text-main)' : '1px solid var(--border-subtle)',
                                            cursor: 'pointer',
                                            transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                                            padding: 0,
                                            boxShadow: formData.color === c ? `0 0 10px ${c}60` : 'none'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    />
                                ))}
                            </div>
                            <input
                                type="text"
                                className="hero-input"
                                name="color"
                                value={formData.color}
                                onChange={handleInputChange}
                                style={{ marginTop: '0.75rem', fontSize: '0.8rem', padding: '0.5rem', fontFamily: 'monospace', fontWeight: 700 }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="hero-btn hero-btn-primary"
                            style={{ width: '100%', marginTop: '0.5rem', padding: '1rem' }}
                        >
                            {submitting ? 'Creating...' : 'Create Platform'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
