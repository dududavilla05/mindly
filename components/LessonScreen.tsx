"use client";

import { useState } from "react";
import MindlyLogo from "./MindlyLogo";
import MentorChat from "./MentorChat";
import type { LessonContent } from "@/types/lesson";


interface LessonScreenProps {
  lesson: LessonContent;
  subject: string;
  onBack: () => void;
  onNewLesson: () => void;
  onOpenHistory?: () => void;
  plan?: string | null;
}

async function exportToPDF(lesson: LessonContent, subject: string) {
  const { jsPDF } = await import("jspdf");
  const html2canvas = (await import("html2canvas")).default;

  const PAD = 40;

  const el = document.createElement("div");
  el.style.cssText = `
    position:absolute; left:-9999px; top:0;
    width:794px; background:#ffffff;
    font-family:Arial,Helvetica,sans-serif; color:#1e1432;
  `;

  el.innerHTML = `
    <div style="background:#6D28D9;padding:16px ${PAD}px;text-align:center;">
      <div style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:6px;">MINDLY</div>
      <div style="font-size:11px;color:#DDD6FE;margin-top:3px;">Aprenda qualquer coisa com IA</div>
    </div>

    <div style="padding:20px ${PAD}px 16px;display:flex;flex-direction:column;gap:12px;">

      <div>
        <span style="background:#EDE9FE;color:#6D28D9;font-size:9px;font-weight:700;
          letter-spacing:2px;padding:3px 12px;border-radius:20px;text-transform:uppercase;">
          ${lesson.category}
        </span>
      </div>

      <h1 style="font-size:22px;font-weight:900;color:#1e1432;margin:0;line-height:1.2;">
        ${lesson.title}
      </h1>

      ${subject && subject !== "Imagem enviada"
        ? `<p style="font-size:12px;color:#7C6A9A;margin:0;">Assunto: &ldquo;${subject}&rdquo;</p>`
        : ""}

      <hr style="border:none;border-top:1px solid #DDD6FE;margin:0;">

      <p style="font-size:13px;color:#2d1f50;line-height:1.55;margin:0;">
        ${lesson.introduction}
      </p>

      <div style="background:#F5F3FF;border-left:4px solid #6D28D9;border-radius:0 6px 6px 0;padding:12px 16px;">
        <div style="font-size:9px;font-weight:700;color:#6D28D9;letter-spacing:2px;
          text-transform:uppercase;margin-bottom:5px;">${lesson.highlight.label}</div>
        <div style="font-size:13px;font-weight:700;color:#1e1432;line-height:1.4;">
          ${lesson.highlight.text}
        </div>
      </div>

      <div style="border:1px solid #DDD6FE;border-radius:8px;padding:12px 16px;">
        <div style="font-size:9px;font-weight:700;color:#6D28D9;letter-spacing:2px;
          text-transform:uppercase;margin-bottom:8px;">${lesson.practicalExample.title}</div>
        <p style="font-size:13px;color:#2d1f50;line-height:1.55;margin:0;">
          ${lesson.practicalExample.content}
        </p>
      </div>

      <div style="border:1px solid #DDD6FE;border-radius:8px;padding:12px 16px;">
        <div style="font-size:9px;font-weight:700;color:#6D28D9;letter-spacing:2px;
          text-transform:uppercase;margin-bottom:10px;">Como Aplicar Hoje</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${lesson.howToApplyToday.map((a, i) => `
            <div style="display:flex;gap:12px;align-items:flex-start;">
              <div style="flex-shrink:0;width:22px;height:22px;background:#6D28D9;border-radius:50%;
                font-size:11px;font-weight:700;color:#fff;
                line-height:22px;text-align:center;">
                ${i + 1}
              </div>
              <p style="font-size:13px;color:#2d1f50;line-height:1.5;margin:0;padding-top:2px;">${a}</p>
            </div>
          `).join("")}
        </div>
      </div>

      ${lesson.curiosity ? `
        <div style="background:#FAFAFA;border:1px solid #EDE9FE;border-radius:8px;padding:12px 16px;">
          <div style="font-size:9px;font-weight:700;color:#7C6A9A;letter-spacing:2px;
            text-transform:uppercase;margin-bottom:5px;">Voce Sabia?</div>
          <p style="font-size:12px;color:#7C6A9A;line-height:1.55;margin:0;font-style:italic;">
            ${lesson.curiosity}
          </p>
        </div>
      ` : ""}

    </div>

    <div style="background:#F5F3FF;border-top:1px solid #DDD6FE;padding:10px ${PAD}px;text-align:center;">
      <span style="font-size:10px;color:#7C6A9A;">
        Gerado pelo Mindly &nbsp;&bull;&nbsp; mindly-ruby.vercel.app
      </span>
    </div>
  `;

  document.body.appendChild(el);

  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdfW = 210;
    const pdfH = 297;
    const imgH = (canvas.height * pdfW) / canvas.width;
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    let posY = 0;
    let first = true;
    while (posY < imgH) {
      if (!first) doc.addPage();
      doc.addImage(imgData, "PNG", 0, -posY, pdfW, imgH);
      posY += pdfH;
      first = false;
    }

    const slug = lesson.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    doc.save(`mindly-${slug}.pdf`);
  } finally {
    document.body.removeChild(el);
  }
}

