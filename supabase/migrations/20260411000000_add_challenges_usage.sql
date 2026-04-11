-- Adiciona contadores diários de desafios ao perfil do usuário
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS challenges_today INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_challenge_date DATE;
