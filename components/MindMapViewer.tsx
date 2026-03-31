"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import type { MindMapNode, MindMapEdge } from "./MindMap";

interface Position { x: number; y: number }

interface MindMapViewerProps {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  onNodeClick: (node: MindMapNode) => void;
  expandingId?: string | null;
}

const LEVEL1_COLORS = ["#7c1fff", "#0d9488", "#d97706", "#db2777", "#2563eb"];
const NODE_RADIUS = [50, 34, 26, 20];
const LINK_DISTANCE = [220, 140, 100];

function nodeColor(node: MindMapNode, allNodes: MindMapNode[]): string {
  if (node.level === 0) return "#7c1fff";
  let ancestor = node;
  while (ancestor.level > 1) {
    const parent = allNodes.find(n => n.id === ancestor.parentId);
    if (!parent) break;
    ancestor = parent;
  }
  const idx = allNodes.filter(n => n.level === 1).findIndex(n => n.id === ancestor.id);
  const base = LEVEL1_COLORS[Math.max(idx, 0) % LEVEL1_COLORS.length];
  return node.level === 1 ? base : base + "bb";
}

function nodeRadius(level: number): number {
  return NODE_RADIUS[Math.min(level, NODE_RADIUS.length - 1)];
}

function wrapLabel(label: string, maxLen = 12): string[] {
  if (label.length <= maxLen) return [label];
  const words = label.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxLen && current) {
      lines.push(current.trim());
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines.slice(0, 2);
}

