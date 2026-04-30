-- Crea tabella substitution_groups per gestire i veri gruppi di sostituzione
CREATE TABLE IF NOT EXISTS substitution_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  type VARCHAR(100) NOT NULL, -- 'carboidrati', 'proteine', 'formaggio', 'legumi', 'uova', 'condimenti', 'frutta', 'verdura'
  created_at TIMESTAMP DEFAULT now()
);

-- Aggiunge colonna substitution_group_id ai foods (se non esiste già)
ALTER TABLE foods ADD COLUMN IF NOT EXISTS substitution_group_id UUID REFERENCES substitution_groups(id);

-- Inserisci i gruppi di sostituzione
INSERT INTO substitution_groups (name, description, type) VALUES
  ('Carboidrati - Pasta/Riso', 'Pasta, riso, orzo, farro, quinoa, grano saraceno, mais, cous cous', 'carboidrati'),
  ('Carboidrati - Pasta Ripiena', 'Pasta ripiena, pasta fresca', 'carboidrati'),
  ('Carboidrati - Pane Fresco', 'Pane fresco integrale e bianco', 'carboidrati'),
  ('Carboidrati - Pan Bauletto', 'Pan bauletto (25g per fetta)', 'carboidrati'),
  ('Carboidrati - Patate', 'Patate bollite, al forno, purè', 'carboidrati'),
  ('Carboidrati - Gnocchi', 'Gnocchi di patata, di ricotta', 'carboidrati'),
  ('Carboidrati - Gallette', 'Gallette, Wasa, pane croccante', 'carboidrati'),
  ('Carboidrati - Piadina', 'Piadina, Tortillas', 'carboidrati'),
  
  ('Proteine - Carne Bianca', 'Tacchino, pollo, coniglio disossato', 'proteine'),
  ('Proteine - Pesce Magro', 'Platessa, merluzzo, nasello, sogliola, orata, branzino, palombo, razza, cernia, trota, sorfano, tonno fresco', 'proteine'),
  ('Proteine - Frutti di Mare', 'Cozze, vongole, gamberi, calamari, totani, seppie, polpo', 'proteine'),
  ('Proteine - Carne Rossa', 'Vitello, manzo, maiale, tagli magri con max 10g grasso per 100g', 'proteine'),
  ('Proteine - Pesce Grasso', 'Salmone, sgombro, aringhe, pesce spada, tonno sott''olio, sardine', 'proteine'),
  ('Proteine - Legumi', 'Lenticchie, fagioli, piselli, ceci, fave, pasta di legumi, gallette legumi, farina legumi', 'legumi'),
  ('Proteine - Uova', 'Uova grandezza media (50g = 1 uovo)', 'uova'),
  ('Proteine - Tofu', 'Tofu naturale', 'proteine'),
  
  ('Formaggio - Formaggio Stagionato', 'Grana, parmigiano, pecorino, cacioricotta, bel paese, bitto, fontina', 'formaggio'),
  ('Formaggio - Mozzarella', 'Mozzarella di bufala, fior di latte', 'formaggio'),
  ('Formaggio - Crescenza', 'Crescenza, Feta, Primosale', 'formaggio'),
  ('Formaggio - Ricotta', 'Ricotta fresca', 'formaggio'),
  ('Formaggio - Fiocchi di Latte', 'Fiocchi di latte (vasetto)', 'formaggio'),
  
  ('Condimenti - Olio', 'Olio extravergine, burro', 'condimenti'),
  ('Condimenti - Maionese', 'Maionese, salsa tahina, frutta secca (noci, mandorle, arachidi)', 'condimenti'),
  ('Condimenti - Grana Pesto', 'Grana, pesto', 'condimenti'),
  ('Condimenti - Formaggi Spalmabili', 'Philadelphia, Philadelphia light', 'condimenti'),
  ('Condimenti - Grassi Vari', 'Olive, avocado, panna', 'condimenti'),
  ('Condimenti - Salse Leggere', 'Philadelphia light, senape, ketchup, salsa barbecue, salsa teriyaki, salsa tzatziki', 'condimenti'),
  
  ('Frutta - Albicocche', 'Albicocche fresche', 'frutta'),
  ('Frutta - Ananas', 'Ananas fresco', 'frutta'),
  ('Frutta - Angurie', 'Anguria fresca', 'frutta'),
  ('Frutta - Arance', 'Arance, clementine, mandarini', 'frutta'),
  ('Frutta - Banane', 'Banane mature', 'frutta'),
  ('Frutta - Cachi', 'Cachi maturi', 'frutta'),
  ('Frutta - Ciliegie', 'Ciliegie fresche', 'frutta'),
  ('Frutta - Clementine', 'Clementine fresche', 'frutta'),
  ('Frutta - Datteri', 'Datteri secchi', 'frutta'),
  ('Frutta - Fichi', 'Fichi freschi', 'frutta'),
  ('Frutta - Fragole', 'Fragole fresche', 'frutta'),
  ('Frutta - Kiwi', 'Kiwi verde', 'frutta'),
  ('Frutta - Lamponi', 'Lamponi freschi', 'frutta'),
  ('Frutta - Litchi', 'Litchi freschi', 'frutta'),
  ('Frutta - Mandarini', 'Mandarini freschi', 'frutta'),
  ('Frutta - Mango', 'Mango maturo', 'frutta'),
  ('Frutta - Mapo', 'Mapo fresco', 'frutta'),
  ('Frutta - Maracuja', 'Frutto della passione', 'frutta'),
  ('Frutta - Mela', 'Mela rossa o gialla', 'frutta'),
  ('Frutta - Melagrana', 'Melagrana fresca', 'frutta'),
  ('Frutta - Melone', 'Melone giallo', 'frutta'),
  ('Frutta - Mirtilli', 'Mirtilli freschi', 'frutta'),
  ('Frutta - More', 'More fresche', 'frutta'),
  ('Frutta - Nespole', 'Nespole fresche', 'frutta'),
  ('Frutta - Papaya', 'Papaya matura', 'frutta'),
  ('Frutta - Peperoni Gialli', 'Peperoni gialli freschi', 'frutta'),
  ('Frutta - Pera', 'Pera matura', 'frutta'),
  ('Frutta - Pesca', 'Pesca fresca', 'frutta'),
  ('Frutta - Pompelmo', 'Pompelmo rosa o bianco', 'frutta'),
  ('Frutta - Prugne', 'Prugne fresche', 'frutta'),
  ('Frutta - Ribes', 'Ribes nero o rosso', 'frutta'),
  ('Frutta - Uva', 'Uva bianca o nera', 'frutta'),
  
  ('Verdura - Verdi', 'Broccoli, lattuga, bietola, zucchine, spinaci, cavoletti, insalata in genere', 'verdura'),
  ('Verdura - Giallo/Arancio', 'Carote, zucca, peperoni gialli', 'verdura'),
  ('Verdura - Rosse', 'Pomodori, peperoni, radicchio rosso', 'verdura'),
  ('Verdura - Bianche', 'Cavolfiore, finocchi, porri, funghi, aglio, cipolla', 'verdura'),
  ('Verdura - Viola', 'Melanzane, cavolo rosso, barbabietole, radicchio', 'verdura'),
  ('Verdura - Pomodori Passati', 'Passata di pomodoro fresca o conservata', 'verdura'),
  ('Verdura - Velluate/Zuppe', 'Zuppe di verdure, passati di verdure', 'verdura')
