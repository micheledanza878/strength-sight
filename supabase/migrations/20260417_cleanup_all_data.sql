-- Clean all data from tables while preserving schemas
-- Delete in order of dependencies (child tables first)

DELETE FROM public.set_logs;
DELETE FROM public.workout_logs;
DELETE FROM public.body_measurements;
DELETE FROM public.active_workout_plan;
DELETE FROM public.workout_plan_exercises;
DELETE FROM public.workout_plan_days;
DELETE FROM public.workout_plans;
DELETE FROM public.exercises;
