"use client";

import { useState, useRef, useEffect } from "react";
import type { LessonContent } from "@/types/lesson";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface MentorChatProps {
  lesson: LessonContent;
  onClose: () => void;
}

export default function MentorChat({ lesson, onClose }: MentorChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Olá! Sou seu Mentor sobre **${lesson.title}**. Pode tirar qualquer dúvida sobre o que acabou de aprender — estou aqui para ajudar! 🎓`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: "user", content: text };
    const history = [...messages, userMessage];
    setMessages(history);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson,
          messages: messages.filter((m) => m.role !== "assistant" || messages.indexOf(m) > 0),
          userMessage: text,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro desconhecido");
      setMessages([...history, { role: "assistant", content: data.reply }]);
    } catch (err) {
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

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl sm:rounded-3xl sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg animate-slide-up"
        style={{
          background: "rgba(12,8,25,0.98)",
          border: "1px solid rgba(124,31,255,0.35)",
          boxShadow: "0 -8px 40px rgba(124,31,255,0.2)",
          maxHeight: "80vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: "rgba(124,31,255,0.2)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
              style={{ background: "linear-gradient(135deg, #7c1fff, #a66aff)" }}
            >
              🎓
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Modo Mentor</p>
              <p className="text-[#7a6a9a] text-xs truncate max-w-[200px]">{lesson.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-[#7a6a9a] hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

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
                {msg.content}
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
                Mentor pensando...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          className="px-4 py-4 border-t shrink-0"
          style={{ borderColor: "rgba(124,31,255,0.2)" }}
        >
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua dúvida... (Enter para enviar)"
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
              onClick={sendMessage}
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
    </>
  );
}
