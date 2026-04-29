-- Populate Michele Danza's Weekly Diet Plan
-- INSTRUCTIONS:
-- 1. Replace {USER_ID} with your actual user ID
-- 2. Run this script in Supabase SQL Editor

-- Step 1: Add missing food items to database
DO $$
DECLARE
  v_cat_latticini UUID;
  v_cat_cereali UUID;
  v_cat_grassi UUID;
  v_cat_verdure UUID;
  v_cat_legumi UUID;
BEGIN
  -- Get or create categories
  SELECT id INTO v_cat_latticini FROM food_categories WHERE name = 'Latticini';
  SELECT id INTO v_cat_grassi FROM food_categories WHERE name = 'Grassi Sani';
  SELECT id INTO v_cat_cereali FROM food_categories WHERE name = 'Carboidrati';

  -- Insert missing foods if they don't exist
  INSERT INTO foods (category_id, name, standard_portion_g, calories_approx)
  VALUES
    (v_cat_latticini, 'Proteine in polvere', 25, 100),
    (v_cat_cereali, 'Cereali muesli', 30, 120),
    (v_cat_grassi, 'Frutta secca mista', 10, 60),
    (v_cat_cereali, 'Verdura mista', 200, 40),
    (v_cat_latticini, 'Dessert proteico', 200, 200),
    (v_cat_cereali, 'Pane integrale', 130, 330),
    (v_cat_cereali, 'Pasta al ragù', 100, 350)
  ON CONFLICT (name, category_id) DO NOTHING;
END $$;

-- Step 2: Create weekly plan for user
WITH new_plan AS (
  INSERT INTO diet_weekly_plans (user_id)
  VALUES ('{USER_ID}')
  ON CONFLICT DO NOTHING
  RETURNING id
)
SELECT 'Plan created with ID: ' || id::text as result FROM new_plan
UNION ALL
SELECT 'Using existing plan with ID: ' || id::text FROM diet_weekly_plans WHERE user_id = '{USER_ID}' LIMIT 1;

-- Step 3: Insert all meals and foods
-- NOTE: Replace {WEEKLY_PLAN_ID} with the ID from step 2

-- ===== LUNEDÌ (day_of_week = 0) =====

-- LUNEDÌ COLAZIONE
WITH meal AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  VALUES ('{WEEKLY_PLAN_ID}', 0, 'colazione')
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT m.id, f.id, portion, idx
FROM meal m,
(VALUES
  ((SELECT id FROM foods WHERE name = 'Yogurt greco' LIMIT 1), 150, 1),
  ((SELECT id FROM foods WHERE name = 'Proteine in polvere' LIMIT 1), 25, 2),
  ((SELECT id FROM foods WHERE name = 'Cereali muesli' LIMIT 1), 30, 3),
  ((SELECT id FROM foods WHERE name = 'Frutta secca mista' LIMIT 1), 10, 4),
  ((SELECT id FROM foods WHERE name = 'Mela' LIMIT 1), 180, 5)
) AS t(food_id, portion, idx);

-- LUNEDÌ PRANZO
WITH meal AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  VALUES ('{WEEKLY_PLAN_ID}', 0, 'pranzo')
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT m.id, f.id, portion, idx
FROM meal m,
(VALUES
  ((SELECT id FROM foods WHERE name = 'Pan bauletto' LIMIT 1), 300, 1),
  ((SELECT id FROM foods WHERE name = 'Sgombro' OR name LIKE 'Tonno%' LIMIT 1), 100, 2),
  ((SELECT id FROM foods WHERE name = 'Verdura mista' LIMIT 1), 200, 3),
  ((SELECT id FROM foods WHERE name LIKE 'Olio%' LIMIT 1), 10, 4),
  ((SELECT id FROM foods WHERE name = 'Arancia' LIMIT 1), 180, 5)
) AS t(food_id, portion, idx);

-- LUNEDÌ CENA
WITH meal AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  VALUES ('{WEEKLY_PLAN_ID}', 0, 'cena')
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT m.id, f.id, portion, idx
FROM meal m,
(VALUES
  ((SELECT id FROM foods WHERE name = 'Pan bauletto' LIMIT 1), 300, 1),
  ((SELECT id FROM foods WHERE name = 'Petto di Pollo' LIMIT 1), 200, 2),
  ((SELECT id FROM foods WHERE name = 'Verdura mista' LIMIT 1), 200, 3),
  ((SELECT id FROM foods WHERE name LIKE 'Olio%' LIMIT 1), 10, 4)
) AS t(food_id, portion, idx);

-- ===== MARTEDÌ (day_of_week = 1) =====

