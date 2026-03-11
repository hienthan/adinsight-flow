import React, { useState } from 'react';
import { X, Eye, EyeOff, Check } from 'lucide-react';
import { MultiSelectDropdown } from '../../components/common/MultiSelectDropdown';

interface InsightActionBarProps {
    selectedCount: number;
    onClear: () => void;
    onApply: (payload: { tier?: string; country?: string; is_active?: boolean }) => void;
    isUpdating: boolean;
}

export const InsightActionBar: React.FC<InsightActionBarProps> = ({
    selectedCount,
    onClear,
    onApply,
    isUpdating
}) => {
    const [selectedTier, setSelectedTier] = useState<string>('');
    const [setToUnknownCountry, setSetToUnknownCountry] = useState<boolean>(false);
    const [selectedStatus, setSelectedStatus] = useState<boolean | null>(null);

    if (selectedCount === 0) return null;

    const tierOptions = [1, 2, 3, 4, 5].map(t => ({ label: `Tier ${t}`, value: String(t) }));

    const handleApply = () => {
        const payload: { tier?: string; country?: string; is_active?: boolean } = {};
        if (selectedTier) payload.tier = selectedTier;
        if (setToUnknownCountry) payload.country = 'Unknown';
        if (selectedStatus !== null) payload.is_active = selectedStatus;

        if (Object.keys(payload).length > 0) {
            onApply(payload);
            setSelectedTier('');
            setSetToUnknownCountry(false);
            setSelectedStatus(null);
        }
    };

    const hasSelection = selectedTier || setToUnknownCountry || selectedStatus !== null;

    return (
        <div style={{
            position: 'fixed',
            top: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--bg-content)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-floating)',
            padding: '0.75rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            zIndex: 1000,
            animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderRight: '1px solid var(--border-subtle)', paddingRight: '1.25rem' }}>
                <div style={{
                    background: 'hsl(var(--primary))',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '20px'
                }}>
                    {selectedCount}
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>Selected</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MultiSelectDropdown
                        options={tierOptions}
                        value={selectedTier}
                        onChange={setSelectedTier}
                        placeholder="Set Tier..."
                        width="125px"
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={() => setSetToUnknownCountry(!setToUnknownCountry)}
                        disabled={isUpdating}
                        className={`hero-btn ${setToUnknownCountry ? 'hero-btn-primary' : 'hero-btn-secondary'}`}
                        style={{
                            padding: '0.5rem 0.85rem',
                            fontSize: '0.8rem',
                            height: '38px',
                            borderRadius: '10px',
                            fontWeight: setToUnknownCountry ? 800 : 600
                        }}
                        title="Set Country = Unknown"
                    >
                        Country = Unknown
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)', paddingLeft: '1rem', paddingRight: '1rem' }}>
                    <button
                        onClick={() => setSelectedStatus(true)}
                        disabled={isUpdating}
                        className={`hero-btn-secondary ${selectedStatus === true ? 'active' : ''}`}
                        style={{
                            padding: '0.45rem',
                            fontSize: '0.8rem',
                            borderRadius: '8px',
                            display: 'flex',
                            background: selectedStatus === true ? 'hsla(var(--primary) / 0.15)' : 'transparent',
                            color: selectedStatus === true ? 'hsl(var(--primary))' : 'var(--text-dim)',
                            border: selectedStatus === true ? '1px solid hsla(var(--primary) / 0.4)' : '1px solid transparent',
                            transition: 'all 0.2s ease'
                        }}
                        title="Set Active"
                    >
                        <Eye size={16} />
                    </button>
                    <button
                        onClick={() => setSelectedStatus(false)}
                        disabled={isUpdating}
                        className={`hero-btn-secondary ${selectedStatus === false ? 'active' : ''}`}
                        style={{
                            padding: '0.45rem',
                            fontSize: '0.8rem',
                            borderRadius: '8px',
                            display: 'flex',
                            background: selectedStatus === false ? 'hsla(var(--destructive) / 0.15)' : 'transparent',
                            color: selectedStatus === false ? 'hsl(var(--destructive))' : 'var(--text-dim)',
                            border: selectedStatus === false ? '1px solid hsla(var(--destructive) / 0.4)' : '1px solid transparent',
                            transition: 'all 0.2s ease'
                        }}
                        title="Set Inactive"
                    >
                        <EyeOff size={16} />
                    </button>
                </div>

                <button
                    onClick={handleApply}
                    disabled={!hasSelection || isUpdating}
                    className="hero-btn hero-btn-primary"
                    style={{
                        padding: '0.5rem 0.85rem',
                        fontSize: '0.8rem',
                        height: '38px',
                        borderRadius: '10px',
                        opacity: hasSelection ? 1 : 0.5
                    }}
                >
                    {isUpdating ? 'Updating...' : <><Check size={16} /> Update</>}
                </button>
            </div>

            <button
                onClick={onClear}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-overlay)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    color: 'var(--text-dim)',
                    marginLeft: '0.25rem'
                }}
                title="Clear Selection"
            >
                <X size={16} />
            </button>
            <style>
                {`
                    @keyframes slideDown {
                        from { transform: translate(-50%, -20px); opacity: 0; }
                        to { transform: translate(-50%, 0); opacity: 1; }
                    }
                `}
            </style>
        </div>
    );
};
