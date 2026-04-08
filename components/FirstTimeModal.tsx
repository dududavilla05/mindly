"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import React from "react";

interface FirstTimeModalProps {
  storageKey: string;
  icon: string;
  title: string;
  description: string;
  buttonText: string;
}

export default function FirstTimeModal({
  storageKey,
  icon,
  title,
  description,
  buttonText,
}: FirstTimeModalProps) {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (!localStorage.getItem(storageKey)) setShow(true);
    } catch {
      // localStorage indisponível (SSR ou modo privativo)
    }
  }, [storageKey]);

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch { /* silencioso */ }
    setShow(false);
  };

  if (!mounted || !show) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "rgba(8,4,20,0.82)", backdropFilter: "blur(10px)", zIndex: 99999 }}
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-sm flex flex-col items-center text-center gap-5 px-7 py-8 rounded-3xl"
        style={{
          background: "linear-gradient(160deg, #110a28 0%, #0d0820 100%)",
          border: "1px solid rgba(124,31,255,0.45)",
          boxShadow: "0 0 0 1px rgba(124,31,255,0.08), 0 0 60px rgba(124,31,255,0.18), 0 32px 64px rgba(0,0,0,0.85)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Orb decorativo */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(124,31,255,0.25) 0%, transparent 70%)", filter: "blur(24px)" }}
        />

        {/* Ícone */}
        <div
          className="relative z-10 flex items-center justify-center w-20 h-20 rounded-2xl text-4xl"
          style={{
            background: "rgba(124,31,255,0.12)",
            border: "1px solid rgba(124,31,255,0.3)",
            boxShadow: "0 0 24px rgba(124,31,255,0.2)",
          }}
        >
          {icon}
        </div>

        {/* Título */}
        <h2
          className="text-xl font-bold leading-tight"
          style={{
            background: "linear-gradient(135deg, #ffffff 30%, #c39dff 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          } as React.CSSProperties}
        >
          {title}
        </h2>

        {/* Descrição */}
        <p className="text-sm leading-relaxed" style={{ color: "rgba(200,180,228,0.85)" }}>
          {description}
        </p>

        {/* Botão */}
        <button
          onClick={dismiss}
          className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:scale-105 active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #7c1fff, #a66aff)",
            boxShadow: "0 0 24px rgba(124,31,255,0.4)",
          }}
        >
          {buttonText}
        </button>
      </div>
    </div>,
    document.body
  );
}
