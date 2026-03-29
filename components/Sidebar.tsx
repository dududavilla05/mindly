"use client";

import MindlyLogo from "./MindlyLogo";
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

interface SidebarProps {
  history: LessonHistoryItem[];
  loading: boolean;
  onSelectLesson: (item: LessonHistoryItem) => void;
}

export default function Sidebar({ history, loading, onSelectLesson }: SidebarProps) {
  return (
    <aside
      className="hidden md:flex flex-col w-60 shrink-0 min-h-screen border-r"
      style={{
        background: "rgba(10, 6, 22, 0.97)",
        borderColor: "rgba(124, 31, 255, 0.15)",
      }}
    >
      {/* Logo */}
      <div
        className="p-4 border-b"
        style={{ borderColor: "rgba(124, 31, 255, 0.15)" }}
      >
        <MindlyLogo size="sm" />
      </div>

      {/* Histórico */}
      <div className="flex-1 overflow-y-auto p-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#7c1fff] mb-3 px-1">
          Histórico
        </p>

        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl p-3"
                style={{ background: "rgba(124,31,255,0.06)" }}
              >
                <div
                  className="h-2.5 rounded-full mb-2 shimmer"
                  style={{
                    background: "rgba(124,31,255,0.18)",
                    width: `${55 + (i % 4) * 10}%`,
                  }}
                />
                <div
                  className="h-2 rounded-full shimmer"
                  style={{
                    background: "rgba(124,31,255,0.09)",
                    width: "35%",
                  }}
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
                onClick={() => onSelectLesson(item)}
                className="text-left w-full rounded-xl p-3 transition-all duration-150 group"
                style={{ background: "rgba(124,31,255,0.05)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(124,31,255,0.13)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "rgba(124,31,255,0.05)")
                }
              >
                <p className="text-sm text-white/70 group-hover:text-white line-clamp-2 leading-snug">
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
    </aside>
  );
}
