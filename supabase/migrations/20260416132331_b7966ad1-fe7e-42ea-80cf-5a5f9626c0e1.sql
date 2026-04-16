-- Remove user_id columns and disable RLS from all tables

-- Drop RLS policies
DROP POLICY IF EXISTS "Users manage own workout_logs" ON public.workout_logs;
DROP POLICY IF EXISTS "Users manage own set_logs" ON public.set_logs;
DROP POLICY IF EXISTS "Users manage own body_measurements" ON public.body_measurements;

-- Disable RLS
ALTER TABLE public.workout_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.set_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_measurements DISABLE ROW LEVEL SECURITY;

-- Remove user_id columns
ALTER TABLE public.workout_logs DROP COLUMN user_id;
ALTER TABLE public.set_logs DROP COLUMN user_id;
ALTER TABLE public.body_measurements DROP COLUMN user_id;