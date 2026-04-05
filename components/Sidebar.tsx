"use client";

import MindlyLogo from "./MindlyLogo";
import type { LessonHistoryItem } from "@/hooks/useHistory";
import type { MindMapItem } from "@/hooks/useMindMaps";
import type { JourneyItem } from "@/hooks/useJourneys";

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
  onDeleteLesson?: (id: string) => void;
  mindMaps?: MindMapItem[];
  mindMapsLoading?: boolean;
  onSelectMindMap?: (item: MindMapItem) => void;
  onDeleteMindMap?: (id: string) => void;
  onNewMindMap?: () => void;
  journeys?: JourneyItem[];
  journeysLoading?: boolean;
  onSelectJourney?: (item: JourneyItem) => void;
  onDeleteJourney?: (id: string) => void;
  onNewJourney?: () => void;
  plan?: string | null;
  activeTab?: "licoes" | "mapas" | "jornadas";
  onTabChange?: (tab: "licoes" | "mapas" | "jornadas") => void;
  mapsLimitReached?: boolean;
  mapsLimit?: number | null;
  mapsToday?: number;
}

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);

export default function Sidebar({
  history,
  loading,
  onSelectLesson,
  onDeleteLesson,
  mindMaps = [],
  mindMapsLoading = false,
  onSelectMindMap,
  onDeleteMindMap,
  onNewMindMap,
  journeys = [],
  journeysLoading = false,
  onSelectJourney,
  onDeleteJourney,
  onNewJourney,
  plan,
  activeTab = "licoes",
  onTabChange,
  mapsLimitReached = false,
  mapsLimit,
  mapsToday = 0,
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
          className="flex-1 py-2.5 text-[10px] font-semibold transition-colors"
          style={{
            color: activeTab === "licoes" ? "#c39dff" : "#4a3870",
            borderBottom: activeTab === "licoes" ? "2px solid #7c1fff" : "2px solid transparent",
          }}
        >
          📚 Lições
        </button>
        <button
          onClick={() => onTabChange?.("mapas")}
          className="flex-1 py-2.5 text-[10px] font-semibold transition-colors"
          style={{
            color: activeTab === "mapas" ? "#c39dff" : "#4a3870",
            borderBottom: activeTab === "mapas" ? "2px solid #7c1fff" : "2px solid transparent",
          }}
        >
          🗺️ Mapas
        </button>
        <button
          onClick={() => onTabChange?.("jornadas")}
          className="flex-1 py-2.5 text-[10px] font-semibold transition-colors"
          style={{
            color: activeTab === "jornadas" ? "#c39dff" : "#4a3870",
            borderBottom: activeTab === "jornadas" ? "2px solid #7c1fff" : "2px solid transparent",
          }}
        >
          🧭 Jornadas
        </button>
      </div>

      {/* Content — scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {activeTab === "licoes" ? (
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
                <div
                  key={item.id}
                  className="group flex items-center rounded-xl transition-all duration-150"
                  style={{ background: "rgba(124,31,255,0.05)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(124,31,255,0.13)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(124,31,255,0.05)")}
                >
                  <div className="flex-1 p-3 cursor-pointer min-w-0" onClick={() => onSelectLesson(item)}>
                    <p className="text-sm text-white/70 group-hover:text-white line-clamp-2 leading-snug">{item.subject}</p>
                    <p className="text-[10px] text-white/25 mt-1">{timeAgo(item.created_at)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (window.confirm("Excluir esta lição?")) onDeleteLesson?.(item.id); }}
                    className="shrink-0 p-2 mr-1 opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-red-400"
                    title="Excluir"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          )
        ) : activeTab === "mapas" ? (
          mapsLimitReached ? (
            <div className="flex flex-col items-center gap-3 mt-10 px-2 text-center">
              <span className="text-2xl">🔒</span>
              <p className="text-xs text-white/60 font-semibold leading-relaxed">Limite diário atingido</p>
              <p className="text-xs text-[#7a6a9a] leading-relaxed">
                {mapsLimit != null ? `${mapsToday}/${mapsLimit} mapas usados hoje.` : ""} Volte amanhã ou faça upgrade.
              </p>
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
                  <div
                    key={item.id}
                    className="group flex items-center rounded-xl transition-all duration-150"
                    style={{ background: "rgba(124,31,255,0.05)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(124,31,255,0.13)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(124,31,255,0.05)")}
                  >
                    <div className="flex-1 p-3 cursor-pointer min-w-0" onClick={() => onSelectMindMap?.(item)}>
                      <p className="text-sm text-white/70 group-hover:text-white line-clamp-1 leading-snug">{item.title}</p>
                      <p className="text-[10px] text-white/25 mt-1">{timeAgo(item.created_at)}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (window.confirm("Excluir este mapa mental?")) onDeleteMindMap?.(item.id); }}
                      className="shrink-0 p-2 mr-1 opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-red-400"
                      title="Excluir"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))
              )}
            </div>
          )
        ) : (
          /* Aba Jornadas */
          !isMax ? (
            <div className="flex flex-col items-center gap-3 mt-10 px-2 text-center">
              <span className="text-2xl">🔒</span>
              <p className="text-xs text-[#7a6a9a] leading-relaxed">Jornadas disponíveis no plano Max</p>
              <a href="/planos" className="text-xs text-[#a78bfa] underline">Ver planos</a>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={onNewJourney}
                className="w-full py-3 rounded-xl text-sm font-semibold text-[#c39dff] transition-all hover:scale-[1.02]"
                style={{ background: "rgba(124,31,255,0.12)", border: "1px solid rgba(124,31,255,0.3)" }}
              >
                + Nova jornada
              </button>
              {journeysLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl p-3" style={{ background: "rgba(124,31,255,0.06)" }}>
                    <div className="h-2.5 rounded-full mb-1.5 shimmer" style={{ background: "rgba(124,31,255,0.18)", width: "75%" }} />
                    <div className="h-1.5 rounded-full shimmer" style={{ background: "rgba(124,31,255,0.09)", width: "45%" }} />
                  </div>
                ))
              ) : journeys.length === 0 ? (
                <p className="text-xs text-center text-white/25 mt-6">Nenhuma jornada criada</p>
              ) : (
                journeys.map((item) => {
                  const pct = Math.round((item.completed_days / item.duration_days) * 100);
                  return (
                    <div
                      key={item.id}
                      className="group flex items-center rounded-xl transition-all duration-150"
                      style={{ background: "rgba(124,31,255,0.05)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(124,31,255,0.13)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(124,31,255,0.05)")}
                    >
                      <div className="flex-1 p-3 cursor-pointer min-w-0 flex flex-col gap-1.5" onClick={() => onSelectJourney?.(item)}>
                        <p className="text-sm text-white/70 group-hover:text-white line-clamp-1 leading-snug">{item.title}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(124,31,255,0.15)" }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                background: pct === 100 ? "#4ade80" : "linear-gradient(90deg, #7c1fff, #a66aff)",
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-white/30 shrink-0">{pct}%</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (window.confirm("Excluir esta jornada? Todo o progresso será perdido.")) onDeleteJourney?.(item.id); }}
                        className="shrink-0 p-2 mr-1 opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-red-400"
                        title="Excluir"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )
        )}
      </div>
    </aside>
  );
}
