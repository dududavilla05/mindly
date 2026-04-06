"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { UserProfile } from "@/app/page";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface LanguageModuleProps {
  profile: UserProfile | null;
  onBack: () => void;
  onProfileUpdated?: () => void;
}

const LANGUAGES = [
  { id: "Inglês", flag: "🇺🇸" },
  { id: "Espanhol", flag: "🇪🇸" },
  { id: "Francês", flag: "🇫🇷" },
  { id: "Alemão", flag: "🇩🇪" },
  { id: "Italiano", flag: "🇮🇹" },
  { id: "Japonês", flag: "🇯🇵" },
  { id: "Mandarim", flag: "🇨🇳" },
];

const LEVELS = ["Iniciante", "Intermediário", "Avançado"];

const QUICK_ACTIONS = [
  { label: "Me dê vocabulário do dia", emoji: "📚" },
  { label: "Quero praticar conversação", emoji: "💬" },
  { label: "Me explique uma gramática", emoji: "📝" },
];

export default function LanguageModule({ profile, onBack, onProfileUpdated }: LanguageModuleProps) {
  const [view, setView] = useState<"select" | "chat">("select");
  const [selectedLanguage, setSelectedLanguage] = useState(profile?.language_learning ?? "Inglês");
  const [selectedLevel, setSelectedLevel] = useState(profile?.language_level ?? "Iniciante");
  const [saving, setSaving] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (view === "chat") {
      inputRef.current?.focus();
    }
  }, [view]);

  const handleStart = async () => {
    setSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language_learning: selectedLanguage,
          language_level: selectedLevel,
        }),
      });
      onProfileUpdated?.();
    } catch { /* silencioso */ } finally {
      setSaving(false);
    }

    const lang = LANGUAGES.find((l) => l.id === selectedLanguage);
    const greeting = `Olá! Sou seu professor de **${selectedLanguage}** ${lang?.flag ?? "🌍"}. Estou aqui para ajudar você a aprender no nível **${selectedLevel}**. Por onde quer começar? Pode me escrever em português ou já tentar em ${selectedLanguage}! 😊`;
    setMessages([{ role: "assistant", content: greeting }]);
    setView("chat");
  };

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const userMessage: Message = { role: "user", content: msg };
    const history = [...messages, userMessage];
    setMessages(history);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/idiomas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.filter((m, i) => !(m.role === "assistant" && i === 0)),
          userMessage: msg,
          language: selectedLanguage,
          level: selectedLevel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro desconhecido");
      setMessages([...history, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages([
        ...history,
        { role: "assistant", content: "Desculpe, ocorreu um erro. Tente novamente." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const lang = LANGUAGES.find((l) => l.id === selectedLanguage);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "rgba(15,10,30,1)" }}
    >
      {/* Header */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 md:px-6 h-14 border-b"
        style={{
          background: "rgba(15,10,30,0.95)",
          borderColor: "rgba(124,31,255,0.2)",
          backdropFilter: "blur(16px)",
        }}
      >
        <button
          onClick={view === "chat" ? () => setView("select") : onBack}
          className="flex items-center justify-center w-8 h-8 rounded-xl text-[#a78bca] hover:text-white transition-colors"
          style={{ background: "rgba(124,31,255,0.12)", border: "1px solid rgba(124,31,255,0.2)" }}
          aria-label="Voltar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
            style={{ background: "linear-gradient(135deg, #7c1fff, #a66aff)" }}
          >
            🌍
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">Módulo de Idiomas</p>
            {view === "chat" && (
              <p className="text-[#7a6a9a] text-xs mt-0.5">{lang?.flag} {selectedLanguage} · {selectedLevel}</p>
            )}
          </div>
        </div>

        <div
          className="ml-auto px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{
            background: "linear-gradient(135deg, rgba(124,31,255,0.3), rgba(166,106,255,0.3))",
            border: "1px solid rgba(124,31,255,0.4)",
            color: "#c39dff",
          }}
        >
          Max
        </div>
      </div>

      {/* Content */}
      {view === "select" ? (
        <div className="flex-1 flex items-start justify-center px-4 py-8 overflow-y-auto">
          <div className="w-full max-w-lg flex flex-col gap-8">

            {/* Título */}
            <div className="text-center">
              <div className="text-4xl mb-3">🌍</div>
              <h1 className="text-2xl font-bold text-white mb-2">Aprenda um Idioma</h1>
              <p className="text-[#7a6a9a] text-sm">Converse com um professor nativo com IA</p>
            </div>

            {/* Seleção de idioma */}
            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold text-[#c39dff] uppercase tracking-widest">
                Escolha seu idioma
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => setSelectedLanguage(lang.id)}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 hover:scale-105 active:scale-95"
                    style={
                      selectedLanguage === lang.id
                        ? {
                            background: "linear-gradient(135deg, #7c1fff, #a66aff)",
                            color: "#ffffff",
                            boxShadow: "0 0 16px rgba(124,31,255,0.5)",
                          }
                        : {
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(124,31,255,0.2)",
                            color: "#c39dff",
                          }
                    }
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <span>{lang.id}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Seleção de nível */}
            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold text-[#c39dff] uppercase tracking-widest">
                Seu nível
              </label>
              <div className="flex gap-2">
                {LEVELS.map((level) => (
                  <button
                    key={level}
                    onClick={() => setSelectedLevel(level)}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:scale-105 active:scale-95"
                    style={
                      selectedLevel === level
                        ? {
                            background: "linear-gradient(135deg, #7c1fff, #a66aff)",
                            color: "#ffffff",
                            boxShadow: "0 0 16px rgba(124,31,255,0.5)",
                          }
                        : {
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(124,31,255,0.2)",
                            color: "#c39dff",
                          }
                    }
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Botão Começar */}
            <button
              onClick={handleStart}
              disabled={saving}
              className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #7c1fff 0%, #a66aff 100%)",
                boxShadow: "0 4px 20px rgba(124,31,255,0.5)",
              }}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3" />
                    <path d="M12 3a9 9 0 019 9" />
                  </svg>
                  Iniciando...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>{lang?.flag ?? "🌍"}</span>
                  Começar com {selectedLanguage}
                </span>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Chat view */
        <div className="flex-1 flex flex-col min-h-0">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3" style={{ minHeight: 0 }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
                  style={
                    msg.role === "user"
                      ? {
                          background: "linear-gradient(135deg, #7c1fff, #a66aff)",
                          color: "#ffffff",
                          borderBottomRightRadius: "6px",
                        }
                      : {
                          background: "rgba(255,255,255,0.07)",
                          border: "1px solid rgba(124,31,255,0.2)",
                          color: "#d4c0f0",
                          borderBottomLeftRadius: "6px",
                        }
                  }
                >
                  {msg.role === "user" ? (
                    msg.content
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        h1: ({ children }) => <h1 className="text-base font-bold text-white mb-2 mt-3 first:mt-0">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-sm font-bold text-[#c39dff] mb-2 mt-3 first:mt-0">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-semibold text-[#a78bfa] mb-1 mt-2 first:mt-0">{children}</h3>,
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="text-[#d4c0f0]">{children}</li>,
                        strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                        em: ({ children }) => <em className="italic text-[#c4b5fd]">{children}</em>,
                        code: ({ inline, children }: { inline?: boolean; children?: React.ReactNode }) =>
                          inline ? (
                            <code className="px-1.5 py-0.5 rounded text-xs font-mono text-[#c39dff]" style={{ background: "rgba(124,31,255,0.2)" }}>{children}</code>
                          ) : (
                            <pre className="rounded-xl p-3 my-2 overflow-x-auto text-xs font-mono text-[#c39dff]" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(124,31,255,0.2)" }}>
                              <code>{children}</code>
                            </pre>
                          ),
                        blockquote: ({ children }) => <blockquote className="pl-3 my-2 italic text-[#a78bfa]" style={{ borderLeft: "3px solid rgba(124,31,255,0.5)" }}>{children}</blockquote>,
                        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#a78bfa] underline hover:text-[#c4b5fd]">{children}</a>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div
                  className="px-4 py-3 rounded-2xl text-sm flex items-center gap-2"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(124,31,255,0.2)",
                    color: "#7a6a9a",
                    borderBottomLeftRadius: "6px",
                  }}
                >
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                  Professor pensando...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick action buttons */}
          <div
            className="px-4 pt-3 pb-2 flex flex-wrap gap-2 border-t shrink-0"
            style={{ borderColor: "rgba(124,31,255,0.15)" }}
          >
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => sendMessage(action.label)}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "rgba(124,31,255,0.12)",
                  border: "1px solid rgba(124,31,255,0.25)",
                  color: "#c39dff",
                }}
              >
                <span>{action.emoji}</span>
                {action.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div
            className="px-4 pb-4 pt-2 border-t shrink-0"
            style={{ borderColor: "rgba(124,31,255,0.2)" }}
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Escreva em ${selectedLanguage} ou em português... (Enter para enviar)`}
                rows={1}
                disabled={loading}
                className="flex-1 resize-none rounded-xl px-4 py-3 text-sm text-white placeholder-[#4a3870] outline-none transition-all duration-200 disabled:opacity-50"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(124,31,255,0.25)",
                  maxHeight: "120px",
                  lineHeight: "1.5",
                }}
                onFocus={(e) => { e.target.style.border = "1px solid rgba(124,31,255,0.6)"; }}
                onBlur={(e) => { e.target.style.border = "1px solid rgba(124,31,255,0.25)"; }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                style={{ background: "linear-gradient(135deg, #7c1fff, #a66aff)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
