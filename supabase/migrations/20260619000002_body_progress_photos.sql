-- =============================================================================
-- Aggiunta tabella body_progress_photos e storage bucket progress-photos
--
-- Contesto:
--   La sezione BodyTracking traccia misurazioni corporee in body_measurements.
--   Questa migration aggiunge il supporto per foto progress associate a ogni
--   sessione di misurazione, con tre angolazioni standard (front/side/back).
--
-- Scelte progettuali:
--   - measurement_id è NULLABLE con ON DELETE SET NULL: se una misurazione
--     viene cancellata, la foto non viene persa ma diventa "orfana" recuperabile.
--     Cambia in ON DELETE CASCADE se vuoi comportamento opposto.
--   - user_id è ridondante (ricavabile da measurement_id) ma necessario per
--     applicare RLS direttamente sulla tabella senza subquery costose e per
--     supportare foto senza misurazione associata in futuro.
--   - L'enum `photo_angle` è un tipo dominio esplicito, più sicuro di un TEXT
--     con CHECK, e permette di aggiungere angolazioni future con ALTER TYPE.
--   - I path su Storage seguono la struttura: {user_id}/{photo_id}.{ext}
--     in modo che le RLS di Storage si basino sul primo segmento del path.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- SEZIONE 1: Tipo enum per le angolazioni fotografiche
-- -----------------------------------------------------------------------------

-- Usiamo CREATE TYPE ... IF NOT EXISTS (Postgres 14+).
-- Se il progetto gira su versioni precedenti, rimuovere il DO$$ block e
-- usare direttamente CREATE TYPE (andrà in errore se già esiste).
DO $$ BEGIN
  CREATE TYPE public.photo_angle AS ENUM ('front', 'side', 'back');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;


-- -----------------------------------------------------------------------------
-- SEZIONE 2: Tabella body_progress_photos
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.body_progress_photos (
  -- Chiave primaria UUID generata automaticamente, usata anche come nome file
  -- su Storage (garantisce unicità globale senza coordinamento client-side).
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Proprietario della foto. NOT NULL e con cascade per allineamento con
  -- tutte le altre tabelle user-owned del progetto.
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Riferimento opzionale alla sessione di misurazione. SET NULL invece di
  -- CASCADE preserva le foto anche se la misurazione viene cancellata;
  -- utile per comparatori visivi storici che mostrano solo le foto.
  measurement_id UUID REFERENCES public.body_measurements(id) ON DELETE SET NULL,

  -- URL pubblico o firmato della foto su Supabase Storage.
  -- Archiviamo l'URL completo per semplicità di lettura lato client.
  -- Se in futuro si cambia bucket o CDN, una migration di aggiornamento
  -- massivo è più chiara di una ricostruzione dinamica dell'URL.
  photo_url TEXT NOT NULL,

  -- Angolazione della foto. Il tipo enum garantisce che solo valori validi
  -- vengano inseriti a livello database, indipendentemente dalla validazione
  -- applicativa.
  angle public.photo_angle NOT NULL,

  -- Timestamp di creazione. Non aggiunta updated_at: le foto non vengono
  -- modificate (solo caricate ed eventualmente cancellate).
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);


-- -----------------------------------------------------------------------------
-- SEZIONE 3: Indici
--
-- Strategia: creiamo indici sulle query più frequenti identificate dai metodi
-- del servizio progressPhotosService.ts.
-- -----------------------------------------------------------------------------

-- getPhotosByMeasurement: filtra per measurement_id (FK nullable)
CREATE INDEX IF NOT EXISTS idx_body_progress_photos_measurement
  ON public.body_progress_photos(measurement_id)
  WHERE measurement_id IS NOT NULL;

-- getPhotosByDateRange: filtra per user_id + created_at in un range.
-- L'ordine (user_id, created_at) permette a Postgres di usare l'indice
-- sia per la clausola WHERE che per ORDER BY senza sort aggiuntivo.
CREATE INDEX IF NOT EXISTS idx_body_progress_photos_user_date
  ON public.body_progress_photos(user_id, created_at DESC);

