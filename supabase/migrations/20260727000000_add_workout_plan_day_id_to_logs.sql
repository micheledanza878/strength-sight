-- Il calcolo del "prossimo allenamento" e il resume/prefill delle sessioni
-- confrontavano i giorni tramite workout_logs.workout_day (testo libero,
-- non univoco). Se uno split riusa gli stessi nomi (es. Push/Pull/Legs
-- ripetuti in una scheda a 6 giorni), il match sul nome trova sempre la
-- prima occorrenza e la rotazione "salta" i giorni successivi.
-- Aggiunge un riferimento stabile all'id del giorno del piano.
ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS workout_plan_day_id UUID REFERENCES public.workout_plan_days(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workout_logs_workout_plan_day_id
  ON public.workout_logs (workout_plan_day_id);
