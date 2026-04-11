"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

// ─── Particles canvas ────────────────────────────────────────────────────────
function ParticlesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const particles: { x: number; y: number; r: number; vx: number; vy: number; alpha: number; da: number }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2 + 0.5,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.5 + 0.1,
        da: (Math.random() - 0.5) * 0.004,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha += p.da;
        if (p.alpha < 0.05) p.da = Math.abs(p.da);
        if (p.alpha > 0.6) p.da = -Math.abs(p.da);
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167,139,250,${p.alpha})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    />
  );
}

// ─── Scroll-reveal hook ───────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(28px)",
      transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

// ─── Logo mark (reusable) ─────────────────────────────────────────────────────
function Logo({ size = 36 }: { size?: number }) {
  return (
    <Image
      src="/icons/logo-final.png"
      alt="Mindly logo"
      width={size}
      height={size}
      style={{ borderRadius: size * 0.26, objectFit: "contain" }}
      priority
    />
  );
}

// ─── Gradient heading span ────────────────────────────────────────────────────
const gradientText: React.CSSProperties = {
  background: "linear-gradient(135deg, #a78bfa, #7c3aed, #6366f1)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

// ─── FAQ Item ────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(124,58,237,0.18)" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", textAlign: "left", padding: "20px 0",
          background: "none", border: "none", cursor: "pointer",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          color: "#e2e8f0", fontSize: "1.05rem", fontWeight: 500,
        }}
      >
        {q}
        <span style={{
          color: "#7c3aed", fontSize: "1.4rem", lineHeight: 1,
          transform: open ? "rotate(45deg)" : "rotate(0deg)",
          transition: "transform 0.3s ease",
          flexShrink: 0, marginLeft: 16,
        }}>+</span>
      </button>
      <div style={{ maxHeight: open ? "300px" : "0", overflow: "hidden", transition: "max-height 0.4s ease" }}>
        <p style={{ color: "#94a3b8", lineHeight: 1.7, paddingBottom: 20, margin: 0 }}>{a}</p>
      </div>
    </div>
  );
}

// ─── Pricing Card ────────────────────────────────────────────────────────────
function PricingCard({ name, price, period, features, cta, highlighted, badge }: {
  name: string; price: string; period: string;
  features: { text: string; included: boolean }[];
  cta: string; highlighted?: boolean; badge?: string;
}) {
  return (
    <div style={{
      background: highlighted
        ? "linear-gradient(135deg, rgba(124,58,237,0.22) 0%, rgba(99,102,241,0.1) 100%)"
        : "rgba(255,255,255,0.03)",
      border: highlighted ? "2px solid #7c3aed" : "1px solid rgba(255,255,255,0.08)",
      borderRadius: 22, padding: "36px 32px",
      position: "relative", display: "flex", flexDirection: "column",
      gap: 8, flex: 1, minWidth: 0,
      boxShadow: highlighted ? "0 0 60px rgba(124,58,237,0.18)" : "none",
    }}>
      {badge && (
        <div style={{
          position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
          background: "linear-gradient(135deg, #7c3aed, #6366f1)",
          color: "#fff", fontSize: "0.78rem", fontWeight: 700,
          padding: "4px 16px", borderRadius: 20, whiteSpace: "nowrap",
        }}>{badge}</div>
      )}
      <div style={{ color: highlighted ? "#a78bfa" : "#94a3b8", fontWeight: 700, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>{name}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 8 }}>
        <span style={{ fontSize: "2.6rem", fontWeight: 800, color: "#f1f5f9", letterSpacing: "-1px" }}>{price}</span>
        {period && <span style={{ color: "#64748b", fontSize: "0.9rem" }}>{period}</span>}
      </div>
      <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "16px 0" }} />
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        {features.map((f, i) => (
          <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, color: f.included ? "#e2e8f0" : "#374151", fontSize: "0.95rem" }}>
            <span style={{ color: f.included ? "#a78bfa" : "#374151", flexShrink: 0, fontSize: "1rem" }}>{f.included ? "✓" : "✗"}</span>
            {f.text}
          </li>
        ))}
      </ul>
      <Link href="/login" style={{
        display: "block", marginTop: 28, textAlign: "center",
        padding: "14px 0", borderRadius: 12, fontWeight: 700, fontSize: "0.95rem",
        background: highlighted ? "linear-gradient(135deg, #7c3aed, #6366f1)" : "rgba(255,255,255,0.06)",
        color: "#fff", textDecoration: "none",
        border: highlighted ? "none" : "1px solid rgba(255,255,255,0.1)",
        transition: "opacity 0.2s, transform 0.2s",
      }}
        onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; e.currentTarget.style.transform = "scale(1.02)"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "scale(1)"; }}
      >
        {cta}
      </Link>
    </div>
  );
}

