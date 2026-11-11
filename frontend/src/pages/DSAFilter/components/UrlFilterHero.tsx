import { FileUp, Trash2 } from 'lucide-react';
import { SafeButton, SurfaceCard } from '../../../components/common/ui';

interface UrlFilterHeroProps {
    platform: string;
    isProcessing: boolean;
    sessionId: string;
    processingError: string;
    onPlatformChange: (value: string) => void;
    onUploadClick: () => void;
    onReset: () => void;
}

export function UrlFilterHero({
    platform,
    isProcessing,
    sessionId,
    processingError,
    onPlatformChange,
    onUploadClick,
    onReset,
}: UrlFilterHeroProps) {
    return (
        <SurfaceCard
            padding="0.8rem 0.95rem"
            radius="1.3rem"
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.85rem',
                flexWrap: 'wrap',
                background: [
                    'radial-gradient(circle at top right, rgba(20, 184, 166, 0.12) 0%, transparent 24%)',
                    'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 98%, white 2%) 0%, color-mix(in srgb, var(--bg-content) 92%, var(--bg-main) 8%) 100%)',
                ].join(', '),
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '1.12rem', fontWeight: 850, letterSpacing: '-0.03em', color: 'var(--text-main)' }}>
                    URL Filter
                </div>
                <span className="hero-badge" style={{ background: 'rgba(15, 118, 110, 0.12)', color: '#0f766e', border: '1px solid rgba(15, 118, 110, 0.18)' }}>
                    No PB Insert
                </span>
                <span className="hero-badge" style={{ background: 'rgba(37, 99, 235, 0.12)', color: '#1d4ed8', border: '1px solid rgba(37, 99, 235, 0.18)' }}>
                    /dsa-filter/url
                </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <div className="filter-group">
                    <label>Platform</label>
                    <select value={platform} onChange={(event) => onPlatformChange(event.target.value)} style={{ width: '136px' }}>
                        <option value="Klook">Klook</option>
                        <option value="Traveloka">Traveloka</option>
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <SafeButton
                        onClick={onUploadClick}
                        className="hero-btn hero-btn-primary"
                        style={{ padding: '0.78rem 0.95rem', gap: '0.5rem' }}
                        disabled={isProcessing}
                    >
                        <FileUp size={17} />
                        <span>{isProcessing ? 'Processing...' : 'Upload CSV'}</span>
                    </SafeButton>

                    <SafeButton
                        onClick={onReset}
                        className="hero-btn hero-btn-secondary"
                        style={{ padding: '0.78rem 0.95rem', gap: '0.5rem' }}
                        disabled={!sessionId}
                    >
                        <Trash2 size={17} />
                        <span>Reset</span>
                    </SafeButton>
                </div>
            </div>

            {processingError ? (
                <div style={{
                    padding: '0.75rem 0.9rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(239, 68, 68, 0.22)',
                    background: 'rgba(239, 68, 68, 0.08)',
                    color: '#dc2626',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                }}>
                    {processingError}
                </div>
            ) : null}
        </SurfaceCard>
    );
}
