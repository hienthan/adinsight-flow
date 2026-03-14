import { SurfaceCard } from '../../components/common/ui';
import type { RouteGraphEdge, RouteGraphNode } from './types';
import { ROUTE_STATUS_META } from './utils';

interface OutboundMapGraphProps {
    sourceNodes: RouteGraphNode[];
    destinationNodes: RouteGraphNode[];
    edges: RouteGraphEdge[];
    onSelectRoute: (routeId: string) => void;
}

const ROW_HEIGHT = 84;
const NODE_HEIGHT = 54;
const LEFT_X = 150;
const RIGHT_X = 760;

export default function OutboundMapGraph({
    sourceNodes,
    destinationNodes,
    edges,
    onSelectRoute,
}: OutboundMapGraphProps) {
    const sourceY = new Map(sourceNodes.map((node, index) => [node.id, 80 + index * ROW_HEIGHT]));
    const destinationY = new Map(destinationNodes.map((node, index) => [node.id, 80 + index * ROW_HEIGHT]));
    const svgHeight = Math.max(sourceNodes.length, destinationNodes.length) * ROW_HEIGHT + 120;

    return (
        <SurfaceCard variant="default" radius="20px" style={{ padding: '1rem', overflowX: 'auto' }}>
            <div style={{ minWidth: '920px', height: `${svgHeight}px`, position: 'relative' }}>
                <svg width="920" height={svgHeight} style={{ position: 'absolute', inset: 0 }}>
                    {edges.map((edge) => {
                        const fromY = sourceY.get(edge.sourceId) ?? 0;
                        const toY = destinationY.get(edge.destinationId) ?? 0;
                        const statusMeta = ROUTE_STATUS_META[edge.status];
                        const strokeWidth = 2 + Math.min(edge.weight, 6);
                        const d = `M ${LEFT_X + 120} ${fromY + NODE_HEIGHT / 2} C 420 ${fromY + NODE_HEIGHT / 2}, 490 ${toY + NODE_HEIGHT / 2}, ${RIGHT_X} ${toY + NODE_HEIGHT / 2}`;

                        return (
                            <path
                                key={edge.id}
                                d={d}
                                stroke={statusMeta.color}
                                strokeOpacity={0.72}
                                strokeWidth={strokeWidth}
                                fill="none"
                                style={{ cursor: 'pointer' }}
                                onClick={() => onSelectRoute(edge.route.id)}
                            />
                        );
                    })}
                </svg>

                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '290px' }}>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', paddingLeft: '1rem' }}>
                        Source Markets
                    </div>
                    {sourceNodes.map((node, index) => (
                        <NodeCard key={node.id} label={node.label} top={80 + index * ROW_HEIGHT} align="left" />
                    ))}
                </div>

                <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '290px' }}>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', textAlign: 'right', paddingRight: '1rem' }}>
                        Destinations
                    </div>
                    {destinationNodes.map((node, index) => (
                        <NodeCard key={node.id} label={node.label} top={80 + index * ROW_HEIGHT} align="right" />
                    ))}
                </div>
            </div>
        </SurfaceCard>
    );
}

function NodeCard({
    label,
    top,
    align,
}: {
    label: string;
    top: number;
    align: 'left' | 'right';
}) {
    const anchoredStyle = align === 'left'
        ? { left: '1rem' as const }
        : { right: '1rem' as const, textAlign: 'right' as const };

    return (
        <div
            style={{
                position: 'absolute',
                top,
                width: '120px',
                height: `${NODE_HEIGHT}px`,
                borderRadius: '16px',
                border: '1px solid var(--border-subtle)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(241,245,249,0.96) 100%)',
                boxShadow: 'var(--shadow-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: align === 'left' ? 'flex-start' : 'flex-end',
                padding: '0 1rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                ...anchoredStyle,
            }}
        >
            {label}
        </div>
    );
}
