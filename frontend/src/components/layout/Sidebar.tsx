import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    ChevronLeft,
    ChevronRight,
    Layers,
    Globe,
    Tag,
    Target,
    Bell,
    History,
    ChevronDown,
    ChevronUp
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
    const [adInsightOpen, setAdInsightOpen] = useState(true);
    const [campTrackingOpen, setCampTrackingOpen] = useState(true);
    const [platformsOpen, setPlatformsOpen] = useState(true);
    const [platforms, setPlatforms] = useState<CampaignPlatform[]>([]);
    const [pendingRemindersCount, setPendingRemindersCount] = useState(0);

    // Fetch campaign platforms
    useEffect(() => {
        const controller = new AbortController();
        const fetchPlatforms = async () => {
            try {
                const records = await pb.collection('campaign_platforms').getFullList<CampaignPlatform>({
                    sort: 'display_name',
                    $autoCancel: false, // Disabling auto-cancel to manage manually if needed or just handle error
                });
                setPlatforms(records);
            } catch (error: any) {
                if (!error.isAbort) {
                    console.error('Failed to fetch platforms:', error);
                }
            }
        };

        fetchPlatforms();
        return () => controller.abort();
    }, []);

    // Fetch pending reminders count
    useEffect(() => {
        const controller = new AbortController();
        const fetchRemindersCount = async () => {
            try {
                const today = new Date().toISOString().split('T')[0];
                const records = await pb.collection('campaign_reminders').getList<CampaignReminder>(1, 1, {
                    filter: `reminder_date <= "${today}" && status = "pending"`,
                    $autoCancel: false,
                });
                setPendingRemindersCount(records.totalItems);
            } catch (error: any) {
                if (!error.isAbort) {
                    console.error('Failed to fetch reminders:', error);
                }
            }
        };

        fetchRemindersCount();
        // Refresh every minute
        const interval = setInterval(fetchRemindersCount, 60000);
        return () => {
            controller.abort();
            clearInterval(interval);
        };
    }, []);

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

    return (
        <aside className={cn(
            "sidebar",
            collapsed && "collapsed"
        )}>
            <button className="collapse-btn" onClick={onToggle}>
                {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            <div className="logo">
                <Layers size={24} strokeWidth={2.5} />
                {!collapsed && <span>AdInsight Flow</span>}
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1 }}>

                {/* Camp Tracking Section */}
                <div>
                    <button
                        onClick={() => setCampTrackingOpen(!campTrackingOpen)}
                        className="section-header"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            padding: '0.5rem',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-dim)',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            letterSpacing: '0.05em',
                            cursor: 'pointer',
                        }}
                    >
                        {!collapsed && <span>CAMP TRACKING</span>}
                        {!collapsed && (campTrackingOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </button>

                    {campTrackingOpen && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
                            {/* Overview */}
                            <Link
                                to="/camp-tracking"
                                className={cn(
                                    "nav-item",
                                    isActive('/camp-tracking') && !location.pathname.includes('/platform') && !['reminders', 'changes'].some(p => location.pathname.includes(p)) && "active"
                                )}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    color: 'var(--text-main)',
                                    background: isActive('/camp-tracking') && !location.pathname.includes('/platform') && !['reminders', 'changes'].some(p => location.pathname.includes(p)) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                }}
                            >
                                <Target size={18} color={isActive('/camp-tracking') && !location.pathname.includes('/platform') && !['reminders', 'changes'].some(p => location.pathname.includes(p)) ? '#3b82f6' : 'currentColor'} />
                                {!collapsed && <span style={{ fontSize: '0.9rem' }}>Overview</span>}
                            </Link>

                            {/* Platforms Section */}
                            <div>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setPlatformsOpen(!platformsOpen);
                                    }}
                                    className="nav-item"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.75rem',
                                        width: '100%',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        textAlign: 'left'
                                    }}
                                >
                                    <Globe size={18} />
                                    {!collapsed && <span style={{ fontSize: '0.9rem', flex: 1 }}>Platforms</span>}
                                    {!collapsed && (platformsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                </button>

                                {platformsOpen && !collapsed && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', marginTop: '0.1rem', paddingLeft: '1.25rem' }}>
                                        {platforms.map((platform) => (
                                            <Link
                                                key={platform.id}
                                                to={`/camp-tracking/platform/${platform.id}`}
                                                className={cn(
                                                    "nav-item",
                                                    isActive(`/camp-tracking/platform/${platform.id}`) && "active"
                                                )}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                    padding: '0.5rem 0.75rem',
                                                    borderRadius: '8px',
                                                    textDecoration: 'none',
                                                    color: isActive(`/camp-tracking/platform/${platform.id}`) ? 'hsl(var(--primary))' : 'var(--text-dim)',
                                                    fontSize: '0.85rem'
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: '8px',
                                                        height: '8px',
                                                        borderRadius: '50%',
                                                        background: platform.color,
                                                    }}
                                                />
                                                {platform.display_name}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Reminders */}
                            <Link
                                to="/camp-tracking/reminders"
                                className={cn(
                                    "nav-item",
                                    isActive('/camp-tracking/reminders') && "active"
                                )}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    color: 'var(--text-main)',
                                    background: isActive('/camp-tracking/reminders') ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                    position: 'relative',
                                }}
                            >
                                <Bell size={18} color={isActive('/camp-tracking/reminders') ? '#3b82f6' : 'currentColor'} />
                                {!collapsed && (
                                    <>
                                        <span style={{ fontSize: '0.9rem' }}>Reminders</span>
                                        {pendingRemindersCount > 0 && (
                                            <span
                                                style={{
                                                    marginLeft: 'auto',
                                                    background: '#ef4444',
                                                    color: '#fff',
                                                    fontSize: '0.7rem',
                                                    padding: '0.1rem 0.4rem',
                                                    borderRadius: '99px',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {pendingRemindersCount}
                                            </span>
                                        )}
                                    </>
                                )}
                            </Link>

                            {/* Change Logs */}
                            <Link
                                to="/camp-tracking/changes"
                                className={cn(
                                    "nav-item",
                                    isActive('/camp-tracking/changes') && "active"
                                )}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    color: 'var(--text-main)',
                                    background: isActive('/camp-tracking/changes') ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                }}
                            >
                                <History size={18} color={isActive('/camp-tracking/changes') ? '#3b82f6' : 'currentColor'} />
                                {!collapsed && <span style={{ fontSize: '0.9rem' }}>Change Logs</span>}
                            </Link>
                        </div>
                    )}
                </div>

                {/* Ad Insight Section */}
                <div>
                    <button
                        onClick={() => setAdInsightOpen(!adInsightOpen)}
                        className="section-header"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            padding: '0.5rem',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-dim)',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            letterSpacing: '0.05em',
                            cursor: 'pointer',
                            marginTop: '1rem',
                        }}
                    >
                        {!collapsed && <span>AD INSIGHT</span>}
                        {!collapsed && (adInsightOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </button>
                    {adInsightOpen && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
                            {/* Platform: Klook */}
                            <div
                                style={{
                                    background: isActive('/adinsight') ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                }}
                            >
                                <Globe size={18} color={isActive('/adinsight') ? '#3b82f6' : 'currentColor'} />
                                {!collapsed && <span style={{ fontSize: '0.9rem' }}>Klook</span>}
                            </div>

                            {/* Sitemaps under Klook */}
                            {!collapsed && (
                                <div style={{ paddingLeft: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <Link
                                        to="/adinsight"
                                        className={cn(
                                            "nav-item",
                                            isActive('/adinsight') && "active"
                                        )}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            padding: '0.4rem 0.5rem',
                                            fontSize: '0.85rem',
                                            color: isActive('/adinsight') ? '#3b82f6' : 'var(--text-main)',
                                            textDecoration: 'none',
                                            borderRadius: '6px',
                                        }}
                                    >
                                        <Tag size={14} />
                                        zh-HK Activity
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </nav>
        </aside>
    );
}
