import { Moon, Sun, Layout } from 'lucide-react';

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
    return (
        <div className="header-wrapper">
            <header className="top-bar">
                <div className="title-group">
                    <h1>AdInsight Flow</h1>
                    <p>Comprehensive URL analysis and campaign tracking performance</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
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
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: 'var(--shadow-soft)'
                        }}
                    >
                        <Layout size={18} />
                        <span>Sticky Hub</span>
                    </button>

                    <button
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
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 'var(--shadow-soft)'
                        }}
                    >
                        {darkMode ? <Sun size={18} fill="currentColor" /> : <Moon size={18} fill="#64748b" />}
                    </button>
                </div>
            </header>
        </div>
    );
}
