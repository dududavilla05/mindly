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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/logo.png"
            alt="Mindly"
            style={{ width: 300, height: 300, borderRadius: 64, display: "block" }}
          />
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
