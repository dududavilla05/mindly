"use client";

import Link from "next/link";

interface UpgradeModalProps {
  onClose: () => void;
}

const PRO_FEATURES = [
  "Lições ilimitadas por dia",
  "Upload de imagens para aprender",
  "Todos os temas disponíveis",
  "Histórico completo de lições",
  "Sem anúncios",
];

export default function UpgradeModal({ onClose }: UpgradeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-3xl p-8 flex flex-col gap-6 text-center animate-slide-up"
        style={{
          background: "rgba(12, 8, 25, 0.98)",
          border: "1px solid rgba(124, 31, 255, 0.35)",
          boxShadow: "0 20px 60px rgba(124, 31, 255, 0.3)",
        }}
      >
        {/* Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-[#5c3d8a] hover:text-white hover:bg-white/10 transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Ícone */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: "linear-gradient(135deg, rgba(124,31,255,0.3), rgba(166,106,255,0.2))", border: "1px solid rgba(124,31,255,0.3)" }}
          >
            🚀
          </div>
          <div
            className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: "rgba(255,165,0,0.15)", border: "1px solid rgba(255,165,0,0.3)", color: "#fbbf24" }}
          >
            LIMITE DIÁRIO ATINGIDO
          </div>
        </div>

        {/* Título */}
        <div>
          <h2 className="text-xl font-bold text-white">
            Você usou suas 10 lições de hoje!
          </h2>
          <p className="text-[#a78bca] text-sm mt-2 leading-relaxed">
            O plano gratuito permite <strong className="text-[#c39dff]">10 lições por dia</strong>.
            Volte amanhã ou assine o Pro para aprender sem limites.
          </p>
        </div>

        {/* Features */}
        <div
          className="rounded-2xl p-4 text-left flex flex-col gap-2.5"
          style={{ background: "rgba(124,31,255,0.08)", border: "1px solid rgba(124,31,255,0.2)" }}
        >
          <p className="text-[#c39dff] text-xs font-bold uppercase tracking-widest mb-1">
            Mindly Pro inclui
          </p>
          {PRO_FEATURES.map((feature) => (
            <div key={feature} className="flex items-center gap-2.5">
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(124,31,255,0.3)" }}
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#a66aff" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="text-white text-sm">{feature}</span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Link
            href="/planos"
            onClick={onClose}
            className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, #7c1fff 0%, #a66aff 100%)",
              boxShadow: "0 4px 20px rgba(124,31,255,0.5)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Ver planos — a partir de R$26,99/mês
          </Link>
          <button
            onClick={onClose}
            className="text-[#5c3d8a] text-sm hover:text-[#a78bca] transition-colors py-1"
          >
            Voltar amanhã com mais 10 lições grátis
          </button>
        </div>
      </div>
    </div>
  );
}
