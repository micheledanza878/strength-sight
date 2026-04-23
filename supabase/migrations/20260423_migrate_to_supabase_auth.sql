-- Migrate to Supabase Auth (email/password)
-- This migration:
-- 1. Drops the custom users table
-- 2. Adds user_id to all relevant tables
-- 3. Re-enables RLS with auth.uid() policies
-- 4. Preserves existing data by setting old user_id to NULL

-- Step 1: Drop custom users table (since we'll use auth.users instead)
DROP TABLE IF EXISTS public.users CASCADE;

-- Step 1b: Set old user_id to NULL for compatibility with auth.users
UPDATE public.workout_plans SET user_id = NULL WHERE user_id IS NOT NULL;
UPDATE public.active_workout_plan SET user_id = NULL WHERE user_id IS NOT NULL;
UPDATE public.workout_logs SET user_id = NULL WHERE user_id IS NOT NULL;
UPDATE public.set_logs SET user_id = NULL WHERE user_id IS NOT NULL;
UPDATE public.body_measurements SET user_id = NULL WHERE user_id IS NOT NULL;

-- Step 2: Add user_id to workout_plans table
ALTER TABLE public.workout_plans
ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE public.workout_plans DROP CONSTRAINT IF EXISTS workout_plans_user_id_fkey;
ALTER TABLE public.workout_plans
ADD CONSTRAINT workout_plans_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_workout_plans_user ON public.workout_plans(user_id);

-- Step 3: Add user_id to active_workout_plan table
ALTER TABLE public.active_workout_plan
ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE public.active_workout_plan DROP CONSTRAINT IF EXISTS active_workout_plan_user_id_fkey;
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
ALTER TABLE public.workout_logs DROP CONSTRAINT IF EXISTS workout_logs_user_id_fkey;
ALTER TABLE public.workout_logs
ADD CONSTRAINT workout_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.set_logs DROP CONSTRAINT IF EXISTS set_logs_user_id_fkey;
ALTER TABLE public.set_logs
ADD CONSTRAINT set_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.body_measurements DROP CONSTRAINT IF EXISTS body_measurements_user_id_fkey;
ALTER TABLE public.body_measurements
ADD CONSTRAINT body_measurements_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 6: Enable RLS on main tables only
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_workout_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.set_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;

-- Disable RLS on child tables (protected by parent table RLS)
ALTER TABLE public.workout_plan_days DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plan_exercises DISABLE ROW LEVEL SECURITY;

-- Step 7: Drop existing RLS policies
DROP POLICY IF EXISTS "Users manage own workout_plans" ON public.workout_plans;
DROP POLICY IF EXISTS "Users manage own active_workout_plan" ON public.active_workout_plan;
DROP POLICY IF EXISTS "Users manage own workout_logs" ON public.workout_logs;
DROP POLICY IF EXISTS "Users manage own set_logs" ON public.set_logs;
DROP POLICY IF EXISTS "Users manage own body_measurements" ON public.body_measurements;

-- Step 8: Create RLS policy for workout_plans
CREATE POLICY "Users manage own workout_plans"
  ON public.workout_plans
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 9: Create RLS policy for active_workout_plan
CREATE POLICY "Users manage own active_workout_plan"
  ON public.active_workout_plan
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 10: Create RLS policy for workout_logs
CREATE POLICY "Users manage own workout_logs"
  ON public.workout_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 11: Create RLS policy for set_logs
CREATE POLICY "Users manage own set_logs"
  ON public.set_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 12: Create RLS policy for body_measurements
CREATE POLICY "Users manage own body_measurements"
  ON public.body_measurements
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_id ON public.workout_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_set_logs_user_id ON public.set_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_id ON public.body_measurements(user_id);
