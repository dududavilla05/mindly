"use client";

import { useState } from "react";
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

interface HistoryDrawerProps {
  open: boolean;
  onClose: () => void;
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
  mapsLimitReached?: boolean;
  mapsLimit?: number | null;
  mapsToday?: number;
}

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);

export default function HistoryDrawer({
  open,
  onClose,
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
  mapsLimitReached = false,
  mapsLimit,
  mapsToday = 0,
}: HistoryDrawerProps) {
  const [tab, setTab] = useState<"licoes" | "mapas" | "jornadas">("licoes");
  const isMax = plan === "max";

  const handleSelectLesson = (item: LessonHistoryItem) => { onSelectLesson(item); onClose(); };
  const handleSelectMindMap = (item: MindMapItem) => { onSelectMindMap?.(item); onClose(); };
  const handleSelectJourney = (item: JourneyItem) => { onSelectJourney?.(item); onClose(); };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[9990] bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-[9995] md:hidden flex flex-col rounded-t-3xl transition-transform duration-300 ease-out"
        style={{
          background: "rgba(10, 6, 22, 0.98)",
          border: "1px solid rgba(124, 31, 255, 0.2)",
          borderBottom: "none",
          maxHeight: "75vh",
          transform: open ? "translateY(0)" : "translateY(100%)",
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(124,31,255,0.4)" }} />
        </div>

        {/* Tabs */}
        <div className="px-4 pt-2 pb-0 shrink-0 flex items-center gap-2 border-b" style={{ borderColor: "rgba(124,31,255,0.15)" }}>
          <button
            onClick={() => setTab("licoes")}
            className="flex-1 py-2.5 text-xs font-semibold rounded-t-xl transition-colors"
            style={{
              color: tab === "licoes" ? "#c39dff" : "#4a3870",
              borderBottom: tab === "licoes" ? "2px solid #7c1fff" : "2px solid transparent",
            }}
          >
            📚 Lições
          </button>
          <button
            onClick={() => setTab("mapas")}
            className="flex-1 py-2.5 text-xs font-semibold rounded-t-xl transition-colors"
            style={{
              color: tab === "mapas" ? "#c39dff" : "#4a3870",
              borderBottom: tab === "mapas" ? "2px solid #7c1fff" : "2px solid transparent",
            }}
          >
            🗺️ Mapas
          </button>
          <button
            onClick={() => setTab("jornadas")}
            className="flex-1 py-2.5 text-xs font-semibold rounded-t-xl transition-colors"
            style={{
              color: tab === "jornadas" ? "#c39dff" : "#4a3870",
              borderBottom: tab === "jornadas" ? "2px solid #7c1fff" : "2px solid transparent",
            }}
          >
            🧭 Jornadas
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 mb-1 flex items-center justify-center rounded-lg text-white/40 hover:text-white transition-colors"
            style={{ background: "rgba(124,31,255,0.1)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {tab === "licoes" ? (
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
              <p className="text-xs text-center text-white/25 mt-10 px-3 leading-relaxed">
                Suas lições aparecem aqui
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="relative rounded-xl transition-all duration-150 cursor-pointer active:scale-[0.98]"
                    style={{ background: "rgba(124,31,255,0.05)" }}
                    onClick={() => handleSelectLesson(item)}
                    onTouchStart={(e) => (e.currentTarget.style.background = "rgba(124,31,255,0.13)")}
                    onTouchEnd={(e) => (e.currentTarget.style.background = "rgba(124,31,255,0.05)")}
                  >
                    <div className="p-3 pr-8">
                      <p className="text-sm text-white/70 line-clamp-2 leading-snug">{item.subject}</p>
                      <p className="text-[10px] text-white/25 mt-1">{timeAgo(item.created_at)}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteLesson?.(item.id); }}
                      className="absolute top-2 right-2 p-1 text-white/25 hover:text-red-400 active:text-red-400 transition-colors rounded"
                      title="Excluir"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : tab === "mapas" ? (
            /* Mapas tab */
            mapsLimitReached ? (
              <div className="flex flex-col items-center gap-3 mt-10 px-4 text-center">
                <span className="text-3xl">🔒</span>
                <p className="text-sm text-white/60 font-semibold">Limite diário atingido</p>
                <p className="text-xs text-[#7a6a9a]">
                  {mapsLimit != null ? `Você usou ${mapsToday}/${mapsLimit} mapas hoje.` : ""} Volte amanhã ou faça upgrade.
                </p>
                <a href="/planos" className="text-xs text-[#a78bfa] underline" onClick={onClose}>Ver planos</a>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { onNewMindMap?.(); onClose(); }}
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
                      className="flex items-center rounded-xl transition-all"
                      style={{ background: "rgba(124,31,255,0.05)" }}
                    >
                      <div className="flex-1 p-3 cursor-pointer min-w-0 active:scale-[0.98]" onClick={() => handleSelectMindMap(item)}>
                        <p className="text-sm text-white/70 line-clamp-1">{item.title}</p>
                        <p className="text-[10px] text-white/25 mt-1">{timeAgo(item.created_at)}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (window.confirm("Excluir este mapa mental?")) onDeleteMindMap?.(item.id); }}
                        className="shrink-0 p-2 mr-1 text-white/20 hover:text-red-400 active:text-red-400 transition-colors"
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
            /* Jornadas tab */
            !isMax ? (
              <div className="flex flex-col items-center gap-3 mt-10 px-4 text-center">
                <span className="text-3xl">🔒</span>
                <p className="text-sm text-[#7a6a9a]">Jornadas disponíveis no plano Max</p>
                <a href="/planos" className="text-xs text-[#a78bfa] underline" onClick={onClose}>Ver planos</a>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { onNewJourney?.(); onClose(); }}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-[#c39dff] transition-all hover:scale-[1.02]"
                  style={{ background: "rgba(124,31,255,0.12)", border: "1px solid rgba(124,31,255,0.3)" }}
                >
                  + Nova jornada
                </button>
                {journeysLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-xl p-3 flex flex-col gap-2" style={{ background: "rgba(124,31,255,0.06)" }}>
                      <div className="h-2.5 rounded-full shimmer" style={{ background: "rgba(124,31,255,0.18)", width: `${55 + (i % 3) * 12}%` }} />
                      <div className="h-1.5 rounded-full shimmer" style={{ background: "rgba(124,31,255,0.09)", width: "100%" }} />
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
                        className="flex items-center rounded-xl transition-all"
                        style={{ background: "rgba(124,31,255,0.05)" }}
                      >
                        <div
                          className="flex-1 p-3 cursor-pointer min-w-0 flex flex-col gap-2 active:scale-[0.98]"
                          onClick={() => handleSelectJourney(item)}
                          onTouchStart={(e) => ((e.currentTarget.closest("div") as HTMLDivElement).style.background = "rgba(124,31,255,0.13)")}
                          onTouchEnd={(e) => ((e.currentTarget.closest("div") as HTMLDivElement).style.background = "rgba(124,31,255,0.05)")}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm text-white/70 line-clamp-1 flex-1">{item.title}</p>
                            <span className="text-[10px] font-bold shrink-0" style={{ color: pct === 100 ? "#4ade80" : "#a78bca" }}>
                              {pct}%
                            </span>
                          </div>
                          <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(124,31,255,0.15)" }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                background: pct === 100
                                  ? "linear-gradient(90deg, #22c55e, #4ade80)"
                                  : "linear-gradient(90deg, #7c1fff, #a66aff)",
                              }}
                            />
                          </div>
                          <p className="text-[10px] text-white/25">
                            {item.completed_days} de {item.duration_days} dias · {timeAgo(item.created_at)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); if (window.confirm("Excluir esta jornada? Todo o progresso será perdido.")) onDeleteJourney?.(item.id); }}
                          className="shrink-0 p-2 mr-1 text-white/20 hover:text-red-400 active:text-red-400 transition-colors"
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
      </div>
    </>
  );
}
