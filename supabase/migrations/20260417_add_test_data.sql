-- Aggiungi più dati di test per vedere come funziona l'app

-- 1. Aggiungi altra scheda (Upper/Lower)
INSERT INTO public.workout_plans (name, description, duration_weeks)
VALUES ('Upper/Lower 4 Giorni', 'Programma Upper Body / Lower Body su 4 giorni', 8);

-- 2. Giorni della scheda Upper/Lower
INSERT INTO public.workout_plan_days (workout_plan_id, day_number, day_name)
SELECT id, 1, 'Upper (Petto/Dorso/Spalle)' FROM public.workout_plans WHERE name = 'Upper/Lower 4 Giorni'
UNION ALL
SELECT id, 2, 'Lower (Gambe)' FROM public.workout_plans WHERE name = 'Upper/Lower 4 Giorni'
UNION ALL
SELECT id, 3, 'Upper (Braccia/Spalle)' FROM public.workout_plans WHERE name = 'Upper/Lower 4 Giorni'
UNION ALL
SELECT id, 4, 'Lower (Gambe Posterior)' FROM public.workout_plans WHERE name = 'Upper/Lower 4 Giorni';

-- 3. Esercizi Upper 1
INSERT INTO public.workout_plan_exercises (workout_plan_day_id, exercise_name, order_number, sets, reps_min, reps_max, rest_seconds, notes)
SELECT wpd.id, 'Panca piana', 1, 4, 6, 8, 120, 'Peso: 60kg'
FROM public.workout_plan_days wpd
JOIN public.workout_plans wp ON wpd.workout_plan_id = wp.id
WHERE wp.name = 'Upper/Lower 4 Giorni' AND wpd.day_number = 1
UNION ALL
SELECT wpd.id, 'Trazioni', 2, 4, 6, 8, 120, 'Assistite se necessario'
FROM public.workout_plan_days wpd
JOIN public.workout_plans wp ON wpd.workout_plan_id = wp.id
WHERE wp.name = 'Upper/Lower 4 Giorni' AND wpd.day_number = 1
UNION ALL
SELECT wpd.id, 'Rematore manubrio', 3, 4, 8, 10, 90, 'Peso: 25kg'
FROM public.workout_plan_days wpd
JOIN public.workout_plans wp ON wpd.workout_plan_id = wp.id
WHERE wp.name = 'Upper/Lower 4 Giorni' AND wpd.day_number = 1
UNION ALL
SELECT wpd.id, 'Distensioni spalle', 4, 3, 8, 10, 90, 'Peso: 20kg'
FROM public.workout_plan_days wpd
JOIN public.workout_plans wp ON wpd.workout_plan_id = wp.id
WHERE wp.name = 'Upper/Lower 4 Giorni' AND wpd.day_number = 1;

-- 4. Esercizi Lower 1
INSERT INTO public.workout_plan_exercises (workout_plan_day_id, exercise_name, order_number, sets, reps_min, reps_max, rest_seconds, notes)
SELECT wpd.id, 'Squat', 1, 4, 6, 8, 150, 'Peso: 80kg'
FROM public.workout_plan_days wpd
JOIN public.workout_plans wp ON wpd.workout_plan_id = wp.id
WHERE wp.name = 'Upper/Lower 4 Giorni' AND wpd.day_number = 2
UNION ALL
SELECT wpd.id, 'Leg Press', 2, 4, 8, 10, 120, 'Peso: 180kg'
FROM public.workout_plan_days wpd
JOIN public.workout_plans wp ON wpd.workout_plan_id = wp.id
WHERE wp.name = 'Upper/Lower 4 Giorni' AND wpd.day_number = 2
UNION ALL
SELECT wpd.id, 'Leg Curl', 3, 3, 10, 12, 90, 'Peso: 50kg'
FROM public.workout_plan_days wpd
JOIN public.workout_plans wp ON wpd.workout_plan_id = wp.id
WHERE wp.name = 'Upper/Lower 4 Giorni' AND wpd.day_number = 2;

