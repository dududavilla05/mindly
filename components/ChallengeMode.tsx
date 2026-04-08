"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import GeneratingOverlay from "./GeneratingOverlay";
import FirstTimeModal from "./FirstTimeModal";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/app/page";

interface Question {
  question: string;
  options: string[]; // ["A) texto", "B) texto", "C) texto", "D) texto"]
  correct: string;   // "A" | "B" | "C" | "D"
  explanation: string;
}

type Difficulty = "Fácil" | "Médio" | "Difícil";
type QuizScreen = "setup" | "quiz" | "result";

const DIFFICULTIES: { value: Difficulty; count: number; color: string; border: string }[] = [
  { value: "Fácil",   count: 5,  color: "#22c55e", border: "rgba(34,197,94,0.45)"  },
  { value: "Médio",   count: 10, color: "#f59e0b", border: "rgba(245,158,11,0.45)" },
  { value: "Difícil", count: 15, color: "#ef4444", border: "rgba(239,68,68,0.45)"  },
];

const GENERATING_PHASES = [
  "Analisando o tema...",
  "Elaborando questões...",
  "Criando as alternativas...",
  "Preparando as explicações...",
  "Quase pronto...",
];

interface ChallengeModeProps {
  profile: UserProfile | null;
  onBack: () => void;
}

