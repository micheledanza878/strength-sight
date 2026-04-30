-- Create Substitution Groups System (v3 - CORRECT)
-- Based on user's actual meal plan structure from photos
-- Uses existing food_equivalences table structure

-- 1. Ensure substitution_groups table exists
CREATE TABLE IF NOT EXISTS substitution_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- 2. Ensure food_equivalences junction table exists (many-to-many)
CREATE TABLE IF NOT EXISTS food_equivalences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES substitution_groups(id) ON DELETE CASCADE,
  food_id UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  base_quantity_g NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(group_id, food_id)
);

CREATE INDEX IF NOT EXISTS idx_food_equivalences_food ON food_equivalences(food_id);
CREATE INDEX IF NOT EXISTS idx_food_equivalences_group ON food_equivalences(group_id);
CREATE INDEX IF NOT EXISTS idx_food_equivalences_group_food ON food_equivalences(group_id, food_id);

-- 4. Clear old incorrect data
DELETE FROM food_equivalences WHERE TRUE;
DELETE FROM substitution_groups WHERE TRUE;

-- 5. Insert Correct Substitution Groups Based on Meal Plan Tables

-- LEGUMI
INSERT INTO substitution_groups (name, description) VALUES
  ('Legumi', 'Legumi intercambiabili')
ON CONFLICT (name) DO NOTHING;

-- PESCE MAGRO (200g standard)
INSERT INTO substitution_groups (name, description) VALUES
  ('Pesce Magro', 'Pesce magro - 200g standard')
ON CONFLICT (name) DO NOTHING;

-- PESCE GRASSO (100g standard - ALSO ALTERNATIVE TO UOVA)
INSERT INTO substitution_groups (name, description) VALUES
  ('Pesce Grasso', 'Pesce grasso (Salmone, Sgombro, etc) - 100g')
ON CONFLICT (name) DO NOTHING;

-- UOVA (150g = 3 medie - INTERCHANGEABLE WITH PESCE GRASSO)
INSERT INTO substitution_groups (name, description) VALUES
  ('Uova', 'Uova (3 medie) - 150g')
ON CONFLICT (name) DO NOTHING;

-- CARNE BIANCA (180g standard)
INSERT INTO substitution_groups (name, description) VALUES
  ('Carne Bianca', 'Petto di Pollo, Petto di Tacchino, Coniglio - 180g')
ON CONFLICT (name) DO NOTHING;

-- CARNE ROSSA (100g standard - SEPARATE FROM CARNE BIANCA)
INSERT INTO substitution_groups (name, description) VALUES
  ('Carne Rossa', 'Manzo, Vitello, Maiale, Agnello - 100g')
ON CONFLICT (name) DO NOTHING;

-- FORMAGGIO (diverse grammature)
INSERT INTO substitution_groups (name, description) VALUES
  ('Formaggio', 'Formaggio stagionato, Mozzarella, Crescenza, Ricotta, Fiocchi di latte, Yogurt')
ON CONFLICT (name) DO NOTHING;

-- CONDIMENTI (includes Grana)
INSERT INTO substitution_groups (name, description) VALUES
  ('Condimenti', 'Olio, Burro, Maionese, Grana, Philadelphia, Olive, Avocado, Panna')
ON CONFLICT (name) DO NOTHING;

-- CARBOIDRATI (diverse grammature)
INSERT INTO substitution_groups (name, description) VALUES
  ('Carboidrati', 'Pasta, Riso, Orzo, Farro, Pane, Patate, Gnocchi, Gallette')
ON CONFLICT (name) DO NOTHING;

-- FRUTTA (diverse grammature)
INSERT INTO substitution_groups (name, description) VALUES
  ('Frutta', 'Mela, Banana, Arancia, Fragole, Pera, Uva, Pesca, Kiwi, Melone, e altri frutti')
ON CONFLICT (name) DO NOTHING;

-- 6. Assign foods to groups via food_equivalences table (many-to-many support)

-- CARBOIDRATI (100-540g depending on type)
INSERT INTO food_equivalences (group_id, food_id, base_quantity_g)
SELECT (SELECT id FROM substitution_groups WHERE name = 'Carboidrati'), f.id, f.standard_portion_g
FROM foods f
WHERE f.name IN ('Pasta/Riso/Orzo/Farro/Quinoa', 'Pasta ripiena', 'Pasta fresca', 'Pane fresco', 'Pan bauletto', 'Patate', 'Gnocchi', 'Gallette/Wasa')
ON CONFLICT (group_id, food_id) DO UPDATE SET base_quantity_g = EXCLUDED.base_quantity_g;

