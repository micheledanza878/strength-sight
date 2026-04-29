-- Michele Danza's Weekly Diet Plan - Ready to Run
-- USER_ID: 22c6f260-95c5-4600-83d9-60e4347b7ced
-- Just run this script as-is in Supabase SQL Editor

-- Step 1: Add missing food items to database
DO $$
DECLARE
  v_cat_latticini UUID;
  v_cat_cereali UUID;
  v_cat_grassi UUID;
BEGIN
  SELECT id INTO v_cat_latticini FROM food_categories WHERE name = 'Latticini';
  SELECT id INTO v_cat_cereali FROM food_categories WHERE name = 'Carboidrati';
  SELECT id INTO v_cat_grassi FROM food_categories WHERE name = 'Grassi Sani';

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

-- Step 2: Create weekly plan and get its ID
WITH new_plan AS (
  INSERT INTO diet_weekly_plans (user_id)
  VALUES ('22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid)
  ON CONFLICT DO NOTHING
  RETURNING id
),
plan_id AS (
  SELECT id FROM new_plan
  UNION ALL
  SELECT id FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid LIMIT 1
)

-- Step 3: Insert all 21 meals with foods

-- LUNEDÌ COLAZIONE
, lunedi_colazione AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  SELECT id, 0, 'colazione' FROM plan_id
  RETURNING id, (SELECT id FROM plan_id) as plan_id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT
  lc.id,
  (CASE
    WHEN t.name = 'Yogurt greco' THEN (SELECT id FROM foods WHERE name = 'Yogurt greco' LIMIT 1)
    WHEN t.name = 'Proteine' THEN (SELECT id FROM foods WHERE name = 'Proteine in polvere' LIMIT 1)
    WHEN t.name = 'Cereali' THEN (SELECT id FROM foods WHERE name = 'Cereali muesli' LIMIT 1)
    WHEN t.name = 'Frutta secca' THEN (SELECT id FROM foods WHERE name = 'Frutta secca mista' LIMIT 1)
    WHEN t.name = 'Mela' THEN (SELECT id FROM foods WHERE name = 'Mela' LIMIT 1)
  END),
  t.portion,
  t.idx
FROM lunedi_colazione lc,
(VALUES
  ('Yogurt greco', 150, 1),
  ('Proteine', 25, 2),
  ('Cereali', 30, 3),
  ('Frutta secca', 10, 4),
  ('Mela', 180, 5)
) AS t(name, portion, idx);

-- LUNEDÌ PRANZO
INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
SELECT id, 0, 'pranzo' FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid
RETURNING id AS lunedi_pranzo_id \gset

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
VALUES
  (:'lunedi_pranzo_id'::uuid, (SELECT id FROM foods WHERE name = 'Pan bauletto' LIMIT 1), 300, 1),
  (:'lunedi_pranzo_id'::uuid, (SELECT id FROM foods WHERE name LIKE '%Tonno%' OR name = 'Sgombro' LIMIT 1), 100, 2),
  (:'lunedi_pranzo_id'::uuid, (SELECT id FROM foods WHERE name = 'Verdura mista' LIMIT 1), 200, 3),
  (:'lunedi_pranzo_id'::uuid, (SELECT id FROM foods WHERE name LIKE '%Olio%' LIMIT 1), 10, 4),
  (:'lunedi_pranzo_id'::uuid, (SELECT id FROM foods WHERE name = 'Arancia' LIMIT 1), 180, 5);

-- LUNEDÌ CENA
INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
SELECT id, 0, 'cena' FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid
RETURNING id AS lunedi_cena_id \gset

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
VALUES
  (:'lunedi_cena_id'::uuid, (SELECT id FROM foods WHERE name = 'Pan bauletto' LIMIT 1), 300, 1),
  (:'lunedi_cena_id'::uuid, (SELECT id FROM foods WHERE name = 'Petto di Pollo' LIMIT 1), 200, 2),
  (:'lunedi_cena_id'::uuid, (SELECT id FROM foods WHERE name = 'Verdura mista' LIMIT 1), 200, 3),
  (:'lunedi_cena_id'::uuid, (SELECT id FROM foods WHERE name LIKE '%Olio%' LIMIT 1), 10, 4);

-- MARTEDÌ COLAZIONE
INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
SELECT id, 1, 'colazione' FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid
RETURNING id AS martedi_colazione_id \gset

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
VALUES
  (:'martedi_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Yogurt greco' LIMIT 1), 150, 1),
  (:'martedi_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Proteine in polvere' LIMIT 1), 25, 2),
  (:'martedi_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Cereali muesli' LIMIT 1), 30, 3),
  (:'martedi_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Frutta secca mista' LIMIT 1), 10, 4),
  (:'martedi_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Banana' LIMIT 1), 110, 5);