-- MARTEDÌ COLAZIONE
WITH meal AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  VALUES ('{WEEKLY_PLAN_ID}', 1, 'colazione')
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT m.id, f.id, portion, idx
FROM meal m,
(VALUES
  ((SELECT id FROM foods WHERE name = 'Yogurt greco' LIMIT 1), 150, 1),
  ((SELECT id FROM foods WHERE name = 'Proteine in polvere' LIMIT 1), 25, 2),
  ((SELECT id FROM foods WHERE name = 'Cereali muesli' LIMIT 1), 30, 3),
  ((SELECT id FROM foods WHERE name = 'Frutta secca mista' LIMIT 1), 10, 4),
  ((SELECT id FROM foods WHERE name = 'Banana' LIMIT 1), 110, 5)
) AS t(food_id, portion, idx);

-- MARTEDÌ PRANZO
WITH meal AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  VALUES ('{WEEKLY_PLAN_ID}', 1, 'pranzo')
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT m.id, f.id, portion, idx
FROM meal m,
(VALUES
  ((SELECT id FROM foods WHERE name = 'Pasta/Riso/Orzo/Farro/Quinoa' LIMIT 1), 100, 1),
  ((SELECT id FROM foods WHERE name LIKE '%Legumi%' LIMIT 1), 120, 2),
  ((SELECT id FROM foods WHERE name = 'Verdura mista' LIMIT 1), 200, 3),
  ((SELECT id FROM foods WHERE name LIKE 'Olio%' LIMIT 1), 10, 4),
  ((SELECT id FROM foods WHERE name = 'Arancia' LIMIT 1), 180, 5),
  ((SELECT id FROM foods WHERE name = 'Dessert proteico' LIMIT 1), 200, 6)
) AS t(food_id, portion, idx);

-- MARTEDÌ CENA
WITH meal AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  VALUES ('{WEEKLY_PLAN_ID}', 1, 'cena')
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT m.id, f.id, portion, idx
FROM meal m,
(VALUES
  ((SELECT id FROM foods WHERE name = 'Pan bauletto' LIMIT 1), 300, 1),
  ((SELECT id FROM foods WHERE name = 'Merluzzo' OR name = 'Platessa' LIMIT 1), 200, 2),
  ((SELECT id FROM foods WHERE name = 'Verdura mista' LIMIT 1), 200, 3),
  ((SELECT id FROM foods WHERE name LIKE 'Olio%' LIMIT 1), 10, 4)
) AS t(food_id, portion, idx);

-- ===== MERCOLEDÌ (day_of_week = 2) =====

-- MERCOLEDÌ COLAZIONE
WITH meal AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  VALUES ('{WEEKLY_PLAN_ID}', 2, 'colazione')
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT m.id, f.id, portion, idx
FROM meal m,
(VALUES
  ((SELECT id FROM foods WHERE name = 'Yogurt greco' LIMIT 1), 150, 1),
  ((SELECT id FROM foods WHERE name = 'Proteine in polvere' LIMIT 1), 25, 2),
  ((SELECT id FROM foods WHERE name = 'Cereali muesli' LIMIT 1), 30, 3),
  ((SELECT id FROM foods WHERE name = 'Frutta secca mista' LIMIT 1), 10, 4),
  ((SELECT id FROM foods WHERE name = 'Fragole' LIMIT 1), 270, 5)
) AS t(food_id, portion, idx);

-- MERCOLEDÌ PRANZO
WITH meal AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  VALUES ('{WEEKLY_PLAN_ID}', 2, 'pranzo')
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT m.id, f.id, portion, idx
FROM meal m,
(VALUES
  ((SELECT id FROM foods WHERE name = 'Pan bauletto' LIMIT 1), 300, 1),
  ((SELECT id FROM foods WHERE name = 'Fiocchi di latte (vasetto)' LIMIT 1), 125, 2),
  ((SELECT id FROM foods WHERE name = 'Bresaola' LIMIT 1), 60, 3),
  ((SELECT id FROM foods WHERE name = 'Verdura mista' LIMIT 1), 200, 4),
  ((SELECT id FROM foods WHERE name LIKE 'Olio%' LIMIT 1), 10, 5),
  ((SELECT id FROM foods WHERE name = 'Kiwi' LIMIT 1), 170, 6)
) AS t(food_id, portion, idx);

-- MERCOLEDÌ CENA
WITH meal AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  VALUES ('{WEEKLY_PLAN_ID}', 2, 'cena')
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT m.id, f.id, portion, idx
FROM meal m,
(VALUES
  ((SELECT id FROM foods WHERE name = 'Pan bauletto' LIMIT 1), 300, 1),
  ((SELECT id FROM foods WHERE name = 'Uova (3 medie)' LIMIT 1), 150, 2),
  ((SELECT id FROM foods WHERE name = 'Verdura mista' LIMIT 1), 200, 3),
  ((SELECT id FROM foods WHERE name LIKE 'Olio%' LIMIT 1), 10, 4)
) AS t(food_id, portion, idx);

