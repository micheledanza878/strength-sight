-- Enable RLS with permissive policies on child tables
-- Required for PostgREST API access via authenticated role

ALTER TABLE public.workout_plan_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON public.workout_plan_days FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.workout_plan_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON public.workout_plan_exercises FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.body_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON public.body_parts FOR ALL TO authenticated USING (true) WITH CHECK (true);
