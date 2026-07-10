-- ============================================================================
-- Nuovo piano dieta di Michele Danza (decorrenza 08/07/2026) + catalogo
-- "Snack Salato".
--
-- Contesto: il vecchio PDF dieta (piano attivo dal 30/04/2026, weekly_plan
-- d1000000-0000-0000-0000-000000000000) viene sostituito da un nuovo PDF a
-- partire dall'08/07/2026. La tabella diet_weekly_plans oggi non ha nessun
-- concetto di "stato" o "periodo di validità": assume implicitamente un solo
-- piano per utente. Introduciamo un versionamento minimale (start_date,
-- end_date, is_active) additivo e non distruttivo: il piano vecchio NON viene
-- cancellato (resta consultabile come storico), viene solo disattivato e
-- "chiuso" alla data del giorno prima del nuovo piano. Viene poi creato un
-- nuovo diet_weekly_plans con il piano pasti completo dei 7 giorni.
--
-- Il nuovo PDF introduce anche uno spuntino pomeridiano salato con diverse
-- alternative (crackers, taralli, grissini, ecc.) non presenti nel catalogo
-- foods. Vengono aggiunti come nuovi alimenti + un nuovo substitution_group
-- "Snack Salato", così da comparire nella Guida Alimenti (/diet/foods).
-- L'utente sceglierà lui, giorno per giorno, quale snack usare: i pasti
-- "spuntino_pomeridiano" del nuovo piano vengono quindi creati SENZA
-- diet_meal_foods collegati.
--
-- Infine viene aggiunta una nuova misurazione corporea (08/07/2026) con due
-- nuovi campi opzionali (addome_cm, somma_pliche_mm) non ancora presenti in
-- body_measurements.
-- ============================================================================


-- ============================================================================
-- SEZIONE 1 — Versioning di diet_weekly_plans (colonne additive)
-- ============================================================================

-- 1a. Colonne additive: nessun piano esistente viene rotto, is_active default
--     true mantiene il comportamento attuale (piano singolo) per eventuali
--     altri utenti/piani già presenti.
ALTER TABLE public.diet_weekly_plans
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 1b. Il piano corrente non ha una start_date storica registrata altrove:
--     usiamo la data di creazione (30/04/2026) come inizio validità.
UPDATE public.diet_weekly_plans
SET start_date = '2026-04-30',
    end_date = '2026-07-07',
    is_active = false
WHERE id = 'd1000000-0000-0000-0000-000000000000';

-- 1c. Nuovo piano settimanale, attivo dall'08/07/2026, senza data di fine.
INSERT INTO public.diet_weekly_plans (id, user_id, start_date, end_date, is_active)
VALUES (
  'd2000000-0000-0000-0000-000000000000',
  '22c6f260-95c5-4600-83d9-60e4347b7ced',
  '2026-07-08',
  NULL,
  true
);


-- ============================================================================
-- SEZIONE 2 — Catalogo "Snack Salato": categoria, foods, substitution_group
-- ============================================================================

-- 2a. Nessuna food_category esistente è chiaramente adatta a uno snack salato
--     ("Latticini e Snack" contiene solo prodotti caseari/dolci: yogurt,
--     formaggi, dessert proteico, proteine in polvere). Creiamo una categoria
--     dedicata "Snack".
INSERT INTO public.food_categories (id, name, color, order_index)
VALUES ('c0000000-0000-0000-0000-000000000011', 'Snack', '#FFE0B2', 11)
ON CONFLICT (name) DO NOTHING;

