-- Ripulisci la migrazione precedente e ricrea il sistema corretto
-- Basato sulle VERE TABELLE dalle foto del piano alimentare

-- Elimina i dati vecchi (se esistono)
DELETE FROM substitution_groups WHERE TRUE;

-- Ricrea i gruppi di sostituzione basati sulle TABELLE REALI

-- 1. LEGUMI - Tutti intercambiabili
INSERT INTO substitution_groups (name, description, type) VALUES
  ('Legumi', 'Legumi secchi, leguminotti, pasta di legumi, gallette di legumi, farina di legumi (40g vs 120g)', 'legumi');

-- 2. FORMAGGIO - Tutti intercambiabili con grammature diverse
INSERT INTO substitution_groups (name, description, type) VALUES
  ('Formaggio', 'Formaggio stagionato (100g), Mozzarella (150g), Crescenza/Feta/Primosale (130g), Ricotta (250g)', 'formaggio');

-- 3. UOVA - Intercambiabili con Tofu e Pesce grasso
INSERT INTO substitution_groups (name, description, type) VALUES
  ('Uova', 'Uova grandezza media (50g = 3), Tofu (125g), Pesce grasso (100g)', 'uova');

-- 4. OLIO E CONDIMENTI - Tutti intercambiabili con grammature diverse
INSERT INTO substitution_groups (name, description, type) VALUES
  ('Olio e Condimenti', 'Olio/Burro (10g), Maionese/salsa tahina/frutta secca (15g), Grana/pesto (20g), Philadelphia (35g), Olive/Avocado/Panna (50g), Salse leggere (60g)', 'condimenti');

-- 5. CARBOIDRATI - Tutti intercambiabili con grammature diverse
INSERT INTO substitution_groups (name, description, type) VALUES
  ('Carboidrati', 'Pasta/riso/orzo/farro/quinoa/grano saraceno/mais/cous cous (100-110g), Pasta ripiena (130-150g), Pane fresco (130-150g), Pan bauletto (5-6 fette), Patate (470-540g), Gnocchi (210-230g), Gallette/Wasa (90g), Piadina/Tortillas (100-110g)', 'carboidrati');

-- 6. CARNE E PESCE - Tutti intercambiabili con grammature diverse
INSERT INTO substitution_groups (name, description, type) VALUES
  ('Carne e Pesce', 'Carne bianca (150-200g), Pesce magro (200-250g), Frutti di mare/Crostacei/Molluschi (300-350g), Carne rossa (100g), Pesce grasso (100g)', 'proteine');

-- 7. FRUTTA - Tutti i frutti intercambiabili con grammature diverse
INSERT INTO substitution_groups (name, description, type) VALUES
  ('Frutta', 'Albicocche (190g), Ananas (190g), Angurie (350g), Arance (180g), Banane (110g), Cachi (150g), Ciliegie (170g), Clementine (200g), Datteri (30g), Fichi (130g), Fragole (270g), Kiwi (170g), Lamponi (160g), Litchi (110g), Mandarini (110g), Mango (140g), Melagrana (100g), Melone (230g), Mirtilli (160g), More (190g), Nespole (250g), Papaya (250g), Peperoni gialli (130g), Pera (130g), Pesca (280g), Pompelmo (280g), Prugne (180g), Ribes (160g), Uva (150g)', 'frutta');

-- 8. VERDURA - Tutte le verdure intercambiabili
INSERT INTO substitution_groups (name, description, type) VALUES
  ('Verdura', 'Verdure: Verdi (broccoli, lattuga, bietola, zucchine, spinaci), Giallo/Arancio (carote, zucca, peperoni), Rosse (pomodori, peperoni, radicchio), Bianche (cavolfiore, finocchi, porri, funghi), Viola (melanzane, cavolo rosso, barbabietole). Variare in base al colore per un apporto completo di vitamine e minerali.', 'verdura');

-- Adesso assegna i cibi ai gruppi CORRETTI

