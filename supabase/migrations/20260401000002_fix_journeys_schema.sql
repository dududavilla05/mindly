-- Fix journeys schema: completed_days as integer count, add streak and completed_day_list
ALTER TABLE journeys DROP COLUMN IF EXISTS completed_days;
ALTER TABLE journeys
  ADD COLUMN IF NOT EXISTS completed_days     integer not null default 0,
  ADD COLUMN IF NOT EXISTS streak             integer not null default 0,
  ADD COLUMN IF NOT EXISTS completed_day_list jsonb   not null default '[]';
