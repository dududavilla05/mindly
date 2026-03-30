"use client";

import type { LessonHistoryItem } from "@/hooks/useHistory";

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
}

export default function HistoryDrawer({
  open,
  onClose,
  history,
  loading,
  onSelectLesson,
}: HistoryDrawerProps) {
  const handleSelect = (item: LessonHistoryItem) => {
    onSelectLesson(item);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[9990] bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
      />

      {/* Drawer */}
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
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: "rgba(124,31,255,0.4)" }}
          />
        </div>

        {/* Title */}
        <div
          className="px-5 py-3 border-b shrink-0 flex items-center justify-between"
          style={{ borderColor: "rgba(124,31,255,0.15)" }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#7c3aed]">
            Histórico
          </p>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white transition-colors"
            style={{ background: "rgba(124,31,255,0.1)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl p-3"
                  style={{ background: "rgba(124,31,255,0.06)" }}
                >
                  <div
                    className="h-2.5 rounded-full mb-2 shimmer"
                    style={{ background: "rgba(124,31,255,0.18)", width: `${55 + (i % 4) * 10}%` }}
                  />
                  <div
                    className="h-2 rounded-full shimmer"
                    style={{ background: "rgba(124,31,255,0.09)", width: "35%" }}
                  />
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs text-center text-white/25 mt-10 px-3 leading-relaxed">
              Suas lições geradas aparecem aqui
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="text-left w-full rounded-xl p-3 active:scale-[0.98] transition-all duration-150"
                  style={{ background: "rgba(124,31,255,0.05)" }}
                  onTouchStart={(e) =>
                    (e.currentTarget.style.background = "rgba(124,31,255,0.13)")
                  }
                  onTouchEnd={(e) =>
                    (e.currentTarget.style.background = "rgba(124,31,255,0.05)")
                  }
                >
                  <p className="text-sm text-white/70 line-clamp-2 leading-snug">
                    {item.subject}
                  </p>
                  <p className="text-[10px] text-white/25 mt-1">
                    {timeAgo(item.created_at)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