-- LEGUMI
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Legumi')
WHERE name IN ('Legumi', 'Legumi secchi', 'Lenticchie', 'Fagioli', 'Piselli', 'Ceci', 'Fave')
OR name LIKE '%Legumi%';

-- FORMAGGIO
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Formaggio')
WHERE name IN ('Formaggio stagionato', 'Grana', 'Parmigiano', 'Pecorino', 'Mozzarella', 'Fior di latte', 'Crescenza', 'Feta', 'Primosale', 'Ricotta', 'Fiocchi di latte (vasetto)');

-- UOVA (insieme a Tofu e Pesce grasso)
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Uova')
WHERE name IN ('Uova (3 medie)', 'Uova', 'Tuorli', 'Tofu', 'Sgombro', 'Salmone', 'Pesce grasso');

-- OLIO E CONDIMENTI
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Olio e Condimenti')
WHERE name LIKE '%Olio%' OR name = 'Burro' 
   OR name IN ('Maionese', 'Salsa tahina', 'Frutta secca mista', 'Frutta secca', 'Grana', 'Pesto', 'Philadelphia', 'Philadelphia original', 'Philadelphia light');

-- CARBOIDRATI
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Carboidrati')
WHERE name IN ('Pasta al ragù', 'Pasta', 'Pasta Riso', 'Riso', 'Orzo', 'Farro', 'Quinoa', 'Grano saraceno', 'Mais', 'Cous cous', 'Pan bauletto', 'Pane', 'Patate', 'Gnocchi', 'Gallette', 'Piadina')
OR name LIKE '%Pasta%' OR name LIKE '%Riso%' OR name LIKE '%pasta%' OR name LIKE '%Pane%';

-- CARNE E PESCE
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Carne e Pesce')
WHERE name IN ('Petto di Pollo', 'Tacchino', 'Coniglio', 'Merluzzo', 'Platessa', 'Nasello', 'Sogliola', 'Orata', 'Branzino', 'Palombo', 'Razza', 'Cernia', 'Trota', 'Sorfano', 'Tonno fresco', 'Cozze', 'Vongole', 'Gamberi', 'Calamari', 'Totani', 'Seppie', 'Polpo', 'Carne rossa', 'Vitello', 'Manzo', 'Maiale')
OR name LIKE '%Merluzzo%' OR name LIKE '%Platessa%' OR name LIKE '%Tonno%' OR name LIKE '%Pesce%';

-- FRUTTA
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Frutta')
WHERE name IN ('Mela', 'Banana', 'Arancia', 'Fragole', 'Pera', 'Uva', 'Pesca', 'Kiwi', 'Melone', 'Albicocche', 'Ananas', 'Angurie', 'Cachi', 'Ciliegie', 'Clementine', 'Datteri', 'Fichi', 'Lamponi', 'Litchi', 'Mandarini', 'Mango', 'Melagrana', 'Mirtilli', 'More', 'Nespole', 'Papaya', 'Peperoni gialli', 'Pompelmo', 'Prugne', 'Ribes', 'Fichi d''India', 'Cachi mela')
OR name LIKE '%rancia%' OR name LIKE '%Fragole%' OR name LIKE '%Melone%';

-- VERDURA
UPDATE foods SET substitution_group_id = (SELECT id FROM substitution_groups WHERE name = 'Verdura')
WHERE name IN ('Verdura mista', 'Verdure', 'Insalata', 'Broccoli', 'Lattuga', 'Bietola', 'Zucchine', 'Spinaci', 'Carote', 'Zucca', 'Pomodori', 'Peperoni', 'Radicchio', 'Cavolfiore', 'Finocchi', 'Porri', 'Funghi', 'Melanzane', 'Cavolo rosso', 'Barbabietole', 'Cavolo', 'Cavoletti', 'Cicoria')
OR name LIKE '%Verdura%' OR name LIKE '%verdura%';

SELECT 'Migrazione v2 - Gruppi di sostituzione CORRETTI basati su TABELLE REALI completata! ✅' as result;
