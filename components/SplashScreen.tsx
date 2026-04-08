"use client";

import { useEffect, useRef, useState } from "react";

export default function SplashScreen() {
  const [visible,   setVisible]   = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [done,      setDone]      = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Controle de duração — igual ao original (4 s exibição + 600 ms fade out)
  useEffect(() => {
    if (sessionStorage.getItem("mindly_splash")) { setDone(true); return; }
    setVisible(true);
    const t1 = setTimeout(() => setFadingOut(true), 4000);
    const t2 = setTimeout(() => { sessionStorage.setItem("mindly_splash", "1"); setDone(true); }, 4600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Partículas no canvas
  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    type Particle = { x: number; y: number; r: number; vx: number; vy: number; opacity: number };
    const particles: Particle[] = Array.from({ length: 65 }, () => ({
      x:       Math.random() * window.innerWidth,
      y:       Math.random() * window.innerHeight,
      r:       Math.random() * 1.8 + 0.4,
      vx:      (Math.random() - 0.5) * 0.25,
      vy:      (Math.random() - 0.5) * 0.25,
      opacity: Math.random() * 0.45 + 0.08,
    }));

    let rafId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0)             p.x = canvas.width;
        if (p.x > canvas.width)  p.x = 0;
        if (p.y < 0)             p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167,139,250,${p.opacity})`;
        ctx.fill();
      }
      rafId = requestAnimationFrame(draw);
    };
    draw();

    return () => { cancelAnimationFrame(rafId); window.removeEventListener("resize", resize); };
  }, [visible]);

  if (done || !visible) return null;

  return (
    <>
      <style>{`
        .sp-root {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: #07060f;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          transition: opacity 600ms ease;
        }

        /* Canvas de partículas cobre a tela inteira */
        .sp-canvas {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        /* Glow pulsante no centro */
        .sp-glow {
          position: absolute;
          width: 340px;
          height: 340px;
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(124,58,237,0.28) 0%, transparent 70%);
          animation: sp-glow-pulse 2.4s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes sp-glow-pulse {
          0%, 100% { transform: scale(1);    opacity: 0.7; }
          50%       { transform: scale(1.18); opacity: 1;   }
        }

        /* Conteúdo central */
        .sp-content {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          opacity: 0;
          transform: scale(0.88);
          animation: sp-content-in 0.7s cubic-bezier(0.34, 1.4, 0.64, 1) 0.2s forwards;
        }
        @keyframes sp-content-in {
          to { opacity: 1; transform: scale(1); }
        }
        @media (min-width: 768px) {
          .sp-content { gap: 8px; }
        }

        /* Logo — tamanhos controlados via style inline no elemento */
        .sp-logo {
          object-fit: contain;
        }

        /* Título com gradiente de texto */
        .sp-title {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 38px;
          font-weight: 800;
          line-height: 1;
          letter-spacing: -0.02em;
          background: linear-gradient(120deg, #7c3aed 0%, #ffffff 50%, #c4b5fd 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Tagline */
        .sp-tagline {
          font-size: 12px;
          font-weight: 400;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          margin-top: -4px;
        }

        /* Barra de progresso */
        .sp-progress-wrap {
          position: absolute;
          bottom: 48px;
          left: 50%;
          transform: translateX(-50%);
          width: 160px;
          height: 2px;
          background: rgba(255,255,255,0.06);
          border-radius: 999px;
          overflow: hidden;
        }
        .sp-progress-bar {
          height: 100%;
          width: 0%;
          border-radius: 999px;
          background: linear-gradient(90deg, #7c3aed, #a78bfa);
          animation: sp-progress 3s cubic-bezier(0.4, 0, 0.2, 1) 0.3s forwards;
        }
        @keyframes sp-progress {
          0%   { width: 0%; }
          85%  { width: 95%; }
          100% { width: 100%; }
        }

        @media (max-width: 767px) {
          .sp-glow    { width: 260px; height: 260px; }
          .sp-title   { font-size: 32px; }
          .sp-tagline { letter-spacing: 3px; }
        }
      `}</style>

      <div className="sp-root" style={{ opacity: fadingOut ? 0 : 1 }}>
        <canvas ref={canvasRef} className="sp-canvas" />
        <div className="sp-glow" />

        <div className="sp-content">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/logo-final.png"
            alt="Mindly"
            className="sp-logo"
            style={{
              width:  typeof window !== "undefined" && window.innerWidth >= 768 ? "400px" : "88px",
              height: typeof window !== "undefined" && window.innerWidth >= 768 ? "400px" : "88px",
            }}
          />
          <span className="sp-title">Mindly</span>
          <p className="sp-tagline">Aprenda com inteligência</p>
        </div>

        <div className="sp-progress-wrap">
          <div className="sp-progress-bar" />
        </div>
      </div>
    </>
  );
}
