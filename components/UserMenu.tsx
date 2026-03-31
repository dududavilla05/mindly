"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Profile {
  plan: "gratis" | "pro" | "max";
  lessons_today: number;
  streak_days?: number;
}

interface UserMenuProps {
  user: User;
  profile: Profile | null;
  onSignOut: () => void;
}

const PLAN_LABELS: Record<string, string> = {
  gratis: "Grátis",
  pro: "Pro",
  max: "Max",
};

const PLAN_LIMIT: Record<string, number | null> = {
  gratis: 10,
  pro: null,
  max: null,
};

export default function UserMenu({ user, profile, onSignOut }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    onSignOut();
    setOpen(false);
  };

  const initial = user.email?.[0]?.toUpperCase() ?? "U";
  const plan = profile?.plan ?? "gratis";
  const lessonsToday = profile?.lessons_today ?? 0;
  const streakDays = profile?.streak_days ?? 0;
  const limit = PLAN_LIMIT[plan];
  const planLabel = PLAN_LABELS[plan];
  const hasStreak = plan === "pro" || plan === "max";

  const planBadgeStyle =
    plan === "max"
      ? { background: "rgba(251,191,36,0.2)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }
      : plan === "pro"
      ? { background: "rgba(124,31,255,0.3)", color: "#c39dff", border: "1px solid rgba(124,31,255,0.4)" }
      : { background: "rgba(255,255,255,0.08)", color: "#a78bca", border: "1px solid rgba(255,255,255,0.1)" };

  return (
    <div className="relative">
      {/* Botão do avatar */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
        style={{ background: "rgba(124,31,255,0.12)", border: "1px solid rgba(124,31,255,0.2)" }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{ background: "linear-gradient(135deg, #7c1fff, #a66aff)" }}
        >
          {initial}
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={planBadgeStyle}>
          {planLabel}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6b4fa0"
          strokeWidth="2.5"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <>
          {/* Overlay para fechar */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div
            className="absolute right-0 top-12 z-50 w-68 rounded-2xl p-4 flex flex-col gap-3 animate-fade-in"
            style={{
              background: "rgba(12,8,25,0.98)",
              border: "1px solid rgba(124,31,255,0.3)",
              boxShadow: "0 8px 30px rgba(124,31,255,0.2)",
            }}
          >
            {/* Usuário */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold text-white shrink-0"
                style={{ background: "linear-gradient(135deg, #7c1fff, #a66aff)" }}
              >
                {initial}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">{user.email}</p>
                <p className="text-[#a78bca] text-xs">Plano {planLabel}</p>
              </div>
            </div>

            {/* Streak */}
            <div
              className="rounded-xl p-3 flex items-center justify-between"
              style={{ background: "rgba(124,31,255,0.08)", border: "1px solid rgba(124,31,255,0.15)" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🔥</span>
                <div>
                  <p className="text-xs font-semibold text-white">
                    {hasStreak ? `${streakDays} ${streakDays === 1 ? "dia" : "dias"} seguidos` : "Streak"}
                  </p>
                  <p className="text-[10px] text-[#7a6a9a]">
                    {hasStreak ? "Continue assim!" : "Disponível no Pro"}
                  </p>
                </div>
              </div>
              {!hasStreak ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5c3d8a" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              ) : (
                <span
                  className="text-lg font-black"
                  style={{ color: streakDays >= 7 ? "#f59e0b" : "#a78bfa" }}
                >
                  {streakDays}
                </span>
              )}
            </div>

            {/* Contador de lições (apenas plano grátis) */}
            {limit !== null && (
              <div
                className="rounded-xl p-3"
                style={{ background: "rgba(124,31,255,0.08)", border: "1px solid rgba(124,31,255,0.15)" }}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-[#a78bca]">Lições hoje</span>
                  <span
                    className="text-xs font-bold"
                    style={{ color: lessonsToday >= limit ? "#ef4444" : "#c39dff" }}
                  >
                    {lessonsToday}/{limit}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((lessonsToday / limit) * 100, 100)}%`,
                      background:
                        lessonsToday >= limit
                          ? "#ef4444"
                          : lessonsToday >= limit * 0.8
                          ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                          : "linear-gradient(90deg, #7c1fff, #a66aff)",
                    }}
                  />
                </div>
                {lessonsToday >= limit && (
                  <p className="text-xs text-red-400 mt-1.5">Limite atingido. Volta amanhã!</p>
                )}
              </div>
            )}

            {/* Upgrade (plano grátis) */}
            {plan === "gratis" && (
              <Link
                href="/planos"
                onClick={() => setOpen(false)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(135deg, rgba(124,31,255,0.3), rgba(166,106,255,0.2))",
                  border: "1px solid rgba(124,31,255,0.35)",
                  color: "#c39dff",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                Fazer upgrade para Pro
              </Link>
            )}

            {/* Ranking */}
            <Link
              href="/ranking"
              onClick={() => setOpen(false)}
              className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 hover:text-white"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#a78bca",
              }}
            >
              🏆 Ranking semanal
            </Link>

            {/* Sair */}
            <button
              onClick={handleSignOut}
              className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 hover:text-white"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#6b4fa0",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sair da conta
            </button>
          </div>
        </>
      )}
    </div>
  );
}