-- MARTEDÌ PRANZO
INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
SELECT id, 1, 'pranzo' FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid
RETURNING id AS martedi_pranzo_id \gset

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
VALUES
  (:'martedi_pranzo_id'::uuid, (SELECT id FROM foods WHERE name LIKE '%Pasta%Riso%' LIMIT 1), 100, 1),
  (:'martedi_pranzo_id'::uuid, (SELECT id FROM foods WHERE name LIKE '%Legumi%' LIMIT 1), 120, 2),
  (:'martedi_pranzo_id'::uuid, (SELECT id FROM foods WHERE name = 'Verdura mista' LIMIT 1), 200, 3),
  (:'martedi_pranzo_id'::uuid, (SELECT id FROM foods WHERE name LIKE '%Olio%' LIMIT 1), 10, 4),
  (:'martedi_pranzo_id'::uuid, (SELECT id FROM foods WHERE name = 'Arancia' LIMIT 1), 180, 5),
  (:'martedi_pranzo_id'::uuid, (SELECT id FROM foods WHERE name = 'Dessert proteico' LIMIT 1), 200, 6);

-- MARTEDÌ CENA
INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
SELECT id, 1, 'cena' FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid
RETURNING id AS martedi_cena_id \gset

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
VALUES
  (:'martedi_cena_id'::uuid, (SELECT id FROM foods WHERE name = 'Pan bauletto' LIMIT 1), 300, 1),
  (:'martedi_cena_id'::uuid, (SELECT id FROM foods WHERE name = 'Merluzzo' OR name = 'Platessa' LIMIT 1), 200, 2),
  (:'martedi_cena_id'::uuid, (SELECT id FROM foods WHERE name = 'Verdura mista' LIMIT 1), 200, 3),
  (:'martedi_cena_id'::uuid, (SELECT id FROM foods WHERE name LIKE '%Olio%' LIMIT 1), 10, 4);

-- MERCOLEDÌ COLAZIONE
INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
SELECT id, 2, 'colazione' FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid
RETURNING id AS mercoledi_colazione_id \gset

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
VALUES
  (:'mercoledi_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Yogurt greco' LIMIT 1), 150, 1),
  (:'mercoledi_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Proteine in polvere' LIMIT 1), 25, 2),
  (:'mercoledi_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Cereali muesli' LIMIT 1), 30, 3),
  (:'mercoledi_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Frutta secca mista' LIMIT 1), 10, 4),
  (:'mercoledi_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Fragole' LIMIT 1), 270, 5);

-- MERCOLEDÌ PRANZO
INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
SELECT id, 2, 'pranzo' FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid
RETURNING id AS mercoledi_pranzo_id \gset

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
VALUES
  (:'mercoledi_pranzo_id'::uuid, (SELECT id FROM foods WHERE name = 'Pan bauletto' LIMIT 1), 300, 1),
  (:'mercoledi_pranzo_id'::uuid, (SELECT id FROM foods WHERE name = 'Fiocchi di latte (vasetto)' LIMIT 1), 125, 2),
  (:'mercoledi_pranzo_id'::uuid, (SELECT id FROM foods WHERE name = 'Bresaola' LIMIT 1), 60, 3),
  (:'mercoledi_pranzo_id'::uuid, (SELECT id FROM foods WHERE name = 'Verdura mista' LIMIT 1), 200, 4),
  (:'mercoledi_pranzo_id'::uuid, (SELECT id FROM foods WHERE name LIKE '%Olio%' LIMIT 1), 10, 5),
  (:'mercoledi_pranzo_id'::uuid, (SELECT id FROM foods WHERE name = 'Kiwi' LIMIT 1), 170, 6);

-- MERCOLEDÌ CENA
INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
SELECT id, 2, 'cena' FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid
RETURNING id AS mercoledi_cena_id \gset

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
VALUES
  (:'mercoledi_cena_id'::uuid, (SELECT id FROM foods WHERE name = 'Pan bauletto' LIMIT 1), 300, 1),
  (:'mercoledi_cena_id'::uuid, (SELECT id FROM foods WHERE name = 'Uova (3 medie)' LIMIT 1), 150, 2),
  (:'mercoledi_cena_id'::uuid, (SELECT id FROM foods WHERE name = 'Verdura mista' LIMIT 1), 200, 3),
  (:'mercoledi_cena_id'::uuid, (SELECT id FROM foods WHERE name LIKE '%Olio%' LIMIT 1), 10, 4);

