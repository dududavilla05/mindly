"use client";

import { useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import MindMapViewer from "./MindMapViewer";
import GeneratingOverlay from "./GeneratingOverlay";
import FirstTimeModal from "./FirstTimeModal";

export interface MindMapNode {
  id: string;
  label: string;
  level: number;
  parentId: string | null;
}

export interface MindMapEdge {
  source: string;
  target: string;
}

interface MindMapProps {
  plan?: string | null;
  userId?: string;
  onBack: () => void;
  initialTopic?: string;
  initialNodes?: MindMapNode[];
  initialEdges?: MindMapEdge[];
  onSaved?: () => void;
  mapsLimitReached?: boolean;
  mapsLimit?: number | null;
  mapsToday?: number;
  onMapGenerated?: () => void;
}

// ── SVG capture helper (pure — no React deps) ─────────────────────────────────
// Clones live SVG, strips pan/zoom transform, adds dark bg, fits viewBox to nodes.
function buildSvgClone(svg: SVGSVGElement): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement;

  const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bgRect.setAttribute("x", "0"); bgRect.setAttribute("y", "0");
  bgRect.setAttribute("width", "100%"); bgRect.setAttribute("height", "100%");
  bgRect.setAttribute("fill", "#0f0a1e");
  clone.insertBefore(bgRect, clone.firstChild);

  const mainGroup = clone.querySelector(":scope > g") as SVGGElement | null;
  if (mainGroup) mainGroup.removeAttribute("transform");

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  clone.querySelectorAll("g.mindmap-node").forEach(g => {
    const m = (g.getAttribute("transform") ?? "").match(/translate\(([^,]+),\s*([^)]+)\)/);
    if (!m) return;
    const nx = parseFloat(m[1]), ny = parseFloat(m[2]);
    minX = Math.min(minX, nx - 95); minY = Math.min(minY, ny - 46);
    maxX = Math.max(maxX, nx + 95); maxY = Math.max(maxY, ny + 46);
  });

  if (minX < Infinity) {
    const PAD = 60;
    clone.setAttribute("viewBox", `${minX - PAD} ${minY - PAD} ${maxX - minX + PAD * 2} ${maxY - minY + PAD * 2}`);
    clone.setAttribute("preserveAspectRatio", "xMidYMid meet");
  }
  return clone;
}

