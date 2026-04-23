-- Populate exercise_body_parts with mappings for standard exercises

-- Helper function to get body_part_id by slug
DO $$
DECLARE
  v_chest_id UUID;
  v_back_id UUID;
  v_shoulders_id UUID;
  v_biceps_id UUID;
  v_triceps_id UUID;
  v_forearms_id UUID;
  v_legs_id UUID;
  v_quads_id UUID;
  v_hamstrings_id UUID;
  v_calves_id UUID;
  v_glutes_id UUID;
  v_abs_id UUID;
  v_traps_id UUID;
  v_lats_id UUID;
BEGIN
  -- Get all body part IDs
  SELECT id INTO v_chest_id FROM public.body_parts WHERE slug = 'chest';
  SELECT id INTO v_back_id FROM public.body_parts WHERE slug = 'back';
  SELECT id INTO v_shoulders_id FROM public.body_parts WHERE slug = 'shoulders';
  SELECT id INTO v_biceps_id FROM public.body_parts WHERE slug = 'biceps';
  SELECT id INTO v_triceps_id FROM public.body_parts WHERE slug = 'triceps';
  SELECT id INTO v_forearms_id FROM public.body_parts WHERE slug = 'forearms';
  SELECT id INTO v_legs_id FROM public.body_parts WHERE slug = 'legs';
  SELECT id INTO v_quads_id FROM public.body_parts WHERE slug = 'quads';
  SELECT id INTO v_hamstrings_id FROM public.body_parts WHERE slug = 'hamstrings';
  SELECT id INTO v_calves_id FROM public.body_parts WHERE slug = 'calves';
  SELECT id INTO v_glutes_id FROM public.body_parts WHERE slug = 'glutes';
  SELECT id INTO v_abs_id FROM public.body_parts WHERE slug = 'abs';
  SELECT id INTO v_traps_id FROM public.body_parts WHERE slug = 'traps';
  SELECT id INTO v_lats_id FROM public.body_parts WHERE slug = 'lats';

  -- Bench Press variants
  INSERT INTO public.exercise_body_parts (exercise_id, body_part_id, is_primary)
  SELECT id, v_chest_id, true FROM public.exercises WHERE LOWER(name) LIKE '%bench%' ON CONFLICT DO NOTHING;

  INSERT INTO public.exercise_body_parts (exercise_id, body_part_id, is_primary)
  SELECT id, v_triceps_id, false FROM public.exercises WHERE LOWER(name) LIKE '%bench%' ON CONFLICT DO NOTHING;

  -- Row variants (back primary)
  INSERT INTO public.exercise_body_parts (exercise_id, body_part_id, is_primary)
  SELECT id, v_back_id, true FROM public.exercises WHERE LOWER(name) LIKE '%row%' ON CONFLICT DO NOTHING;

  INSERT INTO public.exercise_body_parts (exercise_id, body_part_id, is_primary)
  SELECT id, v_biceps_id, false FROM public.exercises WHERE LOWER(name) LIKE '%row%' ON CONFLICT DO NOTHING;

  -- Australian Row (back + shoulders)
  INSERT INTO public.exercise_body_parts (exercise_id, body_part_id, is_primary)
  SELECT id, v_back_id, true FROM public.exercises WHERE LOWER(name) LIKE '%australian%' ON CONFLICT DO NOTHING;

  INSERT INTO public.exercise_body_parts (exercise_id, body_part_id, is_primary)
  SELECT id, v_shoulders_id, false FROM public.exercises WHERE LOWER(name) LIKE '%australian%' ON CONFLICT DO NOTHING;

  -- Lateral Raises (shoulders primary)
  INSERT INTO public.exercise_body_parts (exercise_id, body_part_id, is_primary)
  SELECT id, v_shoulders_id, true FROM public.exercises WHERE LOWER(name) LIKE '%alzate%lateral%' OR LOWER(name) LIKE '%lateral%raise%' ON CONFLICT DO NOTHING;

  -- Rear Delt Raises (shoulders - rear)
  INSERT INTO public.exercise_body_parts (exercise_id, body_part_id, is_primary)
  SELECT id, v_shoulders_id, true FROM public.exercises WHERE LOWER(name) LIKE '%alzate%posterior%' OR LOWER(name) LIKE '%rear%' ON CONFLICT DO NOTHING;

  -- Chest Flyes (Croci)
  INSERT INTO public.exercise_body_parts (exercise_id, body_part_id, is_primary)
  SELECT id, v_chest_id, true FROM public.exercises WHERE LOWER(name) LIKE '%croci%' ON CONFLICT DO NOTHING;

  -- Curls (biceps)
  INSERT INTO public.exercise_body_parts (exercise_id, body_part_id, is_primary)
  SELECT id, v_biceps_id, true FROM public.exercises WHERE LOWER(name) LIKE '%curl%' ON CONFLICT DO NOTHING;

  -- Squat variants (legs)
  INSERT INTO public.exercise_body_parts (exercise_id, body_part_id, is_primary)
  SELECT id, v_quads_id, true FROM public.exercises WHERE LOWER(name) LIKE '%squat%' ON CONFLICT DO NOTHING;

  INSERT INTO public.exercise_body_parts (exercise_id, body_part_id, is_primary)
  SELECT id, v_glutes_id, false FROM public.exercises WHERE LOWER(name) LIKE '%squat%' ON CONFLICT DO NOTHING;

  -- Deadlift (back + legs)
  INSERT INTO public.exercise_body_parts (exercise_id, body_part_id, is_primary)
  SELECT id, v_back_id, true FROM public.exercises WHERE LOWER(name) LIKE '%dead%' ON CONFLICT DO NOTHING;

  INSERT INTO public.exercise_body_parts (exercise_id, body_part_id, is_primary)
  SELECT id, v_legs_id, false FROM public.exercises WHERE LOWER(name) LIKE '%dead%' ON CONFLICT DO NOTHING;

  -- Calf raises
  INSERT INTO public.exercise_body_parts (exercise_id, body_part_id, is_primary)
  SELECT id, v_calves_id, true FROM public.exercises WHERE LOWER(name) LIKE '%calf%' ON CONFLICT DO NOTHING;

  -- Ab exercises
  INSERT INTO public.exercise_body_parts (exercise_id, body_part_id, is_primary)
  SELECT id, v_abs_id, true FROM public.exercises WHERE LOWER(name) LIKE '%crunch%' OR LOWER(name) LIKE '%plank%' OR LOWER(name) LIKE '%addominali%' ON CONFLICT DO NOTHING;

END $$;
