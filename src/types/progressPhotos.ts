// =============================================================================
// Tipi TypeScript per body_progress_photos
// =============================================================================

/**
 * Le tre angolazioni standard per le foto progress.
 * Specchiato dall'enum `photo_angle` definito in Postgres:
 * se si aggiunge un valore all'enum DB, va aggiornato anche qui.
 */
export type PhotoAngle = 'front' | 'side' | 'back';

/**
 * Rappresentazione di una riga in `body_progress_photos` come restituita
 * dalle query Supabase. Tutti i campi corrispondono 1:1 alle colonne della
 * tabella; nessuna trasformazione di naming perché il progetto usa snake_case
 * in modo coerente (vedi Measurement in BodyTracking.tsx).
 */
export interface ProgressPhoto {
  id: string;
  user_id: string;
  measurement_id: string | null;
  photo_url: string;
  angle: PhotoAngle;
  created_at: string;
}

/**
 * Payload per caricare una nuova foto.
 * Separato da ProgressPhoto perché al momento dell'upload
 * id, user_id e created_at non sono ancora noti al client.
 */
export interface UploadPhotoPayload {
  file: File;
  measurementId: string;
  angle: PhotoAngle;
}

/**
 * Risposta dell'operazione di upload: include la riga salvata in DB
 * e l'URL finale da usare nel componente UI.
 */
export interface UploadPhotoResult {
  photo: ProgressPhoto;
  publicUrl: string;
}

/**
 * Parametri per la query getPhotosByDateRange, usata dal comparatore visivo.
 * Le date sono stringhe ISO 8601 (YYYY-MM-DD) per semplicità di serializzazione.
 */
export interface PhotoDateRangeParams {
  startDate: string; // es. "2026-01-01"
  endDate: string;   // es. "2026-06-19"
}

/**
 * Raggruppamento di foto per misurazione, utile per la vista timeline.
 * La chiave è measurement_id (o 'orphan' per foto senza misurazione associata).
 */
export type PhotosByMeasurement = Record<string, ProgressPhoto[]>;