-- GIOVEDÌ COLAZIONE
INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
SELECT id, 3, 'colazione' FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid
RETURNING id AS giovedi_colazione_id \gset

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
VALUES
  (:'giovedi_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Yogurt greco' LIMIT 1), 150, 1),
  (:'giovedi_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Proteine in polvere' LIMIT 1), 25, 2),
  (:'giovedi_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Cereali muesli' LIMIT 1), 30, 3),
  (:'giovedi_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Frutta secca mista' LIMIT 1), 10, 4),
  (:'giovedi_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Pera' LIMIT 1), 130, 5);

-- GIOVEDÌ PRANZO
INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
SELECT id, 3, 'pranzo' FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid
RETURNING id AS giovedi_pranzo_id \gset

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
VALUES
  (:'giovedi_pranzo_id'::uuid, (SELECT id FROM foods WHERE name = 'Pan bauletto' LIMIT 1), 300, 1),
  (:'giovedi_pranzo_id'::uuid, (SELECT id FROM foods WHERE name = 'Sgombro' LIMIT 1), 100, 2),
  (:'giovedi_pranzo_id'::uuid, (SELECT id FROM foods WHERE name = 'Verdura mista' LIMIT 1), 200, 3),
  (:'giovedi_pranzo_id'::uuid, (SELECT id FROM foods WHERE name LIKE '%Olio%' LIMIT 1), 10, 4),
  (:'giovedi_pranzo_id'::uuid, (SELECT id FROM foods WHERE name = 'Mela' LIMIT 1), 180, 5);

-- GIOVEDÌ CENA
INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
SELECT id, 3, 'cena' FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid
RETURNING id AS giovedi_cena_id \gset

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
VALUES
  (:'giovedi_cena_id'::uuid, (SELECT id FROM foods WHERE name = 'Pan bauletto' LIMIT 1), 300, 1),
  (:'giovedi_cena_id'::uuid, (SELECT id FROM foods WHERE name = 'Petto di Pollo' LIMIT 1), 200, 2),
  (:'giovedi_cena_id'::uuid, (SELECT id FROM foods WHERE name = 'Verdura mista' LIMIT 1), 200, 3),
  (:'giovedi_cena_id'::uuid, (SELECT id FROM foods WHERE name LIKE '%Olio%' LIMIT 1), 10, 4);

-- VENERDÌ COLAZIONE
INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
SELECT id, 4, 'colazione' FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid
RETURNING id AS venerdi_colazione_id \gset

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
VALUES
  (:'venerdi_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Yogurt greco' LIMIT 1), 150, 1),
  (:'venerdi_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Proteine in polvere' LIMIT 1), 25, 2),
  (:'venerdi_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Cereali muesli' LIMIT 1), 30, 3),
  (:'venerdi_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Frutta secca mista' LIMIT 1), 10, 4),
  (:'venerdi_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Uva' LIMIT 1), 150, 5);

-- VENERDÌ PRANZO
INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
SELECT id, 4, 'pranzo' FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid
RETURNING id AS venerdi_pranzo_id \gset

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
VALUES
  (:'venerdi_pranzo_id'::uuid, (SELECT id FROM foods WHERE name LIKE '%Pasta%' AND name LIKE '%Riso%' LIMIT 1), 100, 1),
  (:'venerdi_pranzo_id'::uuid, (SELECT id FROM foods WHERE name LIKE '%Legumi%' LIMIT 1), 120, 2),
  (:'venerdi_pranzo_id'::uuid, (SELECT id FROM foods WHERE name = 'Verdura mista' LIMIT 1), 200, 3),
  (:'venerdi_pranzo_id'::uuid, (SELECT id FROM foods WHERE name LIKE '%Olio%' LIMIT 1), 10, 4),
  (:'venerdi_pranzo_id'::uuid, (SELECT id FROM foods WHERE name = 'Arancia' LIMIT 1), 180, 5),
  (:'venerdi_pranzo_id'::uuid, (SELECT id FROM foods WHERE name = 'Dessert proteico' LIMIT 1), 200, 6);

