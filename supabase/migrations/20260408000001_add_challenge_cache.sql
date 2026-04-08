-- Cache de quizzes do Modo Desafio
-- Chave: topic (case-insensitive) + difficulty
CREATE TABLE IF NOT EXISTS public.challenge_cache (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  topic       TEXT        NOT NULL,
  difficulty  TEXT        NOT NULL,
  questions   JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS challenge_cache_difficulty_idx
  ON public.challenge_cache (difficulty);
