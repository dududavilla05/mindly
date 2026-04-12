"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ADMIN_ID = "5e6f4207-8242-41ce-9fdd-092d64237810";
const BRL_RATE = 5.70;

const FEATURE_LABELS: Record<string, string> = {
  lesson:          "Lições",
  lesson_journey:  "Lições (Jornada)",
  lesson_image:    "Lições (Imagem)",
  mindmap_new:     "Mapa Mental (novo)",
  mindmap_text:    "Mapa Mental (texto)",
  mindmap_expand:  "Mapa Mental (expandir)",
  mindmap_explain: "Mapa Mental (explicar)",
  challenge:       "Desafios",
  idiomas:         "Idiomas",
  mentor:          "Mentor",
  journey:         "Jornada (plano)",
};

interface DayData  { date: string; cost: number; }
interface FeatData { feature: string; cost: number; calls: number; input: number; output: number; }
interface CostData {
  today:      number;
  week:       number;
  month:      number;
  allTime:    number;
  totalCalls: number;
  last7Days:  DayData[];
  byFeature:  FeatData[];
  alert:      boolean;
}

function fmt(usd: number) {
  return {
    usd: usd < 0.01 ? `$${usd.toFixed(5)}` : `$${usd.toFixed(4)}`,
    brl: `R$${(usd * BRL_RATE).toFixed(2)}`,
  };
}

function shortDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export default function AdminCostsPage() {
  const router = useRouter();
  const [allowed, setAllowed]   = useState<boolean | null>(null);
  const [data, setData]         = useState<CostData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setAllowed(false); setLoading(false); return; }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || user.id !== ADMIN_ID) {
        setAllowed(false);
        setLoading(false);
        return;
      }
      setAllowed(true);
      fetch("/api/admin/costs")
        .then(r => r.json())
        .then((d: CostData) => { setData(d); setLoading(false); })
        .catch(() => { setError("Erro ao carregar dados."); setLoading(false); });
    });
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f0a1e" }}>
      <div className="text-[#a78bca] text-sm">Carregando...</div>
    </div>
  );

  if (!allowed) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f0a1e" }}>
      <div className="text-center">
        <div className="text-4xl mb-4">🚫</div>
        <p className="text-white font-semibold">Acesso negado</p>
        <p className="text-[#a78bca] text-sm mt-1">Esta página é restrita.</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f0a1e" }}>
      <p className="text-red-400 text-sm">{error ?? "Dados indisponíveis."}</p>
    </div>
  );

  const maxDayCost = Math.max(...data.last7Days.map(d => d.cost), 0.0001);

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: "#0f0a1e", fontFamily: "system-ui, sans-serif" }}>
      <div className="max-w-4xl mx-auto">

        {/* Back button */}
        <button
          onClick={() => router.push("/")}
          className="mb-6 flex items-center gap-2 text-[#a78bca] hover:text-white text-sm transition-colors"
        >
          ← Voltar ao App
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <span className="text-2xl">📊</span>
          <div>
            <h1 className="text-white text-xl font-bold">Monitor de Custos</h1>
            <p className="text-[#6b4fa0] text-xs">API Anthropic — Mindly Admin</p>
          </div>
        </div>

        {/* Alert */}
        {data.alert && (
          <div className="mb-6 p-4 rounded-xl flex items-center gap-3"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <span className="text-lg">⚠️</span>
            <p className="text-red-400 text-sm font-semibold">
              Custo diário acima de $5,00 — verifique o consumo!
            </p>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Hoje",       ...fmt(data.today) },
            { label: "Esta semana",...fmt(data.week) },
            { label: "Este mês",   ...fmt(data.month) },
            { label: "Total geral",...fmt(data.allTime) },
          ].map(({ label, usd, brl }) => (
            <div key={label} className="rounded-xl p-4"
              style={{ background: "rgba(124,31,255,0.08)", border: "1px solid rgba(124,31,255,0.15)" }}>
              <p className="text-[#6b4fa0] text-xs mb-1">{label}</p>
              <p className="text-white font-bold text-lg">{usd}</p>
              <p className="text-[#a78bca] text-xs">{brl}</p>
            </div>
          ))}
        </div>

        {/* Total calls */}
        <div className="mb-8 rounded-xl p-4 inline-block"
          style={{ background: "rgba(124,31,255,0.08)", border: "1px solid rgba(124,31,255,0.15)" }}>
          <p className="text-[#6b4fa0] text-xs">Total de chamadas registradas</p>
          <p className="text-white font-bold text-xl">{data.totalCalls.toLocaleString("pt-BR")}</p>
        </div>

        {/* Last 7 days bar chart */}
        <div className="mb-8 rounded-2xl p-5"
          style={{ background: "rgba(124,31,255,0.06)", border: "1px solid rgba(124,31,255,0.12)" }}>
          <h2 className="text-white text-sm font-semibold mb-4">Últimos 7 dias (USD)</h2>
          <div className="flex items-end gap-2 h-32">
            {data.last7Days.map(({ date, cost }) => {
              const pct = (cost / maxDayCost) * 100;
              const isToday = date === new Date().toISOString().slice(0, 10);
              return (
                <div key={date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-[#a78bca]">{cost > 0 ? `$${cost.toFixed(3)}` : ""}</span>
                  <div className="w-full rounded-t-md transition-all duration-500"
                    style={{
                      height: `${Math.max(pct, cost > 0 ? 4 : 1)}%`,
                      background: isToday
                        ? "linear-gradient(180deg, #fbbf24, #f59e0b)"
                        : "linear-gradient(180deg, #7c1fff, #a66aff)",
                      opacity: cost === 0 ? 0.2 : 1,
                    }} />
                  <span className="text-[10px] text-[#6b4fa0]">{shortDate(date)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* By feature table */}
        <div className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(124,31,255,0.12)" }}>
          <div className="p-4" style={{ background: "rgba(124,31,255,0.06)" }}>
            <h2 className="text-white text-sm font-semibold">Custo por funcionalidade</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "rgba(124,31,255,0.04)", borderBottom: "1px solid rgba(124,31,255,0.1)" }}>
                <th className="text-left px-4 py-2 text-[#6b4fa0] text-xs font-medium">Funcionalidade</th>
                <th className="text-right px-4 py-2 text-[#6b4fa0] text-xs font-medium">Chamadas</th>
                <th className="text-right px-4 py-2 text-[#6b4fa0] text-xs font-medium">Tokens in</th>
                <th className="text-right px-4 py-2 text-[#6b4fa0] text-xs font-medium">Tokens out</th>
                <th className="text-right px-4 py-2 text-[#6b4fa0] text-xs font-medium">USD</th>
                <th className="text-right px-4 py-2 text-[#6b4fa0] text-xs font-medium">BRL</th>
              </tr>
            </thead>
            <tbody>
              {data.byFeature.map(({ feature, cost, calls, input, output }) => (
                <tr key={feature}
                  style={{ borderBottom: "1px solid rgba(124,31,255,0.06)" }}
                  className="hover:bg-[rgba(124,31,255,0.04)] transition-colors">
                  <td className="px-4 py-3 text-white text-xs">
                    {FEATURE_LABELS[feature] ?? feature}
                  </td>
                  <td className="px-4 py-3 text-[#a78bca] text-xs text-right">{calls.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3 text-[#a78bca] text-xs text-right">{input.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3 text-[#a78bca] text-xs text-right">{output.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3 text-[#c39dff] text-xs text-right font-mono">{fmt(cost).usd}</td>
                  <td className="px-4 py-3 text-[#a78bca] text-xs text-right font-mono">{fmt(cost).brl}</td>
                </tr>
              ))}
              {data.byFeature.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#6b4fa0] text-xs">
                    Nenhum registro ainda.
                  </td>
                </tr>
              )}
            </tbody>
            {data.byFeature.length > 0 && (
              <tfoot>
                <tr style={{ background: "rgba(124,31,255,0.06)", borderTop: "1px solid rgba(124,31,255,0.15)" }}>
                  <td className="px-4 py-3 text-white text-xs font-semibold">Total</td>
                  <td className="px-4 py-3 text-[#a78bca] text-xs text-right">
                    {data.byFeature.reduce((s, r) => s + r.calls, 0).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-[#a78bca] text-xs text-right">
                    {data.byFeature.reduce((s, r) => s + r.input, 0).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-[#a78bca] text-xs text-right">
                    {data.byFeature.reduce((s, r) => s + r.output, 0).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-[#c39dff] text-xs text-right font-mono font-semibold">
                    {fmt(data.allTime).usd}
                  </td>
                  <td className="px-4 py-3 text-[#a78bca] text-xs text-right font-mono font-semibold">
                    {fmt(data.allTime).brl}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <p className="text-center text-[#3d2b5e] text-xs mt-8">
          Taxa de câmbio: R${BRL_RATE.toFixed(2)}/USD · Preços Sonnet: $0.000003/token in, $0.000015/token out
        </p>
      </div>
    </div>
  );
}