ON CONFLICT (name) DO NOTHING;

-- Ora assegna i cibi ai rispettivi gruppi (aggiorna i cibi esistenti)
-- CARBOIDRATI - Pasta/Riso
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Carboidrati - Pasta/Riso')
WHERE name IN ('Pasta al ragù', 'Pasta', 'Pasta Riso', 'Riso', 'Orzo', 'Farro', 'Quinoa', 'Grano saraceno', 'Mais', 'Cous cous')
OR name LIKE '%Pasta%' OR name LIKE '%Riso%' OR name LIKE '%pasta%';

-- CARBOIDRATI - Pan Bauletto
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Carboidrati - Pan Bauletto')
WHERE name = 'Pan bauletto';

-- CARBOIDRATI - Pane Fresco
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Carboidrati - Pane Fresco')
WHERE name LIKE '%Pane%' AND name NOT LIKE '%bauletto%';

-- PROTEINE - Carne Bianca
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Proteine - Carne Bianca')
WHERE name IN ('Petto di Pollo', 'Tacchino', 'Coniglio');

-- PROTEINE - Pesce Magro
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Proteine - Pesce Magro')
WHERE name IN ('Merluzzo', 'Platessa', 'Nasello', 'Sogliola', 'Orata', 'Branzino', 'Palombo', 'Razza', 'Cernia', 'Trota', 'Sorfano', 'Tonno fresco')
OR name LIKE '%Merluzzo%' OR name LIKE '%Platessa%';

