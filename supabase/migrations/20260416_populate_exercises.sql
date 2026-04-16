-- Populate exercises reference table
-- This is optional but helpful for tracking exercise data separately

-- Create exercises table (optional - for future use)
-- This table can store exercise metadata like suggested weight, notes, etc.

CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  body_part TEXT, -- 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', etc.
  suggested_weight_kg NUMERIC(5,1),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Giorno A: Petto / Dorso
INSERT INTO public.exercises (name, body_part, suggested_weight_kg, notes)
VALUES
  ('Push-up', 'Chest', NULL, 'Bodyweight exercise - max reps'),
  ('Croci panca piana', 'Chest', 15, '4 sets × 10 reps'),
  ('Spinte panca inclinata', 'Chest', 20, '4 sets × 6-8 reps'),
  ('Trazioni elastico', 'Back', 10, '4 sets × 6 reps - use resistance band'),
  ('Rematore singolo', 'Back', 15, '4 sets × 6-8 reps per side'),
  ('Australian Row', 'Back', NULL, '4 sets × 8-10 reps - bodyweight'),
  ('Dumbbell Pullover', 'Chest/Back', 12, '4 sets × 10 reps')
ON CONFLICT (name) DO NOTHING;

-- Giorno B: Spalle / Braccia
INSERT INTO public.exercises (name, body_part, suggested_weight_kg, notes)
VALUES
  ('Military Press', 'Shoulders', 20, '4 sets × 6-8 reps'),
  ('Alzate posteriori', 'Shoulders', 12, '4 sets × 10 reps'),
  ('Alzate laterali 45°', 'Shoulders', 10, '4 sets × 10 reps'),
  ('Hammer Curl', 'Arms', 12, '4 sets × 6-8 reps'),
  ('Curl concentrato', 'Arms', 10, '4 sets × 8-10 reps'),
  ('French Press', 'Arms', NULL, '4 sets × 8-10 reps'),
  ('Kickback', 'Arms', NULL, '4 sets × 10 reps')
ON CONFLICT (name) DO NOTHING;

-- Giorno C: Petto / Braccia
INSERT INTO public.exercises (name, body_part, suggested_weight_kg, notes)
VALUES
  ('Push Up', 'Chest', NULL, '4 sets × max reps - bodyweight'),
  ('Spinta stretta', 'Chest', 15, '4 sets × 6-8 reps'),
  ('Croci inclinate', 'Chest', 10, '4 sets × 10 reps'),
  ('Curl panca inclinata', 'Arms', 12, '4 sets × 6-8 reps'),
  ('Curl EZ', 'Arms', 15, '4 sets × 8-10 reps'),
  ('Spider Curl', 'Arms', 10, '4 sets × 10 reps')
ON CONFLICT (name) DO NOTHING;

-- Giorno D: Dorso / Spalle
INSERT INTO public.exercises (name, body_part, suggested_weight_kg, notes)
VALUES
  ('Trazioni elastico', 'Back', 10, '4 sets × max reps - use resistance band'),
  ('Rematore panca', 'Back', 20, '4 sets × 6-8 reps'),
  ('Rematore 45°', 'Back', 25, '4 sets × 8-10 reps'),
  ('Lento avanti', 'Shoulders', 15, '4 sets × 6-8 reps'),
  ('Alzate laterali', 'Shoulders', 10, '4 sets × 10 reps'),
  ('Face Pull', 'Shoulders', 8, '4 sets × 12 reps'),
  ('Shrugs', 'Shoulders', 20, '4 sets × 10 reps')
ON CONFLICT (name) DO NOTHING;

-- Gambe
INSERT INTO public.exercises (name, body_part, suggested_weight_kg, notes)
VALUES
  ('Affondi bulgari', 'Legs', 12, '4 sets × 8 reps per leg'),
  ('Stacco rumeno', 'Legs', 25, '4 sets × 8 reps'),
  ('Squat', 'Legs', 20, '4 sets × 8 reps'),
  ('Hip Thrust', 'Legs', 30, '4 sets × 10 reps'),
  ('Sissy Squat (Superset)', 'Legs', NULL, '3 sets × 12 reps - bodyweight'),
  ('Nordic Hamstring Curl (Superset)', 'Legs', NULL, '3 sets × 6 reps - with resistance band'),
  ('Calf Raise', 'Legs', 20, '4 sets × 15 reps')
ON CONFLICT (name) DO NOTHING;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_exercises_body_part ON public.exercises(body_part);
CREATE INDEX IF NOT EXISTS idx_exercises_name ON public.exercises(name);
