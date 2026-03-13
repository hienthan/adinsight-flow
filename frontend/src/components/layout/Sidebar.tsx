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
    Settings,
    TrendingUp,
    FileText
} from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { CampaignReminder } from '../../types/campaign';
import { cn } from '../../lib/utils';

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

const KlookIcon = () => (
    <div style={{
        flexShrink: 0,
        width: 18,
        height: 18,
        borderRadius: 5,
        background: '#ff5b00',
        boxShadow: '0 2px 8px rgba(255, 91, 0, 0.3)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.6rem',
        fontWeight: 900
    }}>K</div>
);

const TravelokaIcon = () => (
    <div style={{
        flexShrink: 0,
        width: 18,
        height: 18,
        borderRadius: 5,
        background: '#1ba0e2',
        boxShadow: '0 2px 8px rgba(27, 160, 226, 0.3)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.55rem',
        fontWeight: 900
    }}>TK</div>
);



export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
    const location = useLocation();
    const [reminderCounts, setReminderCounts] = useState({ overdue: 0, today: 0 });
    const [platformsExpanded, setPlatformsExpanded] = useState(true);

    const getLocalDateString = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };



    useEffect(() => {
        const fetchRemindersCount = async () => {
            try {
                const today = getLocalDateString();
                const records = await pb.collection('campaign_reminders').getFullList<CampaignReminder>({
                    filter: `reminder_date <= "${today}" && status = "pending"`,
                });

                let overdue = 0;
                let todayCount = 0;

                records.forEach(r => {
                    const rDateStr = r.reminder_date.slice(0, 10);
                    if (rDateStr < today) overdue++;
                    else if (rDateStr === today) todayCount++;
                });

                setReminderCounts({ overdue, today: todayCount });
            } catch (error) {
                console.error('Failed to fetch reminders:', error);
            }
        };
        fetchRemindersCount();
        const interval = setInterval(fetchRemindersCount, 60000);
        return () => clearInterval(interval);
    }, []);

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

    const NavLink = ({ to, icon: Icon, children, badgeCount, badgeText, activeCondition, color = 'blue' }: any) => {
        const active = activeCondition !== undefined ? activeCondition : isActive(to);
        const hasBadge = badgeCount > 0 || !!badgeText;

        // Premium Color Palette
        const colors: Record<string, { main: string, bg: string }> = {
            blue: { main: 'hsl(217, 91%, 60%)', bg: 'hsla(217, 91%, 60%, 0.1)' },
            emerald: { main: 'hsl(160, 84%, 39%)', bg: 'hsla(160, 84%, 39%, 0.1)' },
            amber: { main: 'hsl(38, 92%, 50%)', bg: 'hsla(38, 92%, 50%, 0.12)' },
            indigo: { main: 'hsl(239, 84%, 67%)', bg: 'hsla(239, 84%, 67%, 0.1)' },
            rose: { main: 'hsl(350, 89%, 60%)', bg: 'hsla(350, 89%, 60%, 0.1)' },
            purple: { main: 'hsl(265, 89%, 65%)', bg: 'hsla(265, 89%, 65%, 0.1)' },
            teal: { main: 'hsl(187, 85%, 45%)', bg: 'hsla(187, 85%, 45%, 0.1)' },
            slate: { main: 'hsl(215, 25%, 45%)', bg: 'hsla(215, 25%, 45%, 0.1)' }
        };

        const theme = colors[color] || colors.blue;

        return (
            <Link
                to={to}
                className={cn("nav-item", active && "active")}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: collapsed ? '50%' : '10px',
                    background: active ? 'white' : theme.bg,
                    color: theme.main,
                    boxShadow: active ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    flexShrink: 0,
                    border: active ? '1px solid var(--border-subtle)' : '1px solid transparent'
                }}>
                    {Icon && typeof Icon !== 'function' ? <Icon size={18} strokeWidth={active ? 2.5 : 2} /> : <Icon />}
                </div>

                {!collapsed && (
                    <span style={{
                        fontSize: '0.875rem',
                        fontWeight: active ? 700 : 600,
                        color: active ? 'hsl(var(--primary))' : 'var(--text-dim)',
                        whiteSpace: 'nowrap',
                        letterSpacing: '-0.01em'
                    }}>
                        {children}
                    </span>
                )}

                {!collapsed && hasBadge && (
                    <span style={{
                        marginLeft: 'auto',
                        background: 'hsl(3 85% 56%)',
                        color: 'var(--text-on-accent)',
                        border: '1px solid hsla(3 85% 40% / 0.45)',
                        boxShadow: '0 0 10px hsla(3 85% 56% / 0.25)',
                        fontSize: '10px',
                        padding: '2px 7px',
                        borderRadius: '12px',
                        fontWeight: 800,
                        transform: 'scale(0.9)'
                    }}>
                        {badgeText || badgeCount}
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

            <div className="logo" style={{ marginBottom: '1.5rem', padding: '0 0.5rem' }}>
                <div style={{
                    padding: '8px',
                    background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, #3b82f6 100%)',
                    borderRadius: '10px',
                    color: 'white',
                    boxShadow: '0 8px 16px -4px hsla(var(--primary) / 0.4)'
                }}>
                    <Layers size={20} strokeWidth={3} />
                </div>
                {!collapsed && (
                    <span style={{
                        marginLeft: '4px',
                        fontWeight: 900,
                        fontSize: '1.2rem',
                        letterSpacing: '-0.04em'
                    }}>
                        AdInsight
                    </span>
                )}
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto', flex: 1, padding: '0 0.5rem' }}>
                {/* Knowledge Base Section - Moved to Top */}
                {!collapsed && <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em', padding: '1rem 0.5rem 0.5rem 0.5rem', textTransform: 'uppercase' }}>Knowledge</div>}
                <NavLink to="/global-notes" icon={FileText} color="purple">
                    General Notes
                </NavLink>

                {/* Section Header */}
                {!collapsed && <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em', padding: '1.25rem 0.5rem 0.5rem 0.5rem', textTransform: 'uppercase' }}>Tracking Core</div>}

                <NavLink to="/camp-tracking" icon={Target} color="indigo" activeCondition={isActive('/camp-tracking') && !location.pathname.includes('/platform') && !['reminders', 'changes'].some(p => location.pathname.includes(p))}>
                    Overview
                </NavLink>

                <NavLink to="/camp-tracking/platforms" icon={Settings} color="teal">
                    Manage Platforms
                </NavLink>

                <NavLink
                    to="/camp-tracking/reminders"
                    icon={Bell}
                    color="amber"
                    badgeText={(reminderCounts.overdue > 0 || reminderCounts.today > 0) ? `${reminderCounts.overdue}/${reminderCounts.today}` : undefined}
                >
                    Reminders
                </NavLink>
                <NavLink to="/camp-tracking/changes" icon={History} color="purple">
                    Auto Logs
                </NavLink>

                {/* Ad Insight Section */}
                {!collapsed && <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em', padding: '1.25rem 0.5rem 0.5rem 0.5rem', textTransform: 'uppercase' }}>DSA Analytics</div>}

                {/* NEW: Trend Signals Link */}
                <NavLink to="/adinsight/trends" icon={TrendingUp} color="emerald">
                    Trend Signals
                </NavLink>

                <div
                    onClick={() => setPlatformsExpanded(!platformsExpanded)}
                    style={{
                        padding: collapsed ? '0.7rem 0' : '0.6rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        gap: '0.85rem',
                        color: 'var(--text-dim)',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        borderRadius: '0.85rem',
                        transition: 'all 0.2s ease'
                    }}
                    className="nav-item-header"
                >
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        background: 'hsla(var(--primary) / 0.1)',
                        color: 'hsl(var(--primary))',
                        flexShrink: 0
                    }}>
                        <Globe size={18} strokeWidth={2} />
                    </div>
                    {!collapsed && (
                        <>
                            <span style={{ fontSize: '0.875rem', flex: 1 }}>Platform</span>
                            <ChevronRight
                                size={14}
                                style={{
                                    transform: platformsExpanded ? 'rotate(90deg)' : 'none',
                                    transition: 'transform 0.3s ease',
                                    opacity: 0.5
                                }}
                            />
                        </>
                    )}
                </div>

                {platformsExpanded && (
                    <div style={{ paddingLeft: collapsed ? '0' : '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <NavLink to="/adinsight/klook" icon={KlookIcon} activeCondition={isActive('/adinsight/klook')}>
                            Klook
                        </NavLink>

                        <NavLink to="/adinsight/traveloka" icon={TravelokaIcon} activeCondition={isActive('/adinsight/traveloka')}>
                            Traveloka
                        </NavLink>
                    </div>
                )}

            </nav>
        </aside>
    );
}
