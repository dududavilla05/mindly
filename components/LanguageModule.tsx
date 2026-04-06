"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { UserProfile } from "@/app/page";

interface Message {
  role: "user" | "assistant";
  content: string;
  ts: string; // ISO timestamp
}

interface Session {
  id: string;
  language: string;
  level: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

interface LanguageModuleProps {
  profile: UserProfile | null;
  onBack: () => void;
  onProfileUpdated?: () => void;
}

const LANGUAGES = [
  { id: "Inglês",   flag: "🇺🇸" },
  { id: "Espanhol", flag: "🇪🇸" },
  { id: "Francês",  flag: "🇫🇷" },
  { id: "Alemão",   flag: "🇩🇪" },
  { id: "Italiano", flag: "🇮🇹" },
  { id: "Japonês",  flag: "🇯🇵" },
  { id: "Mandarim", flag: "🇨🇳" },
];

const LEVELS = ["Iniciante", "Intermediário", "Avançado"];

const QUICK_ACTIONS = [
  { label: "Me dê vocabulário do dia", emoji: "📚" },
  { label: "Quero praticar conversação", emoji: "💬" },
  { label: "Me explique uma gramática", emoji: "📝" },
];

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatSessionDate(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins  = Math.floor(diff / 60_000);
    if (mins < 1)    return "agora";
    if (mins < 60)   return `${mins}m atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24)  return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    if (days === 1)  return "ontem";
    if (days < 7)    return `${days}d atrás`;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch {
    return "";
  }
}

const MarkdownComponents = {
  p:          ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  h1:         ({ children }: { children?: React.ReactNode }) => <h1 className="text-base font-bold text-white mb-2 mt-3 first:mt-0">{children}</h1>,
  h2:         ({ children }: { children?: React.ReactNode }) => <h2 className="text-sm font-bold text-[#c39dff] mb-1.5 mt-3 first:mt-0">{children}</h2>,
  h3:         ({ children }: { children?: React.ReactNode }) => <h3 className="text-xs font-semibold text-[#a78bfa] uppercase tracking-wide mb-1 mt-2.5 first:mt-0">{children}</h3>,
  ul:         ({ children }: { children?: React.ReactNode }) => <ul className="pl-3 mb-2 space-y-1.5">{children}</ul>,
  ol:         ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-4 mb-2 space-y-1.5">{children}</ol>,
  li:         ({ children }: { children?: React.ReactNode }) => (
    <li className="flex gap-2 text-[#d4c0f0]">
      <span className="text-[#7c1fff] mt-1 shrink-0">–</span>
      <span>{children}</span>
    </li>
  ),
  strong:     ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold text-white">{children}</strong>,
  em:         ({ children }: { children?: React.ReactNode }) => <em className="italic text-[#c4b5fd]">{children}</em>,
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="pl-3 py-1 my-2 italic text-[#a78bfa] text-sm" style={{ borderLeft: "2px solid rgba(124,31,255,0.5)", background: "rgba(124,31,255,0.06)", borderRadius: "0 8px 8px 0" }}>
      {children}
    </blockquote>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) =>
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#a78bfa] underline underline-offset-2 hover:text-[#c4b5fd]">{children}</a>,
  code: ({ inline, children }: { inline?: boolean; children?: React.ReactNode }) =>
    inline ? (
      <code className="px-1.5 py-0.5 rounded text-xs font-mono text-[#c39dff]" style={{ background: "rgba(124,31,255,0.18)" }}>{children}</code>
    ) : (
      <pre className="rounded-xl p-3 my-2 overflow-x-auto text-xs font-mono text-[#c39dff]" style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(124,31,255,0.18)" }}>
        <code>{children}</code>
      </pre>
    ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="overflow-x-auto my-3 rounded-xl" style={{ border: "1px solid rgba(124,31,255,0.2)", background: "rgba(124,31,255,0.04)" }}>
      <table className="w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead style={{ background: "rgba(124,31,255,0.12)" }}>{children}</thead>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="px-3 py-2 text-left text-xs font-semibold text-[#c39dff] whitespace-nowrap" style={{ borderBottom: "1px solid rgba(124,31,255,0.2)" }}>
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="px-3 py-2 text-[11px] text-[#d4c0f0] align-top" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      {children}
    </td>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr className="transition-colors hover:bg-white/[0.02]">{children}</tr>
  ),
};

export default function LanguageModule({ profile, onBack, onProfileUpdated }: LanguageModuleProps) {
  const [view,             setView]             = useState<"select" | "chat">("select");
  const [selectedLanguage, setSelectedLanguage] = useState(profile?.language_learning ?? "Inglês");
  const [selectedLevel,    setSelectedLevel]    = useState(profile?.language_level    ?? "Iniciante");
  const [saving,           setSaving]           = useState(false);
  const [messages,         setMessages]         = useState<Message[]>([]);
  const [input,            setInput]            = useState("");
  const [loading,          setLoading]          = useState(false);
  const [sessions,         setSessions]         = useState<Session[]>([]);
  const [sessionsLoading,  setSessionsLoading]  = useState(false);
  const [sessionId,        setSessionId]        = useState<string | null>(null);
  const [savingSession,    setSavingSession]    = useState(false);

  const bottomRef    = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Espelha o state — garante valor atual dentro de callbacks/closures
  const sessionIdRef       = useRef<string | null>(null);
  // Previne INSERT duplo: só um save com id=null pode rodar por vez
  const savingInProgressRef = useRef(false);

  const updateSessionId = useCallback((id: string | null) => {
    sessionIdRef.current = id;
    setSessionId(id);
  }, []);

  // ── Recarrega lista de sessões do banco ──
  const refreshSessions = useCallback(async () => {
    try {
      const r = await fetch("/api/idiomas/sessions");
      const d = await r.json();
      if (d.error) {
        console.error("[idiomas] refreshSessions API error:", d.error);
        return;
      }
      console.log("[idiomas] sessões recarregadas:", d.sessions?.length ?? 0);
      setSessions(d.sessions ?? []);
    } catch (err) {
      console.error("[idiomas] refreshSessions fetch error:", err);
    }
  }, []);

  // ── Carrega histórico ao montar ──
  useEffect(() => {
    setSessionsLoading(true);
    refreshSessions().finally(() => setSessionsLoading(false));
  }, [refreshSessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (view === "chat") inputRef.current?.focus();
  }, [view]);

  // ── Lógica central de save (sem guard) ──
  // Sempre usa sessionIdRef.current para evitar closures obsoletas.
  const doSave = useCallback(async (msgs: Message[], lang: string, lvl: string): Promise<boolean> => {
    if (msgs.length < 2) {
      console.log("[idiomas:save] skip — menos de 2 mensagens");
      return false;
    }
    const currentSid = sessionIdRef.current;
    const body: Record<string, unknown> = { language: lang, level: lvl, messages: msgs };
    if (currentSid) body.id = currentSid;

    console.log("[idiomas:save] POST → sessionId:", currentSid ?? "NEW", "| msgs:", msgs.length);

    const res = await fetch("/api/idiomas/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      console.error("[idiomas:save] API error:", data.error, "| status:", res.status);
      return false;
    }

    console.log("[idiomas:save] ok → id:", data.id);

    if (data.id && data.id !== currentSid) {
      // Nova sessão — sincroniza ref + state
      updateSessionId(data.id);
    }
    // Sempre recarrega a lista após qualquer save bem-sucedido
    await refreshSessions();
    return true;
  }, [updateSessionId, refreshSessions]);

  // ── Auto-save com guard anti-INSERT-duplo ──
  // O guard só bloqueia se um save com id=null já está em andamento.
  // Se id já existe, INSERTs duplos não são possíveis (UPDATE é idempotente).
  const persistSession = useCallback(async (msgs: Message[], lang: string, lvl: string) => {
    const isNewSession = !sessionIdRef.current;
    if (isNewSession && savingInProgressRef.current) {
      console.log("[idiomas:save] skip — INSERT já em andamento");
      return;
    }
    if (isNewSession) savingInProgressRef.current = true;
    setSavingSession(true);
    try {
      await doSave(msgs, lang, lvl);
    } catch (err) {
      console.error("[idiomas:save] persistSession error:", err);
      // Mesmo com erro, tenta refresh para exibir sessões já existentes
      refreshSessions();
    } finally {
      if (isNewSession) savingInProgressRef.current = false;
      setSavingSession(false);
    }
  }, [doSave, refreshSessions]);

  // ── Debounce de 2s após cada resposta da IA ──
  // Nula o ref após disparar para que handleEncerrar saiba que o timer já rodou.
  const scheduleAutoSave = useCallback((msgs: Message[], lang: string, lvl: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null; // timer disparou — limpa ref
      persistSession(msgs, lang, lvl);
    }, 2000);
  }, [persistSession]);

  const handleStart = async () => {
    setSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language_learning: selectedLanguage, language_level: selectedLevel }),
      });
      onProfileUpdated?.();
    } catch { /* silencioso */ } finally {
      setSaving(false);
    }
    const lang = LANGUAGES.find(l => l.id === selectedLanguage);
    const greeting: Message = {
      role: "assistant",
      content: `Olá! Sou seu professor de **${selectedLanguage}** ${lang?.flag ?? "🌍"}. Estou aqui para ajudar você a aprender no nível **${selectedLevel}**. Por onde quer começar? Pode me escrever em português ou já tentar em ${selectedLanguage}!`,
      ts: new Date().toISOString(),
    };
    setMessages([greeting]);
    updateSessionId(null);
    setView("chat");
  };

  const loadSession = (session: Session) => {
    setSelectedLanguage(session.language);
    setSelectedLevel(session.level);
    setMessages(session.messages);
    updateSessionId(session.id);
    setView("chat");
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    await fetch("/api/idiomas/sessions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (sessionIdRef.current === id) updateSessionId(null);
  };

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const userMessage: Message = { role: "user", content: msg, ts: new Date().toISOString() };
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
      const reply: Message = { role: "assistant", content: data.reply, ts: new Date().toISOString() };
      const updated = [...history, reply];
      setMessages(updated);
      // Usa scheduleAutoSave sem passar sessionId — lê do ref internamente
      scheduleAutoSave(updated, selectedLanguage, selectedLevel);
    } catch {
      const errMsg: Message = { role: "assistant", content: "Desculpe, ocorreu um erro. Tente novamente.", ts: new Date().toISOString() };
      setMessages([...history, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Inicia nova conversa com o mesmo idioma/nível sem voltar para seleção
  const handleNovaConversa = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    doSave(messages, selectedLanguage, selectedLevel)
      .catch(() => {})
      .finally(() => refreshSessions());
    const l = LANGUAGES.find(x => x.id === selectedLanguage);
    const greeting: Message = {
      role: "assistant",
      content: `Nova conversa! Estou pronto para continuar praticando **${selectedLanguage}** no nível **${selectedLevel}**. O que quer aprender agora?`,
      ts: new Date().toISOString(),
    };
    setMessages([greeting]);
    updateSessionId(null);
    setInput("");
  };

  const handleEncerrar = () => {
    // Cancela timer de auto-save pendente
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    // Navega imediatamente — o usuário vê a tela de seleção sem esperar
    setView("select");
    // Salva em background e sempre recarrega o histórico ao final,
    // mesmo que o save falhe (para mostrar sessões salvas anteriormente)
    doSave(messages, selectedLanguage, selectedLevel)
      .catch(err => console.error("[idiomas:save] handleEncerrar error:", err))
      .finally(() => {
        console.log("[idiomas] handleEncerrar: forçando refresh do histórico");
        refreshSessions();
      });
  };

  const lang = LANGUAGES.find(l => l.id === selectedLanguage);

  return (
    <div className="h-[100dvh] flex flex-col" style={{ background: "rgba(15,10,30,1)" }}>

      {/* ── Header ── */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 md:px-5 border-b"
        style={{ height: "56px", background: "rgba(15,10,30,0.95)", borderColor: "rgba(124,31,255,0.2)", backdropFilter: "blur(16px)" }}
      >
        {/* Botão voltar — 44px min para iOS HIG */}
        <button
          onClick={view === "chat" ? handleEncerrar : onBack}
          className="flex items-center justify-center rounded-xl text-[#a78bca] hover:text-white transition-colors shrink-0"
          style={{ width: "44px", height: "44px", background: "rgba(124,31,255,0.12)", border: "1px solid rgba(124,31,255,0.2)" }}
          aria-label="Voltar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0"
            style={{ background: "linear-gradient(135deg, #7c1fff, #a66aff)" }}
          >
            🌍
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-none truncate">Módulo de Idiomas</p>
            {view === "chat" && (
              <p className="text-[#7a6a9a] text-xs mt-0.5 truncate">{lang?.flag} {selectedLanguage} · {selectedLevel}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Indicador de salvamento — apenas desktop */}
          {view === "chat" && savingSession && (
            <span className="text-[10px] text-[#5a4870] hidden md:block">salvando...</span>
          )}

          {/* Botão Nova Conversa — visível no mobile quando em chat */}
          {view === "chat" && (
            <button
              onClick={handleNovaConversa}
              className="flex items-center gap-1.5 rounded-xl text-xs font-semibold text-[#c39dff] hover:text-white transition-all duration-200 shrink-0"
              style={{ height: "44px", padding: "0 12px", background: "rgba(124,31,255,0.12)", border: "1px solid rgba(124,31,255,0.25)" }}
              title="Nova conversa"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="hidden sm:block">Nova conversa</span>
              <span className="sm:hidden">Nova</span>
            </button>
          )}

          {/* Badge Max */}
          <div
            className="px-2.5 py-1 rounded-full text-xs font-semibold shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(124,31,255,0.3), rgba(166,106,255,0.3))", border: "1px solid rgba(124,31,255,0.4)", color: "#c39dff" }}
          >
            Max
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      {view === "select" ? (

        /* ── Tela de Seleção ── */
        <div className="flex-1 overflow-y-auto flex min-h-0">
          <div className="flex-1 flex items-start justify-center px-4 py-8">
            <div className="w-full max-w-lg flex flex-col gap-8">

              {/* Título */}
              <div className="text-center">
                <div className="text-4xl mb-3">🌍</div>
                <h1 className="text-2xl font-bold text-white mb-2">Aprenda um Idioma</h1>
                <p className="text-[#7a6a9a] text-sm">Converse com um professor nativo com IA</p>
              </div>

              {/* Seleção de idioma */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-[#c39dff] uppercase tracking-widest">Escolha seu idioma</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setSelectedLanguage(l.id)}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 hover:scale-105 active:scale-95"
                      style={selectedLanguage === l.id
                        ? { background: "linear-gradient(135deg, #7c1fff, #a66aff)", color: "#ffffff", boxShadow: "0 0 16px rgba(124,31,255,0.5)" }
                        : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(124,31,255,0.2)", color: "#c39dff" }
                      }
                    >
                      <span className="text-lg">{l.flag}</span>
                      <span>{l.id}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Seleção de nível */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-[#c39dff] uppercase tracking-widest">Seu nível</label>
                <div className="flex gap-2">
                  {LEVELS.map((level) => (
                    <button
                      key={level}
                      onClick={() => setSelectedLevel(level)}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:scale-105 active:scale-95"
                      style={selectedLevel === level
                        ? { background: "linear-gradient(135deg, #7c1fff, #a66aff)", color: "#ffffff", boxShadow: "0 0 16px rgba(124,31,255,0.5)" }
                        : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(124,31,255,0.2)", color: "#c39dff" }
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
                style={{ background: "linear-gradient(135deg, #7c1fff 0%, #a66aff 100%)", boxShadow: "0 4px 20px rgba(124,31,255,0.5)" }}
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3" /><path d="M12 3a9 9 0 019 9" />
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

          {/* Histórico lateral direito (select view) */}
          <div
            className="hidden lg:flex flex-col w-72 shrink-0 border-l h-full"
            style={{ borderColor: "rgba(124,31,255,0.15)" }}
          >
            <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: "rgba(124,31,255,0.12)" }}>
              <p className="text-xs font-semibold text-[#c39dff] uppercase tracking-widest">Sessões anteriores</p>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-1">
              {sessionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <span className="flex gap-1">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </span>
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <span className="text-2xl">📭</span>
                  <p className="text-[#4a3870] text-xs text-center">Nenhuma sessão ainda.<br />Comece sua primeira aula!</p>
                </div>
              ) : (
                sessions.map(s => (
                  <SessionCard key={s.id} session={s} onLoad={loadSession} onDelete={handleDeleteSession} />
                ))
              )}
            </div>
          </div>
        </div>

      ) : (

        /* ── Chat View ── */
        <div className="flex-1 flex min-h-0 overflow-hidden">

          {/* Chat column */}
          <div className="flex-1 flex flex-col min-h-0 relative">

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4" style={{ minHeight: 0 }}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>

                  {/* Avatar do assistente */}
                  {msg.role === "assistant" && (
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 mt-0.5"
                      style={{ background: "linear-gradient(135deg, rgba(124,31,255,0.4), rgba(166,106,255,0.4))", border: "1px solid rgba(124,31,255,0.3)" }}
                    >
                      🌍
                    </div>
                  )}

                  <div className="flex flex-col gap-1 max-w-[78%]">
                    <div
                      className="px-4 py-3 text-sm leading-relaxed"
                      style={msg.role === "user"
                        ? {
                            background: "linear-gradient(135deg, #7c1fff, #a66aff)",
                            color: "#ffffff",
                            borderRadius: "18px 18px 4px 18px",
                            boxShadow: "0 2px 12px rgba(124,31,255,0.3)",
                          }
                        : {
                            background: "rgba(255,255,255,0.07)",
                            border: "1px solid rgba(124,31,255,0.18)",
                            color: "#d4c0f0",
                            borderRadius: "18px 18px 18px 4px",
                          }
                      }
                    >
                      {msg.role === "user" ? (
                        msg.content
                      ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                          {msg.content}
                        </ReactMarkdown>
                      )}
                    </div>
                    {/* Timestamp */}
                    <span
                      className={`text-[10px] text-[#4a3870] px-1 ${msg.role === "user" ? "text-right" : "text-left"}`}
                    >
                      {formatTime(msg.ts)}
                    </span>
                  </div>

                  {/* Avatar do usuário */}
                  {msg.role === "user" && (
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                      style={{ background: "linear-gradient(135deg, #5c0fd4, #8a2be2)" }}
                    >
                      EU
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-2.5 justify-start">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0"
                    style={{ background: "linear-gradient(135deg, rgba(124,31,255,0.4), rgba(166,106,255,0.4))", border: "1px solid rgba(124,31,255,0.3)" }}
                  >
                    🌍
                  </div>
                  <div
                    className="px-4 py-3 flex items-center gap-2 text-sm"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(124,31,255,0.18)", color: "#7a6a9a", borderRadius: "18px 18px 18px 4px" }}
                  >
                    <span className="flex gap-1">
                      {[0, 150, 300].map(d => (
                        <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </span>
                    Professor pensando...
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* ── Botão flutuante "Encerrar aula" — apenas desktop (sm+) ──
                No mobile o botão de voltar no header cumpre esta função */}
            <button
              onClick={handleEncerrar}
              className="hidden sm:flex absolute z-10 items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#c39dff] hover:text-white transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                bottom: "132px",
                right: "16px",
                background: "rgba(15,10,30,0.95)",
                border: "1px solid rgba(124,31,255,0.35)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Encerrar aula
            </button>

            {/* Quick actions — scroll horizontal no mobile, wrap no desktop */}
            <div
              className="px-3 pt-2 pb-1.5 flex gap-2 border-t shrink-0 overflow-x-auto"
              style={{ borderColor: "rgba(124,31,255,0.15)", scrollbarWidth: "none" }}
            >
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => sendMessage(action.label)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 rounded-xl text-xs font-medium transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                  style={{ height: "36px", background: "rgba(124,31,255,0.10)", border: "1px solid rgba(124,31,255,0.22)", color: "#c39dff" }}
                >
                  <span>{action.emoji}</span>
                  {action.label}
                </button>
              ))}
            </div>

            {/* Input — min-w-0 e overflow-hidden evitam overflow horizontal */}
            <div
              className="px-3 pb-3 pt-2 border-t shrink-0"
              style={{
                borderColor: "rgba(124,31,255,0.2)",
                paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))",
              }}
            >
              <div className="flex items-end gap-2 min-w-0 overflow-hidden">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Escreva em ${selectedLanguage}...`}
                  rows={1}
                  disabled={loading}
                  className="flex-1 min-w-0 resize-none rounded-xl px-3 py-3 text-sm text-white placeholder-[#4a3870] outline-none transition-all duration-200 disabled:opacity-50"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(124,31,255,0.25)",
                    maxHeight: "120px",
                    lineHeight: "1.5",
                  }}
                  onFocus={(e) => { e.target.style.border = "1px solid rgba(124,31,255,0.6)"; }}
                  onBlur={(e)  => { e.target.style.border = "1px solid rgba(124,31,255,0.25)"; }}
                />
                {/* Botão enviar — 44px para iOS HIG, nunca some */}
                <button
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                  className="flex items-center justify-center rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  style={{ width: "44px", height: "44px", background: "linear-gradient(135deg, #7c1fff, #a66aff)" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* ── Painel lateral direito: Histórico ── */}
          <div
            className="hidden lg:flex flex-col w-72 shrink-0 border-l"
            style={{ borderColor: "rgba(124,31,255,0.15)", background: "rgba(10,6,22,0.8)" }}
          >
            <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: "rgba(124,31,255,0.12)" }}>
              <p className="text-xs font-semibold text-[#c39dff] uppercase tracking-widest">Histórico de sessões</p>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-1">
              {sessionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <span className="flex gap-1">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </span>
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <span className="text-2xl">📭</span>
                  <p className="text-[#4a3870] text-xs text-center">Nenhuma sessão anterior</p>
                </div>
              ) : (
                sessions.map(s => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    active={s.id === sessionId}
                    onLoad={loadSession}
                    onDelete={handleDeleteSession}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── SessionCard sub-component ── */
function SessionCard({
  session,
  active = false,
  onLoad,
  onDelete,
}: {
  session: Session;
  active?: boolean;
  onLoad: (s: Session) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}) {
  const lang = LANGUAGES.find(l => l.id === session.language);
  const preview = session.messages.find(m => m.role === "assistant")?.content ?? "";
  const previewText = preview.replace(/\*\*/g, "").replace(/\*/g, "").slice(0, 60);

  return (
    <button
      onClick={() => onLoad(session)}
      className="w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] group relative"
      style={active
        ? { background: "rgba(124,31,255,0.2)", border: "1px solid rgba(124,31,255,0.4)" }
        : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(124,31,255,0.1)" }
      }
    >
      {/* Header da sessão */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{lang?.flag ?? "🌍"}</span>
          <span className="text-xs font-semibold text-[#c39dff]">{session.language}</span>
          <span className="text-[10px] text-[#4a3870]">·</span>
          <span className="text-[10px] text-[#7a6a9a]">{session.level}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[#4a3870]">{formatSessionDate(session.updated_at)}</span>
          <button
            onClick={(e) => onDelete(session.id, e)}
            className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded flex items-center justify-center text-[#4a3870] hover:text-red-400"
            aria-label="Excluir sessão"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M9 6V4h6v2" />
            </svg>
          </button>
        </div>
      </div>
      {/* Preview */}
      <p className="text-[11px] text-[#5a4870] leading-snug line-clamp-2">{previewText}…</p>
      {/* Mensagens count */}
      <p className="text-[10px] text-[#3d2a60] mt-1">{session.messages.length} mensagens</p>
    </button>
  );
}