-- ===== GIOVEDÌ (day_of_week = 3) =====

-- GIOVEDÌ COLAZIONE
WITH meal AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  VALUES ('{WEEKLY_PLAN_ID}', 3, 'colazione')
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT m.id, f.id, portion, idx
FROM meal m,
(VALUES
  ((SELECT id FROM foods WHERE name = 'Yogurt greco' LIMIT 1), 150, 1),
  ((SELECT id FROM foods WHERE name = 'Proteine in polvere' LIMIT 1), 25, 2),
  ((SELECT id FROM foods WHERE name = 'Cereali muesli' LIMIT 1), 30, 3),
  ((SELECT id FROM foods WHERE name = 'Frutta secca mista' LIMIT 1), 10, 4),
  ((SELECT id FROM foods WHERE name = 'Pera' LIMIT 1), 130, 5)
) AS t(food_id, portion, idx);

-- GIOVEDÌ PRANZO
WITH meal AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  VALUES ('{WEEKLY_PLAN_ID}', 3, 'pranzo')
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT m.id, f.id, portion, idx
FROM meal m,
(VALUES
  ((SELECT id FROM foods WHERE name = 'Pan bauletto' LIMIT 1), 300, 1),
  ((SELECT id FROM foods WHERE name = 'Sgombro' LIMIT 1), 100, 2),
  ((SELECT id FROM foods WHERE name = 'Verdura mista' LIMIT 1), 200, 3),
  ((SELECT id FROM foods WHERE name LIKE 'Olio%' LIMIT 1), 10, 4),
  ((SELECT id FROM foods WHERE name = 'Mela' LIMIT 1), 180, 5)
) AS t(food_id, portion, idx);

-- GIOVEDÌ CENA
WITH meal AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  VALUES ('{WEEKLY_PLAN_ID}', 3, 'cena')
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT m.id, f.id, portion, idx
FROM meal m,
(VALUES
  ((SELECT id FROM foods WHERE name = 'Pan bauletto' LIMIT 1), 300, 1),
  ((SELECT id FROM foods WHERE name = 'Petto di Pollo' LIMIT 1), 200, 2),
  ((SELECT id FROM foods WHERE name = 'Verdura mista' LIMIT 1), 200, 3),
  ((SELECT id FROM foods WHERE name LIKE 'Olio%' LIMIT 1), 10, 4)
) AS t(food_id, portion, idx);

-- ===== VENERDÌ (day_of_week = 4) =====

-- VENERDÌ COLAZIONE
WITH meal AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  VALUES ('{WEEKLY_PLAN_ID}', 4, 'colazione')
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT m.id, f.id, portion, idx
FROM meal m,
(VALUES
  ((SELECT id FROM foods WHERE name = 'Yogurt greco' LIMIT 1), 150, 1),
  ((SELECT id FROM foods WHERE name = 'Proteine in polvere' LIMIT 1), 25, 2),
  ((SELECT id FROM foods WHERE name = 'Cereali muesli' LIMIT 1), 30, 3),
  ((SELECT id FROM foods WHERE name = 'Frutta secca mista' LIMIT 1), 10, 4),
  ((SELECT id FROM foods WHERE name = 'Uva' LIMIT 1), 150, 5)
) AS t(food_id, portion, idx);

-- VENERDÌ PRANZO
WITH meal AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  VALUES ('{WEEKLY_PLAN_ID}', 4, 'pranzo')
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT m.id, f.id, portion, idx
FROM meal m,
(VALUES
  ((SELECT id FROM foods WHERE name = 'Pasta/Riso/Orzo/Farro/Quinoa' LIMIT 1), 100, 1),
  ((SELECT id FROM foods WHERE name LIKE '%Legumi%' LIMIT 1), 120, 2),
  ((SELECT id FROM foods WHERE name = 'Verdura mista' LIMIT 1), 200, 3),
  ((SELECT id FROM foods WHERE name LIKE 'Olio%' LIMIT 1), 10, 4),
  ((SELECT id FROM foods WHERE name = 'Arancia' LIMIT 1), 180, 5),
  ((SELECT id FROM foods WHERE name = 'Dessert proteico' LIMIT 1), 200, 6)
) AS t(food_id, portion, idx);