-- 2b. Nuovi alimenti (tutti in porzione standard = quantità indicata dal
--     PDF). NOTA: "Gallette (spuntino)" è volutamente un food DIVERSO da
--     "Gallette" (f0000000-0000-0000-0000-000000000113, categoria
--     Carboidrati, 90g, usato nei pasti principali) per evitare ambiguità
--     nella Guida Alimenti: nome esplicito + porzione diversa (35g).
INSERT INTO public.foods (id, category_id, name, standard_portion_g) VALUES
  ('f0000000-0000-0000-0000-000000001001', 'c0000000-0000-0000-0000-000000000011', 'Crackers', 35),
  ('f0000000-0000-0000-0000-000000001002', 'c0000000-0000-0000-0000-000000000011', 'Schiacciatine', 35),
  ('f0000000-0000-0000-0000-000000001003', 'c0000000-0000-0000-0000-000000000011', 'Taralli', 35),
  ('f0000000-0000-0000-0000-000000001004', 'c0000000-0000-0000-0000-000000000011', 'Grissini', 35),
  ('f0000000-0000-0000-0000-000000001005', 'c0000000-0000-0000-0000-000000000011', 'Gallette (spuntino)', 35),
  ('f0000000-0000-0000-0000-000000001006', 'c0000000-0000-0000-0000-000000000011', 'Triangolini di mais', 35),
  ('f0000000-0000-0000-0000-000000001007', 'c0000000-0000-0000-0000-000000000011', 'Triangolini di legumi', 35),
  ('f0000000-0000-0000-0000-000000001008', 'c0000000-0000-0000-0000-000000000011', 'Popcorn', 35),
  ('f0000000-0000-0000-0000-000000001009', 'c0000000-0000-0000-0000-000000000011', 'Nachos', 35),
  ('f0000000-0000-0000-0000-000000001010', 'c0000000-0000-0000-0000-000000000011', 'Salatini', 35),
  ('f0000000-0000-0000-0000-000000001011', 'c0000000-0000-0000-0000-000000000011', 'Patatine (in sacchetto)', 25)
ON CONFLICT (name, category_id) DO NOTHING;

-- 2c. Nuovo substitution_group per lo spuntino pomeridiano salato.
INSERT INTO public.substitution_groups (id, name, description)
VALUES (
  'be000000-0000-0000-0000-000000000000',
  'Snack Salato',
  'Alternative allo spuntino pomeridiano.'
);

-- 2d. Equivalenze: un'unità per ciascun nuovo alimento (base_quantity_g =
--     porzione standard) + un'alternativa da 50g di "Pane fresco" (alimento
--     già a catalogo, non duplicato) come da PDF.
INSERT INTO public.food_equivalences (group_id, food_id, base_quantity_g)
SELECT 'be000000-0000-0000-0000-000000000000', f.id, f.standard_portion_g
FROM public.foods f
WHERE f.category_id = 'c0000000-0000-0000-0000-000000000011'
ON CONFLICT (group_id, food_id) DO NOTHING;

INSERT INTO public.food_equivalences (group_id, food_id, base_quantity_g)
SELECT 'be000000-0000-0000-0000-000000000000', f.id, 50
FROM public.foods f
WHERE f.name = 'Pane fresco'
ON CONFLICT (group_id, food_id) DO NOTHING;


-- ============================================================================
-- SEZIONE 3 — Piano pasti settimanale (7 giorni x 4 pasti)
--
-- day_of_week: 0=Lunedì, 1=Martedì, 2=Mercoledì, 3=Giovedì, 4=Venerdì,
--              5=Sabato, 6=Domenica
--
-- Tutti gli id dei diet_meals sono nuovi (prefisso "e", schema
-- e<day 1-7><mealtype 1-4>...) per non collidere con i pasti del piano
-- precedente (prefisso "a"), che restano intatti come storico.
-- mealtype: 1=colazione, 2=pranzo, 3=spuntino_pomeridiano, 4=cena
-- ============================================================================

