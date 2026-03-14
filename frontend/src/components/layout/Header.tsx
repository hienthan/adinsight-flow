import { Moon, Sun, Layout, TrendingUp, Zap, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTrendCounts } from '../../hooks/useTrendCounts';
import {
    SAFE_THEME_TOGGLE_SELECTORS,
    createSafeInteractionScopeCss,
} from '../../lib/uiMotion';
import { SafeButton } from '../common/ui/SafeButton';

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

    return (
        <div className="header-wrapper header-shell">
            <header className="top-bar">
                <div className="title-group">
                    <h1>AdInsight Flow</h1>
                    <p>Comprehensive URL analysis and campaign tracking performance</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <style>{`
                        ${createSafeInteractionScopeCss('.header-shell', SAFE_THEME_TOGGLE_SELECTORS)}
                    `}</style>
                    <AnimatePresence>
                        {!loading && (active > 0 || preAlert > 0 || upcoming > 0) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginRight: '0.5rem', background: 'var(--bg-overlay)', padding: '0.35rem 0.75rem', borderRadius: '14px', border: '1px solid var(--border-subtle)', boxShadow: 'inset 0 0 12px rgba(0,0,0,0.02)' }}>
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
                            padding: '0.5rem 0.8rem',
                            borderRadius: '12px',
                            background: stickySidebarOpen ? 'var(--accent-glow)' : 'var(--bg-content)',
                            border: `1px solid ${stickySidebarOpen ? 'hsl(var(--primary))' : 'var(--border-subtle)'}`,
                            color: stickySidebarOpen ? 'hsl(var(--primary))' : 'var(--text-dim)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            boxShadow: 'var(--shadow-soft)'
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
                            padding: '0.5rem',
                            borderRadius: '12px',
                            background: 'var(--bg-content)',
                            border: '1px solid var(--border-subtle)',
                            color: darkMode ? '#fbbf24' : 'var(--text-dim)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 'var(--shadow-soft)'
                        }}
                    >
                        {darkMode ? <Sun size={18} fill="currentColor" /> : <Moon size={18} fill="#64748b" />}
                    </SafeButton>
                </div>
            </header>
        </div>
    );
}
