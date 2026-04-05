"use client";

import { useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import MindMapViewer from "./MindMapViewer";
import GeneratingOverlay from "./GeneratingOverlay";

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

  const handleNodeClick = useCallback(async (node: MindMapNode) => {
    if (expandingId) return;
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
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(mapContainerRef.current, {
        backgroundColor: "#0f0a1e",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdfW = 297;
      const pdfH = 210;
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

      // Título
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
    <div className="flex flex-col h-screen" style={{ background: "#0f0a1e" }}>
      {/* Header */}
      <header
        className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b shrink-0 z-10"
        style={{ background: "rgba(15,10,30,0.95)", borderColor: "rgba(124,31,255,0.2)", backdropFilter: "blur(20px)" }}
      >
        <button
          onClick={onBack}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-[#a78bca] hover:text-white transition-colors"
          style={{ background: "rgba(124,31,255,0.1)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        <span className="text-lg">🗺️</span>
        <span className="text-white font-semibold text-sm hidden sm:block">Mapa Mental</span>

        <div className="flex-1 flex gap-2">
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === "Enter" && generate()}
            placeholder="Digite um tema..."
            className="flex-1 px-3 py-2 rounded-xl text-sm text-white placeholder-[#4a3870] outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(124,31,255,0.25)" }}
          />
          <button
            onClick={generate}
            disabled={loading || !topic.trim()}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #7c1fff, #a66aff)" }}
          >
            {loading ? "..." : "Gerar"}
          </button>
        </div>

        {nodes.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
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
    </div>
  );
}
