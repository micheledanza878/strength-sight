-- Migrate to Supabase Auth (email/password)
-- This migration:
-- 1. Drops the custom users table
-- 2. Adds user_id to all relevant tables
-- 3. Re-enables RLS with auth.uid() policies

-- Step 1: Drop custom users table (since we'll use auth.users instead)
DROP TABLE IF EXISTS public.users CASCADE;

-- Step 2: Add user_id to workout_plans table
ALTER TABLE public.workout_plans
ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT auth.uid();

ALTER TABLE public.workout_plans
ADD CONSTRAINT workout_plans_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_workout_plans_user ON public.workout_plans(user_id);

-- Step 3: Add user_id to active_workout_plan table
ALTER TABLE public.active_workout_plan
ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT auth.uid();

ALTER TABLE public.active_workout_plan
ADD CONSTRAINT active_workout_plan_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_active_workout_plan_user ON public.active_workout_plan(user_id);

-- Step 4: Re-add user_id to other tables if missing
ALTER TABLE public.workout_logs
ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE public.set_logs
ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE public.body_measurements
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Step 5: Add foreign key constraints
ALTER TABLE public.workout_logs
ADD CONSTRAINT IF NOT EXISTS workout_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.set_logs
ADD CONSTRAINT IF NOT EXISTS set_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.body_measurements
ADD CONSTRAINT IF NOT EXISTS body_measurements_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 6: Enable RLS on all tables
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plan_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_workout_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.set_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;

-- Step 7: Drop existing RLS policies (if any)
DROP POLICY IF EXISTS "Users manage own workout_plans" ON public.workout_plans;
DROP POLICY IF EXISTS "Users manage own workout_plan_days" ON public.workout_plan_days;
DROP POLICY IF EXISTS "Users manage own workout_plan_exercises" ON public.workout_plan_exercises;
DROP POLICY IF EXISTS "Users manage own active_workout_plan" ON public.active_workout_plan;
DROP POLICY IF EXISTS "Users manage own workout_logs" ON public.workout_logs;
DROP POLICY IF EXISTS "Users manage own set_logs" ON public.set_logs;
DROP POLICY IF EXISTS "Users manage own body_measurements" ON public.body_measurements;

-- Step 8: Create RLS policies for workout_plans
CREATE POLICY "Users manage own workout_plans"
  ON public.workout_plans
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 9: Create RLS policies for workout_plan_days (via workout_plans)
CREATE POLICY "Users manage own workout_plan_days"
  ON public.workout_plan_days
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_plans
      WHERE workout_plans.id = workout_plan_days.workout_plan_id
      AND workout_plans.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_plans
      WHERE workout_plans.id = workout_plan_days.workout_plan_id
      AND workout_plans.user_id = auth.uid()
    )
  );

-- Step 10: Create RLS policies for workout_plan_exercises (via workout_plan_days)
CREATE POLICY "Users manage own workout_plan_exercises"
  ON public.workout_plan_exercises
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_plan_days
      JOIN public.workout_plans ON workout_plans.id = workout_plan_days.workout_plan_id
      WHERE workout_plan_days.id = workout_plan_exercises.workout_plan_day_id
      AND workout_plans.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_plan_days
      JOIN public.workout_plans ON workout_plans.id = workout_plan_days.workout_plan_id
      WHERE workout_plan_days.id = workout_plan_exercises.workout_plan_day_id
      AND workout_plans.user_id = auth.uid()
    )
  );

-- Step 11: Create RLS policies for active_workout_plan
CREATE POLICY "Users manage own active_workout_plan"
  ON public.active_workout_plan
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 12: Re-create RLS policies for workout_logs
CREATE POLICY "Users manage own workout_logs"
  ON public.workout_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 13: Re-create RLS policies for set_logs
CREATE POLICY "Users manage own set_logs"
  ON public.set_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 14: Re-create RLS policies for body_measurements
CREATE POLICY "Users manage own body_measurements"
  ON public.body_measurements
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_id ON public.workout_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_set_logs_user_id ON public.set_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_id ON public.body_measurements(user_id);
