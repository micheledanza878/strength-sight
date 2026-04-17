-- Espande body_measurements con tutte le misure dalla foto
-- e aggiunge il sistema di schede di allenamento

-- 1. Espandi body_measurements con nuove colonne
ALTER TABLE public.body_measurements
ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5,1),
ADD COLUMN IF NOT EXISTS testata_cm NUMERIC(5,1),
ADD COLUMN IF NOT EXISTS collo_cm NUMERIC(5,1),
ADD COLUMN IF NOT EXISTS braccio_front_cm NUMERIC(5,1),
ADD COLUMN IF NOT EXISTS braccio_retro_cm NUMERIC(5,1),
ADD COLUMN IF NOT EXISTS avambraccio_cm NUMERIC(5,1),
ADD COLUMN IF NOT EXISTS petto_torace_cm NUMERIC(5,1),
ADD COLUMN IF NOT EXISTS vita_cm NUMERIC(5,1),
ADD COLUMN IF NOT EXISTS vita_retro_cm NUMERIC(5,1),
ADD COLUMN IF NOT EXISTS fianchi_cm NUMERIC(5,1),
ADD COLUMN IF NOT EXISTS fianchi_retro_cm NUMERIC(5,1),
ADD COLUMN IF NOT EXISTS schiena_altezza_dorsali_cm NUMERIC(5,1),
ADD COLUMN IF NOT EXISTS spalle_ampiezza_cm NUMERIC(5,1),
ADD COLUMN IF NOT EXISTS glutei_circonferenza_cm NUMERIC(5,1),
ADD COLUMN IF NOT EXISTS coscia_cm NUMERIC(5,1),
ADD COLUMN IF NOT EXISTS coscia_retro_cm NUMERIC(5,1),
ADD COLUMN IF NOT EXISTS polpaccio_cm NUMERIC(5,1),
ADD COLUMN IF NOT EXISTS polpaccio_retro_cm NUMERIC(5,1);

-- 2. Crea tabella workout_plans (schede di allenamento)
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  duration_weeks INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TRIGGER update_workout_plans_updated_at BEFORE UPDATE ON public.workout_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Crea tabella workout_plan_days (giorni della scheda)
CREATE TABLE IF NOT EXISTS public.workout_plan_days (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL, -- 1, 2, 3, 4, 5
  day_name TEXT NOT NULL, -- 'Petto/Dorso', 'Spalle/Braccia', etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_plan_days_plan ON public.workout_plan_days(workout_plan_id);

-- 4. Crea tabella per gli esercizi della scheda
CREATE TABLE IF NOT EXISTS public.workout_plan_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_plan_day_id UUID NOT NULL REFERENCES public.workout_plan_days(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL,
  order_number INTEGER NOT NULL,
  sets INTEGER NOT NULL DEFAULT 4,
  reps_min INTEGER,
  reps_max INTEGER,
  rest_seconds INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_plan_exercises_day ON public.workout_plan_exercises(workout_plan_day_id);

-- 5. Crea tabella per tracciare quale scheda è attiva
CREATE TABLE IF NOT EXISTS public.active_workout_plan (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Aggiungi indici per performance
CREATE INDEX IF NOT EXISTS idx_active_workout_plan_current ON public.active_workout_plan(started_at DESC);

-- Commento per tracking
COMMENT ON TABLE public.workout_plans IS 'Schede di allenamento (es. PPL, Upper/Lower, etc.)';
COMMENT ON TABLE public.workout_plan_days IS 'Giorni specifici della scheda';
COMMENT ON TABLE public.workout_plan_exercises IS 'Esercizi assegnati a ogni giorno della scheda';
COMMENT ON TABLE public.active_workout_plan IS 'Traccia quale scheda è attualmente in uso';
