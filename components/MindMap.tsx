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

export default function MindMap({ plan, userId, onBack, initialTopic = "", initialNodes, initialEdges, onSaved, mapsLimitReached = false, mapsLimit, mapsToday = 0, onMapGenerated }: MindMapProps) {
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const mapContainerRef = useRef<HTMLDivElement>(null);

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

  const handleImportFromText = useCallback(async () => {
    if (!importText.trim() || importLoading) return;
    setImportLoading(true);
    setImportError("");
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
      setImportModalOpen(false);
      setImportText("");
      onMapGenerated?.();
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Erro ao gerar mapa");
    } finally {
      setImportLoading(false);
    }
  }, [importText, importLoading, onMapGenerated]);

  const handleNodeClick = useCallback(async (node: MindMapNode) => {
    if (expandingId) return;
    // Se o nó já tem filhos, não chamar a API novamente
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

  const handleSave = useCallback(async () => {
    if (!userId || nodes.length === 0) return;
    setSaving(true);
    setSavedMsg("");
    setSaveIsError(false);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Cliente Supabase não disponível");
      console.log("[MindMap] Salvando mapa:", { userId, title: topic.trim(), nodesCount: nodes.length, edgesCount: edges.length });
      const titleValue = topic.trim() || "Mapa sem título";
      const { error } = await supabase.from("mind_maps").insert({
        user_id: userId,
        title: titleValue,
        topic: titleValue,
        nodes: nodes,
        edges: edges,
      });
      if (error) {
        console.error("[MindMap] Erro Supabase ao salvar:", { code: error.code, message: error.message, details: error.details, hint: error.hint });
        throw new Error(error.message ?? "Erro do banco de dados");
      }
      console.log("[MindMap] Mapa salvo com sucesso.");
      setSavedMsg("Salvo!");
      setSaveIsError(false);
      onSaved?.();
      setTimeout(() => setSavedMsg(""), 2500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? "Erro desconhecido";
      console.error("[MindMap] Falha ao salvar:", e);
      setSavedMsg(msg.length > 35 ? msg.slice(0, 35) + "…" : msg);
      setSaveIsError(true);
    } finally {
      setSaving(false);
    }
  }, [userId, nodes, edges, topic, onSaved]);

  const handleExportPdf = useCallback(async () => {
    if (!mapContainerRef.current || nodes.length === 0) return;
    setExportingPdf(true);

    const container = mapContainerRef.current;
    const svg = container.querySelector("svg") as SVGSVGElement | null;
    if (!svg) { setExportingPdf(false); return; }

    const w = container.offsetWidth;
    const h = container.offsetHeight;

    // Clone SVG — never mutate the live React DOM during async capture
    const svgClone = svg.cloneNode(true) as SVGSVGElement;
    svgClone.setAttribute("width", String(w));
    svgClone.setAttribute("height", String(h));

    // Dark background rect matching app theme
    const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bgRect.setAttribute("x", "0");
    bgRect.setAttribute("y", "0");
    bgRect.setAttribute("width", "100%");
    bgRect.setAttribute("height", "100%");
    bgRect.setAttribute("fill", "#0f0a1e");
    svgClone.insertBefore(bgRect, svgClone.firstChild);

    // ── Fit all nodes into view ────────────────────────────────────────────────
    // 1. Remove the user's current pan/zoom transform from the main group so
    //    node positions are in raw content-space coordinates.
    const mainGroup = svgClone.querySelector(":scope > g") as SVGGElement | null;
    if (mainGroup) mainGroup.removeAttribute("transform");

    // 2. Compute bounding box from every mindmap-node's translate(x,y)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    svgClone.querySelectorAll("g.mindmap-node").forEach(g => {
      const m = (g.getAttribute("transform") ?? "").match(/translate\(([^,]+),\s*([^)]+)\)/);
      if (!m) return;
      const nx = parseFloat(m[1]);
      const ny = parseFloat(m[2]);
      // Conservative half-dimensions: root=160×60 + 14px halo; level1=140×50; level2=120×40
      const hw = 95; // (160/2) + 15
      const hh = 46; // (60/2)  + 16
      minX = Math.min(minX, nx - hw);
      minY = Math.min(minY, ny - hh);
      maxX = Math.max(maxX, nx + hw);
      maxY = Math.max(maxY, ny + hh);
    });

    // 3. Set viewBox so the entire content is visible, with padding
    if (minX < Infinity) {
      const PAD = 55;
      svgClone.setAttribute(
        "viewBox",
        `${minX - PAD} ${minY - PAD} ${maxX - minX + PAD * 2} ${maxY - minY + PAD * 2}`
      );
      svgClone.setAttribute("preserveAspectRatio", "xMidYMid meet");
    }
    // ──────────────────────────────────────────────────────────────────────────

    // Off-screen container below viewport (avoids backdrop-filter compositor issues)
    const tempDiv = document.createElement("div");
    tempDiv.style.cssText = `position:fixed; left:0; top:100vh; width:${w}px; height:${h}px; background:#0f0a1e; overflow:hidden;`;
    tempDiv.appendChild(svgClone);
    document.body.appendChild(tempDiv);

    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(tempDiv, {
        backgroundColor: "#0f0a1e",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdfW = 297;
      const pdfH = 210;
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

      // Dark background
      doc.setFillColor(15, 10, 30);
      doc.rect(0, 0, pdfW, pdfH, "F");

      // Title
      doc.setTextColor(195, 157, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(topic.trim() || "Mapa Mental", pdfW / 2, 12, { align: "center" });

      // Subtitle
      doc.setTextColor(90, 60, 138);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Gerado pelo Mindly · Powered by Claude AI", pdfW / 2, 19, { align: "center" });

      // Imagem do mapa
      const margin = 8;
      const imgAreaY = 24;
      const imgAreaH = pdfH - imgAreaY - margin;
      const imgAreaW = pdfW - margin * 2;
      const imgRatio = canvas.width / canvas.height;
      const areaRatio = imgAreaW / imgAreaH;
      let drawW = imgAreaW;
      let drawH = imgAreaH;
      if (imgRatio > areaRatio) {
        drawH = imgAreaW / imgRatio;
      } else {
        drawW = imgAreaH * imgRatio;
      }
      const drawX = margin + (imgAreaW - drawW) / 2;
      const drawY = imgAreaY + (imgAreaH - drawH) / 2;
      doc.addImage(imgData, "PNG", drawX, drawY, drawW, drawH);

      const slug = (topic.trim() || "mapa-mental").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 40);
      doc.save(`mindly-mapa-${slug}.pdf`);
    } catch (e) {
      console.error("[MindMap PDF]", e);
    } finally {
      document.body.removeChild(tempDiv);
      void document.body.offsetHeight; // force repaint to clear compositor state
      setExportingPdf(false);
    }
  }, [nodes, topic]);

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
          <a
            href="/planos"
            className="px-6 py-3 rounded-xl font-bold text-white transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, #7c1fff, #a66aff)" }}
          >
            Ver planos
          </a>
        )}
        <button onClick={onBack} className="text-sm text-[#7a6a9a] hover:text-white transition-colors">
          ← Voltar
        </button>
      </div>
    );
  }

  return (
    <>
    <div className="relative flex flex-col h-screen overflow-x-hidden" style={{ background: "#0f0a1e" }}>
      <FirstTimeModal
        storageKey="mindly_seen_mindmap"
        icon="🧠"
        title="Mapa Mental com IA"
        description="Transforme qualquer tema em um mapa visual interativo. Clique nos nós para expandir e explorar conexões infinitas."
        buttonText="Entendi, vamos lá!"
      />
      {/* Header */}
      <header
        className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-3 sm:py-4 border-b shrink-0 z-10"
        style={{ background: "rgba(15,10,30,0.95)", borderColor: "rgba(124,31,255,0.2)", backdropFilter: "blur(20px)" }}
      >
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
          <button
            onClick={() => setImportModalOpen(true)}
            title="Gerar mapa a partir de texto"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-sm font-semibold transition-all hover:scale-105 shrink-0"
            style={{ background: "rgba(124,31,255,0.12)", border: "1px solid rgba(124,31,255,0.3)", color: "#c39dff" }}
          >
            📄
          </button>
        </div>

        {nodes.length > 0 && (
          /* Botões — desktop (sm+) */
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

      {/* Canvas */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {loading && (
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

        {nodes.length === 0 && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
            <span className="text-6xl opacity-30">🕸️</span>
            <p className="text-[#7a6a9a] text-sm max-w-xs">
              Digite um tema e clique em "Gerar" para criar seu mapa mental interativo.
              Clique nos nós para expandir.
            </p>
          </div>
        )}

        {nodes.length > 0 && !loading && (
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

      {/* 3-pontinhos flutuante — mobile only, posicionado abaixo do header */}
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
                className="absolute right-0 top-full mt-2 z-50 flex flex-col min-w-[180px] rounded-2xl overflow-hidden"
                style={{ background: "rgba(14,9,28,0.98)", border: "1px solid rgba(124,31,255,0.25)", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}
              >
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
                <button
                  onClick={() => { handleExportPdf(); setMobileMenuOpen(false); }}
                  disabled={exportingPdf}
                  className="flex items-center gap-3 px-5 text-sm font-medium text-[#d4c0f0] hover:bg-white/5 active:bg-white/10 transition-colors disabled:opacity-50"
                  style={{ height: "52px" }}
                >
                  <span className="text-base">📄</span>
                  {exportingPdf ? "Gerando PDF..." : "Exportar PDF"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>

    {/* ── Modal: Gerar mapa a partir de texto ─────────────────────────────── */}
    {importModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => { if (!importLoading) { setImportModalOpen(false); setImportText(""); setImportError(""); } }}
        />
        {/* Panel */}
        <div
          className="relative z-10 w-full max-w-lg rounded-3xl p-6 flex flex-col gap-4 animate-slide-up"
          style={{
            background: "rgba(12,8,25,0.98)",
            border: "1px solid rgba(124,31,255,0.35)",
            boxShadow: "0 8px 60px rgba(124,31,255,0.25)",
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <span className="text-2xl">📄</span>
            <h2 className="text-white font-bold text-lg leading-tight">
              Gerar mapa a partir do seu texto
            </h2>
          </div>

          {/* Textarea */}
          <textarea
            value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder="Cole aqui seu texto, documento, ata de reunião, plano de negócios..."
            rows={8}
            disabled={importLoading}
            className="w-full px-4 py-3 rounded-2xl text-sm text-white placeholder-[#4a3870] outline-none resize-y disabled:opacity-60"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(124,31,255,0.25)",
              lineHeight: "1.6",
              minHeight: "160px",
            }}
            onFocus={e => { e.currentTarget.style.border = "1px solid rgba(124,31,255,0.6)"; }}
            onBlur={e => { e.currentTarget.style.border = "1px solid rgba(124,31,255,0.25)"; }}
          />

          {/* Error */}
          {importError && (
            <p className="text-xs text-red-400 -mt-1">{importError}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleImportFromText}
              disabled={importLoading || !importText.trim()}
              className="flex-1 py-3 rounded-2xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #7c1fff, #a66aff)",
                boxShadow: "0 4px 20px rgba(124,31,255,0.3)",
              }}
            >
              {importLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                    <path d="M12 3a9 9 0 019 9"/>
                  </svg>
                  Gerando mapa...
                </span>
              ) : "Gerar Mapa"}
            </button>
            <button
              onClick={() => { setImportModalOpen(false); setImportText(""); setImportError(""); }}
              disabled={importLoading}
              className="px-5 py-3 rounded-2xl font-semibold text-sm text-[#a78bca] hover:text-white transition-colors disabled:opacity-50"
              style={{ background: "rgba(124,31,255,0.1)", border: "1px solid rgba(124,31,255,0.2)" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