-- 5. Esercizi Upper 2
INSERT INTO public.workout_plan_exercises (workout_plan_day_id, exercise_name, order_number, sets, reps_min, reps_max, rest_seconds, notes)
SELECT wpd.id, 'Curl bilanciere', 1, 4, 6, 8, 90, 'Peso: 30kg'
FROM public.workout_plan_days wpd
JOIN public.workout_plans wp ON wpd.workout_plan_id = wp.id
WHERE wp.name = 'Upper/Lower 4 Giorni' AND wpd.day_number = 3
UNION ALL
SELECT wpd.id, 'Tricep dips', 2, 4, 8, 10, 90, 'A corpo libero o assistiti'
FROM public.workout_plan_days wpd
JOIN public.workout_plans wp ON wpd.workout_plan_id = wp.id
WHERE wp.name = 'Upper/Lower 4 Giorni' AND wpd.day_number = 3
UNION ALL
SELECT wpd.id, 'Spalle laterali', 3, 3, 10, 12, 60, 'Peso: 12kg'
FROM public.workout_plan_days wpd
JOIN public.workout_plans wp ON wpd.workout_plan_id = wp.id
WHERE wp.name = 'Upper/Lower 4 Giorni' AND wpd.day_number = 3;

-- 6. Esercizi Lower 2
INSERT INTO public.workout_plan_exercises (workout_plan_day_id, exercise_name, order_number, sets, reps_min, reps_max, rest_seconds, notes)
SELECT wpd.id, 'Stacco', 1, 4, 4, 6, 180, 'Peso: 120kg'
FROM public.workout_plan_days wpd
JOIN public.workout_plans wp ON wpd.workout_plan_id = wp.id
WHERE wp.name = 'Upper/Lower 4 Giorni' AND wpd.day_number = 4
UNION ALL
SELECT wpd.id, 'Hip Thrust', 2, 4, 8, 10, 120, 'Peso: 80kg'
FROM public.workout_plan_days wpd
JOIN public.workout_plans wp ON wpd.workout_plan_id = wp.id
WHERE wp.name = 'Upper/Lower 4 Giorni' AND wpd.day_number = 4
UNION ALL
SELECT wpd.id, 'Calf Raise', 3, 4, 12, 15, 60, 'Peso: 40kg'
FROM public.workout_plan_days wpd
JOIN public.workout_plans wp ON wpd.workout_plan_id = wp.id
WHERE wp.name = 'Upper/Lower 4 Giorni' AND wpd.day_number = 4;

-- 7. Aggiungi più misurazioni (settimanali per 2 mesi)
INSERT INTO public.body_measurements (
  weight, body_fat, height_cm, testata_cm, collo_cm,
  braccio_front_cm, braccio_retro_cm, avambraccio_cm,
  petto_torace_cm, vita_cm, vita_retro_cm,
  fianchi_cm, fianchi_retro_cm,
  schiena_altezza_dorsali_cm, spalle_ampiezza_cm, glutei_circonferenza_cm,
  coscia_cm, coscia_retro_cm, polpaccio_cm, polpaccio_retro_cm,
  measured_at
)
VALUES
  (83.0, 14.0, 183, 56.2, 39.1, 37.2, 36.2, 29.1, 103.5, 82.5, 82.5, 96.5, 96.5, 62.2, 115.5, 98.5, 58.5, 57.5, 39.5, 39.5, CURRENT_DATE - INTERVAL '28 days'),
  (82.8, 14.3, 183, 56.1, 39.0, 37.1, 36.1, 29.0, 103.2, 82.2, 82.2, 96.2, 96.2, 62.0, 115.2, 98.2, 58.2, 57.2, 39.2, 39.2, CURRENT_DATE - INTERVAL '21 days'),
  (82.6, 14.5, 183, 56.0, 39.0, 37.0, 36.0, 29.0, 103.0, 82.0, 82.0, 96.0, 96.0, 62.0, 115.0, 98.0, 58.0, 57.0, 39.0, 39.0, CURRENT_DATE - INTERVAL '14 days'),
  (82.3, 14.7, 183, 55.9, 38.9, 36.9, 35.9, 28.9, 102.8, 81.8, 81.8, 95.8, 95.8, 61.8, 114.8, 97.8, 57.8, 56.8, 38.8, 38.8, CURRENT_DATE - INTERVAL '7 days');

