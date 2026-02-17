import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    ChevronLeft,
    ChevronRight,
    Layers,
    Globe,
    Target,
    Bell,
    History,
    BookOpen,
    Settings,
    TrendingUp // Import
} from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { CampaignReminder } from '../../types/campaign';
import { cn } from '../../lib/utils';

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
    const location = useLocation();
    const [pendingRemindersCount, setPendingRemindersCount] = useState(0);



    useEffect(() => {
        const fetchRemindersCount = async () => {
            try {
                const today = new Date().toISOString().split('T')[0];
                const records = await pb.collection('campaign_reminders').getList<CampaignReminder>(1, 1, {
                    filter: `reminder_date <= "${today}" && status = "pending"`,
                });
                setPendingRemindersCount(records.totalItems);
            } catch (error) {
                console.error('Failed to fetch reminders:', error);
            }
        };
        fetchRemindersCount();
        const interval = setInterval(fetchRemindersCount, 60000);
        return () => clearInterval(interval);
    }, []);

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');
    const isTrendSignalsActive = isActive('/adinsight/trends');
    const isPlatformKlookActive = isActive('/adinsight') && !isTrendSignalsActive;

    const NavLink = ({ to, icon: Icon, children, badgeCount, activeCondition }: any) => {
        const active = activeCondition !== undefined ? activeCondition : isActive(to);
        return (
            <Link
                to={to}
                className={cn("nav-item", active && "active")}
                style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem',
                    textDecoration: 'none', color: active ? 'hsl(var(--primary))' : 'var(--text-dim)',
                    background: active ? 'var(--accent-glow)' : 'transparent', fontWeight: active ? 700 : 500
                }}
            >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                {!collapsed && <span style={{ fontSize: '0.875rem' }}>{children}</span>}
                {!collapsed && badgeCount > 0 && (
                    <span style={{
                        marginLeft: 'auto',
                        background: 'hsl(3 85% 56%)',
                        color: 'var(--text-on-accent)',
                        border: '1px solid hsla(3 85% 40% / 0.45)',
                        boxShadow: '0 0 0 2px hsla(3 85% 56% / 0.18)',
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontWeight: 800
                    }}>
                        {badgeCount}
                    </span>
                )}
            </Link>
        );
    };

    return (
        <aside className={cn("sidebar", collapsed && "collapsed")}>
            <button className="collapse-btn" onClick={onToggle}>
                {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
            </button>

            <div className="logo" style={{ marginBottom: '1rem' }}>
                <Layers size={22} strokeWidth={2.5} />
                {!collapsed && <span>AdInsight Flow</span>}
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowY: 'auto', flex: 1 }}>
                {/* Knowledge Base Section - Moved to Top */}
                {!collapsed && <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em', padding: '1.25rem 0.5rem 0.65rem 0.5rem', textTransform: 'uppercase' }}>Knowledge</div>}
                <NavLink to="/global-notes" icon={BookOpen}>
                    General Notes
                </NavLink>

                {/* Section Header */}
                {!collapsed && <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em', padding: '1.75rem 0.5rem 0.65rem 0.5rem', textTransform: 'uppercase' }}>Tracking Core</div>}

                <NavLink to="/camp-tracking" icon={Target} activeCondition={isActive('/camp-tracking') && !location.pathname.includes('/platform') && !['reminders', 'changes'].some(p => location.pathname.includes(p))}>
                    Overview
                </NavLink>

                <NavLink to="/camp-tracking/platforms" icon={Settings}>
                    Manage Platforms
                </NavLink>

                <NavLink to="/camp-tracking/reminders" icon={Bell} badgeCount={pendingRemindersCount}>
                    Reminders
                </NavLink>
                <NavLink to="/camp-tracking/changes" icon={History}>
                    Auto Logs
                </NavLink>

                {/* Ad Insight Section */}
                {!collapsed && <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em', padding: '1.75rem 0.5rem 0.65rem 0.5rem', textTransform: 'uppercase' }}>DSA Analytics</div>}

                {/* NEW: Trend Signals Link */}
                <NavLink to="/adinsight/trends" icon={TrendingUp}>
                    Trend Signals
                </NavLink>

                <NavLink to="/adinsight" icon={Globe} activeCondition={isPlatformKlookActive}>
                    Platform: Klook
                </NavLink>

            </nav>
        </aside>
    );
}
