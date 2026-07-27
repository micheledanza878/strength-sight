-- Stesso problema già risolto per i giorni (workout_plan_day_id), ma per i
-- singoli esercizi: set_logs.exercise_name è testo libero e modificabile in
-- qualsiasi momento dall'editor della scheda. Ogni volta che un nome viene
-- anche solo leggermente ritoccato (spazio, maiuscola, refuso corretto), lo
-- storico precedente resta agganciato al nome vecchio e l'app non lo trova
-- più — precompilando con reps_min invece del dato reale dell'ultima volta.
ALTER TABLE public.set_logs
  ADD COLUMN IF NOT EXISTS workout_plan_exercise_id UUID REFERENCES public.workout_plan_exercises(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_set_logs_workout_plan_exercise_id
  ON public.set_logs (workout_plan_exercise_id);
