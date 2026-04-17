-- Fix workout_day names to match WORKOUT_DAYS IDs

UPDATE public.workout_logs
SET workout_day = 'A'
WHERE workout_day LIKE '%Push%' OR workout_day LIKE '%Upper (Petto%';

UPDATE public.workout_logs
SET workout_day = 'D'
WHERE workout_day LIKE '%Pull%';

UPDATE public.workout_logs
SET workout_day = 'Gambe'
WHERE workout_day LIKE '%Legs%' OR workout_day LIKE '%Lower%';
