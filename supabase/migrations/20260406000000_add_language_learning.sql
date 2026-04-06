-- Adiciona campos de aprendizado de idiomas ao perfil do usuário
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language_learning TEXT,
  ADD COLUMN IF NOT EXISTS language_level TEXT;
