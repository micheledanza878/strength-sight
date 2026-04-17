-- Add weight field to workout_plan_exercises
ALTER TABLE public.workout_plan_exercises
ADD COLUMN IF NOT EXISTS weight NUMERIC(6,2);

COMMENT ON COLUMN public.workout_plan_exercises.weight IS 'Carico in kg per questo esercizio';