export default function LessonScreen({ lesson, subject, onBack, onNewLesson, onOpenHistory, plan }: LessonScreenProps) {
  const [exporting, setExporting] = useState(false);
  const [mentorOpen, setMentorOpen] = useState(false);
  const canExport = plan === "pro" || plan === "max";
  const canMentor = plan === "max";

  const handleExport = async () => {
    if (!canExport) return;
    setExporting(true);
    try {
      await exportToPDF(lesson, subject);
    } finally {
      setExporting(false);
    }
  };
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Background orbs */}
      <div
        className="orb w-96 h-96 top-[-80px] right-[-120px] opacity-25"
        style={{ background: "radial-gradient(circle, #7c1fff 0%, transparent 70%)" }}
      />
      <div
        className="orb w-72 h-72 bottom-40 left-[-80px] opacity-15"
        style={{ background: "radial-gradient(circle, #a66aff 0%, transparent 70%)" }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-5 border-b border-[rgba(124,31,255,0.15)]"
        style={{ background: "rgba(15,10,30,0.8)", backdropFilter: "blur(20px)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-[#a78bca] hover:text-white hover:bg-[rgba(124,31,255,0.2)] transition-all duration-150"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <MindlyLogo size="sm" />
        </div>
        <div className="flex items-center gap-2">
          {onOpenHistory && (
            <button
              onClick={onOpenHistory}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl text-[#a78bca] hover:text-white transition-all duration-150"
              style={{ background: "rgba(124,31,255,0.1)" }}
              aria-label="Histórico"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </button>
          )}
          <button
            onClick={onNewLesson}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-150 hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #7c1fff, #a66aff)",
              boxShadow: "0 0 12px rgba(124,31,255,0.3)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Nova lição
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6 animate-slide-up">

        {/* Category + Subject badge */}
        <div className="flex items-center gap-3">
          <span
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest"
            style={{
              background: "rgba(124,31,255,0.2)",
              border: "1px solid rgba(124,31,255,0.35)",
              color: "#c39dff",
            }}
          >
            <span className="text-base">{lesson.emoji}</span>
            {lesson.category}
          </span>
          {subject && subject !== "Imagem enviada" && (
            <span className="text-xs text-[#5c3d8a] font-medium truncate max-w-[200px]">
              &ldquo;{subject}&rdquo;
            </span>
          )}
        </div>

        {/* Title */}
        <div>
          <h1
            className="text-3xl sm:text-4xl font-black leading-tight"
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, #c39dff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {lesson.title}
          </h1>
        </div>

        {/* Introduction */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <p className="text-[#d4c0f0] leading-relaxed text-base">
            {lesson.introduction}
          </p>
        </div>

        {/* Highlight */}
        <div
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(124,31,255,0.25) 0%, rgba(166,106,255,0.15) 100%)",
            border: "1px solid rgba(124,31,255,0.4)",
            boxShadow: "0 0 30px rgba(124,31,255,0.15)",
          }}
        >
          {/* Decorative glow */}
          <div
            className="absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-30"
            style={{ background: "radial-gradient(circle, #a66aff 0%, transparent 70%)" }}
          />
          <div className="relative flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(124,31,255,0.4)" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c39dff" strokeWidth="2.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <span className="text-xs font-bold text-[#c39dff] uppercase tracking-widest">
                {lesson.highlight.label}
              </span>
            </div>
            <p className="text-white font-semibold text-lg leading-snug">
              {lesson.highlight.text}
            </p>
          </div>
        </div>

        {/* Practical Example */}
        <div
          className="rounded-2xl p-5 flex flex-col gap-3"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(124,31,255,0.2)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a66aff" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <h2 className="text-[#c39dff] font-bold text-sm uppercase tracking-widest">
              {lesson.practicalExample.title}
            </h2>
          </div>
          <p className="text-[#d4c0f0] leading-relaxed text-base">
            {lesson.practicalExample.content}
          </p>
        </div>

        {/* How to apply today */}
        <div
          className="rounded-2xl p-5 flex flex-col gap-4"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(124,31,255,0.2)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a66aff" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h2 className="text-[#c39dff] font-bold text-sm uppercase tracking-widest">
              Como aplicar hoje
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {lesson.howToApplyToday.map((action, index) => (
              <div key={index} className="flex items-start gap-3">
                <div
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
                  style={{ background: "linear-gradient(135deg, #7c1fff, #a66aff)" }}
                >
                  {index + 1}
                </div>
                <p className="text-[#d4c0f0] text-base leading-relaxed">{action}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Curiosity (optional) */}
        {lesson.curiosity && (
          <div
            className="rounded-2xl p-5 flex flex-col gap-2"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">💡</span>
              <h2 className="text-[#a78bca] font-bold text-sm uppercase tracking-widest">
                Você sabia?
              </h2>
            </div>
            <p className="text-[#a78bca] text-sm leading-relaxed italic">
              {lesson.curiosity}
            </p>
          </div>
        )}

        {/* Export PDF */}
        <div className="relative group">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            style={
              canExport
                ? {
                    background: "rgba(124,31,255,0.12)",
                    border: "1px solid rgba(124,31,255,0.35)",
                    color: "#c39dff",
                  }
                : {
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#5c3d8a",
                    cursor: "not-allowed",
                  }
            }
          >
            {exporting ? (
              <>
                <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                  <path d="M12 3a9 9 0 019 9"/>
                </svg>
                Gerando PDF...
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="18" x2="12" y2="12"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                {canExport ? "Exportar PDF" : "Exportar PDF — Disponível no plano Pro"}
              </>
            )}
          </button>
          {!canExport && (
            <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ background: "rgba(20,10,40,0.95)", border: "1px solid rgba(124,31,255,0.4)" }}
            >
              Disponível no plano Pro
            </div>
          )}
        </div>

        {/* Modo Mentor */}
        <div className="relative group">
          <button
            onClick={() => canMentor && setMentorOpen(true)}
            className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all duration-150 flex items-center justify-center gap-2"
            style={
              canMentor
                ? {
                    background: "linear-gradient(135deg, rgba(124,31,255,0.2), rgba(166,106,255,0.15))",
                    border: "1px solid rgba(124,31,255,0.5)",
                    color: "#c39dff",
                  }
                : {
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#5c3d8a",
                    cursor: "not-allowed",
                  }
            }
          >
            💬 {canMentor ? "Falar com Mentor" : "Falar com Mentor — Plano Max"}
          </button>
          {!canMentor && (
            <div
              className="absolute -top-9 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ background: "rgba(20,10,40,0.95)", border: "1px solid rgba(124,31,255,0.4)" }}
            >
              Disponível no plano Max
            </div>
          )}
        </div>

        {/* New lesson CTA */}
        <button
          onClick={onNewLesson}
          className="w-full py-4 rounded-2xl font-bold text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          style={{
            background: "linear-gradient(135deg, #7c1fff 0%, #a66aff 100%)",
            boxShadow: "0 4px 20px rgba(124, 31, 255, 0.4)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          Aprender mais um assunto
        </button>

        <p className="text-center text-xs text-[#3d1f6e] pb-4">
          Gerado pelo Mindly · Powered by Claude AI
        </p>
      </main>

      {mentorOpen && (
        <MentorChat lesson={lesson} onClose={() => setMentorOpen(false)} />
      )}
    </div>
  );
}
