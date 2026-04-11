-- Tabela para registrar uso da API Anthropic
CREATE TABLE IF NOT EXISTS public.api_usage (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  feature     TEXT NOT NULL,
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  custo_usd   NUMERIC(12, 8) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para queries do painel admin
CREATE INDEX IF NOT EXISTS api_usage_created_at_idx ON public.api_usage (created_at DESC);
CREATE INDEX IF NOT EXISTS api_usage_feature_idx    ON public.api_usage (feature);
CREATE INDEX IF NOT EXISTS api_usage_user_id_idx    ON public.api_usage (user_id);

-- RLS: apenas service role pode inserir/ler (o painel usa service role via API route)
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- Política: o admin pode ler tudo (via service role no backend)
CREATE POLICY "service role full access" ON public.api_usage
  USING (true)
  WITH CHECK (true);