// ─── App mockup frames ────────────────────────────────────────────────────────
function LaptopMockup() {
  return (
    <div style={{ width: "100%", maxWidth: 440 }}>
      {/* Screen */}
      <div style={{
        background: "#0d0b1e", border: "2px solid rgba(124,58,237,0.6)",
        borderRadius: "14px 14px 0 0", padding: "12px",
        boxShadow: "0 0 40px rgba(124,58,237,0.25)",
      }}>
        {/* Dots */}
        <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
          {["#ef4444","#f59e0b","#22c55e"].map((c,i) => <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: c, opacity: 0.7 }} />)}
        </div>
        {/* Screenshot */}
        <div style={{ width: "100%", borderRadius: 8, overflow: "hidden" }}>
          <img
            src="/screenshots/licao.png"
            alt="Mindly app – lições personalizadas"
            style={{ display: "block", width: "100%", height: 210, objectFit: "cover", objectPosition: "top" }}
          />
        </div>
      </div>
      {/* Stand */}
      <div style={{ height: 10, background: "rgba(124,58,237,0.3)", borderRadius: "0 0 4px 4px" }} />
      <div style={{ height: 5, width: "50%", margin: "0 auto", background: "rgba(124,58,237,0.2)", borderRadius: "0 0 8px 8px" }} />
    </div>
  );
}

