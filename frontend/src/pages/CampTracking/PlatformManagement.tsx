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
import RichTextEditor from '../../components/common/RichTextEditor';

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
        id: '',
        display_name: '',
        platform_name: '',
        color: COLOR_PRESETS[0],
        metadata: ''
    });
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        fetchPlatforms();
    }, []);

    useEffect(() => {
        if (loading) return;
        if (platforms.length === 0) return;
        if (formData.id) return;
        handleEdit(platforms[0]);
    }, [loading, platforms, formData.id]);

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

    const handleEdit = (platform: CampaignPlatform) => {
        setFormData({
            id: platform.id,
            display_name: platform.display_name,
            platform_name: platform.platform_name,
            color: platform.color,
            metadata: platform.metadata || ''
        });
        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancel = () => {
        setFormData({ id: '', display_name: '', platform_name: '', color: COLOR_PRESETS[0], metadata: '' });
        setIsEditing(false);
        setError(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
            // Only auto-gen slug for NEW platforms
            ...(name === 'display_name' && !isEditing ? { platform_name: value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') } : {})
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            if (isEditing && formData.id) {
                const updated = await pb.collection('campaign_platforms').update(formData.id, formData);
                setPlatforms(prev => prev.map(p => p.id === formData.id ? updated as any : p));
                setSuccess(`Platform "${formData.display_name}" updated.`);
            } else {
                const newPlatform = await pb.collection('campaign_platforms').create(formData);
                setPlatforms(prev => [...prev, newPlatform as any].sort((a, b) => a.display_name.localeCompare(b.display_name)));
                setSuccess(`Platform "${formData.display_name}" created.`);
            }

            handleCancel();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            console.error('Failed to save platform:', err);
            setError(err.message || 'Failed to save platform');
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
            if (isEditing && formData.id === id) handleCancel();
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
                    Platform Governance
                </h1>
                <p style={{ color: 'var(--text-dim)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                    Manage delivery channels and global strategic documentation
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 380px', gap: '1.5rem', alignItems: 'flex-start' }}>
                {/* Platform List */}
                <div className="hero-card no-lift" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <div style={{ padding: '0.5rem', background: 'var(--accent-glow)', borderRadius: '10px', color: 'hsl(var(--primary))' }}>
                            <Globe size={18} />
                        </div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.01em', margin: 0 }}>Channels</h3>
                    </div>

                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                            <Loader2 size={24} className="animate-spin" style={{ color: 'hsl(var(--primary))' }} />
                        </div>
                    ) : platforms.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                            No platforms found.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {platforms.map(platform => (
                                <div
                                    key={platform.id}
                                    onClick={() => handleEdit(platform)}
                                    className="nav-item"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '0.75rem 1rem',
                                        background: platform.id === formData.id ? 'var(--accent-glow)' : 'var(--bg-overlay)',
                                        border: platform.id === formData.id ? '1px solid hsl(var(--primary))' : '1px solid var(--border-subtle)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                                        <div
                                            style={{
                                                width: '10px',
                                                height: '10px',
                                                borderRadius: '50%',
                                                background: platform.color,
                                                flexShrink: 0
                                            }}
                                        />
                                        <span style={{
                                            fontWeight: 700,
                                            fontSize: '0.9rem',
                                            color: platform.id === formData.id ? 'hsl(var(--primary))' : 'var(--text-main)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {platform.display_name}
                                        </span>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(platform.id, platform.display_name); }}
                                        className="hero-btn-ghost"
                                        style={{ padding: '0.4rem', borderRadius: '0.5rem', color: '#ef4444', opacity: 0.6 }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Form Wrapper (Spans Notes + Identity) */}
                <form id="platform-form" onSubmit={handleSubmit} style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'stretch' }}>

                    {/* Metadata Column (Now in the Middle) */}
                    <div className="hero-card no-lift" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ padding: '0.6rem', background: 'var(--accent-glow)', borderRadius: '12px', color: 'hsl(var(--primary))' }}>
                                    <Globe size={20} />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.01em', margin: 0 }}>Strategic Notes</h3>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                {isEditing && (
                                    <button type="button" onClick={handleCancel} className="hero-btn hero-btn-ghost">Cancel</button>
                                )}
                                <button type="submit" disabled={submitting} className="hero-btn hero-btn-primary">
                                    {submitting ? 'Saving...' : (isEditing ? 'Update Platform' : 'Create Platform')}
                                </button>
                            </div>
                        </div>

                        <div className="filter-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Guidelines & Constraints</label>
                            <div style={{ marginTop: '0.5rem' }}>
                                <RichTextEditor
                                    value={formData.metadata}
                                    onChange={(nextHtml) => setFormData((prev) => ({ ...prev, metadata: nextHtml }))}
                                    placeholder="Enter best practices, rules, or constraints for this platform..."
                                    minHeight={300}
                                    maxHeight={540}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Identity Column (Now on the Right) */}
                    <div className="hero-card no-lift" style={{ padding: '2rem', border: isEditing ? '1px solid hsl(var(--primary))' : '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                            <div style={{ padding: '0.6rem', background: 'var(--accent-glow)', borderRadius: '12px', color: 'hsl(var(--primary))' }}>
                                {isEditing ? <Palette size={20} /> : <Plus size={20} />}
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.01em', margin: 0 }}>
                                {isEditing ? 'Identity' : 'Add Channel'}
                            </h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Channel Name</label>
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
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Internal Slug</label>
                                <input
                                    type="text"
                                    className="hero-input"
                                    name="platform_name"
                                    value={formData.platform_name}
                                    onChange={handleInputChange}
                                    placeholder="e.g. google_ads"
                                    required
                                    disabled={isEditing}
                                />
                            </div>

                            <div className="filter-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                                    <Palette size={14} />
                                    Visual Identity
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    {COLOR_PRESETS.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, color: c }))}
                                            style={{
                                                height: '2rem',
                                                borderRadius: '0.5rem',
                                                background: c,
                                                border: formData.color === c ? '2px solid var(--text-main)' : '1px solid var(--border-subtle)',
                                                cursor: 'pointer',
                                                boxShadow: formData.color === c ? `0 0 10px ${c}60` : 'none'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