export default function MindMapViewer({ nodes, edges, onNodeClick, expandingId }: MindMapViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const posRef = useRef<Map<string, Position>>(new Map());
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [positions, setPositions] = useState<Map<string, Position>>(new Map());
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number; mx: number; my: number } | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Compute radial layout for new nodes
  const computePositions = useCallback((allNodes: MindMapNode[]) => {
    const svg = svgRef.current;
    const cx = (svg?.clientWidth ?? 700) / 2;
    const cy = (svg?.clientHeight ?? 500) / 2;
    const result = new Map(posRef.current);

    const root = allNodes.find(n => n.level === 0);
    if (!root) return result;
    if (!result.has(root.id)) result.set(root.id, { x: cx, y: cy });
    const rootPos = result.get(root.id)!;

    // Level 1
    const l1 = allNodes.filter(n => n.level === 1);
    l1.forEach((node, i) => {
      if (result.has(node.id)) return;
      const angle = (2 * Math.PI * i) / l1.length - Math.PI / 2;
      result.set(node.id, {
        x: rootPos.x + LINK_DISTANCE[0] * Math.cos(angle),
        y: rootPos.y + LINK_DISTANCE[0] * Math.sin(angle),
      });
    });

    // Level 2+
    const processLevel = (level: number) => {
      const byParent = new Map<string, MindMapNode[]>();
      allNodes.filter(n => n.level === level).forEach(n => {
        const arr = byParent.get(n.parentId ?? "") ?? [];
        arr.push(n);
        byParent.set(n.parentId ?? "", arr);
      });
      byParent.forEach((siblings, parentId) => {
        const pPos = result.get(parentId);
        if (!pPos) return;
        const awayAngle = Math.atan2(pPos.y - rootPos.y, pPos.x - rootPos.x);
        const r = LINK_DISTANCE[Math.min(level - 1, LINK_DISTANCE.length - 1)];
        const arc = siblings.length === 1 ? 0 : Math.PI * 0.55;
        siblings.forEach((node, i) => {
          if (result.has(node.id)) return;
          const angle = siblings.length === 1
            ? awayAngle
            : awayAngle - arc / 2 + (arc * i) / (siblings.length - 1);
          result.set(node.id, {
            x: pPos.x + r * Math.cos(angle),
            y: pPos.y + r * Math.sin(angle),
          });
        });
      });
    };

    const maxLevel = Math.max(...allNodes.map(n => n.level), 2);
    for (let l = 2; l <= maxLevel; l++) processLevel(l);

    return result;
  }, []);

  // Recompute when nodes change — defer to rAF so SVG has its final dimensions
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const p = computePositions(nodes);
      posRef.current = p;
      setPositions(new Map(p));
    });
    return () => cancelAnimationFrame(raf);
  }, [nodes, computePositions]);

  // Set up D3 zoom
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .filter((event) => {
        // Allow zoom on wheel, allow pan only when not clicking a node
        if (event.type === "wheel") return true;
        if (event.type === "mousedown" && (event.target as Element).closest(".mindmap-node")) return false;
        return !event.button;
      })
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        setTransform({ x: event.transform.x, y: event.transform.y, k: event.transform.k });
      });
    zoomRef.current = zoom;
    d3.select(svg).call(zoom);
    return () => { d3.select(svg).on(".zoom", null); };
  }, []);

  // Drag handlers
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const pos = posRef.current.get(id);
    if (!pos) return;
    setDragging({ id, ox: pos.x, oy: pos.y, mx: e.clientX, my: e.clientY });
  }, []);

  const handleSvgMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = (e.clientX - dragging.mx) / transform.k;
    const dy = (e.clientY - dragging.my) / transform.k;
    const newPos = { x: dragging.ox + dx, y: dragging.oy + dy };
    posRef.current.set(dragging.id, newPos);
    setPositions(new Map(posRef.current));
  }, [dragging, transform.k]);

  const handleSvgMouseUp = useCallback(() => setDragging(null), []);

  // Touch drag
  const touchRef = useRef<{ id: string; ox: number; oy: number; mx: number; my: number } | null>(null);
  const handleNodeTouchStart = useCallback((e: React.TouchEvent, id: string) => {
    const t = e.touches[0];
    const pos = posRef.current.get(id);
    if (!pos || !t) return;
    touchRef.current = { id, ox: pos.x, oy: pos.y, mx: t.clientX, my: t.clientY };
  }, []);

  const handleSvgTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const t = e.touches[0];
    if (!t) return;
    const dx = (t.clientX - touchRef.current.mx) / transform.k;
    const dy = (t.clientY - touchRef.current.my) / transform.k;
    const newPos = { x: touchRef.current.ox + dx, y: touchRef.current.oy + dy };
    posRef.current.set(touchRef.current.id, newPos);
    setPositions(new Map(posRef.current));
  }, [transform.k]);

  const handleSvgTouchEnd = useCallback(() => { touchRef.current = null; }, []);

  if (nodes.length === 0) return null;

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      style={{ cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
      onMouseMove={handleSvgMouseMove}
      onMouseUp={handleSvgMouseUp}
      onMouseLeave={handleSvgMouseUp}
      onTouchMove={handleSvgTouchMove}
      onTouchEnd={handleSvgTouchEnd}
    >
      <defs>
        <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a66aff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#7c1fff" stopOpacity="0" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
        {/* Edges */}
        {edges.map((edge) => {
          const src = positions.get(typeof edge.source === "string" ? edge.source : (edge.source as MindMapNode).id);
          const tgt = positions.get(typeof edge.target === "string" ? edge.target : (edge.target as MindMapNode).id);
          if (!src || !tgt) return null;
          const mx = (src.x + tgt.x) / 2;
          const my = (src.y + tgt.y) / 2 - 20;
          return (
            <path
              key={`${typeof edge.source === "string" ? edge.source : (edge.source as MindMapNode).id}-${typeof edge.target === "string" ? edge.target : (edge.target as MindMapNode).id}`}
              d={`M${src.x},${src.y} Q${mx},${my} ${tgt.x},${tgt.y}`}
              fill="none"
              stroke="rgba(124,31,255,0.35)"
              strokeWidth="1.5"
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const pos = positions.get(node.id);
          if (!pos) return null;
          const r = nodeRadius(node.level);
          const color = nodeColor(node, nodes);
          const lines = wrapLabel(node.label, node.level === 0 ? 14 : 11);
          const isExpanding = expandingId === node.id;
          const isRoot = node.level === 0;

          return (
            <g
              key={node.id}
              className="mindmap-node"
              transform={`translate(${pos.x},${pos.y})`}
              style={{ cursor: "pointer" }}
              onClick={(e) => { e.stopPropagation(); onNodeClick(node); }}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onTouchStart={(e) => { e.stopPropagation(); handleNodeTouchStart(e, node.id); }}
            >
              {/* Glow for root */}
              {isRoot && (
                <circle r={r + 20} fill="url(#node-glow)" />
              )}
              {/* Main circle */}
              <circle
                r={r}
                fill={color}
                style={{
                  filter: isRoot ? "url(#glow)" : undefined,
                  transition: "r 0.2s",
                }}
                stroke={isExpanding ? "#ffffff" : "rgba(255,255,255,0.2)"}
                strokeWidth={isExpanding ? 2 : 1}
              />
              {/* Expanding spinner */}
              {isExpanding && (
                <circle
                  r={r + 6}
                  fill="none"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                  style={{ animation: "spin 1.5s linear infinite" }}
                />
              )}
              {/* Label */}
              {lines.map((line, i) => (
                <text
                  key={i}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  dy={lines.length === 1 ? 0 : (i === 0 ? -8 : 8)}
                  fill="white"
                  fontSize={isRoot ? 13 : node.level === 1 ? 11 : 9}
                  fontWeight={isRoot ? 700 : node.level === 1 ? 600 : 400}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {line}
                </text>
              ))}
            </g>
          );
        })}
      </g>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </svg>
  );
}
