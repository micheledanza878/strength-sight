-- Aggiungi i campi mancanti a body_measurements
ALTER TABLE public.body_measurements
ADD COLUMN IF NOT EXISTS height_cm numeric,
ADD COLUMN IF NOT EXISTS collo_cm numeric,
ADD COLUMN IF NOT EXISTS braccio_front_cm numeric,
ADD COLUMN IF NOT EXISTS avambraccio_cm numeric,
ADD COLUMN IF NOT EXISTS petto_torace_cm numeric,
ADD COLUMN IF NOT EXISTS vita_cm numeric,
ADD COLUMN IF NOT EXISTS fianchi_cm numeric,
ADD COLUMN IF NOT EXISTS schiena_altezza_dorsali_cm numeric,
ADD COLUMN IF NOT EXISTS spalle_ampiezza_cm numeric,
ADD COLUMN IF NOT EXISTS glutei_circonferenza_cm numeric,
ADD COLUMN IF NOT EXISTS coscia_cm numeric,
ADD COLUMN IF NOT EXISTS polpaccio_cm numeric,
ADD COLUMN IF NOT EXISTS notes text;

-- Commento: I campi old (arms, legs, body_fat, waist) sono mantenuti per compatibilità
