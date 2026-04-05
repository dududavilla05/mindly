-- Allow users to delete their own lesson_history records
CREATE POLICY "lesson_history_delete_own"
  ON public.lesson_history FOR DELETE
  USING (auth.uid() = user_id);

-- Allow users to delete their own mind_maps records
CREATE POLICY "mind_maps_delete_own"
  ON public.mind_maps FOR DELETE
  USING (auth.uid() = user_id);

-- Allow users to delete their own journeys records
CREATE POLICY "journeys_delete_own"
  ON public.journeys FOR DELETE
  USING (auth.uid() = user_id);
