import { Moon, Sun, Layout, TrendingUp, Zap, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTrendCounts } from '../../hooks/useTrendCounts';
import {
    SAFE_THEME_TOGGLE_SELECTORS,
    createSafeInteractionScopeCss,
} from '../../lib/uiMotion';
import { SafeButton } from '../common/ui/SafeButton';
import { createAmbientSurface } from '../common/ui';

interface HeaderProps {
    darkMode: boolean;
    onToggleDarkMode: () => void;
    stickySidebarOpen: boolean;
    onToggleStickySidebar: () => void;
}

export default function Header({
    darkMode,
    onToggleDarkMode,
    stickySidebarOpen,
    onToggleStickySidebar
}: HeaderProps) {
    const { active, preAlert, upcoming, loading } = useTrendCounts();
    const signalCount = active + preAlert + upcoming;

    return (
        <div className="header-wrapper header-shell">
            <header
                className="top-bar"
                style={{
                    padding: '1.2rem 1.3rem',
                    borderRadius: '1.55rem',
                    ...createAmbientSurface('#3b82f6', 0.9),
                    boxShadow: '0 24px 46px -36px rgba(15, 23, 42, 0.7)',
                }}
            >
                <div className="title-group" style={{ minWidth: 0 }}>
                    <h1 style={{ color: 'var(--text-main)' }}>AdInsight Flow</h1>
                    <p>Command center for URL analysis, campaign tracking, and outbound planning.</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <style>{`
                        ${createSafeInteractionScopeCss('.header-shell', SAFE_THEME_TOGGLE_SELECTORS)}
                    `}</style>
                    <AnimatePresence>
                        {!loading && signalCount > 0 && (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    marginRight: '0.1rem',
                                    background: 'linear-gradient(180deg, var(--bg-overlay) 0%, color-mix(in srgb, var(--bg-overlay) 82%, var(--bg-main) 18%) 100%)',
                                    padding: '0.55rem 0.85rem',
                                    borderRadius: '1rem',
                                    border: '1px solid var(--border-subtle)',
                                    boxShadow: '0 16px 32px -28px rgba(15, 23, 42, 0.55)',
                                }}
                            >
                                <div style={{ paddingRight: '0.5rem', borderRight: '1px solid var(--border-subtle)' }}>
                                    <div style={{ fontSize: '1rem', fontWeight: 850, color: 'var(--text-main)', lineHeight: 1 }}>
                                        {signalCount}
                                    </div>
                                </div>
                                {active > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
                                        title={`${active} Active Trends`}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', boxShadow: 'inset 0 0 0 1px rgba(16, 185, 129, 0.05)' }}>
                                            <TrendingUp size={14} style={{ color: '#10b981' }} />
                                        </div>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>{active}</span>
                                    </motion.div>
                                )}

                                {active > 0 && (preAlert > 0 || upcoming > 0) && (
                                    <div style={{ width: '1px', height: '12px', background: 'var(--border-subtle)' }} />
                                )}

                                {preAlert > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
                                        title={`${preAlert} Pre-alerts`}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', boxShadow: 'inset 0 0 0 1px rgba(245, 158, 11, 0.04)' }}>
                                            <Zap size={14} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                                        </div>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>{preAlert}</span>
                                    </motion.div>
                                )}

                                {preAlert > 0 && upcoming > 0 && (
                                    <div style={{ width: '1px', height: '12px', background: 'var(--border-subtle)' }} />
                                )}

                                {upcoming > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
                                        title={`${upcoming} Upcoming Trends`}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)' }} >
                                            <Calendar size={14} style={{ color: '#3b82f6' }} />
                                        </div>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#3b82f6', fontVariantNumeric: 'tabular-nums' }}>{upcoming}</span>
                                    </motion.div>
                                )}
                            </div>
                        )}
                    </AnimatePresence>

                    <SafeButton
                        onClick={onToggleStickySidebar}
                        className="theme-toggle"
                        title={stickySidebarOpen ? 'Close Sticky Hub' : 'Open Sticky Hub'}
                        style={{
                            padding: '0.62rem 0.9rem',
                            borderRadius: '14px',
                            background: stickySidebarOpen
                                ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.16) 0%, rgba(34, 211, 238, 0.12) 100%)'
                                : 'linear-gradient(180deg, var(--bg-content) 0%, color-mix(in srgb, var(--bg-content) 88%, var(--bg-main) 12%) 100%)',
                            border: `1px solid ${stickySidebarOpen ? 'rgba(59, 130, 246, 0.22)' : 'var(--border-subtle)'}`,
                            color: stickySidebarOpen ? '#93c5fd' : 'var(--text-dim)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            boxShadow: '0 16px 28px -24px rgba(15, 23, 42, 0.48)'
                        }}
                    >
                        <Layout size={18} />
                        <span>Sticky Hub</span>
                    </SafeButton>

                    <SafeButton
                        onClick={onToggleDarkMode}
                        className="theme-toggle"
                        title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        style={{
                            padding: '0.62rem',
                            borderRadius: '14px',
                            background: 'linear-gradient(180deg, var(--bg-content) 0%, color-mix(in srgb, var(--bg-content) 88%, var(--bg-main) 12%) 100%)',
                            border: '1px solid var(--border-subtle)',
                            color: darkMode ? '#fbbf24' : 'var(--text-dim)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 16px 28px -24px rgba(15, 23, 42, 0.48)'
                        }}
                    >
                        {darkMode ? <Sun size={18} fill="currentColor" /> : <Moon size={18} fill="#64748b" />}
                    </SafeButton>
                </div>
            </header>
        </div>
    );
}
