-- Supporto per esercizi "skill" (front lever, handstand, planche, muscle-up)
-- tracciati a tempo di tenuta (secondi) invece che a reps, con avanzamento
-- per step secondo il criterio "target raggiunto per 2-3 sedute consecutive".

-- 1. Esercizi della scheda: marca se un esercizio è a reps o a tempo,
--    e se è collegato a una skill del catalogo statico (src/data/skills.ts).
ALTER TABLE public.workout_plan_exercises
ADD COLUMN IF NOT EXISTS tracking_unit TEXT NOT NULL DEFAULT 'reps'
  CHECK (tracking_unit IN ('reps', 'seconds')),
ADD COLUMN IF NOT EXISTS skill_slug TEXT;

-- 2. Log dei set: le tenute a tempo non hanno reps, quindi reps diventa
--    opzionale. hold_seconds è il tempo di tenuta effettivo. skill_slug e
--    skill_step_order registrano a quale skill/step si riferiva il set,
--    così la storia resta corretta anche se l'utente avanza di step dopo.
ALTER TABLE public.set_logs
ALTER COLUMN reps DROP NOT NULL;

ALTER TABLE public.set_logs
ADD COLUMN IF NOT EXISTS hold_seconds INTEGER,
ADD COLUMN IF NOT EXISTS skill_slug TEXT,
ADD COLUMN IF NOT EXISTS skill_step_order INTEGER;

ALTER TABLE public.set_logs
ADD CONSTRAINT set_logs_reps_or_hold_seconds
  CHECK (reps IS NOT NULL OR hold_seconds IS NOT NULL);

-- 3. Stato di avanzamento per-utente su ogni skill: a che step è arrivato
--    e quante sedute pulite consecutive ha accumulato verso il prossimo step.
CREATE TABLE IF NOT EXISTS public.user_skill_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_slug TEXT NOT NULL,
  current_step_order INTEGER NOT NULL DEFAULT 1,
  consecutive_clean_sessions INTEGER NOT NULL DEFAULT 0,
  last_trained_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, skill_slug)
);

ALTER TABLE public.user_skill_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own user_skill_progress" ON public.user_skill_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_skill_progress_updated_at
  BEFORE UPDATE ON public.user_skill_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_user_skill_progress_user ON public.user_skill_progress(user_id);
