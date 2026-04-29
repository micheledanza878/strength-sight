-- Michele Danza's Weekly Diet Plan - SIMPLIFIED VERSION
-- Copia e incolla questo nel Supabase SQL Editor, niente di più

-- Get the plan ID (create if not exists)
WITH plan_insert AS (
  INSERT INTO diet_weekly_plans (user_id)
  VALUES ('22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid)
  ON CONFLICT DO NOTHING
  RETURNING id
),
plan_id AS (
  SELECT id FROM plan_insert
  UNION ALL
  SELECT id FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid LIMIT 1
)

-- LUNEDÌ COLAZIONE
, lunedi_col AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  SELECT id, 0, 'colazione' FROM plan_id
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT lc.id, f.id, p.portion, p.idx
FROM lunedi_col lc, foods f,
(VALUES
  ('Yogurt greco', 150, 1),
  ('Proteine in polvere', 25, 2),
  ('Cereali muesli', 30, 3),
  ('Frutta secca mista', 10, 4),
  ('Mela', 180, 5)
) AS p(fname, portion, idx)
WHERE f.name = p.fname;

-- LUNEDÌ PRANZO
WITH plan_id AS (
  SELECT id FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid LIMIT 1
),
lunedi_pranzo AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  SELECT id, 0, 'pranzo' FROM plan_id
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT lp.id, f.id, p.portion, p.idx
FROM lunedi_pranzo lp, foods f,
(VALUES
  ('Pan bauletto', 300, 1),
  ('Sgombro', 100, 2),
  ('Verdura mista', 200, 3),
  ('Frutta secca mista', 10, 4),
  ('Arancia', 180, 5)
) AS p(fname, portion, idx)
WHERE f.name = p.fname;

-- LUNEDÌ CENA
WITH plan_id AS (
  SELECT id FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid LIMIT 1
),
lunedi_cena AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  SELECT id, 0, 'cena' FROM plan_id
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT lc.id, f.id, p.portion, p.idx
FROM lunedi_cena lc, foods f,
(VALUES
  ('Pan bauletto', 300, 1),
  ('Petto di Pollo', 200, 2),
  ('Verdura mista', 200, 3),
  ('Frutta secca mista', 10, 4)
) AS p(fname, portion, idx)
WHERE f.name = p.fname;

-- MARTEDÌ COLAZIONE
WITH plan_id AS (
  SELECT id FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid LIMIT 1
),
martedi_col AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  SELECT id, 1, 'colazione' FROM plan_id
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT mc.id, f.id, p.portion, p.idx
FROM martedi_col mc, foods f,
(VALUES
  ('Yogurt greco', 150, 1),
  ('Proteine in polvere', 25, 2),
  ('Cereali muesli', 30, 3),
  ('Frutta secca mista', 10, 4),
  ('Banana', 110, 5)
) AS p(fname, portion, idx)
WHERE f.name = p.fname;

-- MARTEDÌ PRANZO
WITH plan_id AS (
  SELECT id FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid LIMIT 1
),
martedi_pranzo AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  SELECT id, 1, 'pranzo' FROM plan_id
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT mp.id, f.id, p.portion, p.idx
FROM martedi_pranzo mp, foods f,
(VALUES
  ('Pasta/Riso/Orzo/Farro/Quinoa', 100, 1),
  ('Verdura mista', 200, 2),
  ('Frutta secca mista', 10, 3),
  ('Arancia', 180, 4),
  ('Dessert proteico', 200, 5)
) AS p(fname, portion, idx)
WHERE f.name = p.fname;

-- MARTEDÌ CENA
WITH plan_id AS (
  SELECT id FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid LIMIT 1
),
martedi_cena AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  SELECT id, 1, 'cena' FROM plan_id
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT mc.id, f.id, p.portion, p.idx
FROM martedi_cena mc, foods f,
(VALUES
  ('Pan bauletto', 300, 1),
  ('Merluzzo', 200, 2),
  ('Verdura mista', 200, 3),
  ('Frutta secca mista', 10, 4)
) AS p(fname, portion, idx)
WHERE f.name = p.fname;

-- MERCOLEDÌ COLAZIONE
WITH plan_id AS (
  SELECT id FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid LIMIT 1
),
mercoledi_col AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  SELECT id, 2, 'colazione' FROM plan_id
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT mc.id, f.id, p.portion, p.idx
FROM mercoledi_col mc, foods f,
(VALUES
  ('Yogurt greco', 150, 1),
  ('Proteine in polvere', 25, 2),
  ('Cereali muesli', 30, 3),
  ('Frutta secca mista', 10, 4),
  ('Fragole', 270, 5)
) AS p(fname, portion, idx)
WHERE f.name = p.fname;

-- MERCOLEDÌ PRANZO
WITH plan_id AS (
  SELECT id FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid LIMIT 1
),
mercoledi_pranzo AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  SELECT id, 2, 'pranzo' FROM plan_id
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT mp.id, f.id, p.portion, p.idx
FROM mercoledi_pranzo mp, foods f,
(VALUES
  ('Pan bauletto', 300, 1),
  ('Fiocchi di latte (vasetto)', 125, 2),
  ('Bresaola', 60, 3),
  ('Verdura mista', 200, 4),
  ('Frutta secca mista', 10, 5),
  ('Kiwi', 170, 6)
) AS p(fname, portion, idx)
WHERE f.name = p.fname;

-- MERCOLEDÌ CENA
WITH plan_id AS (
  SELECT id FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid LIMIT 1
),
mercoledi_cena AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  SELECT id, 2, 'cena' FROM plan_id
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT mc.id, f.id, p.portion, p.idx
FROM mercoledi_cena mc, foods f,
(VALUES
  ('Pan bauletto', 300, 1),
  ('Uova (3 medie)', 150, 2),
  ('Verdura mista', 200, 3),
  ('Frutta secca mista', 10, 4)
) AS p(fname, portion, idx)
WHERE f.name = p.fname;

-- GIOVEDÌ COLAZIONE
WITH plan_id AS (
  SELECT id FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid LIMIT 1
),
giovedi_col AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  SELECT id, 3, 'colazione' FROM plan_id
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT gc.id, f.id, p.portion, p.idx
FROM giovedi_col gc, foods f,
(VALUES
  ('Yogurt greco', 150, 1),
  ('Proteine in polvere', 25, 2),
  ('Cereali muesli', 30, 3),
  ('Frutta secca mista', 10, 4),
  ('Pera', 130, 5)
) AS p(fname, portion, idx)
WHERE f.name = p.fname;

-- GIOVEDÌ PRANZO
WITH plan_id AS (
  SELECT id FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid LIMIT 1
),
giovedi_pranzo AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  SELECT id, 3, 'pranzo' FROM plan_id
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT gp.id, f.id, p.portion, p.idx
FROM giovedi_pranzo gp, foods f,
(VALUES
  ('Pan bauletto', 300, 1),
  ('Sgombro', 100, 2),
  ('Verdura mista', 200, 3),
  ('Frutta secca mista', 10, 4),
  ('Mela', 180, 5)
) AS p(fname, portion, idx)
WHERE f.name = p.fname;

-- GIOVEDÌ CENA
WITH plan_id AS (
  SELECT id FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid LIMIT 1
),
giovedi_cena AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  SELECT id, 3, 'cena' FROM plan_id
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT gc.id, f.id, p.portion, p.idx
FROM giovedi_cena gc, foods f,
(VALUES
  ('Pan bauletto', 300, 1),
  ('Petto di Pollo', 200, 2),
  ('Verdura mista', 200, 3),
  ('Frutta secca mista', 10, 4)
) AS p(fname, portion, idx)
WHERE f.name = p.fname;

-- VENERDÌ COLAZIONE
WITH plan_id AS (
  SELECT id FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid LIMIT 1
),
venerdi_col AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  SELECT id, 4, 'colazione' FROM plan_id
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT vc.id, f.id, p.portion, p.idx
FROM venerdi_col vc, foods f,
(VALUES
  ('Yogurt greco', 150, 1),
  ('Proteine in polvere', 25, 2),
  ('Cereali muesli', 30, 3),
  ('Frutta secca mista', 10, 4),
  ('Uva', 150, 5)
) AS p(fname, portion, idx)
WHERE f.name = p.fname;

-- VENERDÌ PRANZO
WITH plan_id AS (
  SELECT id FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid LIMIT 1
),
venerdi_pranzo AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  SELECT id, 4, 'pranzo' FROM plan_id
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT vp.id, f.id, p.portion, p.idx
FROM venerdi_pranzo vp, foods f,
(VALUES
  ('Pasta/Riso/Orzo/Farro/Quinoa', 100, 1),
  ('Verdura mista', 200, 2),
  ('Frutta secca mista', 10, 3),
  ('Arancia', 180, 4),
  ('Dessert proteico', 200, 5)
) AS p(fname, portion, idx)
WHERE f.name = p.fname;

-- VENERDÌ CENA
WITH plan_id AS (
  SELECT id FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid LIMIT 1
),
venerdi_cena AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  SELECT id, 4, 'cena' FROM plan_id
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT vc.id, f.id, p.portion, p.idx
FROM venerdi_cena vc, foods f,
(VALUES
  ('Pan bauletto', 300, 1),
  ('Formaggio stagionato', 100, 2),
  ('Verdura mista', 200, 3),
  ('Frutta secca mista', 10, 4)
) AS p(fname, portion, idx)
WHERE f.name = p.fname;

-- SABATO COLAZIONE
WITH plan_id AS (
  SELECT id FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid LIMIT 1
),
sabato_col AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  SELECT id, 5, 'colazione' FROM plan_id
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT sc.id, f.id, p.portion, p.idx
FROM sabato_col sc, foods f,
(VALUES
  ('Yogurt greco', 150, 1),
  ('Proteine in polvere', 25, 2),
  ('Cereali muesli', 30, 3),
  ('Frutta secca mista', 10, 4),
  ('Banana', 110, 5)
) AS p(fname, portion, idx)
WHERE f.name = p.fname;

-- SABATO PRANZO
WITH plan_id AS (
  SELECT id FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid LIMIT 1
),
sabato_pranzo AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  SELECT id, 5, 'pranzo' FROM plan_id
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT sp.id, f.id, p.portion, p.idx
FROM sabato_pranzo sp, foods f,
(VALUES
  ('Pan bauletto', 300, 1),
  ('Uova (3 medie)', 150, 2),
  ('Verdura mista', 200, 3),
  ('Frutta secca mista', 10, 4)
) AS p(fname, portion, idx)
WHERE f.name = p.fname;

-- DOMENICA COLAZIONE
WITH plan_id AS (
  SELECT id FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid LIMIT 1
),
domenica_col AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  SELECT id, 6, 'colazione' FROM plan_id
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT dc.id, f.id, p.portion, p.idx
FROM domenica_col dc, foods f,
(VALUES
  ('Yogurt greco', 150, 1),
  ('Proteine in polvere', 25, 2),
  ('Cereali muesli', 30, 3),
  ('Frutta secca mista', 10, 4),
  ('Pesca', 280, 5)
) AS p(fname, portion, idx)
WHERE f.name = p.fname;

-- DOMENICA PRANZO
WITH plan_id AS (
  SELECT id FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid LIMIT 1
),
domenica_pranzo AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  SELECT id, 6, 'pranzo' FROM plan_id
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT dp.id, f.id, p.portion, p.idx
FROM domenica_pranzo dp, foods f,
(VALUES
  ('Pasta al ragù', 100, 1),
  ('Verdura mista', 200, 2),
  ('Frutta secca mista', 10, 3),
  ('Melone', 230, 4),
  ('Dessert proteico', 200, 5)
) AS p(fname, portion, idx)
WHERE f.name = p.fname;

-- DOMENICA CENA
WITH plan_id AS (
  SELECT id FROM diet_weekly_plans WHERE user_id = '22c6f260-95c5-4600-83d9-60e4347b7ced'::uuid LIMIT 1
),
domenica_cena AS (
  INSERT INTO diet_meals (weekly_plan_id, day_of_week, meal_type)
  SELECT id, 6, 'cena' FROM plan_id
  RETURNING id
)
INSERT INTO diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT dc.id, f.id, p.portion, p.idx
FROM domenica_cena dc, foods f,
(VALUES
  ('Pan bauletto', 300, 1),
  ('Branzino', 200, 2),
  ('Verdura mista', 200, 3),
  ('Frutta secca mista', 10, 4)
) AS p(fname, portion, idx)
WHERE f.name = p.fname;

SELECT 'Piano dietetico Michele Danza (2100 kcal) inserito con successo! ✅🥗' as risultato;
