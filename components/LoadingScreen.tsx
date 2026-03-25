"use client";

import MindlyLogo from "./MindlyLogo";

export default function LoadingScreen({ subject }: { subject: string }) {
  const tips = [
    "Analisando o tema...",
    "Estruturando a lição...",
    "Criando exemplos práticos...",
    "Finalizando seu conteúdo...",
  ];

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* Background orbs */}
      <div
        className="orb w-96 h-96 top-[-100px] left-[-150px] opacity-30 animate-pulse-slow"
        style={{ background: "radial-gradient(circle, #7c1fff 0%, transparent 70%)" }}
      />
      <div
        className="orb w-80 h-80 bottom-[-80px] right-[-100px] opacity-20 animate-pulse-slow"
        style={{ background: "radial-gradient(circle, #a66aff 0%, transparent 70%)" }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm">
        {/* Logo */}
        <MindlyLogo size="md" />

        {/* Animated brain / loader */}
        <div className="relative w-24 h-24">
          {/* Outer ring */}
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{
              background: "conic-gradient(from 0deg, #7c1fff, #a66aff, transparent, transparent)",
              mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
              WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
            }}
          />
          {/* Inner circle */}
          <div
            className="absolute inset-3 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(124,31,255,0.3) 0%, rgba(166,106,255,0.2) 100%)",
              border: "1px solid rgba(124,31,255,0.4)",
            }}
          >
            <span className="text-3xl animate-pulse-slow">🧠</span>
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-white font-bold text-lg">
            Preparando sua lição
          </p>
          {subject && (
            <div
              className="px-4 py-2 rounded-full text-sm font-medium text-[#c39dff]"
              style={{
                background: "rgba(124,31,255,0.15)",
                border: "1px solid rgba(124,31,255,0.25)",
              }}
            >
              &ldquo;{subject}&rdquo;
            </div>
          )}
          <p className="text-[#5c3d8a] text-sm">
            A IA está criando uma experiência personalizada para você
          </p>
        </div>

        {/* Shimmer placeholder cards */}
        <div className="w-full flex flex-col gap-3">
          {[80, 60, 90, 50].map((width, i) => (
            <div
              key={i}
              className="h-3 rounded-full shimmer"
              style={{
                width: `${width}%`,
                marginLeft: i % 2 === 1 ? "auto" : "0",
              }}
            />
          ))}
        </div>

        {/* Cycling tips */}
        <p className="text-xs text-[#5c3d8a] animate-pulse-slow">
          {tips[Math.floor(Date.now() / 1000) % tips.length]}
        </p>
      </div>
    </div>
  );
}
