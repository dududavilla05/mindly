"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const PARTICLE_COUNT = 45;
const MAX_DIST_SQ = 120 * 120;

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let raf = 0;
    let particles: Particle[] = [];

    const init = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;

      particles = Array.from({ length: PARTICLE_COUNT }, () => {
        const speed = 0.2 + Math.random() * 0.1; // 0.20–0.30 px/frame
        const angle = Math.random() * Math.PI * 2;
        return {
          x: Math.random() * W,
          y: Math.random() * H,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
        };
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // Move with wrap-around
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x += W;
        else if (p.x > W) p.x -= W;
        if (p.y < 0) p.y += H;
        else if (p.y > H) p.y -= H;
      }

      // Connection lines — all batched into a single path for performance
      ctx.beginPath();
      for (let i = 0; i < particles.length - 1; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          if (dx * dx + dy * dy < MAX_DIST_SQ) {
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
          }
        }
      }
      ctx.strokeStyle = "rgba(124,58,237,0.06)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Particles — batched into a single path
      ctx.beginPath();
      for (const p of particles) {
        ctx.moveTo(p.x + 2, p.y);
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      }
      ctx.fillStyle = "rgba(124,58,237,0.15)";
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };

    init();
    raf = requestAnimationFrame(draw);

    const handleResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
      // Clamp particles that are now outside the new bounds
      for (const p of particles) {
        if (p.x > W) p.x = Math.random() * W;
        if (p.y > H) p.y = Math.random() * H;
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
        willChange: "transform",
      }}
    />
  );
}
