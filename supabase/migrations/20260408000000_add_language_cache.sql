-- Cache de respostas dos atalhos do módulo de idiomas
-- Evita chamadas repetidas à API da Anthropic para os 4 atalhos fixos
CREATE TABLE IF NOT EXISTS public.language_cache (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  language      TEXT        NOT NULL,
  level         TEXT        NOT NULL,
  shortcut_key  TEXT        NOT NULL,
  content       TEXT        NOT NULL,
  cache_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice único para lookup eficiente: idioma + nível + atalho + data
CREATE UNIQUE INDEX IF NOT EXISTS language_cache_lookup
  ON public.language_cache (language, level, shortcut_key, cache_date);

-- Índice para limpeza de entradas antigas
CREATE INDEX IF NOT EXISTS language_cache_date_idx
  ON public.language_cache (cache_date);