-- CARNE BIANCA (180g)
INSERT INTO food_equivalences (group_id, food_id, base_quantity_g)
SELECT (SELECT id FROM substitution_groups WHERE name = 'Carne Bianca'), f.id, f.standard_portion_g
FROM foods f
WHERE f.name IN ('Petto di Pollo', 'Petto di Tacchino', 'Coniglio disossato')
ON CONFLICT (group_id, food_id) DO UPDATE SET base_quantity_g = EXCLUDED.base_quantity_g;

-- PESCE MAGRO (200g)
INSERT INTO food_equivalences (group_id, food_id, base_quantity_g)
SELECT (SELECT id FROM substitution_groups WHERE name = 'Pesce Magro'), f.id, f.standard_portion_g
FROM foods f
WHERE f.name IN ('Platessa', 'Merluzzo', 'Nasello', 'Sogliola', 'Orata', 'Branzino', 'Palombo', 'Razza', 'Cernia', 'Trota', 'Scorfano')
ON CONFLICT (group_id, food_id) DO UPDATE SET base_quantity_g = EXCLUDED.base_quantity_g;

-- PESCE GRASSO (100g) - Add to Pesce Grasso group
INSERT INTO food_equivalences (group_id, food_id, base_quantity_g)
SELECT (SELECT id FROM substitution_groups WHERE name = 'Pesce Grasso'), f.id, f.standard_portion_g
FROM foods f
WHERE f.name IN ('Salmone', 'Sgombro', 'Aringhe', 'Pesce spada', 'Tonno sott''olio', 'Sardine')
ON CONFLICT (group_id, food_id) DO UPDATE SET base_quantity_g = EXCLUDED.base_quantity_g;

-- UOVA (150g)
INSERT INTO food_equivalences (group_id, food_id, base_quantity_g)
SELECT (SELECT id FROM substitution_groups WHERE name = 'Uova'), f.id, f.standard_portion_g
FROM foods f
WHERE f.name IN ('Uova (3 medie)')
ON CONFLICT (group_id, food_id) DO UPDATE SET base_quantity_g = EXCLUDED.base_quantity_g;

-- FORMAGGIO (various portions)
INSERT INTO food_equivalences (group_id, food_id, base_quantity_g)
SELECT (SELECT id FROM substitution_groups WHERE name = 'Formaggio'), f.id, f.standard_portion_g
FROM foods f
WHERE f.name IN ('Formaggio stagionato', 'Mozzarella', 'Crescenza/Feta/Primosale', 'Ricotta', 'Fiocchi di latte (vasetto)', 'Yogurt greco')
ON CONFLICT (group_id, food_id) DO UPDATE SET base_quantity_g = EXCLUDED.base_quantity_g;

-- FRUTTA (all fruits)
INSERT INTO food_equivalences (group_id, food_id, base_quantity_g)
SELECT (SELECT id FROM substitution_groups WHERE name = 'Frutta'), f.id, f.standard_portion_g
FROM foods f
WHERE f.category_id = (SELECT id FROM food_categories WHERE name = 'Frutta')
ON CONFLICT (group_id, food_id) DO UPDATE SET base_quantity_g = EXCLUDED.base_quantity_g;

-- 7. Handle foods that belong to MULTIPLE groups

-- PESCE GRASSO also belongs to UOVA group (for substitution purposes)
-- Salmone, Sgombro, Aringhe, Pesce spada, Tonno, Sardine (100g) are alternatives to Uova
INSERT INTO food_equivalences (group_id, food_id, base_quantity_g)
SELECT (SELECT id FROM substitution_groups WHERE name = 'Uova'), f.id, f.standard_portion_g
FROM foods f
WHERE f.name IN ('Salmone', 'Sgombro', 'Aringhe', 'Pesce spada', 'Tonno sott''olio', 'Sardine')
ON CONFLICT (group_id, food_id) DO NOTHING;

-- Note: GRANA/PESTO should be added to BOTH Formaggio and Condimenti groups
-- INSERT INTO food_equivalences (group_id, food_id, base_quantity_g)
-- SELECT (SELECT id FROM substitution_groups WHERE name = 'Condimenti'), f.id, f.standard_portion_g
-- FROM foods f WHERE f.name IN ('Grana', 'Pesto')
-- ON CONFLICT (group_id, food_id) DO NOTHING;

SELECT 'Migrazione v3 - GRUPPI DI SOSTITUZIONE CORRETTI ✅' as result;
SELECT 'Struttura: food_equivalences junction table con base_quantity_g' as structure;
SELECT 'Pesce grasso (100g) = Uova (150g) per sostituzione' as rule1;
SELECT 'Carne rossa e Carne bianca = SEPARATE groups' as rule2;
SELECT 'Pesce magro (200g) e Pesce grasso (100g) = SEPARATE groups' as rule3;
