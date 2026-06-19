-- =============================================================================
-- Fix RLS policies su workout_plan_days e workout_plan_exercises
--
-- Contesto:
--   La migration 20260428_fix_rls_child_tables.sql aveva abilitato RLS su
--   entrambe le tabelle ma con policy "allow_all" che concedono accesso a
--   qualsiasi utente autenticato, indipendentemente dalla proprietà del dato.
--
-- Catena di ownership:
--   workout_plan_exercises.workout_plan_day_id
--     → workout_plan_days.id
--       → workout_plan_days.workout_plan_id
--         → workout_plans.id
--           → workout_plans.user_id = auth.uid()
--
-- Strategia:
--   - Rimuovere le policy permissive esistenti ("allow_all")
--   - Creare policy granulari per operazione (SELECT / INSERT / UPDATE / DELETE)
--   - Usare subquery EXISTS per verificare la proprietà risalendo la catena
--   - RLS è già abilitato sulle tabelle; non serve riabilitarlo ma lo ripetiamo
--     per rendere la migration idempotente e auto-documentante
-- =============================================================================


-- -----------------------------------------------------------------------------
-- SEZIONE 1: workout_plan_days
-- Verifica: il plan_id deve puntare a un workout_plans.user_id = auth.uid()
-- -----------------------------------------------------------------------------

-- RLS è già attivo (abilitato da 20260428); lo ripetiamo per idempotenza.
ALTER TABLE public.workout_plan_days ENABLE ROW LEVEL SECURITY;

-- Rimuovi la policy permissiva precedente
DROP POLICY IF EXISTS "allow_all" ON public.workout_plan_days;

-- SELECT: l'utente può leggere solo i giorni delle proprie schede
CREATE POLICY "workout_plan_days_select_owner"
  ON public.workout_plan_days
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_plans wp
      WHERE wp.id = public.workout_plan_days.workout_plan_id
        AND wp.user_id = auth.uid()
    )
  );

-- INSERT: l'utente può inserire giorni solo nelle proprie schede.
-- WITH CHECK garantisce che il plan_id fornito nella nuova riga appartenga
-- all'utente corrente, prevenendo inserimenti in schede altrui.
CREATE POLICY "workout_plan_days_insert_owner"
  ON public.workout_plan_days
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workout_plans wp
      WHERE wp.id = public.workout_plan_days.workout_plan_id
        AND wp.user_id = auth.uid()
    )
  );

-- UPDATE: l'utente può modificare solo i giorni delle proprie schede.
-- USING filtra le righe esistenti visibili all'UPDATE;
-- WITH CHECK valida il nuovo stato della riga dopo la modifica.
-- Entrambe le clausole sono necessarie per bloccare anche il "trasferimento"
-- di un giorno da una scheda propria a una scheda altrui.
CREATE POLICY "workout_plan_days_update_owner"
  ON public.workout_plan_days
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_plans wp
      WHERE wp.id = public.workout_plan_days.workout_plan_id
        AND wp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workout_plans wp
      WHERE wp.id = public.workout_plan_days.workout_plan_id
        AND wp.user_id = auth.uid()
    )
  );

-- DELETE: l'utente può eliminare solo i giorni delle proprie schede
CREATE POLICY "workout_plan_days_delete_owner"
  ON public.workout_plan_days
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_plans wp
      WHERE wp.id = public.workout_plan_days.workout_plan_id
        AND wp.user_id = auth.uid()
    )
  );


-- -----------------------------------------------------------------------------
-- SEZIONE 2: workout_plan_exercises
-- Verifica: risale la catena workout_plan_day_id → workout_plan_id → user_id
-- -----------------------------------------------------------------------------

ALTER TABLE public.workout_plan_exercises ENABLE ROW LEVEL SECURITY;

-- Rimuovi la policy permissiva precedente
DROP POLICY IF EXISTS "allow_all" ON public.workout_plan_exercises;

-- SELECT: l'utente può leggere solo gli esercizi appartenenti ai propri piani
CREATE POLICY "workout_plan_exercises_select_owner"
  ON public.workout_plan_exercises
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_plan_days wpd
      JOIN public.workout_plans wp ON wp.id = wpd.workout_plan_id
      WHERE wpd.id = public.workout_plan_exercises.workout_plan_day_id
        AND wp.user_id = auth.uid()
    )
  );

-- INSERT: l'utente può aggiungere esercizi solo nei propri giorni/schede
CREATE POLICY "workout_plan_exercises_insert_owner"
  ON public.workout_plan_exercises
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workout_plan_days wpd
      JOIN public.workout_plans wp ON wp.id = wpd.workout_plan_id
      WHERE wpd.id = public.workout_plan_exercises.workout_plan_day_id
        AND wp.user_id = auth.uid()
    )
  );

-- UPDATE: l'utente può modificare solo i propri esercizi.
-- Come per workout_plan_days, sia USING che WITH CHECK sono necessari
-- per impedire il "reparenting" dell'esercizio verso un giorno altrui.
CREATE POLICY "workout_plan_exercises_update_owner"
  ON public.workout_plan_exercises
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_plan_days wpd
      JOIN public.workout_plans wp ON wp.id = wpd.workout_plan_id
      WHERE wpd.id = public.workout_plan_exercises.workout_plan_day_id
        AND wp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workout_plan_days wpd
      JOIN public.workout_plans wp ON wp.id = wpd.workout_plan_id
      WHERE wpd.id = public.workout_plan_exercises.workout_plan_day_id
        AND wp.user_id = auth.uid()
    )
  );

-- DELETE: l'utente può eliminare solo i propri esercizi
CREATE POLICY "workout_plan_exercises_delete_owner"
  ON public.workout_plan_exercises
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_plan_days wpd
      JOIN public.workout_plans wp ON wp.id = wpd.workout_plan_id
      WHERE wpd.id = public.workout_plan_exercises.workout_plan_day_id
        AND wp.user_id = auth.uid()
    )
  );