INSERT INTO public.diet_meals (id, weekly_plan_id, day_of_week, meal_type) VALUES
  -- Lunedì
  ('e1100000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 0, 'colazione'),
  ('e1200000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 0, 'pranzo'),
  ('e1300000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 0, 'spuntino_pomeridiano'),
  ('e1400000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 0, 'cena'),
  -- Martedì
  ('e2100000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 1, 'colazione'),
  ('e2200000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 1, 'pranzo'),
  ('e2300000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 1, 'spuntino_pomeridiano'),
  ('e2400000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 1, 'cena'),
  -- Mercoledì
  ('e3100000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 2, 'colazione'),
  ('e3200000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 2, 'pranzo'),
  ('e3300000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 2, 'spuntino_pomeridiano'),
  ('e3400000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 2, 'cena'),
  -- Giovedì
  ('e4100000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 3, 'colazione'),
  ('e4200000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 3, 'pranzo'),
  ('e4300000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 3, 'spuntino_pomeridiano'),
  ('e4400000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 3, 'cena'),
  -- Venerdì
  ('e5100000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 4, 'colazione'),
  ('e5200000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 4, 'pranzo'),
  ('e5300000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 4, 'spuntino_pomeridiano'),
  ('e5400000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 4, 'cena'),
  -- Sabato
  ('e6100000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 5, 'colazione'),
  ('e6200000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 5, 'pranzo'),
  ('e6300000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 5, 'spuntino_pomeridiano'),
  ('e6400000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 5, 'cena'),
  -- Domenica
  ('e7100000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 6, 'colazione'),
  ('e7200000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 6, 'pranzo'),
  ('e7300000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 6, 'spuntino_pomeridiano'),
  ('e7400000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 6, 'cena');

-- Nota: le righe "spuntino_pomeridiano" sopra restano volutamente senza
-- diet_meal_foods: l'utente sceglierà dall'app quale alimento del gruppo
-- "Snack Salato" (o l'alternativa da 50g di Pane fresco) usare giorno per
-- giorno.

-- ---- Colazione (identica tutti i giorni) ----------------------------------
-- Yogurt greco bianco 150g, Proteine in polvere 25g, Cereali 50g (nuova
-- quantità da PDF, era 30g nel piano precedente), Frutta secca 10g,
-- Frutta (porzione standard).
INSERT INTO public.diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
SELECT m.id, f.id, v.portion, v.ord
FROM (VALUES
  ('e1100000-0000-0000-0000-000000000000'::uuid),
  ('e2100000-0000-0000-0000-000000000000'::uuid),
  ('e3100000-0000-0000-0000-000000000000'::uuid),
  ('e4100000-0000-0000-0000-000000000000'::uuid),
  ('e5100000-0000-0000-0000-000000000000'::uuid),
  ('e6100000-0000-0000-0000-000000000000'::uuid),
  ('e7100000-0000-0000-0000-000000000000'::uuid)
) AS m(id)
CROSS JOIN (VALUES
  ('Yogurt greco bianco', 150, 1),
  ('Proteine in polvere', 25, 2),
  ('Cereali', 50, 3),
  ('Frutta secca', 10, 4),
  ('Frutta (porzione standard)', 150, 5)
) AS v(food_name, portion, ord)
JOIN public.foods f ON f.name = v.food_name;

-- ---- Lunedì (day_of_week 0) ------------------------------------------------
INSERT INTO public.diet_meal_foods (meal_id, food_id, portion_size_g, order_index) VALUES
  ('e1200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Pan bauletto'), 150, 1),
  ('e1200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Tonno in scatola'), 100, 2),
  ('e1200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Verdura mista'), 200, 3),
  ('e1200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Olio'), 10, 4),
  ('e1200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Frutta (porzione standard)'), 150, 5),
  ('e1400000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Pan bauletto'), 150, 1),
  ('e1400000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Carne bianca'), 200, 2),
  ('e1400000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Verdura mista'), 200, 3),
  ('e1400000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Olio'), 10, 4);

-- ---- Martedì (day_of_week 1) -----------------------------------------------
-- Cena "pesce magro 200g" -> Merluzzo (food specifico già a catalogo).
INSERT INTO public.diet_meal_foods (meal_id, food_id, portion_size_g, order_index) VALUES
  ('e2200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Pasta'), 100, 1),
  ('e2200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Legumi cotti'), 120, 2),
  ('e2200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Verdura mista'), 200, 3),
  ('e2200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Olio'), 10, 4),
  ('e2200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Frutta (porzione standard)'), 150, 5),
  ('e2200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Dessert proteico'), 200, 6),
  ('e2400000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Pan bauletto'), 150, 1),
  ('e2400000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Merluzzo'), 200, 2),
  ('e2400000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Verdura mista'), 200, 3),
  ('e2400000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Olio'), 10, 4);

-- ---- Mercoledì (day_of_week 2) ----------------------------------------------
-- "Fiocchi di latte 1 vasetto" -> porzione standard già a catalogo (150g).
INSERT INTO public.diet_meal_foods (meal_id, food_id, portion_size_g, order_index) VALUES
  ('e3200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Pan bauletto'), 150, 1),
  ('e3200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Fiocchi di latte (max 6% grassi)'), 150, 2),
  ('e3200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Bresaola'), 60, 3),
  ('e3200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Verdura mista'), 200, 4),
  ('e3200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Olio'), 10, 5),
  ('e3200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Frutta (porzione standard)'), 150, 6),
  ('e3400000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Pan bauletto'), 150, 1),
  ('e3400000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Uova'), 150, 2),
  ('e3400000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Verdura mista'), 200, 3),
  ('e3400000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Olio'), 10, 4);

