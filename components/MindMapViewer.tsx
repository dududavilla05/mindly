"use client";

import { useEffect, useRef, useState, useCallback, Fragment } from "react";
import * as d3 from "d3";
import type { MindMapNode, MindMapEdge } from "./MindMap";

interface Position { x: number; y: number }

interface MindMapViewerProps {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  onNodeClick: (node: MindMapNode) => void;
  expandingId?: string | null;
}

const NODE_RADIUS = [68, 46, 33, 25];
const LINK_DISTANCE = [265, 175, 125];

const GRADIENT_COLORS: [string, string][] = [
  ["#9c3fff", "#5010cc"],
  ["#16c0ac", "#0a7068"],
  ["#f59e1b", "#b45309"],
  ["#ec4899", "#9d1451"],
  ["#3b82f6", "#1d4ed8"],
];

// Simple string → unsigned integer hash
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

// Smooth closed cubic-bezier path through points (Catmull-Rom tangents)
function smoothClosedPath(pts: Array<[number, number]>): string {
  const N = pts.length;
  const t = 0.38;
  const tangents = pts.map((_, i) => {
    const prev = pts[(i - 1 + N) % N];
    const next = pts[(i + 1) % N];
    return [(next[0] - prev[0]) * t, (next[1] - prev[1]) * t] as [number, number];
  });
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    const cp1 = [pts[i][0] + tangents[i][0] / 3, pts[i][1] + tangents[i][1] / 3];
    const cp2 = [pts[j][0] - tangents[j][0] / 3, pts[j][1] - tangents[j][1] / 3];
    d += ` C ${cp1[0].toFixed(2)} ${cp1[1].toFixed(2)} ${cp2[0].toFixed(2)} ${cp2[1].toFixed(2)} ${pts[j][0].toFixed(2)} ${pts[j][1].toFixed(2)}`;
  }
  return d + " Z";
}

// Organic blob using irregular radii around a circle
function blobPath(r: number, seed: string, nPts = 8, variance = 0.14): string {
  const h = hashStr(seed);
  const pts: Array<[number, number]> = Array.from({ length: nPts }, (_, i) => {
    const angle = (2 * Math.PI * i / nPts) - Math.PI / 2;
    const rnd = ((h >>> (i * 4)) & 0xff) / 255;
    const ri = r * (1 - variance + rnd * variance * 2);
    return [ri * Math.cos(angle), ri * Math.sin(angle)];
  });
  return smoothClosedPath(pts);
}

function nodeGradient(node: MindMapNode, allNodes: MindMapNode[]): { fill: string; strokeColor: string } {
  if (node.level === 0) return { fill: "url(#grad-root)", strokeColor: "#b06aff" };
  let ancestor = node;
  while (ancestor.level > 1) {
    const parent = allNodes.find(n => n.id === ancestor.parentId);
    if (!parent) break;
    ancestor = parent;
  }
  const idx = allNodes.filter(n => n.level === 1).findIndex(n => n.id === ancestor.id);
  const ci = Math.max(idx, 0) % GRADIENT_COLORS.length;
  const sub = node.level > 1 ? "-sub" : "";
  return { fill: `url(#grad-${ci}${sub})`, strokeColor: GRADIENT_COLORS[ci][0] };
}

function wrapLabel(label: string, maxLen: number): string[] {
  if (label.length <= maxLen) return [label];
  const words = label.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxLen && cur) {
      lines.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur.trim());
  return lines.slice(0, 3);
}

