-- Add body parts system for exercise filtering

-- Create body_parts table with enum-like structure
CREATE TABLE public.body_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert standard body parts
INSERT INTO public.body_parts (slug, name, icon) VALUES
  ('chest', 'Petto', '🏋️'),
  ('back', 'Schiena', '📌'),
  ('shoulders', 'Spalle', '🎯'),
  ('biceps', 'Bicipiti', '💪'),
  ('triceps', 'Tricipiti', '💪'),
  ('forearms', 'Avambracci', '🦾'),
  ('legs', 'Gambe', '🦵'),
  ('quads', 'Quadricipiti', '🦵'),
  ('hamstrings', 'Ischio-tibiali', '🦵'),
  ('calves', 'Polpacci', '🦵'),
  ('glutes', 'Glutei', '🍑'),
  ('abs', 'Addominali', '🫀'),
  ('traps', 'Trapezi', '🎯'),
  ('lats', 'Dorsali', '📌');

-- Create junction table for exercise-body_part relationship (many-to-many)
CREATE TABLE public.exercise_body_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  body_part_id UUID NOT NULL REFERENCES public.body_parts(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(exercise_id, body_part_id)
);

-- Create indexes for performance
CREATE INDEX idx_exercise_body_parts_exercise ON public.exercise_body_parts(exercise_id);
CREATE INDEX idx_exercise_body_parts_body_part ON public.exercise_body_parts(body_part_id);
CREATE INDEX idx_exercise_body_parts_primary ON public.exercise_body_parts(is_primary);