-- ---- Giovedì (day_of_week 3) ------------------------------------------------
INSERT INTO public.diet_meal_foods (meal_id, food_id, portion_size_g, order_index) VALUES
  ('e4200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Pan bauletto'), 150, 1),
  ('e4200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Sgombro'), 100, 2),
  ('e4200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Verdura mista'), 200, 3),
  ('e4200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Olio'), 10, 4),
  ('e4200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Frutta (porzione standard)'), 150, 5),
  ('e4400000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Pan bauletto'), 150, 1),
  ('e4400000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Carne bianca'), 200, 2),
  ('e4400000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Verdura mista'), 200, 3),
  ('e4400000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Olio'), 10, 4);

-- ---- Venerdì (day_of_week 4) ------------------------------------------------
-- Cena "formaggio 100g" -> Grana (food specifico già a catalogo).
INSERT INTO public.diet_meal_foods (meal_id, food_id, portion_size_g, order_index) VALUES
  ('e5200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Pasta'), 100, 1),
  ('e5200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Legumi in scatola'), 120, 2),
  ('e5200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Verdura mista'), 200, 3),
  ('e5200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Olio'), 10, 4),
  ('e5200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Frutta (porzione standard)'), 150, 5),
  ('e5200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Dessert proteico'), 200, 6),
  ('e5400000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Pan bauletto'), 150, 1),
  ('e5400000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Grana'), 100, 2),
  ('e5400000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Verdura mista'), 200, 3),
  ('e5400000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Olio'), 10, 4);

-- ---- Sabato (day_of_week 5) --------------------------------------------------
-- Pranzo senza frutta (come da PDF). Cena: pasto libero, nessun food collegato
-- (come nel piano precedente).
INSERT INTO public.diet_meal_foods (meal_id, food_id, portion_size_g, order_index) VALUES
  ('e6200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Pan bauletto'), 150, 1),
  ('e6200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Uova'), 150, 2),
  ('e6200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Verdura mista'), 200, 3),
  ('e6200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Olio'), 10, 4);

-- ---- Domenica (day_of_week 6) ------------------------------------------------
-- Cena "pesce magro 200g" -> Merluzzo (food specifico già a catalogo).
INSERT INTO public.diet_meal_foods (meal_id, food_id, portion_size_g, order_index) VALUES
  ('e7200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Pasta al ragù'), 100, 1),
  ('e7200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Verdura mista'), 200, 2),
  ('e7200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Olio'), 10, 3),
  ('e7200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Frutta (porzione standard)'), 150, 4),
  ('e7200000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Dessert proteico'), 200, 5),
  ('e7400000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Pan bauletto'), 150, 1),
  ('e7400000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Merluzzo'), 200, 2),
  ('e7400000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Verdura mista'), 200, 3),
  ('e7400000-0000-0000-0000-000000000000', (SELECT id FROM public.foods WHERE name = 'Olio'), 10, 4);


-- ============================================================================
-- SEZIONE 4 — body_measurements: nuovi campi + nuova misurazione (08/07/2026)
-- ============================================================================

-- 4a. Colonne additive, coerenti con lo stile delle altre colonne _cm già
--     presenti (nullable, NUMERIC).
ALTER TABLE public.body_measurements
  ADD COLUMN IF NOT EXISTS addome_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS somma_pliche_mm NUMERIC;

-- 4b. Nuova rilevazione. La "coscia" è stata misurata come "radice coscia":
--     punto di repere potenzialmente diverso dalle misurazioni storiche,
--     annotato esplicitamente in `notes` per non falsare i confronti storici
--     in UI.
INSERT INTO public.body_measurements (
  user_id, measured_at, weight, height_cm,
  vita_cm, addome_cm, braccio_front_cm, coscia_cm,
  body_fat, somma_pliche_mm, notes
) VALUES (
  '22c6f260-95c5-4600-83d9-60e4347b7ced', '2026-07-08', 71.7, 182,
  76, 82, 34.2, 55,
  9.4, 60.5,
  'Coscia misurata come "radice coscia": punto di repere potenzialmente diverso dalle misurazioni precedenti.'
);
