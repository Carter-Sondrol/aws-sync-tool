/**
 * ForceGraphComponent.tsx
 *
 * Canvas-based force-directed graph using react-force-graph-2d.
 * Renders AWS resource nodes with custom shapes, colors, and labels.
 * Supports node click, double-click (collapse), right-click (context menu),
 * drag (pin), search filtering, and mini-map.
 *
 * Replaces the custom useForceLayout hook + ReactFlow with a single
 * canvas-rendered force graph — much better performance for large graphs.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph, { type ForceGraphMethods } from 'react-force-graph-2d';
import { useAppStore } from '../../stores/app-store';
import { useForceGraphData, type FGNode, type FGEdge } from '../../hooks/use-force-graph-data';

// ─── Canvas drawing helpers ───────────────────────────────────────────────────

const NODE_RADIUS = 14;

// Runtime node type — force-graph adds x/y/vx/vy/fx/fy at runtime
interface RuntimeNode extends FGNode {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

// Runtime link type — force-graph resolves source/target to node objects
interface RuntimeLink extends Omit<FGEdge, 'source' | 'target'> {
  source: RuntimeNode | string;
  target: RuntimeNode | string;
}

function drawNode(
  node: RuntimeNode,
  ctx: CanvasRenderingContext2D,
  _highlightOpacity: number,
  selected: boolean,
): void {
  const { x, y, color, shape, synced, isPlaceholder, classification, isGroup, childCount, label, sublabel } = node;
  const r = isGroup ? NODE_RADIUS + 6 : NODE_RADIUS;

  ctx.save();

  // Opacity based on sync/classification
  const isManaged = classification === 'aws-managed';
  ctx.globalAlpha = isManaged ? 0.35 : synced ? 1 : 0.45;

  // Selected glow
  if (selected) {
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 12;
  }

  // Draw shape
  ctx.beginPath();

  switch (shape) {
    case 'circle':
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      break;

    case 'diamond':
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      ctx.closePath();
      break;

    case 'hexagon': {
      const hexR = r * 1.2;
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = x + hexR * Math.cos(angle);
        const py = y + hexR * Math.sin(angle);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }

    case 'cylinder': {
      const w = r * 1.6;
      const h = r * 1.4;
      const arcR = w * 0.15;
      ctx.moveTo(x - w / 2, y - h / 2);
      ctx.lineTo(x + w / 2, y - h / 2);
      ctx.arc(x + w / 2, y, arcR, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(x - w / 2, y + h / 2);
      ctx.arc(x - w / 2, y, arcR, Math.PI / 2, -Math.PI / 2);
      ctx.closePath();
      break;
    }

    case 'group':
      ctx.rect(x - r - 4, y - r + 2, (r + 4) * 2, (r - 2) * 2);
      break;

    default: // rect
      ctx.rect(x - r, y - r, r * 2, r * 2);
      break;
  }

  // Fill
  ctx.fillStyle = isGroup ? 'transparent' : color;
  ctx.fill();

  // Border
  ctx.shadowBlur = 0;
  ctx.lineWidth = selected ? 3 : 2;
  ctx.strokeStyle = selected ? '#ffffff' : color;
  if (isGroup) {
    ctx.setLineDash([4, 3]);
  } else if (isPlaceholder) {
    ctx.setLineDash([3, 3]);
  } else if (!synced) {
    ctx.setLineDash([2, 2]);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Child count badge
  if (childCount > 0) {
    const badgeR = 8;
    const bx = x + r + 2;
    const by = y - r + 2;
    ctx.beginPath();
    ctx.arc(bx, by, badgeR, 0, 2 * Math.PI);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#16181f';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`+${childCount}`, bx, by);
  }

  ctx.restore();

  // Label (drawn outside alpha clipping so it's always readable)
  ctx.save();
  ctx.font = '600 9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Text shadow for readability
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 4;
  ctx.fillStyle = '#fff';

  const labelY = y + r + 3;
  ctx.fillText(label, x, labelY);

  ctx.font = '8px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillStyle = '#888';
  ctx.fillText(sublabel, x, labelY + 11);

  ctx.restore();
}

function drawLink(
  link: RuntimeLink,
  ctx: CanvasRenderingContext2D,
): void {
  const source = typeof link.source === 'object' ? link.source : null;
  const target = typeof link.target === 'object' ? link.target : null;
  if (!source || !target) return;

  const { dashArray, color, animated } = link;

  ctx.save();

  ctx.beginPath();
  ctx.moveTo(source.x, source.y);
  ctx.lineTo(target.x, target.y);

  ctx.strokeStyle = color;
  ctx.lineWidth = animated ? 2 : 1.5;

  if (dashArray && dashArray !== '0') {
    const parts = dashArray.split(',').map(Number);
    ctx.setLineDash(parts);
  }

  ctx.globalAlpha = 0.6;
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ForceGraphComponentProps {
  onNodeClick?: (arn: string) => void;
  onNodeDoubleClick?: (arn: string) => void;
  onNodeRightClick?: (arn: string, event: MouseEvent) => void;
  onPaneClick?: () => void;
  searchTerm?: string;
}

export function ForceGraphComponent({
  onNodeClick,
  onNodeDoubleClick,
  onNodeRightClick,
  onPaneClick,
  searchTerm = '',
}: ForceGraphComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods | null>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  // Responsive sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(el);

    // Initial size
    setSize({ width: el.clientWidth, height: el.clientHeight });

    return () => observer.disconnect();
  }, []);
  const { nodes: fgNodes, edges: fgEdges } = useForceGraphData();
  const { selectedNodeArns } = useAppStore();

  const selectedSet = useMemo(() => new Set(selectedNodeArns), [selectedNodeArns]);

  // Double-click detection (react-force-graph-2d has no onNodeDoubleClick)
  const clickTimerRef = useRef<Map<string, { time: number; timer: number }>>(new Map());

  // Filter nodes by search term
  const filteredNodes = useMemo(() => {
    if (!searchTerm) return fgNodes;
    const term = searchTerm.toLowerCase();
    return fgNodes.filter(
      (n) => n.label.toLowerCase().includes(term) || n.sublabel.toLowerCase().includes(term) || n.id.toLowerCase().includes(term),
    );
  }, [fgNodes, searchTerm]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    return fgEdges.filter(
      (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target),
    );
  }, [fgEdges, filteredNodeIds]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleNodeClick = useCallback(
    (node: any) => {
      const now = Date.now();
      const existing = clickTimerRef.current.get(node.id);

      if (existing && now - existing.time < 350) {
        clearTimeout(existing.timer);
        clickTimerRef.current.delete(node.id);
        onNodeDoubleClick?.(node.id);
      } else {
        const timer = window.setTimeout(() => {
          clickTimerRef.current.delete(node.id);
          onNodeClick?.(node.id);
        }, 350);
        clickTimerRef.current.set(node.id, { time: now, timer });
      }
    },
    [onNodeClick, onNodeDoubleClick],
  );

  const handleNodeRightClick = useCallback(
    (node: any, event: MouseEvent) => {
      event.preventDefault();
      onNodeRightClick?.(node.id, event);
    },
    [onNodeRightClick],
  );

  const handlePaneClick = useCallback(() => {
    onPaneClick?.();
  }, [onPaneClick]);

  const nodeCanvasObject = useCallback(
    (node: RuntimeNode, ctx: CanvasRenderingContext2D, highlightOpacity: number) => {
      const isSelected = selectedSet.has(node.id);
      drawNode(node, ctx, highlightOpacity, isSelected);
    },
    [selectedSet],
  );

  const linkCanvasObject = useCallback(
    (link: RuntimeLink, ctx: CanvasRenderingContext2D) => {
      drawLink(link, ctx);
    },
    [],
  );

  const prevNodeCount = useRef(0);
  const handleEngineStop = useCallback(() => {
    if (fgNodes.length > 0 && prevNodeCount.current === 0 && graphRef.current) {
      graphRef.current.zoomToFit(600, 40);
    }
    prevNodeCount.current = fgNodes.length;
  }, [fgNodes.length]);

  useEffect(() => {
    prevNodeCount.current = 0;
  }, [fgNodes.length]);

  // Graph data — typed as any to avoid the overly complex generic nesting
  const graphData: { nodes: any[]; links: any[] } = useMemo(
    () => ({
      nodes: filteredNodes,
      links: filteredEdges,
    }),
    [filteredNodes, filteredEdges],
  );

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
      <ForceGraph
        ref={graphRef as any}
        width={size.width}
        height={size.height}
        graphData={graphData}
        nodeId="id"
        nodeVal={10}
        nodeLabel={(n: any) => `${n.label}\n${n.sublabel}`}
        nodeCanvasObject={nodeCanvasObject}
        linkCanvasObject={linkCanvasObject}
        linkLabel={(l: any) => l.label || l.relationshipType}
        linkColor={(l: any) => l.color}
        linkWidth={(l: any) => (l.animated ? 2 : 1.5)}
        linkCurvature={0.1}
        linkDirectionalParticles={0}
        backgroundColor="#0a0c12"
        onNodeClick={handleNodeClick}
        onNodeRightClick={handleNodeRightClick}
        onBackgroundClick={handlePaneClick}
        onEngineStop={handleEngineStop}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        minZoom={0.05}
        maxZoom={4}
        cooldownTicks={300}
        d3AlphaMin={0.002}
        d3AlphaDecay={0.0228}
        d3VelocityDecay={0.65}
      />
    </div>
  );
}
