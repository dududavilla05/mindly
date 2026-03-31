"use client";

import MindlyLogo from "./MindlyLogo";
import type { LessonHistoryItem } from "@/hooks/useHistory";
import type { MindMapItem } from "@/hooks/useMindMaps";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}m atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

interface SidebarProps {
  history: LessonHistoryItem[];
  loading: boolean;
  onSelectLesson: (item: LessonHistoryItem) => void;
  mindMaps?: MindMapItem[];
  mindMapsLoading?: boolean;
  onSelectMindMap?: (item: MindMapItem) => void;
  onNewMindMap?: () => void;
  plan?: string | null;
  activeTab?: "licoes" | "mapas";
  onTabChange?: (tab: "licoes" | "mapas") => void;
}

export default function Sidebar({
  history,
  loading,
  onSelectLesson,
  mindMaps = [],
  mindMapsLoading = false,
  onSelectMindMap,
  onNewMindMap,
  plan,
  activeTab = "licoes",
  onTabChange,
}: SidebarProps) {
  const isMax = plan === "max";

  return (
    <aside
      className="hidden md:flex flex-col w-60 shrink-0 h-screen sticky top-0 border-r"
      style={{
        background: "rgba(10, 6, 22, 0.97)",
        borderColor: "rgba(124, 31, 255, 0.15)",
      }}
    >
      {/* Logo */}
      <div className="p-4 border-b shrink-0" style={{ borderColor: "rgba(124, 31, 255, 0.15)" }}>
        <MindlyLogo size="sm" />
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 border-b" style={{ borderColor: "rgba(124,31,255,0.15)" }}>
        <button
          onClick={() => onTabChange?.("licoes")}
          className="flex-1 py-2.5 text-[11px] font-semibold transition-colors"
          style={{
            color: activeTab === "licoes" ? "#c39dff" : "#4a3870",
            borderBottom: activeTab === "licoes" ? "2px solid #7c1fff" : "2px solid transparent",
          }}
        >
          📚 Lições
        </button>
        <button
          onClick={() => onTabChange?.("mapas")}
          className="flex-1 py-2.5 text-[11px] font-semibold transition-colors"
          style={{
            color: activeTab === "mapas" ? "#c39dff" : "#4a3870",
            borderBottom: activeTab === "mapas" ? "2px solid #7c1fff" : "2px solid transparent",
          }}
        >
          🗺️ Mapas
        </button>
      </div>

      {/* Content — scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {activeTab === "licoes" ? (
          /* Aba Lições */
          loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl p-3" style={{ background: "rgba(124,31,255,0.06)" }}>
                  <div className="h-2.5 rounded-full mb-2 shimmer" style={{ background: "rgba(124,31,255,0.18)", width: `${55 + (i % 4) * 10}%` }} />
                  <div className="h-2 rounded-full shimmer" style={{ background: "rgba(124,31,255,0.09)", width: "35%" }} />
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs text-center text-white/25 mt-6 px-3 leading-relaxed">
              Suas lições aparecem aqui
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectLesson(item)}
                  className="text-left w-full rounded-xl p-3 transition-all duration-150 group"
                  style={{ background: "rgba(124,31,255,0.05)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(124,31,255,0.13)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(124,31,255,0.05)")}
                >
                  <p className="text-sm text-white/70 group-hover:text-white line-clamp-2 leading-snug">{item.subject}</p>
                  <p className="text-[10px] text-white/25 mt-1">{timeAgo(item.created_at)}</p>
                </button>
              ))}
            </div>
          )
        ) : (
          /* Aba Mapas */
          !isMax ? (
            <div className="flex flex-col items-center gap-3 mt-10 px-2 text-center">
              <span className="text-2xl">🔒</span>
              <p className="text-xs text-[#7a6a9a] leading-relaxed">Mapas Mentais disponíveis no plano Max</p>
              <a href="/planos" className="text-xs text-[#a78bfa] underline">Ver planos</a>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={onNewMindMap}
                className="w-full py-3 rounded-xl text-sm font-semibold text-[#c39dff] transition-all hover:scale-[1.02]"
                style={{ background: "rgba(124,31,255,0.12)", border: "1px solid rgba(124,31,255,0.3)" }}
              >
                + Novo mapa mental
              </button>
              {mindMapsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl p-3" style={{ background: "rgba(124,31,255,0.06)" }}>
                    <div className="h-2.5 rounded-full shimmer" style={{ background: "rgba(124,31,255,0.18)", width: "70%" }} />
                  </div>
                ))
              ) : mindMaps.length === 0 ? (
                <p className="text-xs text-center text-white/25 mt-6">Nenhum mapa salvo</p>
              ) : (
                mindMaps.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSelectMindMap?.(item)}
                    className="text-left w-full rounded-xl p-3 transition-all duration-150 group"
                    style={{ background: "rgba(124,31,255,0.05)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(124,31,255,0.13)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(124,31,255,0.05)")}
                  >
                    <p className="text-sm text-white/70 group-hover:text-white line-clamp-1 leading-snug">{item.title}</p>
                    <p className="text-[10px] text-white/25 mt-1">{timeAgo(item.created_at)}</p>
                  </button>
                ))
              )}
            </div>
          )
        )}
      </div>
    </aside>
  );
}
