"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function translateError(message: string): string {
  if (message.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  if (message.includes("Email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (message.includes("User already registered")) return "Este e-mail já está cadastrado.";
  if (message.includes("Password should be")) return "A senha deve ter pelo menos 6 caracteres.";
  if (message.includes("rate limit") || message.includes("over_email_send_rate_limit"))
    return "Muitas tentativas. Aguarde alguns minutos.";
  if (message.includes("Unable to validate")) return "Link expirado. Tente novamente.";
  return message;
}

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const supabase = createClient();

  if (!supabase) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-md rounded-3xl p-8 text-center" style={{ background: "rgba(12,8,25,0.98)", border: "1px solid rgba(124,31,255,0.35)" }}>
          <p className="text-red-400 text-sm">Autenticação não configurada. Verifique as variáveis de ambiente.</p>
          <button onClick={onClose} className="mt-4 text-[#a78bca] text-sm hover:text-white">Fechar</button>
        </div>
      </div>
    );
  }

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Preencha e-mail e senha.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSuccess();
        onClose();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setSuccess("Verifique seu e-mail para confirmar o cadastro!");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido.";
      setError(translateError(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/home`,
      },
    });
    if (error) {
      setError(translateError(error.message));
      setGoogleLoading(false);
    }
  };

  const switchMode = (newMode: "login" | "signup") => {
    setMode(newMode);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-3xl p-8 flex flex-col gap-5 animate-slide-up"
        style={{
          background: "rgba(12, 8, 25, 0.98)",
          border: "1px solid rgba(124, 31, 255, 0.35)",
          boxShadow: "0 20px 60px rgba(124, 31, 255, 0.25), 0 0 0 1px rgba(124,31,255,0.1)",
        }}
      >
        {/* Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-[#5c3d8a] hover:text-white hover:bg-white/10 transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Cabeçalho */}
        <div className="text-center pr-4">
          <div className="text-3xl mb-2">🧠</div>
          <h2 className="text-xl font-bold text-white">
            {mode === "login" ? "Bem-vindo de volta!" : "Crie sua conta grátis"}
          </h2>
          <p className="text-[#a78bca] text-sm mt-1">
            {mode === "login"
              ? "Continue de onde parou"
              : "10 lições por dia, sem cartão de crédito"}
          </p>
        </div>

        {/* Abas */}
        <div
          className="flex rounded-xl overflow-hidden p-1 gap-1"
          style={{ background: "rgba(255,255,255,0.04)" }}
        >
          {(["login", "signup"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => switchMode(tab)}
              className="flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200"
              style={
                mode === tab
                  ? {
                      background: "linear-gradient(135deg, #7c1fff, #a66aff)",
                      color: "white",
                      boxShadow: "0 2px 10px rgba(124,31,255,0.4)",
                    }
                  : { color: "#6b4fa0" }
              }
            >
              {tab === "login" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>

        {/* Mensagem de sucesso */}
        {success && (
          <div
            className="px-4 py-3 rounded-xl text-sm text-emerald-300 flex items-start gap-2"
            style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)" }}
          >
            <svg width="16" height="16" className="mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {success}
          </div>
        )}

        {/* Mensagem de erro */}
        {error && (
          <div
            className="px-4 py-3 rounded-xl text-sm text-red-300 flex items-start gap-2"
            style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)" }}
          >
            <svg width="16" height="16" className="mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {/* Google */}
        <button
          onClick={handleGoogleAuth}
          disabled={googleLoading || loading}
          className="w-full py-3 rounded-xl flex items-center justify-center gap-3 text-white text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          {googleLoading ? (
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3" />
              <path d="M12 3a9 9 0 019 9" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          Continuar com Google
        </button>

        {/* Separador */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: "rgba(124,31,255,0.2)" }} />
          <span className="text-xs text-[#4a3870] font-medium">ou com e-mail</span>
          <div className="flex-1 h-px" style={{ background: "rgba(124,31,255,0.2)" }} />
        </div>

        {/* Formulário */}
        <div className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Seu e-mail"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            disabled={loading || !!success}
            className="w-full px-4 py-3 rounded-xl text-white placeholder-[#4a3870] text-sm outline-none transition-all duration-200 disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(124,31,255,0.2)" }}
            onFocus={(e) => { e.target.style.border = "1px solid rgba(124,31,255,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,31,255,0.08)"; }}
            onBlur={(e) => { e.target.style.border = "1px solid rgba(124,31,255,0.2)"; e.target.style.boxShadow = "none"; }}
            onKeyDown={(e) => e.key === "Enter" && handleEmailAuth()}
          />
          <input
            type="password"
            placeholder="Senha (mín. 6 caracteres)"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            disabled={loading || !!success}
            className="w-full px-4 py-3 rounded-xl text-white placeholder-[#4a3870] text-sm outline-none transition-all duration-200 disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(124,31,255,0.2)" }}
            onFocus={(e) => { e.target.style.border = "1px solid rgba(124,31,255,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,31,255,0.08)"; }}
            onBlur={(e) => { e.target.style.border = "1px solid rgba(124,31,255,0.2)"; e.target.style.boxShadow = "none"; }}
            onKeyDown={(e) => e.key === "Enter" && handleEmailAuth()}
          />
        </div>

        {/* Botão principal */}
        <button
          onClick={handleEmailAuth}
          disabled={loading || !!success}
          className="w-full py-3.5 rounded-xl font-bold text-white text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, #7c1fff 0%, #a66aff 100%)",
            boxShadow: "0 4px 20px rgba(124,31,255,0.45)",
          }}
        >
          {loading
            ? "Carregando..."
            : mode === "login"
            ? "Entrar na conta"
            : "Criar conta grátis"}
        </button>

        <p className="text-center text-xs text-[#4a3870]">
          Ao continuar, você concorda com nossos termos de uso.
        </p>
      </div>
    </div>
  );
}
