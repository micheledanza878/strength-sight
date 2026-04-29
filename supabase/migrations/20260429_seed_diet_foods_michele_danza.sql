-- Seed Foods Database for Michele Danza's Diet Plan (2100 kcal)
-- Based on the diet substitution table

-- Get category IDs (they were inserted in the previous migration)
DO $$
DECLARE
  v_cat_carbs UUID;
  v_cat_carne_bianca UUID;
  v_cat_pesce_magro UUID;
  v_cat_pesce_grasso UUID;
  v_cat_frutti_mare UUID;
  v_cat_legumi UUID;
  v_cat_formaggi UUID;
  v_cat_uova UUID;
  v_cat_condimenti UUID;
  v_cat_frutta UUID;
BEGIN

  -- Get category IDs
  SELECT id INTO v_cat_carbs FROM food_categories WHERE name = 'Carboidrati';
  SELECT id INTO v_cat_carne_bianca FROM food_categories WHERE name = 'Carni Bianche';
  SELECT id INTO v_cat_pesce_magro FROM food_categories WHERE name = 'Pesce Magro';
  SELECT id INTO v_cat_pesce_grasso FROM food_categories WHERE name = 'Pesce Grasso';
  SELECT id INTO v_cat_formaggi FROM food_categories WHERE name = 'Latticini';
  SELECT id INTO v_cat_uova FROM food_categories WHERE name = 'Uova';
  SELECT id INTO v_cat_frutta FROM food_categories WHERE name = 'Frutta';

  -- ===== CARBOIDRATI (100g/110g porzione standard) =====
  INSERT INTO foods (category_id, name, standard_portion_g, calories_approx) VALUES
    (v_cat_carbs, 'Pasta/Riso/Orzo/Farro/Quinoa', 100, 350),
    (v_cat_carbs, 'Pasta ripiena', 130, 260),
    (v_cat_carbs, 'Pasta fresca', 130, 210),
    (v_cat_carbs, 'Pane fresco', 130, 330),
    (v_cat_carbs, 'Pan bauletto', 50, 130),
    (v_cat_carbs, 'Patate', 540, 380),
    (v_cat_carbs, 'Gnocchi', 230, 230),
    (v_cat_carbs, 'Gallette/Wasa', 90, 300)
  ON CONFLICT (name, category_id) DO NOTHING;

  -- ===== CARNI BIANCHE (150g/200g) =====
  INSERT INTO foods (category_id, name, standard_portion_g, calories_approx) VALUES
    (v_cat_carne_bianca, 'Petto di Pollo', 180, 190),
    (v_cat_carne_bianca, 'Petto di Tacchino', 180, 170),
    (v_cat_carne_bianca, 'Coniglio disossato', 180, 160)
  ON CONFLICT (name, category_id) DO NOTHING;

  -- ===== PESCE MAGRO (200g/250g) =====
  INSERT INTO foods (category_id, name, standard_portion_g, calories_approx) VALUES
    (v_cat_pesce_magro, 'Platessa', 200, 180),
    (v_cat_pesce_magro, 'Merluzzo', 200, 160),
    (v_cat_pesce_magro, 'Nasello', 200, 160),
    (v_cat_pesce_magro, 'Sogliola', 200, 160),
    (v_cat_pesce_magro, 'Orata', 200, 200),
    (v_cat_pesce_magro, 'Branzino', 200, 200),
    (v_cat_pesce_magro, 'Palombo', 200, 180),
    (v_cat_pesce_magro, 'Razza', 200, 160),
    (v_cat_pesce_magro, 'Cernia', 200, 200),
    (v_cat_pesce_magro, 'Trota', 200, 220),
    (v_cat_pesce_magro, 'Scorfano', 200, 180)
  ON CONFLICT (name, category_id) DO NOTHING;

  -- ===== PESCE GRASSO (100g) =====
  INSERT INTO foods (category_id, name, standard_portion_g, calories_approx) VALUES
    (v_cat_pesce_grasso, 'Salmone', 100, 206),
    (v_cat_pesce_grasso, 'Sgombro', 100, 191),
    (v_cat_pesce_grasso, 'Aringhe', 100, 208),
    (v_cat_pesce_grasso, 'Pesce spada', 100, 155),
    (v_cat_pesce_grasso, 'Tonno sott''olio', 100, 289),
    (v_cat_pesce_grasso, 'Sardine', 100, 208)
  ON CONFLICT (name, category_id) DO NOTHING;

  -- ===== UOVA (3 uova media 50g cadauna) =====
  INSERT INTO foods (category_id, name, standard_portion_g, calories_approx) VALUES
    (v_cat_uova, 'Uova (3 medie)', 150, 155)
  ON CONFLICT (name, category_id) DO NOTHING;

  -- ===== FORMAGGI =====
  INSERT INTO foods (category_id, name, standard_portion_g, calories_approx) VALUES
    (v_cat_formaggi, 'Formaggio stagionato', 100, 390),
    (v_cat_formaggi, 'Mozzarella', 150, 250),
    (v_cat_formaggi, 'Crescenza/Feta/Primosale', 130, 220),
    (v_cat_formaggi, 'Ricotta', 250, 440),
    (v_cat_formaggi, 'Fiocchi di latte (vasetto)', 125, 100),
    (v_cat_formaggi, 'Yogurt greco', 150, 110),
    (v_cat_formaggi, 'Bresaola', 60, 105)
  ON CONFLICT (name, category_id) DO NOTHING;

  -- ===== FRUTTA (31 tipi con porzioni personalizzate) =====
  INSERT INTO foods (category_id, name, standard_portion_g, calories_approx) VALUES
    (v_cat_frutta, 'Albicocche', 190, 57),
    (v_cat_frutta, 'Ananas', 190, 53),
    (v_cat_frutta, 'Anguria', 350, 91),
    (v_cat_frutta, 'Arancia', 180, 75),
    (v_cat_frutta, 'Banana', 110, 95),
    (v_cat_frutta, 'Cachi', 150, 57),
    (v_cat_frutta, 'Ciliegie', 170, 68),
    (v_cat_frutta, 'Clementine', 200, 70),
    (v_cat_frutta, 'Datteri', 30, 67),
    (v_cat_frutta, 'Fichi', 130, 52),
    (v_cat_frutta, 'Fragole', 270, 81),
    (v_cat_frutta, 'Kiwi', 170, 83),
    (v_cat_frutta, 'Lamponi', 160, 48),
    (v_cat_frutta, 'Litchi', 110, 55),
    (v_cat_frutta, 'Mandarini', 110, 38),
    (v_cat_frutta, 'Mango', 140, 56),
    (v_cat_frutta, 'Mapo', 240, 48),
    (v_cat_frutta, 'Maracuja', 80, 30),
    (v_cat_frutta, 'Mela', 180, 90),
    (v_cat_frutta, 'Melagrana', 100, 64),
    (v_cat_frutta, 'Melone', 230, 57),
    (v_cat_frutta, 'Mirtilli', 160, 64),
    (v_cat_frutta, 'More', 190, 57),
    (v_cat_frutta, 'Nespole', 250, 50),
    (v_cat_frutta, 'Papaya', 250, 55),
    (v_cat_frutta, 'Pera', 130, 52),
    (v_cat_frutta, 'Pesca', 280, 84),
    (v_cat_frutta, 'Pompelmo', 280, 83),
    (v_cat_frutta, 'Prugne', 180, 72),
    (v_cat_frutta, 'Ribes', 160, 64),
    (v_cat_frutta, 'Uva', 150, 90)
  ON CONFLICT (name, category_id) DO NOTHING;

END $$;