-- VENERDÌ CENA
WITH meal AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  VALUES ('{WEEKLY_PLAN_ID}', 4, 'cena')
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT m.id, f.id, portion, idx
FROM meal m,
(VALUES
  ((SELECT id FROM foods WHERE name = 'Pan bauletto' LIMIT 1), 300, 1),
  ((SELECT id FROM foods WHERE name = 'Formaggio stagionato' LIMIT 1), 100, 2),
  ((SELECT id FROM foods WHERE name = 'Verdura mista' LIMIT 1), 200, 3),
  ((SELECT id FROM foods WHERE name LIKE 'Olio%' LIMIT 1), 10, 4)
) AS t(food_id, portion, idx);

-- ===== SABATO (day_of_week = 5) =====

-- SABATO COLAZIONE
WITH meal AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  VALUES ('{WEEKLY_PLAN_ID}', 5, 'colazione')
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT m.id, f.id, portion, idx
FROM meal m,
(VALUES
  ((SELECT id FROM foods WHERE name = 'Yogurt greco' LIMIT 1), 150, 1),
  ((SELECT id FROM foods WHERE name = 'Proteine in polvere' LIMIT 1), 25, 2),
  ((SELECT id FROM foods WHERE name = 'Cereali muesli' LIMIT 1), 30, 3),
  ((SELECT id FROM foods WHERE name = 'Frutta secca mista' LIMIT 1), 10, 4),
  ((SELECT id FROM foods WHERE name = 'Banana' LIMIT 1), 110, 5)
) AS t(food_id, portion, idx);

-- SABATO PRANZO
WITH meal AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  VALUES ('{WEEKLY_PLAN_ID}', 5, 'pranzo')
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT m.id, f.id, portion, idx
FROM meal m,
(VALUES
  ((SELECT id FROM foods WHERE name = 'Pan bauletto' LIMIT 1), 300, 1),
  ((SELECT id FROM foods WHERE name = 'Uova (3 medie)' LIMIT 1), 150, 2),
  ((SELECT id FROM foods WHERE name = 'Verdura mista' LIMIT 1), 200, 3),
  ((SELECT id FROM foods WHERE name LIKE 'Olio%' LIMIT 1), 10, 4)
) AS t(food_id, portion, idx);

-- ===== DOMENICA (day_of_week = 6) =====

-- DOMENICA COLAZIONE
WITH meal AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  VALUES ('{WEEKLY_PLAN_ID}', 6, 'colazione')
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT m.id, f.id, portion, idx
FROM meal m,
(VALUES
  ((SELECT id FROM foods WHERE name = 'Yogurt greco' LIMIT 1), 150, 1),
  ((SELECT id FROM foods WHERE name = 'Proteine in polvere' LIMIT 1), 25, 2),
  ((SELECT id FROM foods WHERE name = 'Cereali muesli' LIMIT 1), 30, 3),
  ((SELECT id FROM foods WHERE name = 'Frutta secca mista' LIMIT 1), 10, 4),
  ((SELECT id FROM foods WHERE name = 'Pesca' LIMIT 1), 280, 5)
) AS t(food_id, portion, idx);

-- DOMENICA PRANZO
WITH meal AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  VALUES ('{WEEKLY_PLAN_ID}', 6, 'pranzo')
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT m.id, f.id, portion, idx
FROM meal m,
(VALUES
  ((SELECT id FROM foods WHERE name = 'Pasta al ragù' LIMIT 1), 100, 1),
  ((SELECT id FROM foods WHERE name = 'Verdura mista' LIMIT 1), 200, 2),
  ((SELECT id FROM foods WHERE name LIKE 'Olio%' LIMIT 1), 10, 3),
  ((SELECT id FROM foods WHERE name = 'Melone' LIMIT 1), 230, 4),
  ((SELECT id FROM foods WHERE name = 'Dessert proteico' LIMIT 1), 200, 5)
) AS t(food_id, portion, idx);

-- DOMENICA CENA
WITH meal AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  VALUES ('{WEEKLY_PLAN_ID}', 6, 'cena')
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT m.id, f.id, portion, idx
FROM meal m,
(VALUES
  ((SELECT id FROM foods WHERE name = 'Pan bauletto' LIMIT 1), 300, 1),
  ((SELECT id FROM foods WHERE name = 'Branzino' OR name = 'Orata' LIMIT 1), 200, 2),
  ((SELECT id FROM foods WHERE name = 'Verdura mista' LIMIT 1), 200, 3),
  ((SELECT id FROM foods WHERE name LIKE 'Olio%' LIMIT 1), 10, 4)
) AS t(food_id, portion, idx);

-- Done! All 21 meals inserted
SELECT 'Weekly plan populated successfully!' as result;
