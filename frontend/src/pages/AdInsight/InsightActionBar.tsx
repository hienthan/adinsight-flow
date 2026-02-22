import React, { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { MultiSelectDropdown } from '../../components/common/MultiSelectDropdown';

interface InsightActionBarProps {
    selectedCount: number;
    onClear: () => void;
    onUpdateTier: (tier: number) => void;
    onUpdateSubTag: (subTag: string) => void;
    onUpdateStatus: (isActive: boolean) => void;
    availableSubTags: { label: string, value: string }[];
    isUpdating: boolean;
}

export const InsightActionBar: React.FC<InsightActionBarProps> = ({
    selectedCount,
    onClear,
    onUpdateTier,
    onUpdateSubTag,
    onUpdateStatus,
    availableSubTags,
    isUpdating
}) => {
    const [selectedTier, setSelectedTier] = useState<string>('');
    const [selectedSubTag, setSelectedSubTag] = useState<string>('');

    if (selectedCount === 0) return null;

    const tierOptions = [1, 2, 3, 4, 5].map(t => ({ label: `Tier ${t}`, value: String(t) }));

    const handleTierChange = (val: string) => {
        setSelectedTier(val);
        // Only trigger update if a single valid tier is selected (prevent commas from multi-select)
        if (val && !val.includes(',')) {
            onUpdateTier(Number(val));
            setSelectedTier(''); // Reset after action
        }
    };

    const handleSubTagChange = (val: string) => {
        setSelectedSubTag(val);
        if (val && !val.includes(',')) {
            onUpdateSubTag(val);
            setSelectedSubTag('');
        }
    };

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
            gap: '1.5rem',
            zIndex: 1000,
            animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderRight: '1px solid var(--border-subtle)', paddingRight: '1.5rem' }}>
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
                        onChange={handleTierChange}
                        placeholder="Set Tier..."
                        width="130px"
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MultiSelectDropdown
                        options={availableSubTags}
                        value={selectedSubTag}
                        onChange={handleSubTagChange}
                        placeholder="Set Sub Tag..."
                        width="160px"
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '1rem' }}>
                    <button
                        onClick={() => onUpdateStatus(true)}
                        disabled={isUpdating}
                        className="hero-btn-secondary"
                        style={{ padding: '0.45rem', fontSize: '0.8rem', borderRadius: '8px', display: 'flex' }}
                        title="Set Active"
                    >
                        <Eye size={16} />
                    </button>
                    <button
                        onClick={() => onUpdateStatus(false)}
                        disabled={isUpdating}
                        className="hero-btn-secondary"
                        style={{ padding: '0.45rem', fontSize: '0.8rem', color: 'var(--danger-text)', background: 'var(--danger-bg)', borderRadius: '8px', display: 'flex' }}
                        title="Set Inactive"
                    >
                        <EyeOff size={16} />
                    </button>
                </div>
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
                    marginLeft: '0.5rem'
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
