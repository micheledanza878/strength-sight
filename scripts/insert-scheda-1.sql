-- Inserisci Scheda 1 con i 5 giorni e tutti gli esercizi

-- 1. Inserisci il workout_plan
INSERT INTO public.workout_plans (name, description, duration_weeks)
VALUES ('Scheda 1', 'Scheda Split A/B/Gambe', 12)
RETURNING id;

-- Usa questo ID per i passaggi successivi (sostituisci {plan_id} con l'UUID)
-- Esempio: '123e4567-e89b-12d3-a456-426614174000'

-- 2. Inserisci i 5 giorni della scheda (sostituisci {plan_id})
INSERT INTO public.workout_plan_days (workout_plan_id, day_number, day_name) VALUES
('{plan_id}', 1, 'Petto/Dorso'),
('{plan_id}', 2, 'Spalle Braccia'),
('{plan_id}', 3, 'Gambe'),
('{plan_id}', 4, 'Petto/Braccia'),
('{plan_id}', 5, 'Dorso/Spalle');

-- Usa questi IDs per gli esercizi (sostituisci {day1_id}, {day2_id}, ecc.)

-- ============================================
-- GIORNO 1: Petto/Dorso (sostituisci {day1_id})
-- ============================================
INSERT INTO public.workout_plan_exercises (workout_plan_day_id, exercise_name, order_number, sets, reps_min, reps_max, notes, weight) VALUES
('{day1_id}', 'Push-up', 1, 4, NULL, NULL, 'MAX ripetizioni', NULL),
('{day1_id}', 'Croci panca piana', 2, 4, 10, 10, '', NULL),
('{day1_id}', 'Spinte panca inclinata', 3, 4, 6, 8, '', NULL),
('{day1_id}', 'Trazioni elastico', 4, 4, 6, 6, '', NULL),
('{day1_id}', 'Rematore singolo su panca', 5, 4, 6, 8, 'Carico pesante', NULL),
('{day1_id}', 'Australian Row', 6, 4, 8, 10, '', NULL),
('{day1_id}', 'Dumbbell Pullover', 7, 4, 10, 10, '', NULL);

-- ============================================
-- GIORNO 2: Spalle Braccia (sostituisci {day2_id})
-- ============================================
INSERT INTO public.workout_plan_exercises (workout_plan_day_id, exercise_name, order_number, sets, reps_min, reps_max, notes, weight) VALUES
('{day2_id}', 'Military press', 1, 4, 6, 8, '', 20),
('{day2_id}', 'Alzate posteriori', 2, 4, 10, 10, '', 12),
('{day2_id}', 'Alzate laterali 45°', 3, 4, 10, 10, '', 10),
('{day2_id}', 'Hammer Curl', 4, 4, 6, 8, '', 12),
('{day2_id}', 'Curl concentrato', 5, 4, 8, 10, '', 10),
('{day2_id}', 'French Press (nuca)', 6, 4, 6, 8, '', NULL),
('{day2_id}', 'Kickback manubrio', 7, 4, 10, 10, '', NULL);

-- ============================================
-- GIORNO 3: Gambe (sostituisci {day3_id})
-- ============================================
INSERT INTO public.workout_plan_exercises (workout_plan_day_id, exercise_name, order_number, sets, reps_min, reps_max, notes, weight) VALUES
('{day3_id}', 'Affondi bulgari', 1, 4, 8, 10, 'Stabilità + glutei, per gamba', 8),
('{day3_id}', 'Stacco rumeno', 2, 4, 6, 8, 'Femorali + catena posteriore', 20),
('{day3_id}', 'Squat', 3, 4, 6, 8, 'Fondamentale quadricipiti/glutei', NULL),
('{day3_id}', 'Hip Thrust', 4, 4, 8, 10, 'Focus glutei', NULL),
('{day3_id}', 'Sissy Squat', 5, 3, 10, 12, 'Superset', NULL),
('{day3_id}', 'Nordic Hamstring Curl', 6, 3, 6, 8, 'Superset', NULL),
('{day3_id}', 'Calf Raise su rialzo', 7, 4, 12, 15, 'Polpacci', NULL);

-- ============================================
-- GIORNO 4: Petto/Braccia (sostituisci {day4_id})
-- ============================================
INSERT INTO public.workout_plan_exercises (workout_plan_day_id, exercise_name, order_number, sets, reps_min, reps_max, notes, weight) VALUES
('{day4_id}', 'Push up', 1, 4, NULL, NULL, 'MAX ripetizioni', NULL),
('{day4_id}', 'Spinta stretta panca piana', 2, 4, 6, 8, '', 14),
('{day4_id}', 'Croci panca inclinata', 3, 4, 10, 10, '', 16),
('{day4_id}', 'Curl panca inclinata', 4, 4, 6, 8, '', 10),
('{day4_id}', 'Curl bilanciere EZ', 5, 4, 6, 8, '', 14),
('{day4_id}', 'Spider Curl', 6, 4, 8, 10, '', 6),
('{day4_id}', 'French press', 7, 4, 8, 10, '', NULL),
('{day4_id}', 'Kickback manubrio', 8, 4, 10, 10, '', NULL);

-- ============================================
-- GIORNO 5: Dorso/Spalle (sostituisci {day5_id})
-- ============================================
INSERT INTO public.workout_plan_exercises (workout_plan_day_id, exercise_name, order_number, sets, reps_min, reps_max, notes, weight) VALUES
('{day5_id}', 'Trazioni con elastico', 1, 4, NULL, NULL, 'MAX ripetizioni', NULL),
('{day5_id}', 'Rematore su panca', 2, 4, 6, 8, '', NULL),
('{day5_id}', 'Rematore 45° manubri', 3, 4, 8, 10, '', NULL),
('{day5_id}', 'Lento in avanti', 4, 4, 6, 8, '', NULL),
('{day5_id}', 'Alzate laterali', 5, 4, 8, 10, '', NULL),
('{day5_id}', 'Face Pull', 6, 4, 12, 12, '', NULL),
('{day5_id}', 'Shrugs', 7, 4, 12, 12, '', NULL);
