"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import MindlyLogo from "./MindlyLogo";
import AuthModal from "./AuthModal";
import UpgradeModal from "./UpgradeModal";
import UserMenu from "./UserMenu";
import type { LessonContent } from "@/types/lesson";
import type { User } from "@supabase/supabase-js";
import type { UserProfile } from "@/app/page";

const SUGGESTIONS = [
  { label: "Juros compostos", emoji: "📈" },
  { label: "Bolsa de valores", emoji: "💹" },
  { label: "Inteligência artificial", emoji: "🤖" },
  { label: "Negociação", emoji: "🤝" },
  { label: "Produtividade", emoji: "⚡" },
];

interface HomeScreenProps {
  onLessonGenerated: (lesson: LessonContent, subject: string, lessonsToday?: number, streakDays?: number) => void;
  user: User | null | undefined;
  profile: UserProfile | null;
  onSignOut: () => void;
  onOpenHistory?: () => void;
}

export default function HomeScreen({
  onLessonGenerated,
  user,
  profile,
  onSignOut,
  onOpenHistory,
}: HomeScreenProps) {
  const [subject, setSubject] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Garantir que o portal e conteúdo dependente de auth só renderizam no cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fechar modal automaticamente quando auth for resolvida (OAuth redirect ou popup)
  useEffect(() => {
    if (user) setShowAuthModal(false);
  }, [user]);

  const handleImageFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Por favor, envie apenas imagens.");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    setError(null);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageFile(file);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSubject(suggestion);
    setImageFile(null);
    setImagePreview(null);
    setError(null);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerate = async () => {
    if (!subject.trim() && !imageFile) {
      setError("Digite um assunto ou anexe uma imagem para continuar.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let imageBase64: string | undefined;
      let imageMimeType: string | undefined;

      if (imageFile) {
        const reader = new FileReader();
        imageBase64 = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });
        imageMimeType = imageFile.type;
      }

      const response = await fetch("/api/generate-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim() || undefined,
          imageBase64,
          imageMimeType,
        }),
      });

      const data = await response.json();

      // Limite diário atingido
      if (response.status === 429 && data.error === "limite_atingido") {
        setShowUpgradeModal(true);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Erro ao gerar lição.");
      }

      onLessonGenerated(
        data.lesson,
        subject.trim() || "Imagem enviada",
        data.lessonsToday ?? undefined,
        data.streakDays ?? undefined
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const canGenerate = (subject.trim().length > 0 || !!imageFile) && !loading;
  const authReady = user !== undefined;

  return (
    <div
      suppressHydrationWarning
      className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12"
    >
      {/* Background orbs — isolados para não quebrar position:fixed em Safari/iOS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="orb w-96 h-96 top-[-100px] left-[-150px] opacity-30"
          style={{ background: "radial-gradient(circle, #7c1fff 0%, transparent 70%)" }}
        />
        <div
          className="orb w-80 h-80 bottom-[-80px] right-[-100px] opacity-20"
          style={{ background: "radial-gradient(circle, #a66aff 0%, transparent 70%)" }}
        />
        <div
          className="orb w-64 h-64 top-1/3 right-1/4 opacity-10"
          style={{ background: "radial-gradient(circle, #c39dff 0%, transparent 70%)" }}
        />
      </div>

      {/* Barra de navegação — portal garante position:fixed real fora de qualquer container */}
      {mounted && authReady && createPortal(
        <div className="fixed top-4 right-4 z-[9999] animate-fade-in">
          {user ? (
            <UserMenu user={user} profile={profile} onSignOut={onSignOut} />
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#c39dff] hover:text-white transition-all duration-200 hover:scale-105"
              style={{
                background: "rgba(124,31,255,0.12)",
                border: "1px solid rgba(124,31,255,0.25)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Entrar
            </button>
          )}
        </div>,
        document.body
      )}

      {/* Botão histórico mobile */}
      {mounted && onOpenHistory && createPortal(
        <button
          onClick={onOpenHistory}
          className="md:hidden fixed top-4 left-4 z-[9999] flex items-center justify-center w-10 h-10 rounded-xl text-[#a78bca] hover:text-white transition-all duration-200 animate-fade-in"
          style={{
            background: "rgba(124,31,255,0.12)",
            border: "1px solid rgba(124,31,255,0.25)",
          }}
          aria-label="Histórico"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </button>,
        document.body
      )}

      {/* Conteúdo principal */}
      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center gap-8">
        {/* Logo + tagline */}
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <MindlyLogo size="lg" />
          <p className="text-[#a78bca] text-base font-medium tracking-wide text-center">
            Aprenda qualquer coisa em minutos com IA
          </p>
        </div>

        {/* Card principal */}
        <div
          className="w-full rounded-3xl p-6 sm:p-8 flex flex-col gap-6 animate-slide-up"
          style={{
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(124, 31, 255, 0.25)",
            boxShadow: "0 8px 40px rgba(124, 31, 255, 0.15)",
          }}
        >
          {/* Input de texto */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[#c39dff] uppercase tracking-widest">
              O que você quer aprender?
            </label>
            <div className="relative">
              <textarea
                value={subject}
                onChange={(e) => { setSubject(e.target.value); setError(null); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                placeholder="Ex: Como funciona a inflação? O que é machine learning?..."
                rows={3}
                className="w-full resize-none rounded-2xl px-5 py-4 text-white placeholder-[#4a3870] text-base outline-none transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(124, 31, 255, 0.2)",
                  lineHeight: "1.6",
                }}
                onFocus={(e) => {
                  e.target.style.border = "1px solid rgba(124, 31, 255, 0.6)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(124, 31, 255, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.border = "1px solid rgba(124, 31, 255, 0.2)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>
          </div>

          {/* Divisor */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#3d1f6e] to-transparent" />
            <span className="text-xs text-[#5c3d8a] font-medium uppercase tracking-widest">ou</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#3d1f6e] to-transparent" />
          </div>

          {/* Upload de imagem */}
          {imagePreview ? (
            <div className="relative rounded-2xl overflow-hidden group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Imagem selecionada"
                className="w-full max-h-48 object-cover rounded-2xl"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                <button
                  onClick={removeImage}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
                  style={{ background: "rgba(220, 38, 38, 0.8)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                  Remover imagem
                </button>
              </div>
              <div
                className="absolute bottom-3 left-3 px-3 py-1 rounded-lg text-xs font-medium text-white"
                style={{ background: "rgba(124, 31, 255, 0.85)" }}
              >
                {imageFile?.name}
              </div>
            </div>
          ) : (
            <div
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                dragOver
                  ? "border-[#7c1fff] bg-[#7c1fff]/10"
                  : "border-[#3d1f6e] hover:border-[#7c1fff]/60 hover:bg-[#7c1fff]/5"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(124, 31, 255, 0.15)" }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a66aff" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <div>
                  <p className="text-[#c39dff] font-semibold text-sm">
                    Clique para anexar uma foto
                  </p>
                  <p className="text-[#5c3d8a] text-xs mt-1">
                    ou arraste e solte aqui · PNG, JPG, WEBP
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mensagem de erro */}
          {error && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-red-300"
              style={{ background: "rgba(220, 38, 38, 0.1)", border: "1px solid rgba(220, 38, 38, 0.2)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {/* Botão gerar */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className={`relative w-full py-4 rounded-2xl font-bold text-base transition-all duration-200 overflow-hidden ${
              canGenerate
                ? "cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                : "cursor-not-allowed opacity-40"
            }`}
            style={
              canGenerate
                ? {
                    background: "linear-gradient(135deg, #7c1fff 0%, #a66aff 100%)",
                    boxShadow: "0 4px 20px rgba(124, 31, 255, 0.5)",
                  }
                : { background: "rgba(124, 31, 255, 0.3)" }
            }
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3" />
                  <path d="M12 3a9 9 0 019 9" />
                </svg>
                Gerando sua lição...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                Gerar Lição com IA
              </span>
            )}
          </button>
        </div>

        {/* Sugestões */}
        <div className="flex flex-col items-center gap-3 w-full animate-fade-in">
          <p className="text-xs text-[#5c3d8a] uppercase tracking-widest font-semibold">
            Sugestões populares
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map(({ label, emoji }) => (
              <button
                key={label}
                onClick={() => handleSuggestionClick(label)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 hover:scale-105 active:scale-95 ${
                  subject === label ? "text-white" : "text-[#c39dff] hover:text-white"
                }`}
                style={
                  subject === label
                    ? {
                        background: "linear-gradient(135deg, #7c1fff, #a66aff)",
                        boxShadow: "0 0 12px rgba(124, 31, 255, 0.4)",
                      }
                    : {
                        background: "rgba(124, 31, 255, 0.12)",
                        border: "1px solid rgba(124, 31, 255, 0.2)",
                      }
                }
              >
                <span>{emoji}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex flex-col items-center gap-2">
          <Link
            href="/planos"
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold text-[#c39dff] hover:text-white transition-all duration-150 hover:scale-105"
            style={{
              background: "rgba(124,31,255,0.12)",
              border: "1px solid rgba(124,31,255,0.25)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Ver planos
          </Link>
          {!user && authReady && (
            <button
              onClick={() => setShowAuthModal(true)}
              className="text-xs text-[#4a3870] hover:text-[#a78bca] transition-colors"
            >
              Salve seu histórico · Crie sua conta grátis
            </button>
          )}
          <p className="text-xs text-[#3d1f6e] text-center">
            Powered by Claude AI · Lições personalizadas em segundos
          </p>
        </div>
      </div>

      {/* Modais */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      )}
      {showUpgradeModal && (
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
      )}
    </div>
  );
}
