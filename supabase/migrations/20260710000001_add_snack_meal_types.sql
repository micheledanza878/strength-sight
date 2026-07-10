-- ============================================================================
-- Aggiunge i due spuntini ai valori di meal_type ammessi.
--
-- Contesto: la tabella diet_meals.meal_type è un semplice VARCHAR senza CHECK,
-- quindi accetta già gli spuntini. La tabella diet_daily_logs invece ha un
-- vincolo CHECK che limitava i valori a ('colazione', 'pranzo', 'cena') e
-- avrebbe rifiutato il log di aderenza per gli spuntini.
--
-- Nuovi valori:
--   'spuntino_mattutino'    -> tra colazione e pranzo
--   'spuntino_pomeridiano'  -> tra pranzo e cena
-- ============================================================================

ALTER TABLE diet_daily_logs
  DROP CONSTRAINT IF EXISTS diet_daily_logs_meal_type_check;

ALTER TABLE diet_daily_logs
  ADD CONSTRAINT diet_daily_logs_meal_type_check
  CHECK (meal_type IN (
    'colazione',
    'spuntino_mattutino',
    'pranzo',
    'spuntino_pomeridiano',
    'cena'
  ));
