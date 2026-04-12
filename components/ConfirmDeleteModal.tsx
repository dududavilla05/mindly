"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ConfirmDeleteModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDeleteModal({ message, onConfirm, onCancel }: ConfirmDeleteModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        className="relative z-10 w-full max-w-xs rounded-2xl p-6 flex flex-col gap-5"
        style={{ background: "#130d27", border: "1px solid rgba(124,31,255,0.35)" }}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-2xl">🗑️</span>
          <p className="text-white text-sm leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 active:scale-[0.97]"
            style={{
              color: "#a78bca",
              background: "rgba(124,31,255,0.1)",
              border: "1px solid rgba(124,31,255,0.25)",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.97]"
            style={{
              background: "rgba(220,38,38,0.85)",
              border: "1px solid rgba(239,68,68,0.4)",
            }}
          >
            Apagar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