export default function ChallengeMode({ onBack }: ChallengeModeProps) {
  const [quizScreen, setQuizScreen] = useState<QuizScreen>("setup");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Médio");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [micListening, setMicListening] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const micRef = useRef<unknown>(null);

  useEffect(() => () => { (micRef.current as { stop?: () => void })?.stop?.(); }, []);

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const supabase = createClient();
    if (!supabase) return { "Content-Type": "application/json" };
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return { "Content-Type": "application/json" };
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    };
  }, []);

  const toggleMic = useCallback(() => {
    if (micListening) {
      (micRef.current as { stop?: () => void })?.stop?.();
      setMicListening(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setMicSupported(false); return; }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition = new SR() as any;
      recognition.lang = "pt-BR";
      recognition.continuous = false;
      recognition.interimResults = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (e: any) => {
        const t = (e.results[0]?.[0]?.transcript ?? "") as string;
        if (t) setTopic(t);
      };
      recognition.onend = () => setMicListening(false);
      recognition.onerror = () => setMicListening(false);
      micRef.current = recognition;
      recognition.start();
      setMicListening(true);
    } catch {
      setMicListening(false);
    }
  }, [micListening]);

  const handleStart = useCallback(async () => {
    if (!topic.trim() || loading) return;
    setError("");
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/challenge", {
        method: "POST",
        headers,
        body: JSON.stringify({ topic: topic.trim(), difficulty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar questões");
      if (!Array.isArray(data.questions) || !data.questions.length)
        throw new Error("Nenhuma questão foi gerada");
      setQuestions(data.questions);
      setAnswers(new Array(data.questions.length).fill(null));
      setCurrentIndex(0);
      setQuizScreen("quiz");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [topic, difficulty, loading, getAuthHeaders]);

  const handleAnswer = useCallback((letter: string) => {
    if (answers[currentIndex] !== null) return;
    setAnswers(prev => {
      const updated = [...prev];
      updated[currentIndex] = letter;
      return updated;
    });
  }, [answers, currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      setQuizScreen("result");
    }
  }, [currentIndex, questions.length]);

  const score = answers.filter((a, i) => a !== null && a === questions[i]?.correct).length;
  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  const classification =
    pct <= 40 ? { text: "Continue estudando", emoji: "📚", color: "#ef4444" } :
    pct <= 70 ? { text: "Bom trabalho!", emoji: "👍", color: "#f59e0b" } :
    pct <= 90 ? { text: "Muito bem!", emoji: "🌟", color: "#22c55e" } :
               { text: "Perfeito!", emoji: "🏆", color: "#a66aff" };

  const diffConfig = DIFFICULTIES.find(d => d.value === difficulty)!;
  const currentQ = questions[currentIndex];
  const currentAnswer = answers[currentIndex] ?? null;

  if (loading) return <GeneratingOverlay phases={GENERATING_PHASES} />;

  // ── SETUP SCREEN ──────────────────────────────────────────────────────────
  if (quizScreen === "setup") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0f0a1e", color: "#e8e0f0" }}>
        <FirstTimeModal
          storageKey="mindly_seen_challenge"
          icon="🎯"
          title="Modo Desafio"
          description="Teste seus conhecimentos com quizzes gerados por IA. Escolha qualquer tema, defina a dificuldade e veja sua pontuação final."
          buttonText="Aceitar desafio!"
        />
        <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
          <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, #7c1fff 0%, transparent 65%)", filter: "blur(80px)" }} />
          <div className="absolute bottom-[-15%] right-[-10%] w-96 h-96 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #a66aff 0%, transparent 65%)", filter: "blur(60px)" }} />
        </div>

        <div className="relative z-10 flex flex-col flex-1 max-w-lg mx-auto w-full px-4 py-8 md:py-16">
          <button
            onClick={onBack}
            className="self-start flex items-center gap-2 text-sm text-[#a78bca] hover:text-white transition-colors mb-8"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Voltar
          </button>

          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🎯</div>
            <h1 className="text-2xl font-bold text-white mb-1">Modo Desafio</h1>
            <p className="text-sm text-[#a78bca]">Teste seus conhecimentos com questões de múltipla escolha</p>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-semibold text-[#a78bca] mb-2 uppercase tracking-wider">
              Tema do desafio
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleStart()}
                placeholder="Ex: Fotossíntese, Segunda Guerra Mundial, Python..."
                className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder-[#5a4a7a] outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: topic.trim() ? "1px solid rgba(124,31,255,0.5)" : "1px solid rgba(124,31,255,0.2)",
                }}
              />
              {micSupported && (
                <button
                  onClick={toggleMic}
                  className="flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 shrink-0"
                  style={{
                    background: micListening ? "rgba(239,68,68,0.2)" : "rgba(124,31,255,0.12)",
                    border: micListening ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(124,31,255,0.25)",
                  }}
                  title={micListening ? "Parar microfone" : "Usar microfone"}
                >
                  {micListening ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#ef4444" stroke="none">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c39dff" strokeWidth="2">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  )}
                </button>
              )}
            </div>
            {micListening && (
              <p className="text-xs text-[#ef4444] mt-1.5 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse" />
                Ouvindo...
              </p>
            )}
          </div>

          <div className="mb-8">
            <label className="block text-xs font-semibold text-[#a78bca] mb-3 uppercase tracking-wider">
              Dificuldade
            </label>
            <div className="grid grid-cols-3 gap-3">
              {DIFFICULTIES.map(d => {
                const active = difficulty === d.value;
                return (
                  <button
                    key={d.value}
                    onClick={() => setDifficulty(d.value)}
                    className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-200"
                    style={{
                      background: active ? `${d.color}18` : "rgba(255,255,255,0.04)",
                      border: active ? `1px solid ${d.border}` : "1px solid rgba(255,255,255,0.08)",
                      transform: active ? "scale(1.03)" : "scale(1)",
                    }}
                  >
                    <span className="text-xs font-bold" style={{ color: active ? d.color : "#6b5a8a" }}>
                      {d.value}
                    </span>
                    <span className="text-xs" style={{ color: active ? `${d.color}bb` : "#4a3870" }}>
                      {d.count} questões
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm text-[#ef4444]"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
              {error}
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={!topic.trim()}
            className="w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-200"
            style={{
              background: topic.trim() ? "linear-gradient(135deg, #7c1fff, #a66aff)" : "rgba(124,31,255,0.12)",
              color: topic.trim() ? "white" : "#4a3870",
              cursor: topic.trim() ? "pointer" : "not-allowed",
              boxShadow: topic.trim() ? "0 0 24px rgba(124,31,255,0.3)" : "none",
            }}
          >
            Iniciar Desafio
          </button>
        </div>
      </div>
    );
  }

  // ── QUIZ SCREEN ───────────────────────────────────────────────────────────
  if (quizScreen === "quiz" && currentQ) {
    const progressPct = ((currentIndex + 1) / questions.length) * 100;
    const isAnswered = currentAnswer !== null;
    const isCorrect = currentAnswer === currentQ.correct;
    const isLast = currentIndex === questions.length - 1;

    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0f0a1e", color: "#e8e0f0" }}>
        {/* Progress header */}
        <div
          className="sticky top-0 z-10 px-4 py-3"
          style={{
            background: "rgba(15,10,30,0.92)",
            backdropFilter: "blur(14px)",
            borderBottom: "1px solid rgba(124,31,255,0.12)",
          }}
        >
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button
              onClick={() => setQuizScreen("setup")}
              className="text-[#a78bca] hover:text-white transition-colors shrink-0"
              title="Voltar ao início"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center text-xs text-[#a78bca] mb-1.5">
                <span className="truncate font-medium mr-2">{topic}</span>
                <span className="shrink-0">{currentIndex + 1} / {questions.length}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(124,31,255,0.15)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #7c1fff, #a66aff)" }}
                />
              </div>
            </div>
            <span className="text-xs font-bold shrink-0" style={{ color: diffConfig.color }}>
              {difficulty}
            </span>
          </div>
        </div>

        {/* Question + options */}
        <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6 gap-5">
          <div
            className="p-5 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(124,31,255,0.2)" }}
          >
            <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "#7c1fff" }}>
              Questão {currentIndex + 1}
            </p>
            <p className="text-base font-medium leading-relaxed text-white">
              {currentQ.question}
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            {currentQ.options.map(option => {
              const letter = option.charAt(0);
              const optText = option.replace(/^[A-D]\)\s*/, "");
              const isSelected = currentAnswer === letter;
              const isThisCorrect = letter === currentQ.correct;

              let bg = "rgba(255,255,255,0.04)";
              let border = "rgba(124,31,255,0.15)";
              let textColor = "#c8b8e0";
              let badgeBg = "rgba(124,31,255,0.18)";
              let badgeColor = "#a066ff";
              let badgeContent = letter;

              if (isAnswered) {
                if (isThisCorrect) {
                  bg = "rgba(34,197,94,0.1)";
                  border = "rgba(34,197,94,0.4)";
                  textColor = "#86efac";
                  badgeBg = "rgba(34,197,94,0.22)";
                  badgeColor = "#4ade80";
                  badgeContent = "✓";
                } else if (isSelected) {
                  bg = "rgba(239,68,68,0.1)";
                  border = "rgba(239,68,68,0.4)";
                  textColor = "#fca5a5";
                  badgeBg = "rgba(239,68,68,0.22)";
                  badgeColor = "#f87171";
                  badgeContent = "✗";
                } else {
                  bg = "rgba(255,255,255,0.02)";
                  border = "rgba(124,31,255,0.08)";
                  textColor = "#6b5a8a";
                  badgeBg = "rgba(124,31,255,0.08)";
                  badgeColor = "#5a4a7a";
                }
              }

              return (
                <button
                  key={letter}
                  onClick={() => handleAnswer(letter)}
                  disabled={isAnswered}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all duration-200"
                  style={{
                    background: bg,
                    border: `1px solid ${border}`,
                    cursor: isAnswered ? "default" : "pointer",
                  }}
                >
                  <span
                    className="flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold shrink-0 transition-all duration-200"
                    style={{ background: badgeBg, color: badgeColor }}
                  >
                    {badgeContent}
                  </span>
                  <span className="text-sm leading-snug" style={{ color: textColor }}>
                    {optText}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {isAnswered && (
            <div
              className="p-4 rounded-xl"
              style={{
                background: isCorrect ? "rgba(34,197,94,0.07)" : "rgba(239,68,68,0.07)",
                border: `1px solid ${isCorrect ? "rgba(34,197,94,0.28)" : "rgba(239,68,68,0.28)"}`,
              }}
            >
              <p className="text-xs font-bold mb-1.5" style={{ color: isCorrect ? "#4ade80" : "#f87171" }}>
                {isCorrect ? "✓ Correto!" : `✗ Incorreto — resposta: ${currentQ.correct}`}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "#c8b8e0" }}>
                {currentQ.explanation}
              </p>
            </div>
          )}

          {/* Next button */}
          {isAnswered && (
            <button
              onClick={handleNext}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]"
              style={{
                background: "linear-gradient(135deg, #7c1fff, #a66aff)",
                boxShadow: "0 0 20px rgba(124,31,255,0.3)",
              }}
            >
              {isLast ? "Ver resultado" : "Próxima questão →"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── RESULT SCREEN ─────────────────────────────────────────────────────────
  if (quizScreen === "result") {
    const barColor =
      pct >= 91 ? "linear-gradient(90deg, #7c1fff, #a66aff)" :
      pct >= 71 ? "linear-gradient(90deg, #16a34a, #22c55e)" :
      pct >= 41 ? "linear-gradient(90deg, #d97706, #f59e0b)" :
                  "linear-gradient(90deg, #dc2626, #ef4444)";

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#0f0a1e", color: "#e8e0f0" }}>
        <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
          <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, #7c1fff 0%, transparent 65%)", filter: "blur(80px)" }} />
          <div className="absolute bottom-[-15%] right-[-10%] w-96 h-96 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #a66aff 0%, transparent 65%)", filter: "blur(60px)" }} />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full py-8 gap-6">
          <div className="text-6xl">{classification.emoji}</div>

          <div>
            <h2 className="text-2xl font-bold mb-1" style={{ color: classification.color }}>
              {classification.text}
            </h2>
            <p className="text-sm text-[#a78bca]">{topic} • {difficulty}</p>
          </div>

          <div
            className="w-full p-6 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(124,31,255,0.25)" }}
          >
            <div className="flex items-start justify-between mb-5">
              <div className="text-left">
                <p className="text-xs text-[#a78bca] mb-1">Acertos</p>
                <p className="text-4xl font-bold text-white leading-none">
                  {score}
                  <span className="text-xl text-[#a78bca] font-normal"> / {questions.length}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#a78bca] mb-1">Aproveitamento</p>
                <p className="text-4xl font-bold leading-none" style={{ color: classification.color }}>
                  {pct}<span className="text-xl font-normal">%</span>
                </p>
              </div>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(124,31,255,0.15)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: barColor, transition: "width 0.8s ease" }}
              />
            </div>
          </div>

          <div className="w-full flex flex-col gap-3">
            <button
              onClick={() => {
                setAnswers(new Array(questions.length).fill(null));
                setCurrentIndex(0);
                setQuizScreen("quiz");
              }}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]"
              style={{ background: "linear-gradient(135deg, #7c1fff, #a66aff)", boxShadow: "0 0 20px rgba(124,31,255,0.3)" }}
            >
              Tentar novamente
            </button>
            <button
              onClick={() => {
                setQuizScreen("setup");
                setTopic("");
                setQuestions([]);
                setAnswers([]);
                setCurrentIndex(0);
                setError("");
              }}
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-[#c39dff] hover:text-white transition-colors"
              style={{ background: "rgba(124,31,255,0.1)", border: "1px solid rgba(124,31,255,0.25)" }}
            >
              Novo tema
            </button>
            <button
              onClick={onBack}
              className="w-full py-2.5 text-xs text-[#6b5a8a] hover:text-[#a78bca] transition-colors"
            >
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
