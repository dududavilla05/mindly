-- Adiciona controle de uso de ilustrações por dia na tabela profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS images_today     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_image_date  DATE    NOT NULL DEFAULT CURRENT_DATE;
