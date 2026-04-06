import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X, Search } from 'lucide-react';
import { SAFE_INTERACTIVE_TRANSITION } from '../../lib/uiMotion';

interface Option {
    label: string;
    value: string;
}

interface MultiSelectDropdownProps {
    options: Option[];
    value: string; // comma separated string
    onChange: (val: string) => void;
    placeholder?: string;
    width?: string;
    showSearch?: boolean;
    variant?: 'default' | 'premium';
}

const normalizeSearchText = (value: string) =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd');

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Select...',
    width = '150px',
    showSearch = false,
    variant = 'default',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const [searchQuery, setSearchQuery] = useState('');

    const selectedValues = value ? value.split('|').filter(Boolean) : [];

    // Filter by empty value and search query
    const selectableOptions = options.filter(o => {
        if (o.value === '') return false;
        if (showSearch && searchQuery) return normalizeSearchText(o.label).includes(normalizeSearchText(searchQuery));
        return true;
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (optValue: string) => {
        let newValues: string[];
        if (selectedValues.includes(optValue)) {
            newValues = selectedValues.filter(v => v !== optValue);
        } else {
            newValues = [...selectedValues, optValue];
        }
        onChange(newValues.join('|'));
    };

    const clearSelection = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
    };

    const renderLabel = () => {
        if (selectedValues.length === 0) return <span style={{ color: 'var(--text-dim)' }}>{placeholder}</span>;
        if (selectedValues.length === 1) {
            const opt = options.find(o => o.value === selectedValues[0]);
            return opt ? opt.label : selectedValues[0];
        }
        return `${selectedValues.length} selected`;
    };

    const isPremium = variant === 'premium';
    const triggerStyle = isPremium ? {
        padding: '0.7rem 0.9rem',
        minHeight: '44px',
        border: '1px solid color-mix(in srgb, var(--border-subtle) 74%, rgba(59, 130, 246, 0.24) 26%)',
        borderRadius: '14px',
        background: [
            'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 97%, white 3%) 0%, color-mix(in srgb, var(--bg-content) 92%, var(--bg-main) 8%) 100%)',
            'radial-gradient(circle at top right, rgba(59, 130, 246, 0.08) 0%, transparent 42%)',
        ].join(', '),
        boxShadow: isOpen
            ? '0 0 0 4px rgba(59, 130, 246, 0.08), 0 18px 34px -26px rgba(15, 23, 42, 0.42)'
            : 'inset 0 1px 0 rgba(255,255,255,0.42), 0 18px 34px -28px rgba(15, 23, 42, 0.38)',
        backdropFilter: 'blur(14px)',
    } : {
        padding: '0.55rem 0.85rem',
        border: '1px solid var(--border-subtle)',
        borderRadius: '0.65rem',
        background: 'var(--bg-content)',
    };

    const panelStyle = isPremium ? {
        top: 'calc(100% + 8px)',
        border: '1px solid color-mix(in srgb, var(--border-subtle) 72%, rgba(59, 130, 246, 0.24) 28%)',
        borderRadius: '16px',
        background: [
            'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 98%, white 2%) 0%, color-mix(in srgb, var(--bg-content) 94%, var(--bg-main) 6%) 100%)',
            'radial-gradient(circle at top right, rgba(59, 130, 246, 0.08) 0%, transparent 36%)',
        ].join(', '),
        boxShadow: '0 28px 46px -30px rgba(15, 23, 42, 0.64)',
        padding: '0.4rem',
        maxHeight: '260px',
        backdropFilter: 'blur(16px)',
    } : {
        top: 'calc(100% + 4px)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '0.65rem',
        background: 'var(--bg-content)',
        boxShadow: 'var(--shadow-medium)',
        padding: '0.25rem',
        maxHeight: '220px',
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width, minWidth: '160px' }}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    fontWeight: isPremium ? 600 : 500,
                    color: 'var(--text-main)',
                    transition: SAFE_INTERACTIVE_TRANSITION,
                    fontFamily: 'var(--font-main)',
                    ...triggerStyle,
                }}
            >
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '0.5rem' }}>
                    {renderLabel()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {selectedValues.length > 0 ? (
                        <div
                            onClick={clearSelection}
                            style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                            <X size={14} />
                        </div>
                    ) : null}
                    <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                </div>
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    left: 0,
                    minWidth: 'max(100%, 260px)',
                    width: 'max-content',
                    zIndex: 120,
                    overflowY: 'auto',
                    ...panelStyle,
                }}>
                    {showSearch && (
                        <div style={{
                            padding: isPremium ? '0.45rem 0.45rem 0.55rem' : '0.4rem',
                            borderBottom: '1px solid var(--border-subtle)',
                            position: 'sticky',
                            top: 0,
                            background: isPremium
                                ? 'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 98%, white 2%) 0%, color-mix(in srgb, var(--bg-content) 95%, var(--bg-main) 5%) 100%)'
                                : 'var(--bg-content)',
                            zIndex: 10,
                        }}>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <Search size={14} style={{ position: 'absolute', left: '0.5rem', color: 'var(--text-dim)' }} />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        width: '100%',
                                        padding: isPremium ? '0.55rem 0.7rem 0.55rem 1.9rem' : '0.35rem 0.5rem 0.35rem 1.75rem',
                                        borderRadius: isPremium ? '10px' : '4px',
                                        border: '1px solid var(--border-subtle)',
                                        background: isPremium ? 'var(--bg-overlay)' : 'var(--bg-main)',
                                        fontSize: '0.8rem',
                                        color: 'var(--text-main)',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </div>
                    )}
                    {selectableOptions.length === 0 ? (
                        <div style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>No matches found</div>
                    ) : (
                        selectableOptions.map(opt => {
                            const isSelected = selectedValues.includes(opt.value);
                            return (
                                <div
                                    key={opt.value}
                                    onClick={(e) => { e.stopPropagation(); toggleOption(opt.value); }}
                                    className={`multiselect-option ${isSelected ? 'selected' : ''}`}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        padding: isPremium ? '0.62rem 0.7rem' : '0.45rem 0.55rem',
                                        borderRadius: isPremium ? '12px' : '8px',
                                        background: isSelected
                                            ? 'linear-gradient(180deg, rgba(59, 130, 246, 0.12) 0%, color-mix(in srgb, var(--bg-content) 94%, rgba(59, 130, 246, 0.06) 6%) 100%)'
                                            : 'transparent',
                                        color: 'var(--text-main)',
                                        cursor: 'pointer',
                                        transition: SAFE_INTERACTIVE_TRANSITION,
                                    }}
                                >
                                    <div style={{ width: '16px', display: 'flex', justifyContent: 'center', marginRight: '6px' }}>
                                        {isSelected && <Check size={14} />}
                                    </div>
                                    <span style={{ flex: 1, whiteSpace: 'normal', overflowWrap: 'anywhere', lineHeight: 1.35 }}>{opt.label}</span>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};
