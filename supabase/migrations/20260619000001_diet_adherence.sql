-- Diet Adherence Tracking
-- Traccia i pasti effettivamente consumati dall'utente rispetto al piano settimanale.
--
-- Modello: un log per ogni pasto consumato in un giorno specifico.
-- Ogni riga rappresenta un evento "ho mangiato questo pasto in questa data".
-- I macronutrienti sono pre-calcolati al momento del salvataggio per evitare
-- ricalcoli e per conservare lo storico anche se il piano cambia in seguito.

CREATE TABLE diet_daily_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Proprietario del log. Referenzia auth.users per integrità referenziale
  -- e per applicare RLS in modo diretto (senza join su tabelle intermedie).
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Data del giorno a cui si riferisce il pasto consumato.
  -- Tipo DATE (senza fuso orario): la data è sempre quella locale dell'utente,
  -- non un timestamp assoluto. Il fuso orario è responsabilità del client.
  log_date       DATE        NOT NULL,

  -- Tipo di pasto: 'colazione', 'pranzo', 'cena' — allineato ai valori
  -- usati in diet_meals.meal_type. Vincolo CHECK per impedire valori arbitrari.
  meal_type      VARCHAR(50) NOT NULL CHECK (meal_type IN ('colazione', 'pranzo', 'cena')),

  -- Snapshot degli alimenti consumati al momento del log.
  -- Struttura attesa per ogni elemento dell'array JSON:
  -- {
  --   "food_id": "uuid",
  --   "name": "string",         -- snapshot del nome (il DB foods può cambiare)
  --   "portion_g": 150.0,       -- grammi effettivamente consumati
  --   "calories": 210,
  --   "protein_g": 30.5,        -- opzionale, se disponibile
  --   "carbs_g": 5.0,           -- opzionale
  --   "fats_g": 8.0             -- opzionale
  -- }
  -- Salviamo uno snapshot invece di un FK perché:
  -- 1. Il piano può essere aggiornato in futuro e i log storici devono restare corretti
  -- 2. L'utente potrebbe loggare porzioni diverse da quelle pianificate
  foods_eaten    JSONB       NOT NULL DEFAULT '[]'::jsonb,

  -- Totali calcolati al momento del salvataggio (denormalizzazione intenzionale).
  -- Evitano aggregazioni su foods_eaten a ogni lettura, rendendo le query
  -- di riepilogo settimanale/mensile molto più veloci.
  -- NULL ammesso: l'utente potrebbe loggare un pasto senza dati nutrizionali completi.
  total_kcal     DECIMAL(8,2),
  total_protein  DECIMAL(8,2),
  total_carbs    DECIMAL(8,2),
  total_fats     DECIMAL(8,2),

  -- Note libere opzionali (es. "ho sostituito il pollo con il tonno")
  notes          TEXT,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Un utente può loggare al massimo una volta per giorno + tipo pasto.
  -- Se vuole aggiornare un log esistente usa UPDATE (upsert lato servizio).
  UNIQUE (user_id, log_date, meal_type)
);

-- Indice primario per accessi tipici: "dammi tutti i log dell'utente X per la data Y"
CREATE INDEX idx_diet_daily_logs_user_date
  ON diet_daily_logs (user_id, log_date);

-- Indice aggiuntivo per query di riepilogo su intervalli di date
-- (es. aderenza settimanale: WHERE user_id = ? AND log_date BETWEEN ? AND ?)
CREATE INDEX idx_diet_daily_logs_user_date_range
  ON diet_daily_logs (user_id, log_date DESC);

-- Trigger per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_diet_daily_logs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_diet_daily_logs_updated_at
  BEFORE UPDATE ON diet_daily_logs
  FOR EACH ROW EXECUTE FUNCTION update_diet_daily_logs_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE diet_daily_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: l'utente vede solo i propri log.
-- Il check su user_id = auth.uid() è diretto (senza join), efficiente
-- e sfrutta l'indice idx_diet_daily_logs_user_date.
CREATE POLICY "diet_daily_logs_select_own"
  ON diet_daily_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: l'utente può creare solo log con il proprio user_id.
-- WITH CHECK impedisce di inserire righe con user_id altrui.
CREATE POLICY "diet_daily_logs_insert_own"
  ON diet_daily_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: l'utente può modificare solo i propri log.
-- USING filtra le righe candidate; WITH CHECK protegge da riassegnazioni
-- fraudolente del user_id durante l'update.
CREATE POLICY "diet_daily_logs_update_own"
  ON diet_daily_logs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: l'utente può eliminare solo i propri log.
CREATE POLICY "diet_daily_logs_delete_own"
  ON diet_daily_logs
  FOR DELETE
  USING (auth.uid() = user_id);
