"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import MindMapViewer from "./MindMapViewer";

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
}

export default function MindMap({ plan, userId, onBack, initialTopic = "", initialNodes, initialEdges, onSaved }: MindMapProps) {
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar mapa");
    } finally {
      setLoading(false);
    }
  }, [topic, loading]);

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
      const { error } = await supabase.from("mind_maps").insert({
        user_id: userId,
        title: topic.trim() || "Mapa sem título",
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

  if (!isMax) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-6" style={{ background: "#0f0a1e" }}>
        <span className="text-5xl">🗺️</span>
        <h2 className="text-2xl font-bold text-white text-center">Mapa Mental com IA</h2>
        <p className="text-[#a78bca] text-center max-w-sm">
          O Mapa Mental é exclusivo para usuários do plano <strong className="text-white">Max</strong>.
          Visualize e expanda conhecimento de forma interativa.
        </p>
        <a
          href="/planos"
          className="px-6 py-3 rounded-xl font-bold text-white transition-all hover:scale-105"
          style={{ background: "linear-gradient(135deg, #7c1fff, #a66aff)" }}
        >
          Ver planos
        </a>
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
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105 disabled:opacity-50 shrink-0"
            style={{
              background: saveIsError ? "rgba(239,68,68,0.12)" : savedMsg && !saveIsError ? "rgba(34,197,94,0.12)" : "rgba(124,31,255,0.15)",
              border: `1px solid ${saveIsError ? "rgba(239,68,68,0.35)" : savedMsg && !saveIsError ? "rgba(34,197,94,0.35)" : "rgba(124,31,255,0.3)"}`,
              color: saveIsError ? "#fca5a5" : savedMsg && !saveIsError ? "#86efac" : "#c39dff",
            }}
          >
            {saving ? "Salvando…" : saveIsError ? "❌ " + savedMsg : savedMsg ? "✓ " + savedMsg : "💾 Salvar"}
          </button>
        )}
      </header>

      {/* Canvas */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
            <div className="w-12 h-12 rounded-full border-2 border-[#7c1fff] border-t-transparent animate-spin" />
            <p className="text-[#a78bca] text-sm">Gerando mapa mental...</p>
          </div>
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
          <MindMapViewer
            nodes={nodes}
            edges={edges}
            onNodeClick={handleNodeClick}
            expandingId={expandingId}
          />
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
