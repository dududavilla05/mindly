"use client";

import { useState, useCallback } from "react";
import type { LessonContent } from "@/types/lesson";
import type { SupabaseClientType } from "@/lib/supabase/client";
import type { JourneyLesson, JourneyItem } from "@/hooks/useJourneys";
import GeneratingOverlay from "./GeneratingOverlay";

interface JourneyState {
  id?: string;
  title: string;
  objective: string;
  duration_days: number;
  lessons: JourneyLesson[];
  completed_days: number[];
}

interface JourneyProps {
  plan?: string | null;
  userId?: string;
  supabase?: SupabaseClientType | null;
  onBack: () => void;
  initialJourney?: JourneyItem | null;
  onLessonGenerated: (lesson: LessonContent, subject: string) => void;
  onSaved?: () => void;
}

const JOURNEY_PHASES = [
  "Analisando seu objetivo...",
  "Estruturando o plano de estudos...",
  "Criando lições progressivas...",
  "Organizando a jornada...",
  "Quase pronto...",
];

const DURATION_OPTIONS: { value: 7 | 15 | 30; label: string; desc: string }[] = [
  { value: 7,  label: "7 dias",  desc: "Visão geral rápida" },
  { value: 15, label: "15 dias", desc: "Aprendizado completo" },
  { value: 30, label: "30 dias", desc: "Domínio profundo" },
];

