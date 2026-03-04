export const getTierStyle = (tier: string) => {
    switch (tier) {
        case 'a1': return { background: 'hsla(var(--primary) / 0.05)', color: 'hsl(var(--primary))', border: '1px solid hsla(var(--primary) / 0.1)' };
        case '2':
        case 'a2': return { background: 'rgba(16, 185, 129, 0.05)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.1)' };
        case '3':
        case 'a3': return { background: 'rgba(99, 102, 241, 0.05)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.1)' };
        case 'a4': return { background: 'rgba(245, 158, 11, 0.05)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.1)' };
        case '5': return { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' };
        default: return { background: 'var(--bg-overlay)', color: 'var(--text-dim)', border: '1px solid var(--border-subtle)' };
    }
};

export const getScoreStyle = (score: number) => {
    if (score >= 4) return { background: 'rgba(16, 185, 129, 0.08)', color: '#10b981', fontWeight: 800 };
    if (score >= 2) return { background: 'hsla(var(--primary) / 0.05)', color: 'hsl(var(--primary))', fontWeight: 700 };
    if (score > 0) return { background: 'rgba(245, 158, 11, 0.08)', color: '#f59e0b', fontWeight: 600 };
    return { background: 'var(--bg-overlay)', color: 'var(--text-dim)', fontWeight: 400 };
};

export const getFunnelStyle = (stage?: string) => {
    switch (stage) {
        case 'readiness':
            return { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' };
        case 'planning':
            return { background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' };
        default:
            return { background: 'rgba(107, 114, 128, 0.1)', color: '#6b7280', border: '1px solid rgba(107, 114, 128, 0.2)' };
    }
};
