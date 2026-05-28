import { forceCenter, forceCollide } from 'd3-force-3d'
import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState
} from 'react'
import ForceGraph, { type ForceGraphMethods } from 'react-force-graph-2d'
import { type FGNode, GROUP_NODE_PREFIX, useForceGraphData } from '../../hooks/use-force-graph-data'
// import { forceCenter, forceCollide } from 'd3-force'
import { useAppStore } from '../../stores/app-store'

export interface ForceGraphHandle {
    centerAt: (arn: string) => void
    zoomToFit: () => void
}

// ─── Canvas drawing helpers ───────────────────────────────────────────────────

const MAX_GRAPH_LABEL_LENGTH = 24

// Runtime node type — force-graph adds x/y/vx/vy/fx/fy at runtime
interface RuntimeNode extends FGNode {
    x: number
    y: number
    vx?: number
    vy?: number
    fx?: number
    fy?: number
    isPinned?: boolean
}

function compactGraphLabel(value: string): string {
    if (value.length <= MAX_GRAPH_LABEL_LENGTH) return value
    const head = value.slice(0, 11)
    const tail = value.slice(-9)
    return `${head}...${tail}`
}

function drawNode(
    node: RuntimeNode,
    ctx: CanvasRenderingContext2D,
    _highlightOpacity: number,
    selected: boolean
): void {
    const {
        x,
        y,
        color,
        shape,
        synced,
        isPlaceholder,
        isAwsManaged,
        isPending,
        sublabel,
        isGroupNode
    } = node
    const label = compactGraphLabel(node.label)
    const r = node.nodeRadius

    // Group node — dashed circle with count + type label, not interactive-selected
    if (isGroupNode) {
        const { synced, syncedPartial, isGroupCollapsed } = node
        ctx.save()
        ctx.globalAlpha = isGroupCollapsed ? 0.9 : 0.7
        ctx.beginPath()
        ctx.arc(x, y, r, 0, 2 * Math.PI)
        if (synced) {
            ctx.setLineDash([])
            ctx.lineWidth = 2
        } else if (syncedPartial) {
            ctx.setLineDash([3, 2])
            ctx.lineWidth = 1.5
        } else {
            ctx.setLineDash([2, 2])
            ctx.lineWidth = 1.5
        }
        ctx.strokeStyle = color
        ctx.stroke()
        ctx.setLineDash([])
        if (synced || syncedPartial) {
            ctx.beginPath()
            ctx.arc(x, y, r * 0.35, 0, 2 * Math.PI)
            ctx.fillStyle = color
            ctx.globalAlpha = synced ? 0.9 : 0.5
            ctx.fill()
            ctx.globalAlpha = isGroupCollapsed ? 0.9 : 0.7
        }
        ctx.font = 'bold 8px -apple-system, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = color
        ctx.fillText(sublabel, x, y)
        ctx.font = '7px -apple-system, sans-serif'
        ctx.textBaseline = 'top'
        ctx.fillStyle = isGroupCollapsed ? '#bbb' : '#888'
        ctx.fillText(label, x, y + r + 2)
        ctx.restore()
        return
    }

    ctx.save()

    // Opacity: aws-managed resources are de-emphasised, pending nodes are faded
    ctx.globalAlpha = isAwsManaged ? 0.35 : isPending ? 0.4 : synced ? 1 : 0.65

    // Selected glow
    if (selected) {
        ctx.shadowColor = '#fff'
        ctx.shadowBlur = 12
    }

    // Draw shape
    ctx.beginPath()

    switch (shape) {
        case 'circle':
            ctx.arc(x, y, r, 0, 2 * Math.PI)
            break

        case 'diamond':
            ctx.moveTo(x, y - r)
            ctx.lineTo(x + r, y)
            ctx.lineTo(x, y + r)
            ctx.lineTo(x - r, y)
            ctx.closePath()
            break

        case 'hexagon': {
            const hexR = r * 1.2
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 6
                const px = x + hexR * Math.cos(angle)
                const py = y + hexR * Math.sin(angle)
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
            }
            ctx.closePath()
            break
        }

        case 'cylinder': {
            const w = r * 1.6
            const h = r * 1.4
            const arcR = w * 0.15
            ctx.moveTo(x - w / 2, y - h / 2)
            ctx.lineTo(x + w / 2, y - h / 2)
            ctx.arc(x + w / 2, y, arcR, -Math.PI / 2, Math.PI / 2)
            ctx.lineTo(x - w / 2, y + h / 2)
            ctx.arc(x - w / 2, y, arcR, Math.PI / 2, -Math.PI / 2)
            ctx.closePath()
            break
        }

        default: // rect
            ctx.rect(x - r, y - r, r * 2, r * 2)
            break
    }

    ctx.fillStyle = color
    if (!node.isSubresource) {
        ctx.fill()
    }

    // Border
    ctx.shadowBlur = 0
    ctx.lineWidth = node.isSubresource ? (selected ? 3 : 2.5) : selected ? 3 : 2
    ctx.strokeStyle = selected ? '#ffffff' : color
    if (isPlaceholder || isPending) {
        ctx.setLineDash([3, 3])
    } else if (!synced) {
        ctx.setLineDash([2, 2])
    }
    ctx.stroke()
    ctx.setLineDash([])

    ctx.restore()

    // Collapsed-children badge
    if (node.collapsedChildCount > 0) {
        const bx = x + r * 0.7
        const by = y - r * 0.7
        const br = 7
        ctx.save()
        ctx.beginPath()
        ctx.arc(bx, by, br, 0, 2 * Math.PI)
        ctx.fillStyle = '#f97316'
        ctx.fill()
        ctx.font = 'bold 8px -apple-system, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#fff'
        ctx.fillText(String(node.collapsedChildCount), bx, by)
        ctx.restore()
    }

    // Pin indicator
    if (node.isPinned) {
        const px = x + r * 0.65
        const py = y - r * 0.65
        ctx.save()
        ctx.beginPath()
        ctx.arc(px, py, 5, 0, 2 * Math.PI)
        ctx.fillStyle = '#fbbf24'
        ctx.fill()
        ctx.strokeStyle = '#78350f'
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.font = 'bold 6px -apple-system, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#78350f'
        ctx.fillText('📌', px, py)
        ctx.restore()
    }

    // Label (drawn outside alpha clipping so it's always readable)
    ctx.save()
    ctx.font = '600 9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    // Text shadow for readability
    ctx.shadowColor = 'rgba(0,0,0,0.8)'
    ctx.shadowBlur = 4
    ctx.fillStyle = '#fff'

    const labelY = y + r + 3
    ctx.fillText(label, x, labelY)

    ctx.font = '8px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.fillStyle = '#888'
    ctx.fillText(sublabel, x, labelY + 11)

    ctx.restore()
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SelectBox {
    x0: number
    y0: number
    x1: number
    y1: number
}