-- PROTEINE - Pesce Grasso
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Proteine - Pesce Grasso')
WHERE name IN ('Sgombro', 'Salmone', 'Aringhe', 'Pesce spada', 'Tonno sott''olio', 'Sardine')
OR name LIKE '%Sgombro%' OR name LIKE '%Salmone%';

-- PROTEINE - Frutti di Mare
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Proteine - Frutti di Mare')
WHERE name IN ('Cozze', 'Vongole', 'Gamberi', 'Calamari', 'Totani', 'Seppie', 'Polpo');

-- PROTEINE - Uova
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Proteine - Uova')
WHERE name IN ('Uova (3 medie)', 'Uova', 'Tuorli');

-- PROTEINE - Legumi
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Proteine - Legumi')
WHERE name IN ('Legumi', 'Legumi secchi', 'Lenticchie', 'Fagioli', 'Piselli', 'Ceci', 'Fave')
OR name LIKE '%Legumi%';

-- PROTEINE - Tofu
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Proteine - Tofu')
WHERE name = 'Tofu';

-- FORMAGGIO - Stagionato
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Formaggio - Formaggio Stagionato')
WHERE name IN ('Formaggio stagionato', 'Grana', 'Parmigiano', 'Pecorino');

-- FORMAGGIO - Mozzarella
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Formaggio - Mozzarella')
WHERE name IN ('Mozzarella', 'Fior di latte');

-- FORMAGGIO - Crescenza
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Formaggio - Crescenza')
WHERE name IN ('Crescenza', 'Feta', 'Primosale');

-- FORMAGGIO - Ricotta
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Formaggio - Ricotta')
WHERE name = 'Ricotta';

-- FORMAGGIO - Fiocchi di Latte
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Formaggio - Fiocchi di Latte')
WHERE name = 'Fiocchi di latte (vasetto)';

-- CONDIMENTI - Olio
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Condimenti - Olio')
WHERE name LIKE '%Olio%' OR name = 'Burro';

-- CONDIMENTI - Maionese
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Condimenti - Maionese')
WHERE name IN ('Maionese', 'Salsa tahina', 'Frutta secca mista', 'Frutta secca');

-- CONDIMENTI - Grana Pesto
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Condimenti - Grana Pesto')
WHERE name IN ('Grana', 'Pesto');

-- CONDIMENTI - Philadelphia
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Condimenti - Formaggi Spalmabili')
WHERE name IN ('Philadelphia', 'Philadelphia original', 'Philadelphia light');

-- FRUTTA
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Frutta - Mela')
WHERE name = 'Mela';

UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Frutta - Banane')
WHERE name = 'Banana';

UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Frutta - Arance')
WHERE name = 'Arancia';

UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Frutta - Fragole')
WHERE name = 'Fragole';

UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Frutta - Pera')
WHERE name = 'Pera';

UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Frutta - Uva')
WHERE name = 'Uva';

UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Frutta - Pesca')
WHERE name = 'Pesca';

UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Frutta - Kiwi')
WHERE name = 'Kiwi';

UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Frutta - Melone')
WHERE name = 'Melone';

-- VERDURA
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Verdura - Verdi')
WHERE name = 'Verdura mista';

-- Crea un indice per query veloce
CREATE INDEX IF NOT EXISTS idx_foods_substitution_group ON foods(substitution_group_id);

SELECT 'Migrazione substitution_groups completata! ✅' as result;
