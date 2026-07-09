-- =============================================================================
-- Ottimizzazione performance RLS su workout_plan_days / workout_plan_exercises
--
-- Contesto:
--   20260619000000_fix_rls_child_tables.sql (applicato il 2026-07-09 insieme
--   alla remediation di sicurezza) usa auth.uid() diretto nelle policy invece
--   di (select auth.uid()), causando rivalutazione per riga. L'advisor
--   performance di Supabase l'ha segnalato subito dopo l'applicazione.
--
--   Stessa identica logica di autorizzazione delle policy esistenti, solo
--   wrapping (select auth.uid()) per farlo valutare una volta per query
--   invece che una volta per riga. Nessun cambio di comportamento.
-- =============================================================================

DROP POLICY IF EXISTS "workout_plan_days_select_owner" ON public.workout_plan_days;
CREATE POLICY "workout_plan_days_select_owner"
  ON public.workout_plan_days
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_plans wp
      WHERE wp.id = public.workout_plan_days.workout_plan_id
        AND wp.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "workout_plan_days_insert_owner" ON public.workout_plan_days;
CREATE POLICY "workout_plan_days_insert_owner"
  ON public.workout_plan_days
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workout_plans wp
      WHERE wp.id = public.workout_plan_days.workout_plan_id
        AND wp.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "workout_plan_days_update_owner" ON public.workout_plan_days;
CREATE POLICY "workout_plan_days_update_owner"
  ON public.workout_plan_days
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_plans wp
      WHERE wp.id = public.workout_plan_days.workout_plan_id
        AND wp.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workout_plans wp
      WHERE wp.id = public.workout_plan_days.workout_plan_id
        AND wp.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "workout_plan_days_delete_owner" ON public.workout_plan_days;
CREATE POLICY "workout_plan_days_delete_owner"
  ON public.workout_plan_days
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_plans wp
      WHERE wp.id = public.workout_plan_days.workout_plan_id
        AND wp.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "workout_plan_exercises_select_owner" ON public.workout_plan_exercises;
CREATE POLICY "workout_plan_exercises_select_owner"
  ON public.workout_plan_exercises
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_plan_days wpd
      JOIN public.workout_plans wp ON wp.id = wpd.workout_plan_id
      WHERE wpd.id = public.workout_plan_exercises.workout_plan_day_id
        AND wp.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "workout_plan_exercises_insert_owner" ON public.workout_plan_exercises;
CREATE POLICY "workout_plan_exercises_insert_owner"
  ON public.workout_plan_exercises
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workout_plan_days wpd
      JOIN public.workout_plans wp ON wp.id = wpd.workout_plan_id
      WHERE wpd.id = public.workout_plan_exercises.workout_plan_day_id
        AND wp.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "workout_plan_exercises_update_owner" ON public.workout_plan_exercises;
CREATE POLICY "workout_plan_exercises_update_owner"
  ON public.workout_plan_exercises
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_plan_days wpd
      JOIN public.workout_plans wp ON wp.id = wpd.workout_plan_id
      WHERE wpd.id = public.workout_plan_exercises.workout_plan_day_id
        AND wp.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workout_plan_days wpd
      JOIN public.workout_plans wp ON wp.id = wpd.workout_plan_id
      WHERE wpd.id = public.workout_plan_exercises.workout_plan_day_id
        AND wp.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "workout_plan_exercises_delete_owner" ON public.workout_plan_exercises;
CREATE POLICY "workout_plan_exercises_delete_owner"
  ON public.workout_plan_exercises
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_plan_days wpd
      JOIN public.workout_plans wp ON wp.id = wpd.workout_plan_id
      WHERE wpd.id = public.workout_plan_exercises.workout_plan_day_id
        AND wp.user_id = (select auth.uid())
    )
  );
