-- Migration segura/idempotente para language_sessions
-- Pode ser re-executada sem erros mesmo que a tabela já exista

-- 1. Cria a tabela se não existir
CREATE TABLE IF NOT EXISTS public.language_sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language    TEXT        NOT NULL,
  level       TEXT        NOT NULL,
  messages    JSONB       NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Índice (idempotente)
CREATE INDEX IF NOT EXISTS language_sessions_user_updated
  ON public.language_sessions (user_id, updated_at DESC);

-- 3. Habilita RLS (idempotente)
ALTER TABLE public.language_sessions ENABLE ROW LEVEL SECURITY;

-- 4. Recria policies com segurança (drop + create)
DROP POLICY IF EXISTS "lang_sessions_select_own" ON public.language_sessions;
DROP POLICY IF EXISTS "lang_sessions_insert_own" ON public.language_sessions;
DROP POLICY IF EXISTS "lang_sessions_update_own" ON public.language_sessions;
DROP POLICY IF EXISTS "lang_sessions_delete_own" ON public.language_sessions;

CREATE POLICY "lang_sessions_select_own"
  ON public.language_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "lang_sessions_insert_own"
  ON public.language_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "lang_sessions_update_own"
  ON public.language_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "lang_sessions_delete_own"
  ON public.language_sessions FOR DELETE USING (auth.uid() = user_id);

-- 5. Trigger de updated_at (recria com segurança)
DROP TRIGGER IF EXISTS trg_language_sessions_updated_at ON public.language_sessions;

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
