"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import MindlyLogo from "@/components/MindlyLogo";
import Link from "next/link";

interface PlanFeature {
  text: string;
  soon?: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: string;
  annualBilling: string | null;
  description: string;
  emoji: string;
  priceId: string | null;
  features: PlanFeature[];
  cta: string;
  highlight: boolean;
  badge?: string;
  trialBadge?: string;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Grátis",
    price: "R$0",
    annualBilling: null,
    description: "Comece a aprender hoje sem pagar nada.",
    emoji: "🌱",
    priceId: null,
    features: [
      { text: "10 lições por dia" },
      { text: "3 mapas mentais por dia" },
      { text: "Histórico das últimas 20 lições" },
      { text: "Exportar lição em PDF" },
      { text: "Streak visível" },
    ],
    cta: "Começar grátis",
    highlight: false,
  },
  {
    id: "pro",
    name: "Mindly Pro",
    price: "R$26,99",
    annualBilling: "R$323,88/ano",
    description: "Para quem quer aprender sem limites.",
    emoji: "⚡",
    priceId: "price_1TGozXHKVKk7mpMh5PZHlrL8",
    features: [
      { text: "Lições ilimitadas" },
      { text: "10 mapas mentais por dia" },
      { text: "Histórico completo de lições" },
      { text: "Exportar lição em PDF" },
      { text: "Streak + ranking semanal" },
{ text: "Certificados de conclusão", soon: true },
      { text: "Lembretes de estudo", soon: true },
    ],
    cta: "Iniciar 7 dias grátis",
    highlight: true,
    badge: "Mais popular",
    trialBadge: "7 dias grátis",
  },
  {
    id: "max",
    name: "Mindly Max",
    price: "R$48,99",
    annualBilling: "R$587,88/ano",
    description: "A experiência completa de aprendizado com IA.",
    emoji: "🚀",
    priceId: "price_1TGp07HKVKk7mpMh8ORNG6Iq",
    features: [
      { text: "Tudo do Pro" },
      { text: "Modo Mentor (chat com IA)" },
      { text: "Mapa Mental ilimitado" },
      { text: "Relatório semanal de evolução", soon: true },
      { text: "Jornada de Aprendizado" },
      { text: "Modo Desafio", soon: true },
      { text: "Badge exclusivo no ranking", soon: true },
      { text: "Acesso antecipado a novidades" },
    ],
    cta: "Iniciar 7 dias grátis",
    highlight: false,
    trialBadge: "7 dias grátis",
  },
];

function PlanosContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    if (searchParams.get("sucesso") === "true") {
      setToast({ type: "success", msg: "Assinatura confirmada! Bem-vindo ao Mindly Pro 🎉" });
      router.replace("/planos");
    } else if (searchParams.get("cancelado") === "true") {
      setToast({ type: "error", msg: "Pagamento cancelado. Você pode tentar novamente a qualquer momento." });
      router.replace("/planos");
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const handleSubscribe = async (priceId: string, planId: string) => {
    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err) {
      setToast({
        type: "error",
        msg: err instanceof Error ? err.message : "Erro ao iniciar pagamento.",
      });
      setLoadingPlan(null);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Background orbs */}
      <div
        className="orb w-[500px] h-[500px] -top-32 -left-40 opacity-20"
        style={{ background: "radial-gradient(circle, #7c1fff 0%, transparent 70%)" }}
      />
      <div
        className="orb w-96 h-96 bottom-0 -right-20 opacity-15"
        style={{ background: "radial-gradient(circle, #a66aff 0%, transparent 70%)" }}
      />

      {/* Header */}
      <header
        className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-5 border-b border-[rgba(124,31,255,0.15)]"
        style={{ background: "rgba(15,10,30,0.8)", backdropFilter: "blur(20px)" }}
      >
        <Link href="/">
          <MindlyLogo size="sm" />
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#c39dff] hover:text-white transition-colors"
          style={{ background: "rgba(124,31,255,0.1)", border: "1px solid rgba(124,31,255,0.2)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Voltar
        </Link>
      </header>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl transition-all animate-slide-up ${
            toast.type === "success" ? "text-emerald-300" : "text-red-300"
          }`}
          style={{
            background: toast.type === "success" ? "rgba(16,185,129,0.15)" : "rgba(220,38,38,0.15)",
            border: `1px solid ${toast.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(220,38,38,0.3)"}`,
            backdropFilter: "blur(12px)",
          }}
        >
          {toast.type === "success" ? "✅" : "⚠️"} {toast.msg}
        </div>
      )}

      {/* Main content */}
      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-12 flex flex-col items-center gap-10">

        {/* Heading */}
        <div className="text-center flex flex-col items-center gap-3 max-w-xl animate-fade-in">
          <span
            className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-[#c39dff]"
            style={{ background: "rgba(124,31,255,0.15)", border: "1px solid rgba(124,31,255,0.3)" }}
          >
            Planos e Preços
          </span>
          <h1
            className="text-4xl sm:text-5xl font-black leading-tight"
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, #c39dff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Invista no seu aprendizado
          </h1>
          <p className="text-[#a78bca] text-base leading-relaxed">
            Escolha o plano ideal para você e comece a aprender qualquer coisa com o poder da IA.
          </p>
        </div>

        {/* Cards */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-5 animate-slide-up">
          {PLANS.map((plan) => {
            const isFree = plan.id === "free";

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-3xl p-6 gap-5 transition-transform duration-200 hover:-translate-y-1 ${
                  plan.highlight ? "ring-2 ring-[#7c1fff]" : ""
                }`}
                style={
                  plan.highlight
                    ? {
                        background: "linear-gradient(160deg, rgba(124,31,255,0.25) 0%, rgba(166,106,255,0.1) 100%)",
                        border: "1px solid rgba(124,31,255,0.5)",
                        boxShadow: "0 0 40px rgba(124,31,255,0.2)",
                      }
                    : {
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }
                }
              >
                {/* Badges */}
                {(plan.badge || plan.trialBadge) && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 whitespace-nowrap">
                    {plan.badge && (
                      <div
                        className="px-4 py-1 rounded-full text-xs font-bold text-white"
                        style={{ background: "linear-gradient(135deg, #7c1fff, #a66aff)" }}
                      >
                        {plan.badge}
                      </div>
                    )}
                    {plan.trialBadge && (
                      <div
                        className="px-3 py-1 rounded-full text-xs font-bold text-white"
                        style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}
                      >
                        {plan.trialBadge}
                      </div>
                    )}
                  </div>
                )}

                {/* Plan header */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{plan.emoji}</span>
                    <span className={`font-bold text-base ${plan.highlight ? "text-white" : "text-[#c39dff]"}`}>
                      {plan.name}
                    </span>
                  </div>
                  <p className="text-[#7a6a9a] text-sm leading-relaxed">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-end gap-1">
                    <span
                      className="text-4xl font-black"
                      style={
                        plan.highlight
                          ? {
                              background: "linear-gradient(135deg, #fff 0%, #c39dff 100%)",
                              WebkitBackgroundClip: "text",
                              WebkitTextFillColor: "transparent",
                              backgroundClip: "text",
                            }
                          : { color: "white" }
                      }
                    >
                      {plan.price}
                    </span>
                    {!isFree && <span className="text-[#7a6a9a] text-sm mb-1.5">/mês</span>}
                    {isFree && <span className="text-[#7a6a9a] text-sm mb-1.5">para sempre</span>}
                  </div>
                  {!isFree && plan.trialBadge && (
                    <span
                      className="self-start px-2 py-0.5 rounded-md text-[11px] font-bold"
                      style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.35)", color: "#34d399" }}
                    >
                      ✨ {plan.trialBadge}
                    </span>
                  )}
                  {!isFree && plan.annualBilling && (
                    <p className="text-xs text-[#7a6a9a]">cobrado {plan.annualBilling}</p>
                  )}
                  {!isFree && (
                    <p className="text-xs text-[#a78bfa]">Parcelado em até 12x no cartão</p>
                  )}
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-[#3d1f6e] to-transparent" />

                {/* Features */}
                <div className="flex flex-col gap-2.5 flex-1">
                  {plan.features.map((f) => (
                    <div key={f.text} className="flex items-start gap-2.5">
                      <div
                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                        style={{ background: "rgba(124,31,255,0.25)" }}
                      >
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#a66aff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <span className="text-[#d4c0f0] text-sm flex items-center gap-2 flex-wrap">
                        {f.text}
                        {f.soon && (
                          <span
                            className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide"
                            style={{
                              background: "rgba(124,31,255,0.2)",
                              border: "1px solid rgba(124,31,255,0.35)",
                              color: "#a78bfa",
                            }}
                          >
                            Em breve
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                {plan.priceId ? (
                  <button
                    onClick={() => handleSubscribe(plan.priceId!, plan.id)}
                    disabled={loadingPlan === plan.id}
                    className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all duration-150 ${
                      plan.highlight
                        ? "hover:scale-[1.02] active:scale-[0.98]"
                        : "hover:opacity-90"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    style={
                      plan.highlight
                        ? {
                            background: "linear-gradient(135deg, #7c1fff, #a66aff)",
                            boxShadow: "0 4px 20px rgba(124,31,255,0.4)",
                            color: "white",
                          }
                        : {
                            background: "rgba(124,31,255,0.15)",
                            border: "1px solid rgba(124,31,255,0.3)",
                            color: "#c39dff",
                          }
                    }
                  >
                    {loadingPlan === plan.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                          <path d="M12 3a9 9 0 019 9"/>
                        </svg>
                        Redirecionando...
                      </span>
                    ) : plan.cta}
                  </button>
                ) : (
                  <Link
                    href="/"
                    className="w-full py-3.5 rounded-2xl font-bold text-sm text-center transition-all duration-150 hover:opacity-90"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#a78bca",
                    }}
                  >
                    {plan.cta}
                  </Link>
                )}
                {plan.priceId && (
                  <p className="text-center text-[11px] text-[#5c3d8a]">
                    7 dias grátis · Cancele quando quiser, sem multa
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-6 text-xs text-[#5c3d8a] animate-fade-in">
          {[
            { icon: "🔒", text: "Pagamento 100% seguro via Stripe" },
            { icon: "🔄", text: "Cancele quando quiser" },
            { icon: "💳", text: "Cartão de crédito ou débito" },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-1.5">
              <span>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function PlanosPage() {
  return (
    <Suspense>
      <PlanosContent />
    </Suspense>
  );
}