export default function MindMap({
  plan, userId, onBack, initialTopic = "", initialNodes, initialEdges,
  onSaved, mapsLimitReached = false, mapsLimit, mapsToday = 0, onMapGenerated,
}: MindMapProps) {
  const isMax = plan === "max";
  const [topic, setTopic] = useState(initialTopic);
  const [nodes, setNodes] = useState<MindMapNode[]>(initialNodes ?? []);
  const [edges, setEdges] = useState<MindMapEdge[]>(initialEdges ?? []);
  const [loading, setLoading] = useState(false);
  const [expandingId, setExpandingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [saveIsError, setSaveIsError] = useState(false);
  const [error, setError] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingImage, setExportingImage] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Input mode: "tema" = single keyword topic | "texto" = paste long text
  const [inputMode, setInputMode] = useState<"tema" | "texto">("tema");
  const [importText, setImportText] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // ── Generate from topic ──────────────────────────────────────────────────────
  const generate = useCallback(async () => {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setError("");
    setNodes([]);
    setEdges([]);
    try {
      const res = await fetch("/api/mindmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar");
      setNodes(data.nodes ?? []);
      setEdges(data.edges ?? []);
      onMapGenerated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar mapa");
    } finally {
      setLoading(false);
    }
  }, [topic, loading, onMapGenerated]);

  // ── Generate from pasted text ────────────────────────────────────────────────
  const handleImportFromText = useCallback(async () => {
    if (!importText.trim() || importLoading) return;
    setImportLoading(true);
    setImportError("");
    setNodes([]);
    setEdges([]);
    try {
      const res = await fetch("/api/mindmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromText: true, text: importText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar mapa");
      const rootNode = (data.nodes as MindMapNode[])?.find(n => n.level === 0);
      if (rootNode) setTopic(rootNode.label);
      setNodes(data.nodes ?? []);
      setEdges(data.edges ?? []);
      setImportText("");
      setInputMode("tema"); // volta ao modo tema após gerar
      onMapGenerated?.();
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Erro ao gerar mapa");
    } finally {
      setImportLoading(false);
    }
  }, [importText, importLoading, onMapGenerated]);

  // ── Expand node ──────────────────────────────────────────────────────────────
  const handleNodeClick = useCallback(async (node: MindMapNode) => {
    if (expandingId) return;
    if (nodes.some(n => n.parentId === node.id)) return;
    setExpandingId(node.id);
    setError("");
    try {
      const res = await fetch("/api/mindmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), nodeId: node.id, nodeLabel: node.label, nodeLevel: node.level }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao expandir");
      const newNodes: MindMapNode[] = data.nodes ?? [];
      const newEdges: MindMapEdge[] = data.edges ?? [];
      const existingIds = new Set(nodes.map(n => n.id));
      setNodes(prev => [...prev, ...newNodes.filter(n => !existingIds.has(n.id))]);
      setEdges(prev => [...prev, ...newEdges]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao expandir nó");
    } finally {
      setExpandingId(null);
    }
  }, [expandingId, topic, nodes]);

  // ── Save to Supabase ─────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!userId || nodes.length === 0) return;
    setSaving(true);
    setSavedMsg("");
    setSaveIsError(false);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Cliente Supabase não disponível");
      const titleValue = topic.trim() || "Mapa sem título";
      const { error } = await supabase.from("mind_maps").insert({
        user_id: userId, title: titleValue, topic: titleValue, nodes, edges,
      });
      if (error) throw new Error(error.message ?? "Erro do banco de dados");
      setSavedMsg("Salvo!");
      setSaveIsError(false);
      onSaved?.();
      setTimeout(() => setSavedMsg(""), 2500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? "Erro desconhecido";
      setSavedMsg(msg.length > 35 ? msg.slice(0, 35) + "…" : msg);
      setSaveIsError(true);
    } finally {
      setSaving(false);
    }
  }, [userId, nodes, edges, topic, onSaved]);

  // ── Shared SVG → canvas renderer ─────────────────────────────────────────────
  // Renders a fixed-size off-screen canvas regardless of current viewport size.
  const renderExportCanvas = useCallback(async (exportW: number, exportH: number, scale: number): Promise<HTMLCanvasElement | null> => {
    const container = mapContainerRef.current;
    if (!container) return null;
    const svg = container.querySelector("svg") as SVGSVGElement | null;
    if (!svg) return null;

    const svgClone = buildSvgClone(svg);
    svgClone.setAttribute("width", String(exportW));
    svgClone.setAttribute("height", String(exportH));

    const tempDiv = document.createElement("div");
    tempDiv.style.cssText = `position:fixed;left:0;top:100vh;width:${exportW}px;height:${exportH}px;background:#0f0a1e;overflow:hidden;`;
    tempDiv.appendChild(svgClone);
    document.body.appendChild(tempDiv);

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(tempDiv, { backgroundColor: "#0f0a1e", scale, useCORS: true, logging: false });
      document.body.removeChild(tempDiv);
      void document.body.offsetHeight;
      return canvas;
    } catch {
      document.body.removeChild(tempDiv);
      void document.body.offsetHeight;
      return null;
    }
  }, []);

  // ── Export PDF (desktop + mobile) ────────────────────────────────────────────
  const handleExportPdf = useCallback(async () => {
    if (nodes.length === 0) return;
    setExportingPdf(true);
    try {
      // Fixed landscape canvas avoids the portrait-viewport-in-landscape-PDF bug
      const canvas = await renderExportCanvas(1920, 1080, 1.5);
      if (!canvas) throw new Error("Falha ao capturar mapa");

      const imgData = canvas.toDataURL("image/png");
      const { jsPDF } = await import("jspdf");

      const pdfW = 297, pdfH = 210;
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

      doc.setFillColor(15, 10, 30);
      doc.rect(0, 0, pdfW, pdfH, "F");

      doc.setTextColor(195, 157, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(topic.trim() || "Mapa Mental", pdfW / 2, 12, { align: "center" });

      doc.setTextColor(90, 60, 138);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Gerado pelo Mindly · Powered by Claude AI", pdfW / 2, 19, { align: "center" });

      const margin = 8, imgAreaY = 24;
      const imgAreaH = pdfH - imgAreaY - margin;
      const imgAreaW = pdfW - margin * 2;
      const imgRatio = canvas.width / canvas.height;
      const areaRatio = imgAreaW / imgAreaH;
      let drawW = imgAreaW, drawH = imgAreaH;
      if (imgRatio > areaRatio) drawH = imgAreaW / imgRatio;
      else drawW = imgAreaH * imgRatio;
      const drawX = margin + (imgAreaW - drawW) / 2;
      const drawY = imgAreaY + (imgAreaH - drawH) / 2;
      doc.addImage(imgData, "PNG", drawX, drawY, drawW, drawH);

      const slug = (topic.trim() || "mapa-mental").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 40);
      doc.save(`mindly-mapa-${slug}.pdf`);
    } catch (e) {
      console.error("[MindMap PDF]", e);
    } finally {
      setExportingPdf(false);
    }
  }, [nodes, topic, renderExportCanvas]);

  // ── Export Image — PNG + Web Share API (mobile gallery) ──────────────────────
  const handleExportImage = useCallback(async () => {
    if (nodes.length === 0) return;
    setExportingImage(true);
    try {
      // Square canvas: ideal for sharing to gallery / social
      const canvas = await renderExportCanvas(1080, 1080, 2);
      if (!canvas) throw new Error("Falha ao capturar mapa");

      const slug = (topic.trim() || "mapa-mental").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 40);
      const fileName = `mindly-mapa-${slug}.png`;

      const pngBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
      if (!pngBlob) throw new Error("Falha ao gerar imagem");

      const file = new File([pngBlob], fileName, { type: "image/png" });
      const canShare = typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });

      if (canShare) {
        try {
          await navigator.share({
            files: [file],
            title: topic.trim() || "Mapa Mental",
            text: "Mapa mental gerado pelo Mindly · Powered by Claude AI",
          });
        } catch {
          // User cancelled — silent fallback to download
          const url = URL.createObjectURL(pngBlob);
          const a = document.createElement("a");
          a.href = url; a.download = fileName; a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      } else {
        const url = URL.createObjectURL(pngBlob);
        const a = document.createElement("a");
        a.href = url; a.download = fileName; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (e) {
      console.error("[MindMap Image]", e);
    } finally {
      setExportingImage(false);
    }
  }, [nodes, topic, renderExportCanvas]);

  // ── Limit wall ───────────────────────────────────────────────────────────────
  if (mapsLimitReached) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-6" style={{ background: "#0f0a1e" }}>
        <span className="text-5xl">🔒</span>
        <h2 className="text-2xl font-bold text-white text-center">Limite diário atingido</h2>
        <p className="text-[#a78bca] text-center max-w-sm">
          {mapsLimit != null
            ? `Você usou ${mapsToday} de ${mapsLimit} mapas mentais hoje.`
            : "Limite diário de mapas atingido."}{" "}
          {!isMax && "Faça upgrade para criar mais mapas ou volte amanhã."}
        </p>
        {!isMax && (
          <a href="/planos" className="px-6 py-3 rounded-xl font-bold text-white transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, #7c1fff, #a66aff)" }}>
            Ver planos
          </a>
        )}
        <button onClick={onBack} className="text-sm text-[#7a6a9a] hover:text-white transition-colors">
          ← Voltar
        </button>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="relative flex flex-col h-screen overflow-x-hidden" style={{ background: "#0f0a1e" }}>
      <FirstTimeModal
        storageKey="mindly_seen_mindmap"
        icon="🧠"
        title="Mapa Mental com IA"
        description="Transforme qualquer tema em um mapa visual interativo. Clique nos nós para expandir e explorar conexões infinitas."
        buttonText="Entendi, vamos lá!"
      />

      {/* ── Header ── */}
      <header
        className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2 sm:py-3 border-b shrink-0 z-10"
        style={{ background: "rgba(15,10,30,0.95)", borderColor: "rgba(124,31,255,0.2)", backdropFilter: "blur(20px)" }}
      >
        {/* Back */}
        <button
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-[#a78bca] hover:text-white transition-colors shrink-0"
          style={{ background: "rgba(124,31,255,0.1)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        <span className="text-base sm:text-lg shrink-0">🗺️</span>
        <span className="text-white font-semibold text-sm hidden sm:block shrink-0">Mapa Mental</span>

        {/* ── Input area: "Por Tema" vs "Por Texto" ── */}
        {inputMode === "tema" ? (
          /* ── Tema mode: single-line input (keeps header height unchanged) ── */
          <div className="flex-1 min-w-0 flex gap-1.5 sm:gap-2">
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === "Enter" && generate()}
              placeholder="Digite um tema..."
              className="flex-1 min-w-0 px-2.5 sm:px-3 py-2 rounded-xl text-sm text-white placeholder-[#4a3870] outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(124,31,255,0.25)" }}
            />
            <button
              onClick={generate}
              disabled={loading || !topic.trim()}
              className="px-3 sm:px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              style={{ background: "linear-gradient(135deg, #7c1fff, #a66aff)" }}
            >
              {loading ? "..." : "Gerar"}
            </button>
            {/* Mode switch: clearly labeled, descriptive tooltip */}
            <button
              onClick={() => setInputMode("texto")}
              title="Gerar mapa a partir de um texto ou anotação — cole qualquer texto longo e a IA cria o mapa"
              className="flex items-center gap-1 px-2 sm:px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105 shrink-0"
              style={{ background: "rgba(124,31,255,0.12)", border: "1px solid rgba(124,31,255,0.3)", color: "#c39dff" }}
            >
              <span>📝</span>
              <span className="hidden xs:inline sm:inline">Texto</span>
            </button>
          </div>
        ) : (
          /* ── Texto mode: inline textarea, no separate modal needed ── */
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="flex gap-1.5">
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder="Cole seu texto, anotações ou resumo — a IA gera o mapa automaticamente"
                rows={2}
                disabled={importLoading}
                className="flex-1 min-w-0 px-2.5 sm:px-3 py-1.5 rounded-xl text-sm text-white placeholder-[#4a3870] outline-none resize-none disabled:opacity-60"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(124,31,255,0.3)", lineHeight: "1.5" }}
              />
              <button
                onClick={handleImportFromText}
                disabled={importLoading || !importText.trim()}
                className="px-3 sm:px-4 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 self-end py-2"
                style={{ background: "linear-gradient(135deg, #7c1fff, #a66aff)" }}
              >
                {importLoading ? "..." : "Gerar"}
              </button>
            </div>
            {/* Switch back + inline error */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => { setInputMode("tema"); setImportError(""); }}
                className="flex items-center gap-1 text-xs text-[#7a5faa] hover:text-[#c39dff] transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Por Tema
              </button>
              {importError && <p className="text-xs text-red-400 truncate">{importError}</p>}
            </div>
          </div>
        )}

        {/* Desktop action buttons (sm+) */}
        {nodes.length > 0 && (
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105 disabled:opacity-50"
              style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399" }}
              title="Exportar PDF"
            >
              {exportingPdf ? "Gerando…" : "📄 PDF"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105 disabled:opacity-50"
              style={{
                background: saveIsError ? "rgba(239,68,68,0.12)" : savedMsg && !saveIsError ? "rgba(34,197,94,0.12)" : "rgba(124,31,255,0.15)",
                border: `1px solid ${saveIsError ? "rgba(239,68,68,0.35)" : savedMsg && !saveIsError ? "rgba(34,197,94,0.35)" : "rgba(124,31,255,0.3)"}`,
                color: saveIsError ? "#fca5a5" : savedMsg && !saveIsError ? "#86efac" : "#c39dff",
              }}
            >
              {saving ? "Salvando…" : saveIsError ? "❌ " + savedMsg : savedMsg ? "✓ " + savedMsg : "💾 Salvar"}
            </button>
          </div>
        )}
      </header>

      {/* ── Canvas ── */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {(loading || importLoading) && (
          <GeneratingOverlay phases={[
            "Mapeando conexões...",
            "Organizando os conceitos...",
            "Criando os nós...",
            "Estruturando o mapa...",
            "Quase pronto...",
          ]} />
        )}

        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-xl text-sm text-red-300"
            style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
            {error}
          </div>
        )}

        {nodes.length === 0 && !loading && !importLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
            <span className="text-6xl opacity-30">🕸️</span>
            <p className="text-[#7a6a9a] text-sm max-w-xs">
              Digite um tema e clique em "Gerar", ou use{" "}
              <span className="text-[#a78bca]">📝 Texto</span> para gerar a partir
              de qualquer anotação, resumo ou documento.
            </p>
          </div>
        )}

        {nodes.length > 0 && !loading && !importLoading && (
          <div ref={mapContainerRef} className="animate-fade-in w-full h-full">
            <MindMapViewer
              nodes={nodes}
              edges={edges}
              onNodeClick={handleNodeClick}
              expandingId={expandingId}
              topic={topic}
            />
          </div>
        )}

        {expandingId && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs text-[#a78bca]"
            style={{ background: "rgba(124,31,255,0.2)", border: "1px solid rgba(124,31,255,0.3)" }}>
            Expandindo nó...
          </div>
        )}
      </div>

      {/* ── 3-dot floating menu — mobile only ── */}
      {nodes.length > 0 && (
        <div className="absolute flex sm:hidden" style={{ top: "76px", right: "12px", zIndex: 40 }}>
          <button
            onClick={() => setMobileMenuOpen(v => !v)}
            className="flex items-center justify-center rounded-xl text-[#c39dff]"
            style={{ width: "44px", height: "44px", background: "rgba(14,9,28,0.92)", border: "1px solid rgba(124,31,255,0.35)", boxShadow: "0 4px 16px rgba(0,0,0,0.5)", backdropFilter: "blur(12px)" }}
            aria-label="Mais opções"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5"  r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="12" cy="19" r="1.8" />
            </svg>
          </button>

          {mobileMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMobileMenuOpen(false)} />
              <div
                className="absolute right-0 top-full mt-2 z-50 flex flex-col min-w-[200px] rounded-2xl overflow-hidden"
                style={{ background: "rgba(14,9,28,0.98)", border: "1px solid rgba(124,31,255,0.25)", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}
              >
                {/* Salvar */}
                <button
                  onClick={() => { handleSave(); setMobileMenuOpen(false); }}
                  disabled={saving}
                  className="flex items-center gap-3 px-5 text-sm font-medium text-[#d4c0f0] hover:bg-white/5 active:bg-white/10 transition-colors disabled:opacity-50"
                  style={{ height: "52px" }}
                >
                  <span className="text-base">💾</span>
                  {saving ? "Salvando..." : saveIsError ? "Erro ao salvar" : savedMsg ? "✓ Salvo!" : "Salvar mapa"}
                </button>

                <div style={{ borderTop: "1px solid rgba(124,31,255,0.12)" }} />

                {/* Salvar PDF */}
                <button
                  onClick={() => { handleExportPdf(); setMobileMenuOpen(false); }}
                  disabled={exportingPdf}
                  className="flex items-center gap-3 px-5 text-sm font-medium text-[#d4c0f0] hover:bg-white/5 active:bg-white/10 transition-colors disabled:opacity-50"
                  style={{ height: "52px" }}
                >
                  <span className="text-base">📄</span>
                  {exportingPdf ? "Gerando PDF..." : "Salvar PDF"}
                </button>

                <div style={{ borderTop: "1px solid rgba(124,31,255,0.12)" }} />

                {/* Salvar na Galeria */}
                <button
                  onClick={() => { handleExportImage(); setMobileMenuOpen(false); }}
                  disabled={exportingImage}
                  className="flex items-center gap-3 px-5 text-sm font-medium text-[#d4c0f0] hover:bg-white/5 active:bg-white/10 transition-colors disabled:opacity-50"
                  style={{ height: "52px" }}
                >
                  <span className="text-base">📷</span>
                  {exportingImage ? "Gerando imagem..." : "Salvar na Galeria"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
