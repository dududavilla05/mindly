"use client";

import { useEffect, useRef, useState } from "react";

interface OnboardingModalProps {
  onComplete: () => void;
  onViewPlans: () => void;
}

const SLIDES = [
  {
    icon: null, // usa a logo
    title: "Bem-vindo ao Mindly! 🧠",
    subtitle: "Seu assistente de aprendizado com IA",
    cta: "Começar",
  },
  {
    icon: "📖",
    title: "Aprenda qualquer coisa",
    subtitle: "Digite um tema e a IA gera uma lição completa e personalizada em segundos",
    cta: "Próximo",
  },
  {
    icon: "🗺️",
    title: "Visualize e planeje",
    subtitle: "Crie mapas mentais interativos e jornadas de aprendizado de 7, 15 ou 30 dias",
    cta: "Próximo",
  },
  {
    icon: "👑",
    title: "Escolha seu plano",
    subtitle: "Comece grátis com 10 lições por dia. Faça upgrade para Pro ou Max para recursos ilimitados.",
    cta: null, // dois botões
  },
];

export default function OnboardingModal({ onComplete, onViewPlans }: OnboardingModalProps) {
  const [step, setStep]         = useState(0);
  const [exiting, setExiting]   = useState(false);
  const [direction, setDir]     = useState<1 | -1>(1);
  const canvasRef               = useRef<HTMLCanvasElement>(null);

  // Partículas no canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    type P = { x: number; y: number; r: number; vx: number; vy: number; o: number };
    const pts: P[] = Array.from({ length: 55 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.6 + 0.3,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      o: Math.random() * 0.4 + 0.07,
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;  if (p.x > canvas.width)  p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167,139,250,${p.o})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  const goTo = (next: number, dir: 1 | -1 = 1) => {
    setDir(dir);
    setExiting(true);
    setTimeout(() => {
      setStep(next);
      setExiting(false);
    }, 260);
  };

  const handleNext = () => {
    if (step < SLIDES.length - 1) goTo(step + 1, 1);
  };

  const slide = SLIDES[step];
  const slideDir = exiting ? (direction === 1 ? -1 : 1) : 1;

  return (
    <>
      <style>{`
        @keyframes ob-in  { from { opacity: 0; transform: translateX(calc(var(--dir) * 48px)); } to { opacity: 1; transform: translateX(0); } }
        @keyframes ob-out { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(calc(var(--dir) * -48px)); } }
        .ob-slide {
          animation: ob-in 0.26s cubic-bezier(0.4,0,0.2,1) both;
          --dir: 1;
        }
        .ob-slide-exit {
          animation: ob-out 0.26s cubic-bezier(0.4,0,0.2,1) both;
          --dir: 1;
        }
        .ob-slide[data-dir="-1"]      { --dir: -1; }
        .ob-slide-exit[data-dir="-1"] { --dir: -1; }
      `}</style>

      <div
        className="fixed inset-0 z-[99998] flex flex-col items-center justify-center overflow-hidden"
        style={{ background: "rgba(7,6,15,0.97)" }}
      >
        {/* Partículas */}
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

        {/* Glow central */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: "420px", height: "420px", borderRadius: "50%",
            background: "radial-gradient(ellipse at center, rgba(124,58,237,0.18) 0%, transparent 70%)",
          }}
        />

        {/* Pontos de progresso */}
        <div className="absolute top-8 flex gap-2 z-10">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? "20px" : "6px",
                height: "6px",
                borderRadius: "999px",
                background: i === step ? "#7c3aed" : "rgba(124,58,237,0.3)",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>

        {/* Conteúdo do slide */}
        <div
          key={step}
          className={exiting ? "ob-slide-exit" : "ob-slide"}
          data-dir={String(slideDir)}
          style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", padding: "0 32px", maxWidth: "400px", width: "100%", textAlign: "center" }}
        >
          {/* Ícone ou logo */}
          {step === 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/icons/logo-final.png"
              alt="Mindly"
              style={{ width: "100px", height: "100px", objectFit: "contain" }}
            />
          ) : (
            <div
              style={{
                width: "88px", height: "88px", borderRadius: "28px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "42px",
                background: "rgba(124,58,237,0.15)",
                border: "1px solid rgba(124,58,237,0.3)",
              }}
            >
              {slide.icon}
            </div>
          )}

          {/* Título */}
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#ffffff", lineHeight: 1.2, margin: 0 }}>
            {slide.title}
          </h1>

          {/* Subtítulo */}
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: 0 }}>
            {slide.subtitle}
          </p>

          {/* Botões */}
          {step < SLIDES.length - 1 ? (
            <button
              onClick={handleNext}
              style={{
                marginTop: "8px",
                width: "100%", padding: "14px",
                borderRadius: "16px",
                fontWeight: 700, fontSize: "16px", color: "#ffffff",
                background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
                border: "none", cursor: "pointer",
                boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
              }}
            >
              {slide.cta}
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", marginTop: "8px" }}>
              <button
                onClick={onComplete}
                style={{
                  width: "100%", padding: "14px",
                  borderRadius: "16px",
                  fontWeight: 700, fontSize: "15px", color: "#ffffff",
                  background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
                  border: "none", cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
                }}
              >
                Continuar grátis
              </button>
              <button
                onClick={() => { onViewPlans(); onComplete(); }}
                style={{
                  width: "100%", padding: "13px",
                  borderRadius: "16px",
                  fontWeight: 600, fontSize: "15px", color: "#c4b5fd",
                  background: "rgba(124,58,237,0.12)",
                  border: "1px solid rgba(124,58,237,0.35)",
                  cursor: "pointer",
                }}
              >
                Ver planos
              </button>
            </div>
          )}
        </div>

        {/* Skip */}
        {step < SLIDES.length - 1 && (
          <button
            onClick={onComplete}
            className="absolute bottom-8"
            style={{ fontSize: "13px", color: "rgba(255,255,255,0.25)", background: "none", border: "none", cursor: "pointer" }}
          >
            Pular
          </button>
        )}
      </div>
    </>
  );
}
