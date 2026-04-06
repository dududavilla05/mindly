-- Index for case-insensitive subject lookup used by lesson cache
CREATE INDEX IF NOT EXISTS lesson_history_subject_lower_idx
  ON public.lesson_history (lower(subject));
