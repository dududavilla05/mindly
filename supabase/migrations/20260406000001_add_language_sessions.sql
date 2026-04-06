-- Tabela de sessões de conversação do módulo de idiomas
CREATE TABLE IF NOT EXISTS public.language_sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language    TEXT        NOT NULL,
  level       TEXT        NOT NULL,
  messages    JSONB       NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para buscar sessões do usuário ordenadas por data
CREATE INDEX IF NOT EXISTS language_sessions_user_updated
  ON public.language_sessions (user_id, updated_at DESC);

-- RLS
ALTER TABLE public.language_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lang_sessions_select_own"
  ON public.language_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "lang_sessions_insert_own"
  ON public.language_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "lang_sessions_update_own"
  ON public.language_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "lang_sessions_delete_own"
  ON public.language_sessions FOR DELETE USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_language_sessions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_language_sessions_updated_at
  BEFORE UPDATE ON public.language_sessions
  FOR EACH ROW EXECUTE FUNCTION update_language_sessions_updated_at();
