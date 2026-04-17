-- Rimuove colonne non necessarie da body_measurements
-- Mantiene solo le misure utilizzate negli step della app

ALTER TABLE public.body_measurements
DROP COLUMN IF EXISTS testata_cm,
DROP COLUMN IF EXISTS braccio_retro_cm,
DROP COLUMN IF EXISTS vita_retro_cm,
DROP COLUMN IF EXISTS fianchi_retro_cm,
DROP COLUMN IF EXISTS coscia_retro_cm,
DROP COLUMN IF EXISTS polpaccio_retro_cm,
DROP COLUMN IF EXISTS body_fat;
