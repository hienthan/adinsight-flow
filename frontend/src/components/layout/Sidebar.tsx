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
    ChevronDown,
    ChevronUp,
    Plus
} from 'lucide-react';
import { pb } from '../../lib/pocketbase';
import { CampaignPlatform, CampaignReminder } from '../../types/campaign';
import { cn } from '../../lib/utils';

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
    const location = useLocation();
    const [platformsOpen, setPlatformsOpen] = useState(true);
    const [remindersOpen, setRemindersOpen] = useState(false);
    const [logsOpen, setLogsOpen] = useState(false);
    const [platforms, setPlatforms] = useState<CampaignPlatform[]>([]);
    const [pendingRemindersCount, setPendingRemindersCount] = useState(0);

    useEffect(() => {
        const fetchPlatforms = async () => {
            try {
                const records = await pb.collection('campaign_platforms').getFullList<CampaignPlatform>({
                    sort: 'display_name',
                });
                setPlatforms(records);
            } catch (error) {
                console.error('Failed to fetch platforms:', error);
            }
        };
        fetchPlatforms();
    }, []);

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
                        marginLeft: 'auto', background: 'var(--destructive)', color: 'white',
                        fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: 800
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
                {/* Section Header */}
                {!collapsed && <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em', padding: '1.25rem 0.5rem 0.65rem 0.5rem', textTransform: 'uppercase' }}>Tracking Core</div>}

                <NavLink to="/camp-tracking" icon={Target} activeCondition={isActive('/camp-tracking') && !location.pathname.includes('/platform') && !['reminders', 'changes'].some(p => location.pathname.includes(p))}>
                    Overview
                </NavLink>

                <div>
                    <button
                        onClick={() => setPlatformsOpen(!platformsOpen)}
                        className="nav-item"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-dim)' }}
                    >
                        <Globe size={18} />
                        {!collapsed && <span style={{ fontSize: '0.875rem', flex: 1, fontWeight: 500 }}>Platforms</span>}
                        {!collapsed && (platformsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </button>

                    {platformsOpen && !collapsed && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', paddingLeft: '1.25rem', marginTop: '0.2rem', alignItems: 'flex-start' }}>
                            {platforms.map((p) => (
                                <Link
                                    key={p.id}
                                    to={`/camp-tracking/platform/${p.id}`}
                                    className={cn("nav-item", isActive(`/camp-tracking/platform/${p.id}`) && "active")}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.6rem',
                                        fontSize: '0.8rem', textDecoration: 'none', width: '100%',
                                        color: isActive(`/camp-tracking/platform/${p.id}`) ? 'hsl(var(--primary))' : 'var(--text-dim)',
                                        justifyContent: 'flex-start'
                                    }}
                                >
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                                    {p.display_name}
                                </Link>
                            ))}
                            <Link to="/camp-tracking/platforms" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', padding: '0.5rem 0.6rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'flex-start' }}>
                                <Plus size={12} /> Manage
                            </Link>
                        </div>
                    )}
                </div>

                <div>
                    <button
                        onClick={() => setRemindersOpen(!remindersOpen)}
                        className="nav-item"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-dim)' }}
                    >
                        <Bell size={18} />
                        {!collapsed && <span style={{ fontSize: '0.875rem', flex: 1, fontWeight: 500 }}>Reminders</span>}
                        {!collapsed && pendingRemindersCount > 0 && (
                            <span style={{ background: 'var(--destructive)', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: 800, marginRight: '0.5rem' }}>
                                {pendingRemindersCount}
                            </span>
                        )}
                        {!collapsed && (remindersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </button>

                    {remindersOpen && !collapsed && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', paddingLeft: '1.25rem', marginTop: '0.2rem', alignItems: 'flex-start' }}>
                            <Link
                                to="/camp-tracking/reminders"
                                className={cn("nav-item", isActive('/camp-tracking/reminders') && !location.search && "active")}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.6rem',
                                    fontSize: '0.8rem', textDecoration: 'none', width: '100%',
                                    color: isActive('/camp-tracking/reminders') && !location.search ? 'hsl(var(--primary))' : 'var(--text-dim)',
                                }}
                            >
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)', flexShrink: 0 }} />
                                All Checkpoints
                            </Link>
                            {platforms.map((p) => (
                                <Link
                                    key={p.id}
                                    to={`/camp-tracking/reminders?platform=${p.id}`}
                                    className={cn("nav-item", location.search === `?platform=${p.id}` && location.pathname.includes('reminders') && "active")}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.6rem',
                                        fontSize: '0.8rem', textDecoration: 'none', width: '100%',
                                        color: location.search === `?platform=${p.id}` && location.pathname.includes('reminders') ? p.color : 'var(--text-dim)',
                                    }}
                                >
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                                    {p.display_name}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <button
                        onClick={() => setLogsOpen(!logsOpen)}
                        className="nav-item"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-dim)' }}
                    >
                        <History size={18} />
                        {!collapsed && <span style={{ fontSize: '0.875rem', flex: 1, fontWeight: 500 }}>Auto Logs</span>}
                        {!collapsed && (logsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </button>

                    {logsOpen && !collapsed && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', paddingLeft: '1.25rem', marginTop: '0.2rem', alignItems: 'flex-start' }}>
                            <Link
                                to="/camp-tracking/changes"
                                className={cn("nav-item", isActive('/camp-tracking/changes') && !location.search && "active")}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.6rem',
                                    fontSize: '0.8rem', textDecoration: 'none', width: '100%',
                                    color: isActive('/camp-tracking/changes') && !location.search ? 'hsl(var(--primary))' : 'var(--text-dim)',
                                }}
                            >
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)', flexShrink: 0 }} />
                                All Changes
                            </Link>
                            {platforms.map((p) => (
                                <Link
                                    key={p.id}
                                    to={`/camp-tracking/changes?platform=${p.id}`}
                                    className={cn("nav-item", location.search === `?platform=${p.id}` && location.pathname.includes('changes') && "active")}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.6rem',
                                        fontSize: '0.8rem', textDecoration: 'none', width: '100%',
                                        color: location.search === `?platform=${p.id}` && location.pathname.includes('changes') ? p.color : 'var(--text-dim)',
                                    }}
                                >
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                                    {p.display_name}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Ad Insight Section */}
                {!collapsed && <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em', padding: '1.75rem 0.5rem 0.65rem 0.5rem', textTransform: 'uppercase' }}>DSA Analytics</div>}

                <NavLink to="/adinsight" icon={Globe}>
                    Klook zh-HK
                </NavLink>
            </nav>
        </aside>
    );
}
