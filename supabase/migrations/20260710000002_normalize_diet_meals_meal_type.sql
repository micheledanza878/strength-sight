-- ============================================================================
-- Normalizza diet_meals.meal_type a minuscolo + aggiunge CHECK constraint.
--
-- Contesto: diet_meals.meal_type è VARCHAR senza CHECK (a differenza di
-- diet_daily_logs.meal_type, che ce l'ha già). Questo ha permesso
-- l'inserimento di valori in MAIUSCOLO (COLAZIONE/PRANZO/CENA) nei 21 pasti
-- del piano esistente. Il frontend confronta meal_type con === contro i
-- valori minuscoli attesi (colazione/pranzo/cena/spuntino_mattutino/
-- spuntino_pomeridiano), quindi il confronto falliva sempre e ogni slot
-- risultava vuoto in UI nonostante gli alimenti fossero correttamente
-- collegati in diet_meal_foods.
-- ============================================================================

UPDATE diet_meals
SET meal_type = lower(meal_type)
WHERE meal_type <> lower(meal_type);

ALTER TABLE diet_meals
  ADD CONSTRAINT diet_meals_meal_type_check
  CHECK (meal_type IN (
    'colazione',
    'spuntino_mattutino',
    'pranzo',
    'spuntino_pomeridiano',
    'cena'
  ));
