-- Insert Michele Danza's Weekly Diet Plan
-- NOTA: Sostituire i seguenti valori:
-- {USER_ID}: ID dell'utente (da auth.users)
-- {WEEKLY_PLAN_ID}: ID del piano settimanale (può essere un nuovo UUID)

-- 1. Crea il piano settimanale (se non esiste)
WITH plan_insert AS (
  INSERT INTO diet_weekly_plans (user_id)
  VALUES ('{USER_ID}')
  ON CONFLICT DO NOTHING
  RETURNING id
)
SELECT id AS weekly_plan_id FROM plan_insert
UNION ALL
SELECT id FROM diet_weekly_plans WHERE user_id = '{USER_ID}' LIMIT 1;

-- 2. Una volta ottenuto il {WEEKLY_PLAN_ID}, inserisci i pasti e gli alimenti
-- ===== LUNEDÌ (0) =====
-- COLAZIONE
INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
VALUES ('{WEEKLY_PLAN_ID}', 0, 'colazione')
RETURNING id AS colazione_id;
-- Salva l'ID sopra come {LUNEDI_COLAZIONE_ID}

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT '{LUNEDI_COLAZIONE_ID}', id, 150, 1 FROM foods WHERE name = 'Yogurt greco' AND category_id IN (SELECT id FROM food_categories WHERE name = 'Latticini');

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT '{LUNEDI_COLAZIONE_ID}', id, 25, 2 FROM foods WHERE name LIKE 'Proteine%';

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT '{LUNEDI_COLAZIONE_ID}', id, 30, 3 FROM foods WHERE name LIKE 'Cereali%';

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT '{LUNEDI_COLAZIONE_ID}', id, 10, 4 FROM foods WHERE name = 'Frutta secca';

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT '{LUNEDI_COLAZIONE_ID}', id, 180, 5 FROM foods WHERE name = 'Mela' AND category_id IN (SELECT id FROM food_categories WHERE name = 'Frutta');

-- PRANZO
INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
VALUES ('{WEEKLY_PLAN_ID}', 0, 'pranzo')
RETURNING id AS pranzo_id;
-- Salva l'ID sopra come {LUNEDI_PRANZO_ID}

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT '{LUNEDI_PRANZO_ID}', id, 300, 1 FROM foods WHERE name = 'Pan bauletto' AND category_id IN (SELECT id FROM food_categories WHERE name = 'Carboidrati');

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT '{LUNEDI_PRANZO_ID}', id, 100, 2 FROM foods WHERE name = 'Tonno sott''olio' OR name LIKE 'Tonno%';

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT '{LUNEDI_PRANZO_ID}', id, 200, 3 FROM foods WHERE name LIKE 'Verdura%' OR name LIKE 'Insalata%';

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT '{LUNEDI_PRANZO_ID}', id, 10, 4 FROM foods WHERE name LIKE 'Olio%';

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT '{LUNEDI_PRANZO_ID}', id, 180, 5 FROM foods WHERE name = 'Mela' AND category_id IN (SELECT id FROM food_categories WHERE name = 'Frutta');

-- CENA
INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
VALUES ('{WEEKLY_PLAN_ID}', 0, 'cena')
RETURNING id AS cena_id;
-- Salva l'ID sopra come {LUNEDI_CENA_ID}

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT '{LUNEDI_CENA_ID}', id, 300, 1 FROM foods WHERE name = 'Pan bauletto' AND category_id IN (SELECT id FROM food_categories WHERE name = 'Carboidrati');

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT '{LUNEDI_CENA_ID}', id, 200, 2 FROM foods WHERE name = 'Petto di Pollo' OR name LIKE 'Petto di%';

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT '{LUNEDI_CENA_ID}', id, 200, 3 FROM foods WHERE name LIKE 'Verdura%' OR name LIKE 'Insalata%';

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT '{LUNEDI_CENA_ID}', id, 10, 4 FROM foods WHERE name LIKE 'Olio%';

-- ===== RIPETI PER MARTEDÌ - DOMENICA =====
-- [Usa lo stesso pattern per gli altri 6 giorni]

-- NOTA: Questo è uno script di ESEMPIO.
-- Per inserire il piano completo, ti servirà:
-- 1. Il USER_ID del tuo account
-- 2. Il WEEKLY_PLAN_ID creato al passo 1
-- 3. Ripetere lo schema sopra per ciascun giorno e pasto

-- ALTERNATIVA PIÙ SEMPLICE:
-- Usa l'applicazione frontend per inserire i dati,
-- oppure prepara uno script SQL con tutti i 21 pasti precompilati.