function PhoneMockup({ type }: { type: "map" | "challenge" }) {
  const src = type === "map" ? "/screenshots/mapa.png" : "/screenshots/desafio.png";
  const alt = type === "map" ? "Mindly app – mapas mentais" : "Mindly app – modo desafio";
  return (
    <div style={{ width: 180, margin: "0 auto" }}>
      <div style={{
        background: "#0d0b1e",
        border: "2px solid rgba(124,58,237,0.5)",
        borderRadius: 28, padding: "20px 12px 16px",
        boxShadow: "0 0 30px rgba(124,58,237,0.18)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Notch */}
        <div style={{ width: 56, height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 10, margin: "0 auto 14px", flexShrink: 0 }} />
        {/* Screenshot */}
        <div style={{ borderRadius: 12, overflow: "hidden" }}>
          <img
            src={src}
            alt={alt}
            style={{ display: "block", width: "100%", height: 260, objectFit: "cover", objectPosition: "top" }}
          />
        </div>
        {/* Home bar */}
        <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 4, margin: "12px auto 0", flexShrink: 0 }} />
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [badgePulse, setBadgePulse] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Badge pulse every 4s
  useEffect(() => {
    const t = setInterval(() => {
      setBadgePulse(true);
      setTimeout(() => setBadgePulse(false), 600);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const features = [
    { icon: "📚", title: "Lições Personalizadas", desc: "IA gera lições únicas sobre qualquer tema — filosofia, finanças, ciência ou história — adaptadas ao seu estilo de aprendizado." },
    { icon: "🧠", title: "Mapas Mentais", desc: "Transforme qualquer conceito em um mapa visual interativo. Organize ideias e acelere a compreensão de temas complexos." },
    { icon: "🗺️", title: "Jornadas de Aprendizado", desc: "Crie trilhas de 7 a 90 dias com metas diárias e acompanhe seu progresso com streaks e calendário visual." },
    { icon: "🌍", title: "Prática de Idiomas", desc: "Converse com um professor de IA nativo em inglês, espanhol, francês e mais — no seu nível, no seu ritmo." },
    { icon: "🏆", title: "Modo Desafio", desc: "Teste seu conhecimento com quizzes gerados por IA sobre qualquer lição. Aprenda mais retendo mais." },
    { icon: "🎓", title: "Mentor IA", desc: "Tire dúvidas sobre qualquer lição com um mentor especialista. Respostas precisas, didáticas e instantâneas." },
  ];

  const steps = [
    { n: "01", title: "Escolha um tema", desc: "Digite qualquer assunto que queira aprender — da culinária à física quântica. O Mindly não tem limites." },
    { n: "02", title: "A IA cria sua lição", desc: "Em segundos, você recebe uma lição personalizada, mapa mental, exemplos práticos e como aplicar hoje." },
    { n: "03", title: "Aprenda e evolua", desc: "Acompanhe seu progresso, pratique com desafios, converse com o Mentor e construa seu histórico de conhecimento." },
  ];

  const testimonials = [
    { name: "Ana C.", role: "Empreendedora", avatar: "https://i.pravatar.cc/150?img=1", text: "Aprendi mais sobre finanças em 2 semanas com o Mindly do que em um semestre de faculdade. As lições são incríveis." },
    { name: "Rafael M.", role: "Estudante de Direito", avatar: "https://i.pravatar.cc/150?img=5", text: "O Modo Desafio me ajudou a fixar conceitos jurídicos complexos. Minha nota na prova subiu muito." },
    { name: "Juliana P.", role: "Designer UX", avatar: "https://i.pravatar.cc/150?img=9", text: "Uso o recurso de idiomas todo dia para praticar inglês. O professor de IA é paciente e corrijo meus erros na hora." },
  ];

  const faqs = [
    { q: "O Mindly é gratuito?", a: "Sim! O plano Grátis oferece 10 lições, 3 mapas mentais e 5 desafios por dia sem custo. Para uso ilimitado e recursos exclusivos como Mentor IA e prática de idiomas, temos os planos Pro e Max." },
    { q: "Como o Mindly usa Inteligência Artificial?", a: "O Mindly utiliza IA avançada para gerar cada lição, mapa mental, desafio e conversa em tempo real especificamente para você — nada é pré-fabricado ou genérico." },
    { q: "Posso usar no celular?", a: "Sim! O Mindly é totalmente responsivo e funciona perfeitamente em qualquer dispositivo — celular, tablet ou computador." },
    { q: "Quais idiomas posso aprender?", a: "Atualmente suportamos inglês, espanhol, francês, alemão, italiano, japonês, mandarim e português (para falantes de outros idiomas). Novos idiomas são adicionados regularmente." },
    { q: "Posso cancelar a qualquer momento?", a: "Sim, sem burocracia. Você pode cancelar ou mudar de plano quando quiser, sem multas ou fidelidade." },
    { q: "Meus dados estão seguros?", a: "Absolutamente. Usamos criptografia de ponta a ponta, seguimos a LGPD e você pode exportar ou deletar seus dados a qualquer momento." },
  ];

  return (
    <div style={{ background: "#0a0818", color: "#e2e8f0", fontFamily: "'Inter', 'Poppins', -apple-system, sans-serif", overflowX: "hidden" }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        @keyframes badgePop { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        @keyframes shimmerBadge { 0%{background-position:200%} 100%{background-position:-200%} }
        .hero-badge-pulse { animation: badgePop 0.6s ease; }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "0 24px",
        background: scrolled ? "rgba(10,8,24,0.93)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(124,58,237,0.18)" : "none",
        transition: "all 0.3s ease",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Logo size={36} />
            <span style={{ fontWeight: 800, fontSize: "1.2rem", color: "#f1f5f9", letterSpacing: "-0.5px" }}>Mindly</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link href="/login" style={{ padding: "8px 18px", borderRadius: 10, color: "#94a3b8", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500, transition: "color 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#e2e8f0")}
              onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
            >Entrar</Link>
            <Link href="/login" style={{
              padding: "9px 22px", borderRadius: 10, fontWeight: 700, fontSize: "0.9rem",
              background: "linear-gradient(135deg, #7c3aed, #6366f1)",
              color: "#fff", textDecoration: "none",
              boxShadow: "0 0 20px rgba(124,58,237,0.3)",
              transition: "box-shadow 0.2s",
            }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 0 30px rgba(124,58,237,0.5)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 0 20px rgba(124,58,237,0.3)")}
            >Começar grátis</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "120px 24px 80px", position: "relative", overflow: "hidden" }}>
        <ParticlesCanvas />
        {/* Glow */}
        <div style={{ position: "absolute", top: "25%", left: "50%", transform: "translateX(-50%)", width: 800, height: 600, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(124,58,237,0.18) 0%, transparent 65%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", maxWidth: 820, margin: "0 auto" }}>
          {/* Logo big */}
          <div style={{ marginBottom: 28 }}>
            <Logo size={80} />
          </div>

          {/* Animated badge */}
          <div
            className={badgePulse ? "hero-badge-pulse" : ""}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.4)",
              borderRadius: 40, padding: "7px 18px", marginBottom: 28,
            }}
          >
            <span style={{ fontSize: "1rem" }}>🚀</span>
            <span style={{ fontSize: "0.85rem", color: "#a78bfa", fontWeight: 600 }}>Mais de 100 lições geradas hoje</span>
          </div>

          <h1 style={{ fontSize: "clamp(2.6rem, 6vw, 4.2rem)", fontWeight: 900, lineHeight: 1.08, margin: "0 0 24px", color: "#f8fafc", letterSpacing: "-1px" }}>
            Aprenda qualquer coisa<br />
            <span style={gradientText}>com Inteligência Artificial</span>
          </h1>

          <p style={{ fontSize: "clamp(1rem, 2.5vw, 1.2rem)", color: "#94a3b8", lineHeight: 1.75, margin: "0 0 40px", maxWidth: 580, marginLeft: "auto", marginRight: "auto" }}>
            O Mindly cria lições únicas, mapas mentais e trilhas de aprendizado personalizadas para você — sobre qualquer tema, em minutos.
          </p>

          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/login" style={{
              padding: "16px 38px", borderRadius: 14, fontWeight: 700, fontSize: "1.05rem",
              background: "linear-gradient(135deg, #7c3aed, #6366f1)",
              color: "#fff", textDecoration: "none",
              boxShadow: "0 0 50px rgba(124,58,237,0.45)",
              transition: "box-shadow 0.3s, transform 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 70px rgba(124,58,237,0.65)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 50px rgba(124,58,237,0.45)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              Começar gratuitamente →
            </Link>
            <Link href="/login" style={{
              padding: "16px 38px", borderRadius: 14, fontWeight: 600, fontSize: "1.05rem",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.13)",
              color: "#cbd5e1", textDecoration: "none",
              transition: "background 0.2s, border-color 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.09)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.13)"; }}
            >
              Já tenho conta
            </Link>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 48, justifyContent: "center", marginTop: 68, flexWrap: "wrap" }}>
            {[["10.000+", "lições geradas"], ["98%", "satisfação"], ["6", "ferramentas de aprendizado"]].map(([n, l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.9rem", fontWeight: 900, ...gradientText, letterSpacing: "-0.5px" }}>{n}</div>
                <div style={{ fontSize: "0.83rem", color: "#475569", marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROBLEM / SOLUTION ── */}
      <section style={{ padding: "100px 24px", background: "rgba(255,255,255,0.01)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 800, color: "#f1f5f9", margin: "0 0 16px", letterSpacing: "-0.5px" }}>O problema com o aprendizado tradicional</h2>
              <p style={{ color: "#64748b", fontSize: "1.05rem", maxWidth: 600, margin: "0 auto" }}>Você já tentou aprender algo online e se sentiu assim?</p>
            </div>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, marginBottom: 64 }}>
            {[
              { icon: "😵", title: "Conteúdo genérico demais", desc: "Cursos e artigos escritos para todo mundo não funcionam para você. Seu contexto, seu ritmo e suas dúvidas são únicos." },
              { icon: "⏳", title: "Tempo desperdiçado", desc: "Horas assistindo vídeos que não chegam ao ponto. Você quer a essência do assunto, não rodeios." },
              { icon: "📉", title: "Conhecimento que não fica", desc: "Você lê, assiste e esquece. Sem prática ativa e revisão, o aprendizado evapora em dias." },
            ].map((p, i) => (
              <Reveal key={i} delay={i * 100}>
                <div style={{
                  background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 18, padding: "28px 24px",
                  transition: "transform 0.3s, border-color 0.3s",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1.02)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(239,68,68,0.3)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(239,68,68,0.15)"; }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: 12 }}>{p.icon}</div>
                  <h3 style={{ color: "#fca5a5", fontWeight: 700, margin: "0 0 8px", fontSize: "1.05rem" }}>{p.title}</h3>
                  <p style={{ color: "#6b7280", margin: 0, lineHeight: 1.65, fontSize: "0.95rem" }}>{p.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(99,102,241,0.08))", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 22, padding: "44px 40px", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <Logo size={60} />
              </div>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f1f5f9", margin: "0 0 12px", letterSpacing: "-0.5px" }}>O Mindly resolve tudo isso</h3>
              <p style={{ color: "#94a3b8", fontSize: "1.05rem", lineHeight: 1.75, maxWidth: 580, margin: "0 auto" }}>
                IA que cria conteúdo <strong style={{ color: "#a78bfa" }}>único para você</strong>, na hora, sobre qualquer tema. Com ferramentas de prática que garantem que o conhecimento realmente fique.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <div style={{ display: "inline-block", background: "rgba(124,58,237,0.13)", border: "1px solid rgba(124,58,237,0.28)", borderRadius: 20, padding: "5px 18px", marginBottom: 16 }}>
                <span style={{ color: "#a78bfa", fontSize: "0.84rem", fontWeight: 600 }}>6 ferramentas poderosas</span>
              </div>
              <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 800, color: "#f1f5f9", margin: "0 0 16px", letterSpacing: "-0.5px" }}>Tudo que você precisa para aprender</h2>
              <p style={{ color: "#64748b", fontSize: "1.05rem", maxWidth: 520, margin: "0 auto" }}>Um ecossistema completo de aprendizado, alimentado por IA.</p>
            </div>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {features.map((f, i) => (
              <Reveal key={i} delay={(i % 3) * 80}>
                <div style={{
                  background: "rgba(255,255,255,0.028)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 20, padding: "28px 24px",
                  transition: "border-color 0.3s, transform 0.3s, box-shadow 0.3s",
                  cursor: "default",
                }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.borderColor = "rgba(124,58,237,0.55)";
                    el.style.transform = "scale(1.02) translateY(-2px)";
                    el.style.boxShadow = "0 8px 40px rgba(124,58,237,0.18)";
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.borderColor = "rgba(255,255,255,0.07)";
                    el.style.transform = "scale(1) translateY(0)";
                    el.style.boxShadow = "none";
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: 14 }}>{f.icon}</div>
                  <h3 style={{ color: "#f1f5f9", fontWeight: 700, margin: "0 0 8px", fontSize: "1.05rem" }}>{f.title}</h3>
                  <p style={{ color: "#64748b", margin: 0, lineHeight: 1.65, fontSize: "0.93rem" }}>{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── APP MOCKUPS ── */}
      <section style={{ padding: "100px 24px", background: "rgba(124,58,237,0.03)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 800, color: "#f1f5f9", margin: "0 0 16px", letterSpacing: "-0.5px" }}>
                Veja o Mindly <span style={gradientText}>em ação</span>
              </h2>
              <p style={{ color: "#64748b", fontSize: "1.05rem" }}>Uma experiência de aprendizado diferente de tudo que você já viu.</p>
            </div>
          </Reveal>

          <div style={{ display: "flex", gap: 32, alignItems: "flex-end", justifyContent: "center", flexWrap: "wrap" }}>
            <Reveal delay={0}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                <LaptopMockup />
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: "0.95rem" }}>📚 Lições Personalizadas</div>
                  <div style={{ color: "#64748b", fontSize: "0.82rem", marginTop: 4 }}>Conteúdo gerado para você</div>
                </div>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                <PhoneMockup type="map" />
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: "0.95rem" }}>🧠 Mapas Mentais</div>
                  <div style={{ color: "#64748b", fontSize: "0.82rem", marginTop: 4 }}>Visualize qualquer conceito</div>
                </div>
              </div>
            </Reveal>
            <Reveal delay={240}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                <PhoneMockup type="challenge" />
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: "0.95rem" }}>🏆 Modo Desafio</div>
                  <div style={{ color: "#64748b", fontSize: "0.82rem", marginTop: 4 }}>Teste e fixe o conhecimento</div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 72 }}>
              <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 800, color: "#f1f5f9", margin: "0 0 16px", letterSpacing: "-0.5px" }}>Como funciona</h2>
              <p style={{ color: "#64748b", fontSize: "1.05rem" }}>Três passos para transformar sua forma de aprender.</p>
            </div>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 32 }}>
            {steps.map((s, i) => (
              <Reveal key={i} delay={i * 120}>
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    width: 68, height: 68, borderRadius: "50%",
                    background: "linear-gradient(135deg, rgba(124,58,237,0.28), rgba(99,102,241,0.18))",
                    border: "2px solid rgba(124,58,237,0.45)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 22px",
                    fontSize: "1.1rem", fontWeight: 800, color: "#a78bfa",
                    boxShadow: "0 0 20px rgba(124,58,237,0.15)",
                  }}>{s.n}</div>
                  <h3 style={{ color: "#f1f5f9", fontWeight: 700, margin: "0 0 10px", fontSize: "1.1rem" }}>{s.title}</h3>
                  <p style={{ color: "#64748b", margin: 0, lineHeight: 1.7, fontSize: "0.95rem" }}>{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section style={{ padding: "100px 24px", background: "rgba(255,255,255,0.01)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 800, color: "#f1f5f9", margin: "0 0 16px", letterSpacing: "-0.5px" }}>Planos para cada momento</h2>
              <p style={{ color: "#64748b", fontSize: "1.05rem" }}>Comece gratuitamente. Evolua quando quiser.</p>
            </div>
          </Reveal>

          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
            <Reveal delay={0}>
              <PricingCard
                name="Grátis"
                price="R$ 0"
                period="/mês"
                cta="Começar grátis"
                features={[
                  { text: "10 lições por dia", included: true },
                  { text: "3 mapas mentais por dia", included: true },
                  { text: "5 desafios por dia", included: true },
                  { text: "Histórico de lições", included: true },
                  { text: "Jornadas de aprendizado", included: false },
                  { text: "Prática de idiomas", included: false },
                  { text: "Mentor IA", included: false },
                ]}
              />
            </Reveal>
            <Reveal delay={100}>
              <PricingCard
                name="Pro"
                price="R$ 26,99"
                period="/mês"
                cta="Assinar Pro"
                highlighted
                badge="Mais popular"
                features={[
                  { text: "Lições ilimitadas", included: true },
                  { text: "Mapas mentais ilimitados", included: true },
                  { text: "Modo Desafio ilimitado", included: true },
                  { text: "Jornadas de aprendizado", included: true },
                  { text: "Histórico completo", included: true },
                  { text: "Prática de idiomas", included: false },
                  { text: "Mentor IA", included: false },
                ]}
              />
            </Reveal>
            <Reveal delay={200}>
              <PricingCard
                name="Max"
                price="R$ 48,99"
                period="/mês"
                cta="Assinar Max"
                features={[
                  { text: "Tudo do Pro", included: true },
                  { text: "Mentor IA (chat por lição)", included: true },
                  { text: "Prática de idiomas com IA", included: true },
                  { text: "Exportação de lições em PDF", included: true },
                  { text: "Exportação de dados (LGPD)", included: true },
                  { text: "Acesso antecipado a novidades", included: true },
                  { text: "Suporte prioritário", included: true },
                ]}
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 800, color: "#f1f5f9", margin: "0 0 16px", letterSpacing: "-0.5px" }}>O que dizem nossos alunos</h2>
              <div style={{ display: "flex", justifyContent: "center", gap: 3, marginTop: 8 }}>
                {"★★★★★".split("").map((s, i) => <span key={i} style={{ color: "#f59e0b", fontSize: "1.3rem" }}>{s}</span>)}
              </div>
            </div>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 24 }}>
            {testimonials.map((t, i) => (
              <Reveal key={i} delay={i * 100}>
                <div style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 20, padding: "28px 24px",
                  transition: "transform 0.3s, border-color 0.3s, box-shadow 0.3s",
                }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "scale(1.02)";
                    el.style.borderColor = "rgba(124,58,237,0.4)";
                    el.style.boxShadow = "0 8px 32px rgba(124,58,237,0.12)";
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "scale(1)";
                    el.style.borderColor = "rgba(255,255,255,0.07)";
                    el.style.boxShadow = "none";
                  }}
                >
                  <div style={{ display: "flex", gap: 2, marginBottom: 16 }}>
                    {"★★★★★".split("").map((s, j) => <span key={j} style={{ color: "#f59e0b", fontSize: "0.9rem" }}>{s}</span>)}
                  </div>
                  <p style={{ color: "#94a3b8", lineHeight: 1.72, margin: "0 0 20px", fontSize: "0.97rem", fontStyle: "italic" }}>&ldquo;{t.text}&rdquo;</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Image
                      src={t.avatar}
                      alt={t.name}
                      width={40}
                      height={40}
                      style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: "0.95rem" }}>{t.name}</div>
                      <div style={{ color: "#64748b", fontSize: "0.82rem" }}>{t.role}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: "100px 24px", background: "rgba(255,255,255,0.01)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 800, color: "#f1f5f9", margin: "0 0 16px", letterSpacing: "-0.5px" }}>Perguntas frequentes</h2>
              <p style={{ color: "#64748b", fontSize: "1.05rem" }}>Tudo que você precisa saber antes de começar.</p>
            </div>
          </Reveal>
          <Reveal>
            <div>
              {faqs.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <Reveal>
            <div style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(99,102,241,0.1))",
              border: "1px solid rgba(124,58,237,0.35)",
              borderRadius: 28, padding: "80px 48px",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: -80, right: -80, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 70%)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: -60, left: -60, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
              <div style={{ position: "relative" }}>
                <Logo size={64} />
                <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 900, color: "#f8fafc", margin: "20px 0 16px", letterSpacing: "-0.5px" }}>
                  Pronto para aprender<br />de verdade?
                </h2>
                <p style={{ color: "#94a3b8", fontSize: "1.1rem", margin: "0 0 36px", lineHeight: 1.75 }}>
                  Junte-se a milhares de pessoas que já transformaram sua forma de aprender. Comece grátis hoje.
                </p>
                <Link href="/login" style={{
                  display: "inline-block", padding: "17px 52px", borderRadius: 14,
                  fontWeight: 700, fontSize: "1.1rem",
                  background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                  color: "#fff", textDecoration: "none",
                  boxShadow: "0 0 50px rgba(124,58,237,0.45)",
                  transition: "box-shadow 0.3s, transform 0.2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 70px rgba(124,58,237,0.65)"; e.currentTarget.style.transform = "translateY(-2px) scale(1.02)"; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 50px rgba(124,58,237,0.45)"; e.currentTarget.style.transform = "translateY(0) scale(1)"; }}
                >
                  Criar conta grátis →
                </Link>
                <p style={{ color: "#475569", fontSize: "0.85rem", marginTop: 16 }}>Sem cartão de crédito. Sem compromisso.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "48px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24, marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Logo size={32} />
              <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#f1f5f9", letterSpacing: "-0.5px" }}>Mindly</span>
            </div>
            <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
              {[["Entrar", "/login"], ["Começar", "/login"]].map(([label, href]) => (
                <Link key={label} href={href} style={{ color: "#64748b", textDecoration: "none", fontSize: "0.9rem", transition: "color 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#94a3b8")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}
                >{label}</Link>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <p style={{ color: "#334155", fontSize: "0.85rem", margin: 0 }}>
              © {new Date().getFullYear()} Mindly. Todos os direitos reservados.
            </p>
            <p style={{ color: "#334155", fontSize: "0.82rem", margin: 0 }}>
              Feito com ❤️ no Brasil 🇧🇷
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
