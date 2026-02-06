import { Moon, Sun } from 'lucide-react';

interface HeaderProps {
    darkMode: boolean;
    onToggleDarkMode: () => void;
}

export default function Header({ darkMode, onToggleDarkMode }: HeaderProps) {
    return (
        <div className="header-wrapper">
            <header className="top-bar">
                <div className="title-group">
                    <h1>AdInsight Flow</h1>
                    <p>Comprehensive URL analysis and campaign tracking performance</p>
                </div>

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
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                        e.currentTarget.style.borderColor = 'hsl(var(--primary))';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    }}
                >
                    {darkMode ? <Sun size={18} fill="currentColor" /> : <Moon size={18} fill="#64748b" />}
                </button>
            </header>
        </div>
    );
}
