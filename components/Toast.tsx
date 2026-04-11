"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type ToastType = "success" | "error" | "info";

export function showToast(message: string, type: ToastType = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("mindly:toast", { detail: { message, type } }));
}

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

const ICONS: Record<ToastType, string> = {
  success: "✅",
  error:   "❌",
  info:    "ℹ️",
};

const COLORS: Record<ToastType, { bg: string; border: string }> = {
  success: { bg: "rgba(16,30,16,0.97)",  border: "rgba(74,222,128,0.35)" },
  error:   { bg: "rgba(30,12,12,0.97)",  border: "rgba(248,113,113,0.35)" },
  info:    { bg: "rgba(12,8,25,0.97)",   border: "rgba(124,58,237,0.35)"  },
};

export default function Toast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const { message, type } = (e as CustomEvent<{ message: string; type: ToastType }>).detail;
      const id = Date.now() + Math.random();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    };
    window.addEventListener("mindly:toast", handler);
    return () => window.removeEventListener("mindly:toast", handler);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed bottom-6 right-4 md:right-6 z-[99999] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
    >
      {toasts.map(({ id, message, type }) => (
        <div
          key={id}
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm text-white font-medium shadow-lg"
          style={{
            background: COLORS[type].bg,
            border: `1px solid ${COLORS[type].border}`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            animation: "toastIn 0.25s ease-out",
            maxWidth: "320px",
          }}
        >
          <span className="text-base shrink-0">{ICONS[type]}</span>
          <span style={{ color: "rgba(255,255,255,0.9)", lineHeight: "1.4" }}>{message}</span>
        </div>
      ))}
    </div>,
    document.body
  );
}
