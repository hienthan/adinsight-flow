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
}

const normalizeSearchText = (value: string) =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd');

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({ options, value, onChange, placeholder = 'Select...', width = '150px', showSearch = false }) => {
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

    return (
        <div ref={containerRef} style={{ position: 'relative', width, minWidth: '160px' }}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0.85rem',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '0.65rem',
                    background: 'var(--bg-content)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 500,
                    color: 'var(--text-main)',
                    transition: SAFE_INTERACTIVE_TRANSITION,
                    fontFamily: 'var(--font-main)'
                }}
            >
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '0.5rem' }}>
                    {renderLabel()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {selectedValues.length > 0 && (
                        <div
                            onClick={clearSelection}
                            style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                            <X size={14} />
                        </div>
                    )}
                    <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
                </div>
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    minWidth: 'max(100%, 260px)',
                    width: 'max-content',
                    background: 'var(--bg-content)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '0.65rem',
                    boxShadow: 'var(--shadow-medium)',
                    zIndex: 120,
                    maxHeight: '220px',
                    overflowY: 'auto',
                    padding: '0.25rem'
                }}>
                    {showSearch && (
                        <div style={{ padding: '0.4rem', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, background: 'var(--bg-content)', zIndex: 10 }}>
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
                                        padding: '0.35rem 0.5rem 0.35rem 1.75rem',
                                        borderRadius: '4px',
                                        border: '1px solid var(--border-subtle)',
                                        background: 'var(--bg-main)',
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