interface ForceGraphComponentProps {
    onNodeClick?: (arn: string) => void
    onNodeDoubleClick?: (arn: string) => void
    onNodeRightClick?: (arn: string, event: MouseEvent) => void
    onPaneClick?: () => void
    searchTerm?: string
    onBoxSelect?: (arns: string[], additive: boolean) => void
    onPinToggle?: (arn: string) => void
}

export const ForceGraphComponent = forwardRef<ForceGraphHandle, ForceGraphComponentProps>(
    function ForceGraphComponent(
        {
            onNodeClick,
            onNodeDoubleClick,
            onNodeRightClick,
            onPaneClick,
            searchTerm = '',
            onBoxSelect,
            onPinToggle
        },
        ref
    ) {
        const containerRef = useRef<HTMLDivElement>(null)
        const graphRef = useRef<ForceGraphMethods | null>(null)
        const [size, setSize] = useState({ width: 800, height: 600 })
        const [selectBox, setSelectBox] = useState<SelectBox | null>(null)
        const selectStartRef = useRef<{ x: number; y: number } | null>(null)

        useImperativeHandle(
            ref,
            () => ({
                centerAt: (arn: string) => {
                    const graph = graphRef.current
                    if (!graph) return
                    const target = graphData.nodes.find((n: FGNode) => n.id === arn)
                    if (!target || target.x == null || target.y == null) return
                    graph.centerAt(target.x, target.y, 400)
                },
                zoomToFit: () => {
                    graphRef.current?.zoomToFit(600, 40)
                }
            }),
            []
        )

        // Responsive sizing
        useEffect(() => {
            const el = containerRef.current
            if (!el) return

            const observer = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
                }
            })
            observer.observe(el)

            // Initial size
            setSize({ width: el.clientWidth, height: el.clientHeight })

            return () => observer.disconnect()
        }, [])
        const { nodes: fgNodes, edges: fgEdges } = useForceGraphData()
        const { selectedNodeArns, toggleCollapseNode, pinnedNodeArns, togglePinNode } =
            useAppStore()

        const selectedSet = useMemo(() => new Set(selectedNodeArns), [selectedNodeArns])

        // Double-click detection (react-force-graph-2d has no onNodeDoubleClick)
        const clickTimerRef = useRef<Map<string, { time: number; timer: number }>>(new Map())

        // Preserve node positions across graph data updates — tracked via onEngineTick so we
        // always have the real D3-laid-out coordinates, not the initial placeholders.
        const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map())

        // Filter nodes by search term
        const filteredNodes = useMemo(() => {
            if (!searchTerm) return fgNodes
            const term = searchTerm.toLowerCase()
            return fgNodes.filter(
                (n) =>
                    n.label.toLowerCase().includes(term) ||
                    n.sublabel.toLowerCase().includes(term) ||
                    n.id.toLowerCase().includes(term)
            )
        }, [fgNodes, searchTerm])

        const filteredNodeIds = useMemo(
            () => new Set(filteredNodes.map((n) => n.id)),
            [filteredNodes]
        )

        const filteredEdges = useMemo(() => {
            if (!searchTerm) return fgEdges
            return fgEdges.filter((e) => {
                const src =
                    typeof e.source === 'string' ? e.source : (e.source as { id: string }).id
                const tgt =
                    typeof e.target === 'string' ? e.target : (e.target as { id: string }).id
                return filteredNodeIds.has(src) && filteredNodeIds.has(tgt)
            })
        }, [fgEdges, searchTerm, filteredNodeIds])

        const graphData: { nodes: any[]; links: any[] } = useMemo(() => {
            const positions = nodePositionsRef.current
            const pinned = pinnedNodeArns
            const nodes = filteredNodes.map((n) => {
                const p = positions.get(n.id)
                const isPinned = pinned.has(n.id)
                const base = p ? { ...n, x: p.x, y: p.y } : { ...n }
                if (isPinned && p) {
                    return { ...base, fx: p.x, fy: p.y, isPinned: true }
                }
                return { ...base, isPinned: false }
            })
            return { nodes, links: filteredEdges }
        }, [filteredNodes, filteredEdges, pinnedNodeArns])

        useEffect(() => {
            const graph = graphRef.current
            if (!graph) return

            // Tuning: softer repulsion, gentle centering, collision to prevent overlap
            graph.d3Force('charge')?.strength(-80)
            graph.d3Force('link')?.distance(300)
            graph.d3Force('center', forceCenter(size.width / 2, size.height / 2).strength(0.05))
            graph.d3Force('collision', forceCollide().radius(18).strength(0.7))
        }, [graphData, size])

        // ─── Handlers ─────────────────────────────────────────────────────────────

        const handleNodeClick = useCallback(
            (node: any) => {
                if (node.id.startsWith(GROUP_NODE_PREFIX)) {
                    toggleCollapseNode(node.id)
                    return
                }
                const now = Date.now()
                const existing = clickTimerRef.current.get(node.id)

                if (existing && now - existing.time < 350) {
                    clearTimeout(existing.timer)
                    clickTimerRef.current.delete(node.id)
                    toggleCollapseNode(node.id)
                    onNodeDoubleClick?.(node.id)
                } else {
                    onNodeClick?.(node.id)
                    const timer = window.setTimeout(() => {
                        clickTimerRef.current.delete(node.id)
                    }, 350)
                    clickTimerRef.current.set(node.id, { time: now, timer })
                }
            },
            [onNodeClick, onNodeDoubleClick, toggleCollapseNode]
        )

        const handleNodeRightClick = useCallback(
            (node: any, event: MouseEvent) => {
                event.preventDefault()
                onNodeRightClick?.(node.id, event)
            },
            [onNodeRightClick]
        )

        const handlePaneClick = useCallback(() => {
            onPaneClick?.()
        }, [onPaneClick])

        const handleNodeDragStart = useCallback(() => {
            graphRef.current?.d3ReheatSimulation?.()
        }, [])

        const handleNodeDragEnd = useCallback((node: any) => {
            if (node?.x != null && node?.y != null) {
                const positions = new Map(nodePositionsRef.current)
                positions.set(node.id, { x: node.x, y: node.y })
                nodePositionsRef.current = positions
            }
        }, [])

        const nodeCanvasObject = useCallback(
            (node: RuntimeNode, ctx: CanvasRenderingContext2D, highlightOpacity: number) => {
                const isSelected = selectedSet.has(node.id)
                drawNode(node, ctx, highlightOpacity, isSelected)
            },
            [selectedSet]
        )

        const nodePointerAreaPaint = useCallback(
            (node: RuntimeNode, color: string, ctx: CanvasRenderingContext2D) => {
                ctx.fillStyle = color
                ctx.beginPath()
                ctx.arc(node.x, node.y, node.nodeRadius + 6, 0, 2 * Math.PI)
                ctx.fill()
            },
            []
        )

        const prevNodeCount = useRef(0)
        const handleEngineTick = useCallback(() => {
            if (!graphData.nodes.length) return
            const positions = new Map<string, { x: number; y: number }>()
            for (const n of graphData.nodes) {
                if (n.x != null && n.y != null) {
                    positions.set(n.id, { x: n.x, y: n.y })
                }
            }
            nodePositionsRef.current = positions
        }, [graphData])

        const handleEngineStop = useCallback(() => {
            if (fgNodes.length > 0 && prevNodeCount.current === 0 && graphRef.current) {
                graphRef.current.zoomToFit(600, 40)
            }
            prevNodeCount.current = fgNodes.length
        }, [fgNodes.length])

        const handleBackgroundMouseDown = (e: React.MouseEvent) => {
            if (!e.shiftKey && !e.ctrlKey && !e.metaKey) return
            onPaneClick?.()
            const rect = containerRef.current!.getBoundingClientRect()
            selectStartRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
            setSelectBox(null)
        }

        const handleBackgroundMouseMove = (e: React.MouseEvent) => {
            if (!selectStartRef.current) return
            const rect = containerRef.current!.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top
            setSelectBox({
                x0: selectStartRef.current.x,
                y0: selectStartRef.current.y,
                x1: x,
                y1: y
            })
        }

        const handleBackgroundMouseUp = (e: React.MouseEvent) => {
            if (!selectStartRef.current) return
            const rect = containerRef.current!.getBoundingClientRect()
            const x1 = e.clientX - rect.left
            const y1 = e.clientY - rect.top
            const { x: x0, y: y0 } = selectStartRef.current
            selectStartRef.current = null
            setSelectBox(null)

            if (Math.abs(x1 - x0) < 4 && Math.abs(y1 - y0) < 4) return

            const g0 = ((graphRef.current as any)?.screen2GraphCoords(x0, y0) as {
                x: number
                y: number
            }) ?? { x: 0, y: 0 }
            const g1 = ((graphRef.current as any)?.screen2GraphCoords(x1, y1) as {
                x: number
                y: number
            }) ?? { x: 0, y: 0 }
            const [gx0, gx1] = [Math.min(g0.x, g1.x), Math.max(g0.x, g1.x)]
            const [gy0, gy1] = [Math.min(g0.y, g1.y), Math.max(g0.y, g1.y)]

            const hitArns = graphData.nodes
                .filter(
                    (n: any) =>
                        !n.isGroupNode && n.x >= gx0 && n.x <= gx1 && n.y >= gy0 && n.y <= gy1
                )
                .map((n: any) => n.id as string)

            onBoxSelect?.(hitArns, true)
        }

        return (
            <div
                ref={containerRef}
                style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
            >
                <ForceGraph
                    ref={graphRef as any}
                    width={size.width}
                    height={size.height}
                    graphData={graphData}
                    nodeId="id"
                    nodeVal={(n: any) => n.nodeVal}
                    nodeLabel={(n: any) => `${n.label}\n${n.sublabel}`}
                    nodeCanvasObject={nodeCanvasObject}
                    nodePointerAreaPaint={nodePointerAreaPaint as any}
                    linkLabel={(l: any) => l.label || l.relationshipType}
                    linkColor={(l: any) => l.color}
                    linkWidth={(l: any) => (l.animated ? 2 : 1.5)}
                    linkCurvature={0.1}
                    linkDirectionalArrowLength={7}
                    linkDirectionalArrowRelPos={0.85}
                    linkDirectionalParticles={0}
                    backgroundColor="#0a0c12"
                    onNodeClick={handleNodeClick}
                    onNodeRightClick={handleNodeRightClick}
                    onBackgroundClick={handlePaneClick}
                    onBackgroundMouseDown={handleBackgroundMouseDown}
                    onEngineStop={handleEngineStop}
                    onEngineTick={handleEngineTick}
                    enableNodeDrag={selectBox === null}
                    onNodeDragStart={handleNodeDragStart}
                    onNodeDragEnd={handleNodeDragEnd}
                    enablePanInteraction={selectBox === null}
                    enableZoomInteraction={true}
                    minZoom={0.05}
                    maxZoom={4}
                    cooldownTicks={300}
                    d3AlphaMin={0.0001}
                    d3AlphaDecay={0.0228}
                    d3VelocityDecay={0.65}
                />
                {selectBox && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            cursor: 'crosshair',
                            zIndex: 10
                        }}
                        onMouseMove={handleBackgroundMouseMove}
                        onMouseUp={handleBackgroundMouseUp}
                    />
                )}
                {selectBox && (
                    <div
                        style={{
                            position: 'absolute',
                            pointerEvents: 'none',
                            zIndex: 11,
                            border: '1px solid #60a5fa',
                            background: 'rgba(96,165,250,0.08)',
                            left: Math.min(selectBox.x0, selectBox.x1),
                            top: Math.min(selectBox.y0, selectBox.y1),
                            width: Math.abs(selectBox.x1 - selectBox.x0),
                            height: Math.abs(selectBox.y1 - selectBox.y0)
                        }}
                    />
                )}
            </div>
        )
    }
)
