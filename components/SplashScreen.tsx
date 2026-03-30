"use client";

import { useEffect, useState } from "react";

const LETTERS = ["M", "i", "n", "d", "l", "y"];

export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("mindly_splash")) {
      setDone(true);
      return;
    }
    setVisible(true);
    const t1 = setTimeout(() => setFadingOut(true), 3000);
    const t2 = setTimeout(() => {
      sessionStorage.setItem("mindly_splash", "1");
      setDone(true);
    }, 3450);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (done || !visible) return null;

  return (
    <>
      <style>{`
        @keyframes splashPopIn {
          0%   { transform: scale(0.7); opacity: 0; }
          70%  { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes splashLetterIn {
          from { transform: translateY(10px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes splashFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes splashProgress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99999,
          background: "#0A0A0A",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "20px",
          opacity: fadingOut ? 0 : 1,
          transition: "opacity 450ms ease",
          pointerEvents: fadingOut ? "none" : "all",
        }}
      >
        {/* Logo */}
        <div
          style={{
            opacity: 0,
            animation: "splashPopIn 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) 100ms forwards",
          }}
        >
          <svg width="88" height="88" viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="260" height="260" rx="60" fill="#0A0A0A"/>
            <rect x="0" y="0" width="260" height="260" rx="60" fill="none" stroke="#3B1C8C" strokeWidth="3"/>
            <path d="M124 180 C124 180 72 175 67 142 C62 112 79 88 98 83 C93 63 113 48 132 54 L132 180 Z" fill="#7C3AED"/>
            <path d="M136 180 C136 180 188 175 193 142 C198 112 181 88 162 83 C167 63 147 48 128 54 L128 180 Z" fill="#7C3AED"/>
            <rect x="126" y="54" width="8" height="126" rx="4" fill="#0A0A0A"/>
            <path d="M74 142 C87 134 106 136 124 138" fill="none" stroke="#0A0A0A" strokeWidth="5" strokeLinecap="round"/>
            <path d="M186 142 C173 134 154 136 136 138" fill="none" stroke="#0A0A0A" strokeWidth="5" strokeLinecap="round"/>
            <path d="M84 162 C96 158 110 160 124 158" fill="none" stroke="#0A0A0A" strokeWidth="3.5" strokeLinecap="round"/>
            <path d="M176 162 C164 158 150 160 136 158" fill="none" stroke="#0A0A0A" strokeWidth="3.5" strokeLinecap="round"/>
            <circle cx="67" cy="142" r="7" fill="#A78BFA"/>
            <circle cx="193" cy="142" r="7" fill="#A78BFA"/>
            <circle cx="130" cy="54" r="7" fill="#A78BFA"/>
            <line x1="67" y1="142" x2="40" y2="142" stroke="#A78BFA" strokeWidth="4" strokeLinecap="round"/>
            <line x1="40" y1="142" x2="40" y2="110" stroke="#A78BFA" strokeWidth="4" strokeLinecap="round"/>
            <circle cx="40" cy="110" r="6" fill="#A78BFA"/>
            <line x1="193" y1="142" x2="220" y2="142" stroke="#A78BFA" strokeWidth="4" strokeLinecap="round"/>
            <line x1="220" y1="142" x2="220" y2="110" stroke="#A78BFA" strokeWidth="4" strokeLinecap="round"/>
            <circle cx="220" cy="110" r="6" fill="#A78BFA"/>
            <line x1="130" y1="54" x2="130" y2="30" stroke="#A78BFA" strokeWidth="4" strokeLinecap="round"/>
            <circle cx="130" cy="30" r="6" fill="#A78BFA"/>
          </svg>
        </div>

        {/* "Mindly" — letras uma por uma */}
        <div
          style={{
            display: "flex",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontStyle: "italic",
            fontWeight: 600,
            fontSize: "clamp(56px, 14vw, 84px)",
            color: "#ffffff",
            letterSpacing: "-0.01em",
            lineHeight: 1,
          }}
        >
          {LETTERS.map((letter, i) => (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity: 0,
                animation: "splashLetterIn 0.35s ease forwards",
                animationDelay: `${520 + i * 95}ms`,
              }}
            >
              {letter}
            </span>
          ))}
        </div>

        {/* Tagline */}
        <p
          style={{
            color: "#A78BFA",
            fontSize: "14px",
            fontFamily: "'Inter', sans-serif",
            letterSpacing: "0.02em",
            opacity: 0,
            animation: "splashFadeIn 0.5s ease forwards",
            animationDelay: "1600ms",
          }}
        >
          O melhor app de aprendizagem
        </p>

        {/* Barra de progresso */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "rgba(124,58,237,0.15)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: "0%",
              background: "linear-gradient(90deg, #7C3AED, #A78BFA)",
              animation: "splashProgress 1s ease forwards",
              animationDelay: "2000ms",
            }}
          />
        </div>
      </div>
    </>
  );
}