export default function Journey({
  plan, userId, supabase, onBack, initialJourney, onLessonGenerated, onSaved,
}: JourneyProps) {
  const isMax = plan === "max";

  const [phase, setPhase] = useState<"form" | "loading" | "plan">(
    initialJourney ? "plan" : "form"
  );
  const [objective, setObjective] = useState(initialJourney?.objective ?? "");
  const [durationDays, setDurationDays] = useState<7 | 15 | 30>(
    (initialJourney?.duration_days as 7 | 15 | 30) ?? 7
  );
  const [journey, setJourney] = useState<JourneyState | null>(
    initialJourney ? { ...initialJourney } : null
  );
  const [error, setError] = useState("");
  const [loadingLessonDay, setLoadingLessonDay] = useState<number | null>(null);

  const progress = journey
    ? Math.round((journey.completed_days.length / journey.duration_days) * 100)
    : 0;

  const handleCreate = useCallback(async () => {
    if (!objective.trim()) return;
    setPhase("loading");
    setError("");
    try {
      const res = await fetch("/api/journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objective: objective.trim(), duration_days: durationDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar jornada");

      const newJourney: JourneyState = {
        title: data.title,
        objective: data.objective,
        duration_days: data.duration_days,
        lessons: data.lessons,
        completed_days: [],
      };
      setJourney(newJourney);
      setPhase("plan");

      if (userId && supabase) {
        const { data: saved } = await supabase
          .from("journeys")
          .insert({
            user_id: userId,
            title: newJourney.title,
            objective: newJourney.objective,
            duration_days: newJourney.duration_days,
            lessons: newJourney.lessons,
            completed_days: [],
          })
          .select("id")
          .single();
        if (saved?.id) setJourney(prev => prev ? { ...prev, id: saved.id } : prev);
        onSaved?.();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar jornada");
      setPhase("form");
    }
  }, [objective, durationDays, userId, supabase, onSaved]);

  const toggleDay = useCallback(async (day: number) => {
    if (!journey) return;
    const newCompleted = journey.completed_days.includes(day)
      ? journey.completed_days.filter(d => d !== day)
      : [...journey.completed_days, day];
    setJourney(prev => prev ? { ...prev, completed_days: newCompleted } : prev);
    if (journey.id && supabase) {
      await supabase.from("journeys").update({ completed_days: newCompleted }).eq("id", journey.id);
    }
  }, [journey, supabase]);

  const studyLesson = useCallback(async (lesson: JourneyLesson) => {
    if (loadingLessonDay !== null) return;
    setLoadingLessonDay(lesson.day);
    setError("");
    try {
      const res = await fetch("/api/generate-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: lesson.title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar lição");
      onLessonGenerated(data.lesson as LessonContent, lesson.title);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar lição");
    } finally {
      setLoadingLessonDay(null);
    }
  }, [loadingLessonDay, onLessonGenerated]);

  const handleNewJourney = () => {
    setPhase("form");
    setJourney(null);
    setObjective("");
    setDurationDays(7);
    setError("");
  };

  /* ── Upsell (não-Max) ── */
  if (!isMax) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-6" style={{ background: "#0f0a1e" }}>
        <span className="text-5xl">🧭</span>
        <h2 className="text-2xl font-bold text-white text-center">Jornada de Aprendizado</h2>
        <p className="text-[#a78bca] text-center max-w-sm">
          A Jornada de Aprendizado é exclusiva para usuários do plano{" "}
          <strong className="text-white">Max</strong>. Crie planos de estudos com IA e acompanhe seu progresso dia a dia.
        </p>
        <a
          href="/planos"
          className="px-6 py-3 rounded-xl font-bold text-white transition-all hover:scale-105"
          style={{ background: "linear-gradient(135deg, #7c1fff, #a66aff)" }}
        >
          Ver planos
        </a>
        <button onClick={onBack} className="text-sm text-[#7a6a9a] hover:text-white transition-colors">
          ← Voltar
        </button>
      </div>
    );
  }

  /* ── Loading overlay ── */
  if (phase === "loading") {
    return <GeneratingOverlay phases={JOURNEY_PHASES} />;
  }

  /* ── Formulário ── */
  if (phase === "form") {
    return (
      <div className="flex flex-col min-h-screen" style={{ background: "#0f0a1e" }}>
        {/* Header */}
        <header
          className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b shrink-0"
          style={{ background: "rgba(15,10,30,0.95)", borderColor: "rgba(124,31,255,0.2)", backdropFilter: "blur(20px)" }}
        >
          <button
            onClick={onBack}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-[#a78bca] hover:text-white transition-colors"
            style={{ background: "rgba(124,31,255,0.1)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-lg">🧭</span>
          <span className="text-white font-semibold text-sm">Jornada de Aprendizado</span>
        </header>

        {/* Form content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
          <div
            className="w-full max-w-lg flex flex-col gap-6 rounded-3xl p-6 sm:p-8"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(124,31,255,0.25)",
              boxShadow: "0 8px 40px rgba(124,31,255,0.15)",
            }}
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="text-4xl">🧭</span>
              <h1 className="text-xl sm:text-2xl font-black text-white">Crie sua Jornada</h1>
              <p className="text-sm text-[#a78bca]">
                Defina um objetivo e a IA monta um plano de estudos progressivo para você
              </p>
            </div>

            {/* Objetivo */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#c39dff] uppercase tracking-widest">
                Qual é seu objetivo?
              </label>
              <textarea
                value={objective}
                onChange={e => { setObjective(e.target.value); setError(""); }}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && objective.trim()) { e.preventDefault(); handleCreate(); }}}
                placeholder="Ex: Quero aprender sobre investimentos do zero, Dominar Python para análise de dados..."
                rows={3}
                className="w-full resize-none rounded-2xl px-4 py-3 text-white placeholder-[#4a3870] text-sm outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(124,31,255,0.2)",
                  lineHeight: "1.6",
                }}
                onFocus={e => { e.target.style.border = "1px solid rgba(124,31,255,0.6)"; }}
                onBlur={e => { e.target.style.border = "1px solid rgba(124,31,255,0.2)"; }}
              />
            </div>

            {/* Duração */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#c39dff] uppercase tracking-widest">
                Duração da jornada
              </label>
              <div className="grid grid-cols-3 gap-2">
                {DURATION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDurationDays(opt.value)}
                    className="flex flex-col items-center gap-0.5 py-3 rounded-xl transition-all"
                    style={durationDays === opt.value ? {
                      background: "linear-gradient(135deg, rgba(124,31,255,0.3), rgba(166,106,255,0.2))",
                      border: "1px solid rgba(124,31,255,0.6)",
                    } : {
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(124,31,255,0.15)",
                    }}
                  >
                    <span className={`font-bold text-sm ${durationDays === opt.value ? "text-white" : "text-[#7a6a9a]"}`}>
                      {opt.label}
                    </span>
                    <span className={`text-[10px] ${durationDays === opt.value ? "text-[#c39dff]" : "text-[#4a3870]"}`}>
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-red-300"
                style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)" }}
              >
                {error}
              </div>
            )}

            {/* Button */}
            <button
              onClick={handleCreate}
              disabled={!objective.trim()}
              className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #7c1fff, #a66aff)", boxShadow: "0 4px 20px rgba(124,31,255,0.4)" }}
            >
              <span className="flex items-center justify-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                Criar Jornada com IA
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Plano da jornada ── */
  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#0f0a1e" }}>
      {/* Header */}
      <header
        className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b shrink-0 sticky top-0 z-10"
        style={{ background: "rgba(15,10,30,0.95)", borderColor: "rgba(124,31,255,0.2)", backdropFilter: "blur(20px)" }}
      >
        <button
          onClick={onBack}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-[#a78bca] hover:text-white transition-colors shrink-0"
          style={{ background: "rgba(124,31,255,0.1)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-lg shrink-0">🧭</span>
        <span className="text-white font-semibold text-sm truncate flex-1 min-w-0">
          {journey?.title ?? "Jornada"}
        </span>
        <button
          onClick={handleNewJourney}
          className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#c39dff] hover:text-white transition-all"
          style={{ background: "rgba(124,31,255,0.12)", border: "1px solid rgba(124,31,255,0.25)" }}
        >
          + Nova
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
        {/* Título e objetivo */}
        <div className="flex flex-col gap-1">
          <h1
            className="text-2xl sm:text-3xl font-black leading-tight"
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, #c39dff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {journey?.title}
          </h1>
          <p className="text-sm text-[#7a6a9a]">{journey?.objective}</p>
        </div>

        {/* Progresso */}
        <div
          className="rounded-2xl p-4 flex flex-col gap-3"
          style={{ background: "rgba(124,31,255,0.08)", border: "1px solid rgba(124,31,255,0.2)" }}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#c39dff] font-semibold">Progresso da jornada</span>
            <span className="text-white font-bold">{progress}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(124,31,255,0.15)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: progress === 100
                  ? "linear-gradient(90deg, #22c55e, #4ade80)"
                  : "linear-gradient(90deg, #7c1fff, #a66aff)",
              }}
            />
          </div>
          <p className="text-xs text-[#7a6a9a]">
            {journey?.completed_days.length} de {journey?.duration_days} dias concluídos
            {progress === 100 && " 🎉"}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-red-300"
            style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)" }}
          >
            {error}
          </div>
        )}

        {/* Lista de lições */}
        <div className="flex flex-col gap-3">
          {journey?.lessons.map(lesson => {
            const isDone = journey.completed_days.includes(lesson.day);
            const isLoadingThis = loadingLessonDay === lesson.day;
            return (
              <div
                key={lesson.day}
                className="rounded-2xl p-4 flex items-start gap-3 transition-all"
                style={{
                  background: isDone
                    ? "rgba(34,197,94,0.07)"
                    : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isDone ? "rgba(34,197,94,0.2)" : "rgba(124,31,255,0.15)"}`,
                }}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleDay(lesson.day)}
                  className="shrink-0 mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-all"
                  style={{
                    background: isDone ? "rgba(34,197,94,0.3)" : "rgba(124,31,255,0.1)",
                    border: `1.5px solid ${isDone ? "rgba(34,197,94,0.6)" : "rgba(124,31,255,0.3)"}`,
                  }}
                  aria-label={isDone ? "Desmarcar dia" : "Marcar como concluído"}
                >
                  {isDone && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        background: isDone ? "rgba(34,197,94,0.15)" : "rgba(124,31,255,0.15)",
                        color: isDone ? "#4ade80" : "#a78bca",
                      }}
                    >
                      Dia {lesson.day}
                    </span>
                    <h3
                      className="text-sm font-semibold leading-snug"
                      style={{ color: isDone ? "#86efac" : "#e2d9f5" }}
                    >
                      {lesson.title}
                    </h3>
                  </div>
                  <p className="text-xs text-[#7a6a9a] leading-relaxed">{lesson.description}</p>
                </div>

                {/* Estudar button */}
                <button
                  onClick={() => studyLesson(lesson)}
                  disabled={isLoadingThis || loadingLessonDay !== null}
                  className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: isDone ? "rgba(34,197,94,0.12)" : "rgba(124,31,255,0.15)",
                    border: `1px solid ${isDone ? "rgba(34,197,94,0.3)" : "rgba(124,31,255,0.3)"}`,
                    color: isDone ? "#86efac" : "#c39dff",
                  }}
                >
                  {isLoadingThis ? (
                    <span className="flex items-center gap-1">
                      <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3" />
                        <path d="M12 3a9 9 0 019 9" />
                      </svg>
                    </span>
                  ) : (
                    isDone ? "Rever" : "Estudar"
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