export default function MindMapViewer({ nodes, edges, onNodeClick, expandingId }: MindMapViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const posRef = useRef<Map<string, Position>>(new Map());
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [positions, setPositions] = useState<Map<string, Position>>(new Map());
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number; mx: number; my: number } | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const computePositions = useCallback((allNodes: MindMapNode[]) => {
    const svg = svgRef.current;
    const cx = (svg?.clientWidth ?? 700) / 2;
    const cy = (svg?.clientHeight ?? 500) / 2;
    const result = new Map(posRef.current);

    const root = allNodes.find(n => n.level === 0);
    if (!root) return result;
    if (!result.has(root.id)) result.set(root.id, { x: cx, y: cy });
    const rootPos = result.get(root.id)!;

    const l1 = allNodes.filter(n => n.level === 1);
    l1.forEach((node, i) => {
      if (result.has(node.id)) return;
      const angle = (2 * Math.PI * i) / l1.length - Math.PI / 2;
      result.set(node.id, {
        x: rootPos.x + LINK_DISTANCE[0] * Math.cos(angle),
        y: rootPos.y + LINK_DISTANCE[0] * Math.sin(angle),
      });
    });

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

  // Recompute after layout paint so SVG has real dimensions
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const p = computePositions(nodes);
      posRef.current = p;
      setPositions(new Map(p));
    });
    return () => cancelAnimationFrame(raf);
  }, [nodes, computePositions]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .filter((event) => {
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
    posRef.current.set(dragging.id, { x: dragging.ox + dx, y: dragging.oy + dy });
    setPositions(new Map(posRef.current));
  }, [dragging, transform.k]);

  const handleSvgMouseUp = useCallback(() => setDragging(null), []);

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
    posRef.current.set(touchRef.current.id, { x: touchRef.current.ox + dx, y: touchRef.current.oy + dy });
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
        {/* Root gradient */}
        <radialGradient id="grad-root" cx="35%" cy="30%" r="70%" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#b06aff" />
          <stop offset="100%" stopColor="#5010cc" />
        </radialGradient>

        {/* Per-subtree gradients (full opacity = level 1, subdued = level 2+) */}
        {GRADIENT_COLORS.map(([c1, c2], i) => (
          <Fragment key={i}>
            <radialGradient id={`grad-${i}`} cx="35%" cy="30%" r="70%" gradientUnits="objectBoundingBox">
              <stop offset="0%" stopColor={c1} />
              <stop offset="100%" stopColor={c2} />
            </radialGradient>
            <radialGradient id={`grad-${i}-sub`} cx="35%" cy="30%" r="70%" gradientUnits="objectBoundingBox">
              <stop offset="0%" stopColor={c1} stopOpacity="0.75" />
              <stop offset="100%" stopColor={c2} stopOpacity="0.75" />
            </radialGradient>
          </Fragment>
        ))}

        {/* Glow filters */}
        <filter id="glow-lg" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow-sm" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="text-shadow">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="rgba(0,0,0,0.7)" />
        </filter>
      </defs>

      <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
        {/* ── Edges ── */}
        {edges.map((edge) => {
          const srcId = typeof edge.source === "string" ? edge.source : (edge.source as MindMapNode).id;
          const tgtId = typeof edge.target === "string" ? edge.target : (edge.target as MindMapNode).id;
          const src = positions.get(srcId);
          const tgt = positions.get(tgtId);
          if (!src || !tgt) return null;
          // Quadratic bezier with gentle perpendicular bulge
          const dx = tgt.x - src.x;
          const dy = tgt.y - src.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;
          const bulge = Math.min(len * 0.15, 35);
          const mx = (src.x + tgt.x) / 2 + nx * bulge;
          const my = (src.y + tgt.y) / 2 + ny * bulge;
          return (
            <path
              key={`${srcId}-${tgtId}`}
              d={`M${src.x},${src.y} Q${mx},${my} ${tgt.x},${tgt.y}`}
              fill="none"
              stroke="rgba(160,100,255,0.28)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          );
        })}

        {/* ── Nodes ── */}
        {nodes.map((node) => {
          const pos = positions.get(node.id);
          if (!pos) return null;

          const r = NODE_RADIUS[Math.min(node.level, NODE_RADIUS.length - 1)];
          const { fill, strokeColor } = nodeGradient(node, nodes);
          const isRoot = node.level === 0;
          const isExpanding = expandingId === node.id;

          const nPts = isRoot ? 10 : node.level === 1 ? 8 : 7;
          const variance = isRoot ? 0.07 : 0.16;
          const blob = blobPath(r, node.id, nPts, variance);

          const maxLen = isRoot ? 16 : node.level === 1 ? 13 : 10;
          const lines = wrapLabel(node.label, maxLen);
          const fontSize = isRoot ? 14 : node.level === 1 ? 12 : 10;
          const lineH = fontSize + 4;
          const totalTextH = (lines.length - 1) * lineH;

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
              {/* Outer glow halo for root */}
              {isRoot && (
                <path
                  d={blobPath(r + 22, node.id + "__halo", nPts, 0.05)}
                  fill="rgba(124,31,255,0.15)"
                />
              )}

              {/* Main blob shape */}
              <path
                d={blob}
                fill={fill}
                stroke={isExpanding ? "#fff" : strokeColor + "55"}
                strokeWidth={isExpanding ? 2 : 1.5}
                filter={isRoot ? "url(#glow-lg)" : "url(#glow-sm)"}
              />

              {/* Top-left gloss highlight */}
              <ellipse
                rx={r * 0.42}
                ry={r * 0.28}
                cx={-r * 0.18}
                cy={-r * 0.22}
                fill="rgba(255,255,255,0.13)"
                style={{ pointerEvents: "none" }}
              />

              {/* Expanding spinner ring */}
              {isExpanding && (
                <circle
                  r={r + 12}
                  fill="none"
                  stroke="rgba(255,255,255,0.45)"
                  strokeWidth="1.5"
                  strokeDasharray="5 4"
                  style={{ animation: "spin 1.5s linear infinite" }}
                />
              )}

              {/* Label */}
              {lines.map((line, i) => (
                <text
                  key={i}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  dy={-totalTextH / 2 + i * lineH}
                  fill="white"
                  fontSize={fontSize}
                  fontWeight={isRoot ? 700 : node.level === 1 ? 600 : 400}
                  filter="url(#text-shadow)"
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
