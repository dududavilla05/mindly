"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import MindlyLogo from "./MindlyLogo";

const DEFAULT_PHASES = [
  "Analisando seu tema...",
  "Gerando conteúdo personalizado...",
  "Organizando as ideias...",
  "Adicionando exemplos práticos...",
  "Quase pronto...",
];

const PARTICLES = [
  { size: 6,  top: "12%", left: "8%",  animation: "animate-float",      delay: "0s" },
  { size: 4,  top: "20%", right: "10%", animation: "animate-float-alt", delay: "0.6s" },
  { size: 8,  top: "70%", left: "6%",  animation: "animate-float-slow",  delay: "1.1s" },
  { size: 5,  top: "78%", right: "8%", animation: "animate-float",       delay: "0.3s" },
  { size: 3,  top: "40%", left: "3%",  animation: "animate-float-alt",   delay: "1.8s" },
  { size: 6,  top: "55%", right: "4%", animation: "animate-float-slow",  delay: "0.9s" },
  { size: 4,  top: "30%", left: "18%", animation: "animate-float",       delay: "2.2s" },
  { size: 3,  top: "85%", left: "35%", animation: "animate-float-alt",   delay: "1.4s" },
];

interface GeneratingOverlayProps {
  phases?: string[];
}

export default function GeneratingOverlay({ phases = DEFAULT_PHASES }: GeneratingOverlayProps) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [textVisible, setTextVisible] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTextVisible(false);
      setTimeout(() => {
        setPhaseIndex((i) => (i + 1) % phases.length);
        setTextVisible(true);
      }, 350);
    }, 2200);
    return () => clearInterval(interval);
  }, [phases]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="flex items-center justify-center animate-fade-in"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 99999,
        background: "rgba(8,4,20,0.93)",
        backdropFilter: "blur(14px)",
      }}
    >
      {/* Orbs de fundo */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none opacity-20"
        style={{
          top: "-20%", left: "-15%",
          background: "radial-gradient(circle, #7c1fff 0%, transparent 65%)",
          filter: "blur(60px)",
          animation: "pulse 4s ease-in-out infinite",
        }}
      />
      <div
        className="absolute w-96 h-96 rounded-full pointer-events-none opacity-15"
        style={{
          bottom: "-15%", right: "-10%",
          background: "radial-gradient(circle, #a66aff 0%, transparent 65%)",
          filter: "blur(60px)",
          animation: "pulse 5s ease-in-out infinite 1s",
        }}
      />
      <div
        className="absolute w-64 h-64 rounded-full pointer-events-none opacity-10"
        style={{
          top: "40%", right: "20%",
          background: "radial-gradient(circle, #c39dff 0%, transparent 65%)",
          filter: "blur(50px)",
          animation: "pulse 3.5s ease-in-out infinite 0.5s",
        }}
      />

      {/* Partículas flutuantes */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className={`absolute rounded-full pointer-events-none ${p.animation}`}
          style={{
            width: p.size,
            height: p.size,
            top: p.top,
            left: "left" in p ? p.left : undefined,
            right: "right" in p ? p.right : undefined,
            animationDelay: p.delay,
            background: i % 2 === 0
              ? "rgba(124,31,255,0.8)"
              : "rgba(166,106,255,0.7)",
            boxShadow: `0 0 ${p.size * 2}px rgba(124,31,255,0.6)`,
          }}
        />
      ))}

      {/* Card central */}
      <div
        className="relative flex flex-col items-center gap-7 px-8 py-10 rounded-3xl mx-4 w-full max-w-xs"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(124,31,255,0.4)",
          boxShadow: "0 0 60px rgba(124,31,255,0.25), 0 0 120px rgba(124,31,255,0.1)",
        }}
      >
        {/* Anel pulsante ao redor do logo */}
        <div className="relative flex items-center justify-center">
          <div
            className="absolute rounded-full animate-pulse-ring"
            style={{
              width: 96, height: 96,
              background: "rgba(124,31,255,0.2)",
              border: "1px solid rgba(124,31,255,0.5)",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: 80, height: 80,
              background: "rgba(124,31,255,0.1)",
              animation: "pulseRing 2s ease-in-out infinite 0.4s",
            }}
          />
          <div className="relative z-10" style={{ animation: "pulse 2.5s ease-in-out infinite" }}>
            <MindlyLogo size="sm" />
          </div>
        </div>

        {/* Texto rotativo */}
        <div className="flex flex-col items-center gap-2 min-h-[3rem]">
          <p
            className="text-base font-semibold text-center text-[#c39dff] transition-all duration-350"
            style={{
              opacity: textVisible ? 1 : 0,
              transform: textVisible ? "translateY(0)" : "translateY(6px)",
              transition: "opacity 0.35s ease, transform 0.35s ease",
            }}
          >
            {PHASES[phaseIndex]}
          </p>
        </div>

        {/* Três pontinhos animados */}
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full animate-bounce-dot"
              style={{
                background: "linear-gradient(135deg, #7c1fff, #a66aff)",
                animationDelay: `${i * 0.22}s`,
              }}
            />
          ))}
        </div>

        {/* Barra de progresso shimmer */}
        <div
          className="w-full h-1 rounded-full overflow-hidden"
          style={{ background: "rgba(124,31,255,0.15)" }}
        >
          <div
            className="h-full rounded-full shimmer"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(124,31,255,0.8) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
            }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
