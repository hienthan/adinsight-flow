import { useState, useEffect, type ElementType, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    ChevronLeft,
    ChevronRight,
    Layers,
    Globe,
    ClipboardList,
    Route,
    Bell,
    History,
    Settings,
    TrendingUp,
    Link2,
    NotebookPen,
    TextSearch,
    WandSparkles
} from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { CampaignReminder } from '../../types/campaign';
import { cn } from '../../lib/utils';
import {
    SAFE_INTERACTIVE_TRANSITION,
    SAFE_NAV_SELECTORS,
    createSafeInteractionScopeCss,
} from '../../lib/uiMotion';
import { SafeButton } from '../common/ui/SafeButton';

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

interface NavLinkProps {
    to: string;
    icon: ElementType;
    children: ReactNode;
    badgeCount?: number;
    badgeText?: string;
    activeCondition?: boolean;
    color?: keyof typeof NAV_THEMES;
}

const NAV_THEMES = {
    blue: { main: '#60a5fa', bg: 'rgba(96, 165, 250, 0.12)', glow: 'rgba(96, 165, 250, 0.34)' },
    emerald: { main: '#34d399', bg: 'rgba(52, 211, 153, 0.12)', glow: 'rgba(52, 211, 153, 0.34)' },
    amber: { main: '#fbbf24', bg: 'rgba(251, 191, 36, 0.14)', glow: 'rgba(251, 191, 36, 0.34)' },
    indigo: { main: '#818cf8', bg: 'rgba(129, 140, 248, 0.12)', glow: 'rgba(129, 140, 248, 0.34)' },
    rose: { main: '#fb7185', bg: 'rgba(251, 113, 133, 0.12)', glow: 'rgba(251, 113, 133, 0.34)' },
    purple: { main: '#c084fc', bg: 'rgba(192, 132, 252, 0.12)', glow: 'rgba(192, 132, 252, 0.34)' },
    teal: { main: '#22d3ee', bg: 'rgba(34, 211, 238, 0.12)', glow: 'rgba(34, 211, 238, 0.34)' },
    slate: { main: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)', glow: 'rgba(148, 163, 184, 0.24)' }
} as const;

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
    const [dsaFilterExpanded, setDsaFilterExpanded] = useState(true);

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

    const NavLink = ({ to, icon: Icon, children, badgeCount, badgeText, activeCondition, color = 'blue' }: NavLinkProps) => {
        const active = activeCondition !== undefined ? activeCondition : isActive(to);
        const hasBadge = (badgeCount ?? 0) > 0 || !!badgeText;
        const theme = NAV_THEMES[color] || NAV_THEMES.blue;

        return (
            <Link
                to={to}
                className={cn("nav-item", active && "active")}
                style={{
                    background: active
                        ? `linear-gradient(135deg, ${theme.bg} 0%, color-mix(in srgb, ${theme.bg} 72%, var(--bg-content) 28%) 100%)`
                        : undefined,
                    boxShadow: active ? `0 16px 28px -24px ${theme.glow}` : undefined,
                    borderColor: active ? theme.glow : undefined,
                }}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: collapsed ? '50%' : '10px',
                    background: active
                        ? `linear-gradient(135deg, ${theme.bg} 0%, color-mix(in srgb, ${theme.bg} 62%, var(--bg-content) 38%) 100%)`
                        : theme.bg,
                    color: theme.main,
                    boxShadow: active ? `0 10px 22px -16px ${theme.glow}` : 'none',
                    transition: SAFE_INTERACTIVE_TRANSITION,
                    flexShrink: 0,
                    border: active ? `1px solid ${theme.glow}` : '1px solid transparent'
                }}>
                    <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                </div>

                {!collapsed && (
                    <span style={{
                        fontSize: '0.875rem',
                        fontWeight: active ? 700 : 600,
                        color: active ? 'var(--text-main)' : 'var(--text-dim)',
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
        <aside
            className={cn("sidebar", collapsed && "collapsed")}
            style={{
                background: [
                    'radial-gradient(circle at top left, rgba(59, 130, 246, 0.16) 0%, transparent 26%)',
                    'radial-gradient(circle at bottom left, rgba(20, 184, 166, 0.12) 0%, transparent 24%)',
                    'linear-gradient(180deg, color-mix(in srgb, var(--bg-content) 92%, var(--bg-main) 8%) 0%, color-mix(in srgb, var(--bg-content) 84%, var(--bg-main) 16%) 100%)',
                ].join(', '),
                borderRight: '1px solid var(--border-subtle)',
                boxShadow: '0 30px 60px -40px rgba(15, 23, 42, 0.7)',
            }}
        >
            <style>{`
                ${createSafeInteractionScopeCss('.sidebar', SAFE_NAV_SELECTORS)}
            `}</style>
            <SafeButton className="collapse-btn" onClick={onToggle}>
                {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
            </SafeButton>

            <div
                className="logo"
                style={{
                    marginBottom: '1.25rem',
                    padding: collapsed ? '0 0.2rem' : '0.35rem 0.5rem 0.6rem 0.5rem',
                    borderBottom: collapsed ? 'none' : '1px solid var(--border-subtle)',
                }}
            >
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
                    <div style={{ marginLeft: '0.3rem', minWidth: 0 }}>
                        <span style={{
                            display: 'block',
                            fontWeight: 900,
                            fontSize: '1.2rem',
                            letterSpacing: '-0.04em'
                        }}>
                            AdInsight
                        </span>
                        <span style={{
                            display: 'block',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            color: 'var(--text-muted)',
                            marginTop: '0.2rem',
                        }}>
                            Operator Console
                        </span>
                    </div>
                )}
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto', flex: 1, padding: '0 0.5rem' }}>
                {/* Knowledge Base Section - Moved to Top */}
                {!collapsed && <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em', padding: '1rem 0.5rem 0.5rem 0.5rem', textTransform: 'uppercase' }}>Knowledge</div>}
                <NavLink to="/global-notes" icon={NotebookPen} color="purple">
                    General Notes
                </NavLink>

                {/* Section Header */}
                {!collapsed && <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em', padding: '1.25rem 0.5rem 0.5rem 0.5rem', textTransform: 'uppercase' }}>Tracking Core</div>}

                <NavLink to="/camp-tracking" icon={ClipboardList} color="indigo" activeCondition={isActive('/camp-tracking') && !location.pathname.includes('/platform') && !['reminders', 'changes', 'outbound-map'].some(p => location.pathname.includes(p))}>
                    Overview
                </NavLink>

                <NavLink to="/camp-tracking/platforms" icon={Settings} color="teal">
                    Manage Platforms
                </NavLink>

                <NavLink to="/camp-tracking/outbound-map" icon={Route} color="emerald">
                    Outbound Map
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
                        transition: SAFE_INTERACTIVE_TRANSITION,
                        background: platformsExpanded ? 'var(--bg-overlay)' : 'transparent',
                        border: platformsExpanded ? '1px solid var(--border-subtle)' : '1px solid transparent',
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

                <div
                    onClick={() => setDsaFilterExpanded(!dsaFilterExpanded)}
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
                        transition: SAFE_INTERACTIVE_TRANSITION,
                        background: dsaFilterExpanded ? 'var(--bg-overlay)' : 'transparent',
                        border: dsaFilterExpanded ? '1px solid var(--border-subtle)' : '1px solid transparent',
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
                        background: 'rgba(20, 184, 166, 0.12)',
                        color: '#14b8a6',
                        flexShrink: 0
                    }}>
                        <WandSparkles size={18} strokeWidth={2} />
                    </div>
                    {!collapsed && (
                        <>
                            <span style={{ fontSize: '0.875rem', flex: 1 }}>DSA Filter</span>
                            <ChevronRight
                                size={14}
                                style={{
                                    transform: dsaFilterExpanded ? 'rotate(90deg)' : 'none',
                                    transition: 'transform 0.3s ease',
                                    opacity: 0.5
                                }}
                            />
                        </>
                    )}
                </div>

                {dsaFilterExpanded && (
                    <div style={{ paddingLeft: collapsed ? '0' : '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <NavLink to="/dsa-filter/url" icon={Link2} activeCondition={isActive('/dsa-filter/url')} color="teal">
                            URL
                        </NavLink>
                        <NavLink to="/dsa-filter/search-terms" icon={TextSearch} activeCondition={isActive('/dsa-filter/search-terms')} color="blue">
                            Search Terms
                        </NavLink>
                    </div>
                )}

            </nav>

            {!collapsed && (
                <div
                    style={{
                        marginTop: '1rem',
                        padding: '0.95rem',
                        borderRadius: '1.2rem',
                        background: 'linear-gradient(180deg, var(--bg-overlay) 0%, color-mix(in srgb, var(--bg-overlay) 82%, var(--bg-main) 18%) 100%)',
                        border: '1px solid var(--border-subtle)',
                        boxShadow: '0 18px 34px -28px rgba(15, 23, 42, 0.6)',
                    }}
                >
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                        Reminder Pressure
                    </div>
                    <div style={{ marginTop: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <div>
                            <div style={{ fontSize: '1.45rem', fontWeight: 850, letterSpacing: '-0.04em', color: 'var(--text-main)', lineHeight: 1 }}>
                                {reminderCounts.overdue + reminderCounts.today}
                            </div>
                            <div style={{ marginTop: '0.3rem', fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                                urgent reminders
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <span className="hero-badge" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                Overdue {reminderCounts.overdue}
                            </span>
                            <span className="hero-badge" style={{ background: 'rgba(251, 191, 36, 0.12)', color: '#fcd34d', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                                Today {reminderCounts.today}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
