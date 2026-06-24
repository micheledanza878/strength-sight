-- Cache AI-generated info for exercises
-- Tabella di cache condivisa tra tutti gli utenti: le informazioni tecniche
-- su un esercizio (tecnica, muscoli, varianti, consigli) vengono generate
-- una sola volta dall'edge function con service role e poi riutilizzate
-- da qualsiasi utente che richieda lo stesso esercizio.
--
-- La chiave di lookup è normalized_name = lower(trim(exercise_name)),
-- che garantisce unicità indipendentemente da maiuscole/minuscole e spazi.
--
-- Scritture: solo l'edge function con service role key (bypassa RLS).
-- Letture: qualsiasi utente autenticato.

CREATE TABLE public.exercise_ai_info (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Nome originale dell'esercizio così come fornito dal client.
  -- Conservato per display, ma non usato come chiave di lookup.
  exercise_name        TEXT        NOT NULL,

  -- Chiave di lookup normalizzata: lower(trim(exercise_name)).
  -- UNIQUE garantisce che non esistano duplicati per lo stesso esercizio
  -- indipendentemente da capitalizzazione o spazi ridondanti.
  normalized_name      TEXT        NOT NULL UNIQUE,

  -- Descrizione della tecnica di esecuzione (testo libero generato dall'AI).
  technique            TEXT,

  -- Muscoli primari coinvolti nell'esercizio (array di stringhe).
  primary_muscles      TEXT[],

  -- Muscoli secondari o sinergici (array di stringhe).
  secondary_muscles    TEXT[],

  -- Varianti comuni dell'esercizio (array di stringhe).
  variations           TEXT[],

  -- Consigli pratici per l'esecuzione sicura ed efficace (array di stringhe).
  tips                 TEXT[],

  -- Percentuale del peso corporeo usata come carico (es. 0.65 = 65%).
  -- NUMERIC(4,2): max 99.99, due decimali — sufficiente per valori percentuali.
  -- NULL se l'esercizio non è a corpo libero o il dato non è disponibile.
  bodyweight_percentage NUMERIC(4,2),

  -- Flag che indica se l'esercizio è a corpo libero (bodyweight).
  -- DEFAULT false: la maggior parte degli esercizi usa attrezzi.
  is_bodyweight        BOOLEAN     DEFAULT false,

  -- URL YouTube di un video dimostrativo.
  youtube_url          TEXT,

  -- ID del video YouTube estratto dall'URL (es. "dQw4w9WgXcQ").
  -- Separato per permettere embed diretti senza parsing lato client.
  youtube_video_id     TEXT,

  -- Identificatore del modello AI usato per generare le informazioni
  -- (es. "gemini-1.5-flash"). Utile per audit e re-generazione selettiva.
  model_used           TEXT,

  -- Timestamp di generazione. DEFAULT now() impostato al momento dell'INSERT
  -- dall'edge function. Usato per invalidare la cache in futuro se necessario.
  generated_at         TIMESTAMPTZ DEFAULT now()
);

-- Indice sull'unica chiave di lookup usata in produzione.
-- Tutte le query su questa tabella partono da normalized_name
-- (es. WHERE normalized_name = lower(trim($1))).
-- L'indice UNIQUE su normalized_name già crea un indice B-tree implicito,
-- ma lo dichiariamo esplicitamente con nome significativo per chiarezza
-- e per facilitare il monitoring nei piani di esecuzione.
CREATE INDEX idx_exercise_ai_info_normalized ON public.exercise_ai_info(normalized_name);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.exercise_ai_info ENABLE ROW LEVEL SECURITY;

-- SELECT: qualsiasi utente autenticato può leggere la cache.
-- Non c'è filtro per user_id perché exercise_ai_info è contenuto condiviso:
-- le informazioni su un esercizio sono uguali per tutti gli utenti.
-- USING (true) significa "nessun filtro aggiuntivo sulle righe".
CREATE POLICY "exercise_ai_info_select_authenticated"
  ON public.exercise_ai_info
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT e UPDATE: nessuna policy per il ruolo authenticated.
-- Le scritture avvengono esclusivamente dall'edge function tramite
-- service role key, che bypassa RLS automaticamente in Supabase.
-- Non creare policy INSERT/UPDATE per authenticated è la scelta corretta:
-- RLS abilitato + nessuna policy corrispondente = accesso negato per default.
