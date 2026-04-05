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
  topic?: string;
}

// Rounded-rectangle dimensions per level
const NODE_SIZES = [
  { w: 160, h: 60, rx: 12 },  // level 0 — root
  { w: 140, h: 50, rx: 12 },  // level 1
  { w: 120, h: 40, rx: 12 },  // level 2+
];

function nodeSize(level: number) {
  return NODE_SIZES[Math.min(level, NODE_SIZES.length - 1)];
}

const GRADIENT_COLORS: [string, string][] = [
  ["#9c3fff", "#5010cc"],
  ["#16c0ac", "#0a7068"],
  ["#f59e1b", "#b45309"],
  ["#ec4899", "#9d1451"],
  ["#3b82f6", "#1d4ed8"],
];

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

// ── D3 force layout ──────────────────────────────────────────────────────────
type SimNode = d3.SimulationNodeDatum & { id: string; level: number };

function runForceLayout(
  allNodes: MindMapNode[],
  allEdges: MindMapEdge[],
  cx: number,
  cy: number,
  existing: Map<string, Position>
): Map<string, Position> {
  const isExpansion = allNodes.some(n => existing.has(n.id) && n.level > 0);

  const simNodes: SimNode[] = allNodes.map(n => {
    const pos = existing.get(n.id);
    let ix = cx + (Math.random() - 0.5) * 320;
    let iy = cy + (Math.random() - 0.5) * 320;
    if (!pos && n.parentId) {
      const pPos = existing.get(n.parentId);
      if (pPos) {
        const a = Math.random() * 2 * Math.PI;
        ix = pPos.x + Math.cos(a) * 80;
        iy = pPos.y + Math.sin(a) * 80;
      }
    }
    return {
      id: n.id,
      level: n.level,
      x: pos?.x ?? ix,
      y: pos?.y ?? iy,
      fx: n.level === 0 ? cx : (isExpansion && pos ? pos.x : undefined),
      fy: n.level === 0 ? cy : (isExpansion && pos ? pos.y : undefined),
    };
  });

  const nodeMap = new Map(simNodes.map(n => [n.id, n]));

  const simEdges = allEdges
    .map(e => ({
      source: typeof e.source === "string" ? e.source : (e.source as MindMapNode).id,
      target: typeof e.target === "string" ? e.target : (e.target as MindMapNode).id,
    }))
    .filter(l => nodeMap.has(l.source) && nodeMap.has(l.target));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sim = d3.forceSimulation<SimNode>(simNodes)
    .force("link",
      d3.forceLink<SimNode, { source: string; target: string }>(simEdges)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .id((d: any) => d.id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .distance((l: any) => {
          const tgtId = typeof l.target === "string" ? l.target : l.target.id;
          const tgt = nodeMap.get(tgtId);
          return (tgt?.level ?? 2) === 1 ? 185 : 130;
        })
        .strength(0.9)
    )
    .force("charge", d3.forceManyBody<SimNode>().strength(-480))
    .force("center", d3.forceCenter<SimNode>(cx, cy).strength(0.06))
    .force("collide",
      d3.forceCollide<SimNode>()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .radius((d: any) => {
          const s = nodeSize(d.level ?? 2);
          return Math.sqrt((s.w / 2) ** 2 + (s.h / 2) ** 2) + 20;
        })
        .strength(1)
        .iterations(4)
    )
    .stop();

  sim.tick(280);

  const result = new Map<string, Position>(existing);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  simNodes.forEach((n: any) => {
    if (n.x != null && n.y != null) result.set(n.id, { x: n.x, y: n.y });
  });
  return result;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MindMapViewer({ nodes, edges, onNodeClick, expandingId, topic }: MindMapViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const posRef = useRef<Map<string, Position>>(new Map());
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [positions, setPositions] = useState<Map<string, Position>>(new Map());
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number; mx: number; my: number } | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Explanation card state
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loadingExpl, setLoadingExpl] = useState(false);

  // ── Layout ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const svg = svgRef.current;
      const cx = (svg?.clientWidth ?? 700) / 2;
      const cy = (svg?.clientHeight ?? 500) / 2;
      const p = runForceLayout(nodes, edges, cx, cy, posRef.current);
      posRef.current = p;
      setPositions(new Map(p));
    });
    return () => cancelAnimationFrame(raf);
  }, [nodes, edges]);

  // ── Zoom setup ──────────────────────────────────────────────────────────────
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

  // ── Zoom to node ─────────────────────────────────────────────────────────────
  const zoomToNode = useCallback((nodeId: string) => {
    const svg = svgRef.current;
    const zoom = zoomRef.current;
    if (!svg || !zoom) return;
    const pos = posRef.current.get(nodeId);
    if (!pos) return;
    const w = svg.clientWidth;
    const h = svg.clientHeight;
    const scale = 1.75;
    const tx = w / 2 - scale * pos.x;
    const ty = h / 2 - scale * pos.y;
    d3.select(svg)
      .transition()
      .duration(550)
      .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  }, []);

  // ── Reset zoom ───────────────────────────────────────────────────────────────
  const resetZoom = useCallback(() => {
    const svg = svgRef.current;
    const zoom = zoomRef.current;
    if (!svg || !zoom) return;
    d3.select(svg)
      .transition()
      .duration(450)
      .call(zoom.transform, d3.zoomIdentity);
  }, []);

  // ── Node selection + explanation fetch ────────────────────────────────────────
  const handleNodeSelect = useCallback(async (node: MindMapNode) => {
    if (node.level === 0) return;
    setSelectedNode(node);
    setExplanation(null);
    setLoadingExpl(true);
    zoomToNode(node.id);

    try {
      const res = await fetch("/api/mindmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic ?? node.label,
          nodeId: node.id,
          nodeLabel: node.label,
          nodeLevel: node.level,
          explain: true,
        }),
      });
      const data = await res.json();
      setExplanation(data.explanation ?? null);
    } catch {
      setExplanation(null);
    } finally {
      setLoadingExpl(false);
    }
  }, [topic, zoomToNode]);

  const handleClose = useCallback(() => {
    setSelectedNode(null);
    setExplanation(null);
    resetZoom();
  }, [resetZoom]);

  const handleExpand = useCallback(() => {
    if (!selectedNode) return;
    onNodeClick(selectedNode);
    setSelectedNode(null);
    setExplanation(null);
  }, [selectedNode, onNodeClick]);

  // ── Drag (mouse) ─────────────────────────────────────────────────────────────
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

  // ── Drag (touch) ─────────────────────────────────────────────────────────────
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
    <div className="w-full h-full relative">
      {/* ── SVG Canvas ─────────────────────────────────────────────────────── */}
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
          <linearGradient id="grad-root" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#b06aff" />
            <stop offset="100%" stopColor="#5010cc" />
          </linearGradient>
          {/* Per-branch gradients */}
          {GRADIENT_COLORS.map(([c1, c2], i) => (
            <Fragment key={i}>
              <linearGradient id={`grad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={c1} />
                <stop offset="100%" stopColor={c2} />
              </linearGradient>
              <linearGradient id={`grad-${i}-sub`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={c1} stopOpacity="0.72" />
                <stop offset="100%" stopColor={c2} stopOpacity="0.72" />
              </linearGradient>
            </Fragment>
          ))}
          {/* Glow filters */}
          <filter id="glow-lg" x="-60%" y="-100%" width="220%" height="300%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-sm" x="-40%" y="-80%" width="180%" height="260%">
            <feGaussianBlur stdDeviation="4" result="blur" />
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
            const dx = tgt.x - src.x;
            const dy = tgt.y - src.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const nx = -dy / len;
            const ny = dx / len;
            const bulge = Math.min(len * 0.15, 35);
            const mx = (src.x + tgt.x) / 2 + nx * bulge;
            const my = (src.y + tgt.y) / 2 + ny * bulge;
            const isSelected = selectedNode && (tgtId === selectedNode.id || srcId === selectedNode.id);
            return (
              <path
                key={`${srcId}-${tgtId}`}
                d={`M${src.x},${src.y} Q${mx},${my} ${tgt.x},${tgt.y}`}
                fill="none"
                stroke={isSelected ? "rgba(200,140,255,0.55)" : "rgba(160,100,255,0.28)"}
                strokeWidth={isSelected ? 2.5 : 1.8}
                strokeLinecap="round"
              />
            );
          })}

          {/* ── Nodes ── */}
          {nodes.map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;

            const { w, h, rx } = nodeSize(node.level);
            const hw = w / 2;
            const hh = h / 2;
            const { fill, strokeColor } = nodeGradient(node, nodes);
            const isRoot = node.level === 0;
            const isExpanding = expandingId === node.id;
            const isSelected = selectedNode?.id === node.id;

            const maxLen = isRoot ? 18 : node.level === 1 ? 15 : 13;
            const lines = wrapLabel(node.label, maxLen);
            const fontSize = isRoot ? 14 : node.level === 1 ? 12 : 11;
            const lineH = fontSize + 4;
            const totalTextH = (lines.length - 1) * lineH;

            // Selection / expanding ring padding
            const pad = 8;

            return (
              <g
                key={node.id}
                className="mindmap-node"
                transform={`translate(${pos.x},${pos.y})`}
                style={{ cursor: node.level === 0 ? "default" : "pointer" }}
                onClick={(e) => { e.stopPropagation(); handleNodeSelect(node); }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onTouchStart={(e) => { e.stopPropagation(); handleNodeTouchStart(e, node.id); }}
              >
                {/* Root outer glow halo */}
                {isRoot && (
                  <rect
                    x={-(hw + 14)} y={-(hh + 14)}
                    width={w + 28} height={h + 28}
                    rx={rx + 6}
                    fill="rgba(124,31,255,0.15)"
                    style={{ pointerEvents: "none" }}
                  />
                )}

                {/* Selection dashed ring */}
                {isSelected && (
                  <rect
                    x={-(hw + pad)} y={-(hh + pad)}
                    width={w + pad * 2} height={h + pad * 2}
                    rx={rx + 4}
                    fill="none"
                    stroke="rgba(200,140,255,0.6)"
                    strokeWidth="2"
                    strokeDasharray="6 3"
                    style={{ animation: "spin 3s linear infinite", transformOrigin: "0 0" }}
                  />
                )}

                {/* Main rounded rect */}
                <rect
                  x={-hw} y={-hh}
                  width={w} height={h}
                  rx={rx}
                  fill={fill}
                  stroke={isExpanding || isSelected ? "#fff" : strokeColor + "66"}
                  strokeWidth={isExpanding || isSelected ? 2 : 1.5}
                  filter={isRoot ? "url(#glow-lg)" : "url(#glow-sm)"}
                />

                {/* Glass highlight (top strip) */}
                <rect
                  x={-hw + 8} y={-hh + 5}
                  width={w - 16} height={h * 0.3}
                  rx={rx - 4}
                  fill="rgba(255,255,255,0.12)"
                  style={{ pointerEvents: "none" }}
                />

                {/* Expanding dashed ring */}
                {isExpanding && (
                  <rect
                    x={-(hw + pad)} y={-(hh + pad)}
                    width={w + pad * 2} height={h + pad * 2}
                    rx={rx + 4}
                    fill="none"
                    stroke="rgba(255,255,255,0.45)"
                    strokeWidth="1.5"
                    strokeDasharray="5 4"
                    style={{ animation: "spin 1.5s linear infinite", transformOrigin: "0 0" }}
                  />
                )}

                {/* Label text — vertically centred */}
                {lines.map((line, i) => (
                  <text
                    key={i}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    y={-totalTextH / 2 + i * lineH}
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

      {/* ── Explanation Card ────────────────────────────────────────────────── */}
      {selectedNode && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-sm z-20 animate-slide-up"
          style={{
            background: "rgba(15,10,30,0.97)",
            border: "1px solid rgba(124,31,255,0.45)",
            borderRadius: "1.25rem",
            boxShadow: "0 0 40px rgba(124,31,255,0.25)",
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-2">
            <p
              className="font-bold text-base leading-tight"
              style={{
                background: "linear-gradient(135deg, #fff 0%, #c39dff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {selectedNode.label}
            </p>
            <button
              onClick={handleClose}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[#7a5faa] hover:text-white transition-colors"
              style={{ background: "rgba(124,31,255,0.15)" }}
              aria-label="Fechar"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Explanation */}
          <div className="px-5 pb-3 min-h-[3.5rem]">
            {loadingExpl ? (
              <div className="flex items-center gap-2 text-xs text-[#7a5faa]">
                <svg className="animate-spin flex-shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3" />
                  <path d="M12 3a9 9 0 019 9" />
                </svg>
                Gerando explicação...
              </div>
            ) : explanation ? (
              <p className="text-sm text-[#c4a8e8] leading-relaxed">{explanation}</p>
            ) : (
              <p className="text-xs text-[#5c3d8a] italic">Clique em expandir para ver mais.</p>
            )}
          </div>

          {/* Divider */}
          <div className="h-px mx-5" style={{ background: "rgba(124,31,255,0.2)" }} />

          {/* Actions */}
          <div className="flex gap-2 p-3">
            <button
              onClick={handleExpand}
              disabled={!!expandingId}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #7c1fff, #a66aff)",
                boxShadow: "0 2px 12px rgba(124,31,255,0.35)",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Expandir (3 ramos)
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#a78bca] hover:text-white transition-colors"
              style={{ background: "rgba(124,31,255,0.1)", border: "1px solid rgba(124,31,255,0.2)" }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