-- 8. Aggiungi più workout logs (ultimi 10 giorni)
INSERT INTO public.workout_logs (workout_day, started_at, completed_at)
VALUES
  ('Push A (Petto/Spalle)', now() - INTERVAL '10 days', now() - INTERVAL '10 days' + INTERVAL '1 hour 20 min'),
  ('Pull A (Dorso/Bicipiti)', now() - INTERVAL '9 days', now() - INTERVAL '9 days' + INTERVAL '1 hour 15 min'),
  ('Legs A (Gambe)', now() - INTERVAL '8 days', now() - INTERVAL '8 days' + INTERVAL '1 hour 45 min'),
  ('Push B (Petto/Spalle)', now() - INTERVAL '7 days', now() - INTERVAL '7 days' + INTERVAL '1 hour 20 min'),
  ('Pull B (Dorso/Bicipiti)', now() - INTERVAL '6 days', now() - INTERVAL '6 days' + INTERVAL '1 hour 15 min'),
  ('Legs B (Gambe)', now() - INTERVAL '5 days', now() - INTERVAL '5 days' + INTERVAL '1 hour 50 min'),
  ('Push A (Petto/Spalle)', now() - INTERVAL '4 days', now() - INTERVAL '4 days' + INTERVAL '1 hour 25 min'),
  ('Pull A (Dorso/Bicipiti)', now() - INTERVAL '3 days', now() - INTERVAL '3 days' + INTERVAL '1 hour 10 min'),
  ('Legs A (Gambe)', now() - INTERVAL '2 days', now() - INTERVAL '2 days' + INTERVAL '1 hour 55 min'),
  ('Push B (Petto/Spalle)', now() - INTERVAL '1 day', now() - INTERVAL '1 day' + INTERVAL '1 hour 30 min');

-- 9. Aggiungi set_logs per gli ultimi 3 workout
INSERT INTO public.set_logs (workout_log_id, exercise_name, set_number, reps, weight)
SELECT wl.id, 'Spinte panca piana', 1, 8, 50
FROM (SELECT id FROM public.workout_logs WHERE workout_day = 'Push B (Petto/Spalle)' ORDER BY created_at DESC LIMIT 1) wl
UNION ALL
SELECT wl.id, 'Spinte panca piana', 2, 7, 50
FROM (SELECT id FROM public.workout_logs WHERE workout_day = 'Push B (Petto/Spalle)' ORDER BY created_at DESC LIMIT 1) wl
UNION ALL
SELECT wl.id, 'Spinte panca piana', 3, 6, 50
FROM (SELECT id FROM public.workout_logs WHERE workout_day = 'Push B (Petto/Spalle)' ORDER BY created_at DESC LIMIT 1) wl
UNION ALL
SELECT wl.id, 'Spinte panca piana', 4, 6, 50
FROM (SELECT id FROM public.workout_logs WHERE workout_day = 'Push B (Petto/Spalle)' ORDER BY created_at DESC LIMIT 1) wl
UNION ALL
SELECT wl.id, 'Croci panca piana', 1, 12, 15
FROM (SELECT id FROM public.workout_logs WHERE workout_day = 'Push B (Petto/Spalle)' ORDER BY created_at DESC LIMIT 1) wl
UNION ALL
SELECT wl.id, 'Croci panca piana', 2, 11, 15
FROM (SELECT id FROM public.workout_logs WHERE workout_day = 'Push B (Petto/Spalle)' ORDER BY created_at DESC LIMIT 1) wl
UNION ALL
SELECT wl.id, 'Croci panca piana', 3, 10, 15
FROM (SELECT id FROM public.workout_logs WHERE workout_day = 'Push B (Petto/Spalle)' ORDER BY created_at DESC LIMIT 1) wl
UNION ALL
SELECT wl.id, 'Croci panca piana', 4, 10, 15
FROM (SELECT id FROM public.workout_logs WHERE workout_day = 'Push B (Petto/Spalle)' ORDER BY created_at DESC LIMIT 1) wl
UNION ALL
SELECT wl.id, 'Alzate laterali 45°', 1, 10, 10
FROM (SELECT id FROM public.workout_logs WHERE workout_day = 'Push B (Petto/Spalle)' ORDER BY created_at DESC LIMIT 1) wl
UNION ALL
SELECT wl.id, 'Alzate laterali 45°', 2, 9, 10
FROM (SELECT id FROM public.workout_logs WHERE workout_day = 'Push B (Petto/Spalle)' ORDER BY created_at DESC LIMIT 1) wl
UNION ALL
SELECT wl.id, 'Alzate laterali 45°', 3, 8, 10
FROM (SELECT id FROM public.workout_logs WHERE workout_day = 'Push B (Petto/Spalle)' ORDER BY created_at DESC LIMIT 1) wl
UNION ALL
SELECT wl.id, 'Alzate laterali 45°', 4, 8, 10
FROM (SELECT id FROM public.workout_logs WHERE workout_day = 'Push B (Petto/Spalle)' ORDER BY created_at DESC LIMIT 1) wl;
