import React from 'react';
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
                >
                    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </header>
        </div>
    );
}