-- VENERDÌ CENA
INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
SELECT id, 4, 'cena' FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid
RETURNING id AS venerdi_cena_id \gset

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
VALUES
  (:'venerdi_cena_id'::uuid, (SELECT id FROM foods WHERE name = 'Pan bauletto' LIMIT 1), 300, 1),
  (:'venerdi_cena_id'::uuid, (SELECT id FROM foods WHERE name = 'Formaggio stagionato' LIMIT 1), 100, 2),
  (:'venerdi_cena_id'::uuid, (SELECT id FROM foods WHERE name = 'Verdura mista' LIMIT 1), 200, 3),
  (:'venerdi_cena_id'::uuid, (SELECT id FROM foods WHERE name LIKE '%Olio%' LIMIT 1), 10, 4);

-- SABATO COLAZIONE
INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
SELECT id, 5, 'colazione' FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid
RETURNING id AS sabato_colazione_id \gset

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
VALUES
  (:'sabato_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Yogurt greco' LIMIT 1), 150, 1),
  (:'sabato_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Proteine in polvere' LIMIT 1), 25, 2),
  (:'sabato_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Cereali muesli' LIMIT 1), 30, 3),
  (:'sabato_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Frutta secca mista' LIMIT 1), 10, 4),
  (:'sabato_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Banana' LIMIT 1), 110, 5);

-- SABATO PRANZO
INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
SELECT id, 5, 'pranzo' FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid
RETURNING id AS sabato_pranzo_id \gset

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
VALUES
  (:'sabato_pranzo_id'::uuid, (SELECT id FROM foods WHERE name = 'Pan bauletto' LIMIT 1), 300, 1),
  (:'sabato_pranzo_id'::uuid, (SELECT id FROM foods WHERE name = 'Uova (3 medie)' LIMIT 1), 150, 2),
  (:'sabato_pranzo_id'::uuid, (SELECT id FROM foods WHERE name = 'Verdura mista' LIMIT 1), 200, 3),
  (:'sabato_pranzo_id'::uuid, (SELECT id FROM foods WHERE name LIKE '%Olio%' LIMIT 1), 10, 4);

-- DOMENICA COLAZIONE
INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
SELECT id, 6, 'colazione' FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid
RETURNING id AS domenica_colazione_id \gset

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
VALUES
  (:'domenica_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Yogurt greco' LIMIT 1), 150, 1),
  (:'domenica_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Proteine in polvere' LIMIT 1), 25, 2),
  (:'domenica_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Cereali muesli' LIMIT 1), 30, 3),
  (:'domenica_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Frutta secca mista' LIMIT 1), 10, 4),
  (:'domenica_colazione_id'::uuid, (SELECT id FROM foods WHERE name = 'Pesca' LIMIT 1), 280, 5);

-- DOMENICA PRANZO
INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
SELECT id, 6, 'pranzo' FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid
RETURNING id AS domenica_pranzo_id \gset

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
VALUES
  (:'domenica_pranzo_id'::uuid, (SELECT id FROM foods WHERE name = 'Pasta al ragù' LIMIT 1), 100, 1),
  (:'domenica_pranzo_id'::uuid, (SELECT id FROM foods WHERE name = 'Verdura mista' LIMIT 1), 200, 2),
  (:'domenica_pranzo_id'::uuid, (SELECT id FROM foods WHERE name LIKE '%Olio%' LIMIT 1), 10, 3),
  (:'domenica_pranzo_id'::uuid, (SELECT id FROM foods WHERE name = 'Melone' LIMIT 1), 230, 4),
  (:'domenica_pranzo_id'::uuid, (SELECT id FROM foods WHERE name = 'Dessert proteico' LIMIT 1), 200, 5);

-- DOMENICA CENA
INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
SELECT id, 6, 'cena' FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid
RETURNING id AS domenica_cena_id \gset

INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
VALUES
  (:'domenica_cena_id'::uuid, (SELECT id FROM foods WHERE name = 'Pan bauletto' LIMIT 1), 300, 1),
  (:'domenica_cena_id'::uuid, (SELECT id FROM foods WHERE name = 'Branzino' OR name = 'Orata' LIMIT 1), 200, 2),
  (:'domenica_cena_id'::uuid, (SELECT id FROM foods WHERE name = 'Verdura mista' LIMIT 1), 200, 3),
  (:'domenica_cena_id'::uuid, (SELECT id FROM foods WHERE name LIKE '%Olio%' LIMIT 1), 10, 4);

SELECT 'Piano settimanale Michele Danza (2100 kcal) inserito con successo! ✅' as result;
