import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const metadata: Metadata = {
  title: "Ranking Semanal — Mindly",
};

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain || local.length <= 2) return email;
  return `${local[0]}${local[1]}***@${domain}`;
}

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default async function RankingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const adminSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Semana atual (domingo)
  const now = new Date();
  const brasiliaTime = new Date(now.getTime() + (-3 * 60 - now.getTimezoneOffset()) * 60000);
  const weekStart = new Date(brasiliaTime);
  weekStart.setDate(brasiliaTime.getDate() - brasiliaTime.getDay());
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const { data: ranking } = await adminSupabase
    .from("weekly_ranking")
    .select("user_id, email, lessons_count")
    .eq("week_start", weekStartStr)
    .order("lessons_count", { ascending: false })
    .limit(10);

  const rows = ranking ?? [];

  return (
    <div className="min-h-screen bg-[#0f0a1e] text-white">
      <div className="max-w-xl mx-auto px-6 py-16">
        <Link href="/" className="text-[#a78bfa] text-sm hover:underline mb-8 inline-block">
          ← Voltar
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🏆</span>
          <h1 className="text-3xl font-bold">Ranking Semanal</h1>
        </div>
        <p className="text-[#7a6a9a] text-sm mb-10">
          Top 10 usuários com mais lições geradas essa semana
        </p>

        {rows.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center text-[#7a6a9a]"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(124,31,255,0.15)" }}
          >
            Nenhuma lição gerada essa semana ainda. Seja o primeiro!
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((row, index) => {
              const position = index + 1;
              const isCurrentUser = user?.id === row.user_id;
              const medal = MEDALS[position];

              return (
                <div
                  key={row.user_id}
                  className="flex items-center gap-4 rounded-2xl px-5 py-4 transition-all duration-200"
                  style={{
                    background: isCurrentUser
                      ? "rgba(124,31,255,0.18)"
                      : "rgba(255,255,255,0.04)",
                    border: isCurrentUser
                      ? "1px solid rgba(124,31,255,0.45)"
                      : "1px solid rgba(124,31,255,0.12)",
                    boxShadow: isCurrentUser ? "0 0 20px rgba(124,31,255,0.15)" : "none",
                  }}
                >
                  {/* Posição */}
                  <div className="w-8 text-center shrink-0">
                    {medal ? (
                      <span className="text-2xl">{medal}</span>
                    ) : (
                      <span className="text-sm font-bold text-[#7a6a9a]">#{position}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ background: "linear-gradient(135deg, #7c1fff, #a66aff)" }}
                  >
                    {row.email?.[0]?.toUpperCase() ?? "?"}
                  </div>

                  {/* Email */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {maskEmail(row.email)}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-[#a78bfa] font-semibold">você</span>
                      )}
                    </p>
                  </div>

                  {/* Contagem */}
                  <div className="text-right shrink-0">
                    <p className="text-lg font-black" style={{ color: position === 1 ? "#fbbf24" : "#a78bfa" }}>
                      {row.lessons_count}
                    </p>
                    <p className="text-[10px] text-[#7a6a9a]">lições</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-[#4a3870] mt-8">
          Ranking reseta todo domingo às 00h
        </p>
      </div>
    </div>
  );
}