-- Indice parziale per angle: utile se si vuole filtrare per angolazione
-- (es. mostrare solo le foto frontali nel comparatore visivo).
CREATE INDEX IF NOT EXISTS idx_body_progress_photos_user_angle
  ON public.body_progress_photos(user_id, angle);


-- -----------------------------------------------------------------------------
-- SEZIONE 4: Row Level Security sulla tabella
--
-- Pattern: policy granulari per operazione, coerenti con il resto del progetto
-- (vedi 20260619000000_fix_rls_child_tables.sql).
-- Ogni policy usa auth.uid() = user_id, consentendo solo all'owner di
-- operare sui propri record.
-- -----------------------------------------------------------------------------

ALTER TABLE public.body_progress_photos ENABLE ROW LEVEL SECURITY;

-- SELECT: l'utente vede solo le proprie foto
CREATE POLICY "progress_photos_select_owner"
  ON public.body_progress_photos
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: l'utente può inserire solo foto a proprio nome.
-- WITH CHECK su user_id impedisce di inserire righe con user_id altrui,
-- anche se il client inviasse un valore diverso nel payload.
CREATE POLICY "progress_photos_insert_owner"
  ON public.body_progress_photos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: non previsto nel servizio iniziale (le foto non si modificano),
-- ma la policy è inclusa per completezza e per non lasciare gap di sicurezza
-- nel caso venga aggiunta una funzionalità di ricollegamento a measurement_id.
CREATE POLICY "progress_photos_update_owner"
  ON public.body_progress_photos
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: l'utente può eliminare solo le proprie foto
CREATE POLICY "progress_photos_delete_owner"
  ON public.body_progress_photos
  FOR DELETE
  USING (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- SEZIONE 5: Storage bucket e policy
--
-- IMPORTANTE: Le istruzioni INSERT in storage.buckets e storage.objects
-- richiedono il ruolo `service_role`. Supabase le esegue automaticamente
-- nelle migration tramite `supabase db push` (che usa service_role).
-- Se si applica manualmente tramite psql con un ruolo utente, queste
-- istruzioni falliranno. In quel caso, creare il bucket dalla Dashboard
-- Supabase (Storage → New bucket) e applicare le policy manualmente.
--
-- Struttura path file: {user_id}/{photo_id}.{ext}
-- Questa struttura è fondamentale per le RLS di Storage, che usano
-- (storage.foldername(name))[1] per estrarre lo user_id dal path
-- e confrontarlo con auth.uid().
-- -----------------------------------------------------------------------------

-- Crea il bucket se non esiste già.
-- public = false: i file non sono accessibili senza autenticazione.
-- file_size_limit = 10 MB: ragionevole per foto progress compresse lato client.
-- allowed_mime_types: accettiamo solo immagini.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'progress-photos',
  'progress-photos',
  false,
  10485760, -- 10 MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
-- Nota: ON CONFLICT aggiorna i limiti se il bucket esiste già, rendendo
-- la migration idempotente senza toccare public (che potrebbe essere stato
-- cambiato intenzionalmente via Dashboard).


-- Policy Storage: SELECT (download)
-- L'utente può scaricare solo file nella propria cartella ({user_id}/...).
-- (storage.foldername(name))[1] estrae il primo segmento del path.
CREATE POLICY "progress_photos_storage_select_owner"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- Policy Storage: INSERT (upload)
-- WITH CHECK garantisce che il client non possa caricare file in cartelle
-- altrui modificando il path nella richiesta.
CREATE POLICY "progress_photos_storage_insert_owner"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'progress-photos'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- Policy Storage: UPDATE
-- Necessaria se si vuole sovrascrivere un file esistente con upsert=true.
-- Il pattern doppio USING + WITH CHECK impedisce il "move" di file tra
-- cartelle di utenti diversi.
CREATE POLICY "progress_photos_storage_update_owner"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'progress-photos'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- Policy Storage: DELETE
-- L'utente può eliminare solo i file nella propria cartella.
CREATE POLICY "progress_photos_storage_delete_owner"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );
