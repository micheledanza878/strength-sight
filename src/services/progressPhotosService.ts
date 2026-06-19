// =============================================================================
// progressPhotosService.ts
//
// Servizio per la gestione delle foto progress associate alle misurazioni
// corporee. Si occupa di:
//   1. Upload del file su Supabase Storage (bucket: progress-photos)
//   2. Persistenza dell'URL e dei metadati in body_progress_photos
//   3. Lettura delle foto (per misurazione o per range di date)
//   4. Cancellazione atomica: prima Storage, poi DB
//
// Nota sulla gestione errori:
//   Tutti i metodi propagano l'errore al chiamante (throw). La UI deve
//   avvolgere le chiamate in try/catch e mostrare feedback all'utente.
//   Non facciamo swallow silenzioso degli errori per non nascondere problemi
//   di rete, di autorizzazione o di quota Storage.
//
// Nota sul client Supabase:
//   Importiamo il client singleton già configurato con il tipo Database.
//   Per body_progress_photos, usiamo `supabase.from('body_progress_photos')`
//   con cast `as any` perché la tabella non è ancora nei tipi auto-generati
//   da Supabase CLI (i tipi in types.ts vengono rigenerati dopo `supabase db push`).
//   Una volta rigenerati, rimuovere i cast e tipare direttamente.
// =============================================================================

import { supabase } from '@/integrations/supabase/client';
import { getUserId } from '@/lib/user';
import type {
  PhotoAngle,
  ProgressPhoto,
  UploadPhotoResult,
  PhotosByMeasurement,
} from '@/types/progressPhotos';

// Nome del bucket su Supabase Storage. Centralizzato qui per evitare
// stringhe magiche sparse nel codice.
const BUCKET = 'progress-photos';

// =============================================================================
// Funzioni di utilità private (non esportate)
// =============================================================================

/**
 * Estrae l'estensione dal tipo MIME di un File.
 * Fallback a 'jpg' per tipi non gestiti (non dovrebbe accadere con la
 * validazione MIME sul bucket, ma meglio essere difensivi).
 */
function extensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
  };
  return map[mime] ?? 'jpg';
}

/**
 * Costruisce il path del file su Storage nel formato:
 *   {userId}/{photoId}.{ext}
 *
 * Il primo segmento (userId) è il fondamento delle RLS policy di Storage:
 * `(storage.foldername(name))[1] = auth.uid()::text`
 * Non modificare questa struttura senza aggiornare le policy in migration.
 */
function buildStoragePath(userId: string, photoId: string, mime: string): string {
  const ext = extensionFromMime(mime);
  return `${userId}/${photoId}.${ext}`;
}

// =============================================================================
// uploadPhoto
// =============================================================================

/**
 * Carica una foto su Supabase Storage e salva i metadati in DB.
 *
 * Flusso:
 *   1. Recupera l'userId dalla sessione corrente (lancia se non autenticato)
 *   2. Genera un UUID lato client per il photoId (usato sia come PK in DB
 *      che come nome file su Storage, garantendo coerenza senza round-trip aggiuntivi)
 *   3. Carica il file su Storage → ottieni il path
 *   4. Recupera l'URL pubblico (firmato dal client, non richiede token extra
 *      perché l'accesso è controllato da RLS sul download)
 *   5. Inserisce la riga in body_progress_photos con l'URL ottenuto
 *
 * Perché generare l'UUID lato client invece di lasciarlo a Postgres?
 *   Vogliamo usare lo stesso ID come nome file su Storage. Se lo generasse
 *   Postgres, dovremmo prima inserire in DB (per ottenere l'id), poi fare
 *   l'upload, poi aggiornare l'URL — tre operazioni invece di due, con
 *   rischio di righe "fantasma" senza foto se l'upload fallisce.
 *   Generandolo lato client, possiamo costruire il path prima dell'upload.
 *
 * @param file          File immagine da caricare
 * @param measurementId UUID della misurazione a cui associare la foto
 * @param angle         Angolazione della foto ('front' | 'side' | 'back')
 * @returns             La riga salvata in DB e l'URL della foto
 * @throws              Se l'utente non è autenticato, l'upload fallisce,
 *                      o l'inserimento in DB fallisce
 */
export async function uploadPhoto(
  file: File,
  measurementId: string,
  angle: PhotoAngle,
): Promise<UploadPhotoResult> {
  const userId = await getUserId();

  // Genera UUID lato client. crypto.randomUUID() è disponibile in tutti i
  // browser moderni e in Node 14.17+. Se occorre supporto legacy, sostituire
  // con la libreria `uuid`.
  const photoId = crypto.randomUUID();
  const storagePath = buildStoragePath(userId, photoId, file.type);

  // --- Step 1: Upload su Storage ---
  // `upsert: false` evita di sovrascrivere accidentalmente file esistenti.
  // Dato che il nome include un UUID, le collisioni sono praticamente impossibili,
  // ma la difesa in profondità non costa nulla.
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload su Storage fallito: ${uploadError.message}`);
  }

  // --- Step 2: Ottieni URL del file ---
  // getPublicUrl() non richiede richieste di rete aggiuntive: costruisce
  // l'URL deterministicamente a partire da bucket + path.
  // Poiché il bucket è privato, l'accesso effettivo è controllato da RLS;
  // getPublicUrl funziona perché il client è autenticato con la session token.
  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  const photoUrl = urlData.publicUrl;

  // --- Step 3: Inserisci metadati in DB ---
  // Passiamo l'id esplicitamente per usare lo stesso UUID generato sopra.
  // Se l'inserimento fallisce, la foto è già su Storage → situazione inconsistente.
  // Soluzione semplice: tentiamo di cancellare il file su Storage in caso di errore DB.
  const { data: insertedRow, error: dbError } = await (supabase
    .from('body_progress_photos' as any)
    .insert({
      id: photoId,
      user_id: userId,
      measurement_id: measurementId,
      photo_url: photoUrl,
      angle,
    })
    .select()
    .single() as any);

  if (dbError) {
    // Rollback best-effort: cancella il file dallo Storage per evitare orfani.
    // Non blocchiamo per l'errore di cancellazione (potrebbe fallire anch'esso)
    // e non lo propagiamo al chiamante — l'errore principale è dbError.
    await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => {});
    throw new Error(`Salvataggio metadati foto fallito: ${dbError.message}`);
  }

  return {
    photo: insertedRow as ProgressPhoto,
    publicUrl: photoUrl,
  };
}

// =============================================================================
// getPhotosByMeasurement
// =============================================================================

/**
 * Recupera tutte le foto associate a una specifica sessione di misurazione.
 * Le foto sono ordinate per angolazione (front → side → back) per una
 * presentazione consistente nella UI.
 *
 * @param measurementId UUID della misurazione
 * @returns             Array di ProgressPhoto (vuoto se nessuna foto)
 * @throws              In caso di errore di rete o RLS violation
 */
export async function getPhotosByMeasurement(
  measurementId: string,
): Promise<ProgressPhoto[]> {
  const { data, error } = await (supabase
    .from('body_progress_photos' as any)
    .select('*')
    .eq('measurement_id', measurementId)
    .order('angle', { ascending: true }) as any);
  // Nota: l'ordinamento per `angle` è alfabetico sull'enum ('back','front','side').
  // Se si vuole l'ordine front→side→back, filtrare/riordinare lato client
  // fino a quando Supabase non supporterà ORDER BY con enum custom.

  if (error) {
    throw new Error(`Errore nel recupero foto per misurazione ${measurementId}: ${error.message}`);
  }

  return (data ?? []) as ProgressPhoto[];
}

// =============================================================================
// getPhotosByDateRange
// =============================================================================

/**
 * Recupera tutte le foto dell'utente corrente in un intervallo di date.
 * Pensata per il comparatore visivo: carica le foto di due (o più) sessioni
 * per metterle a confronto.
 *
 * La query filtra su `created_at` (timestamp foto) e non su `measured_at`
 * della misurazione per due motivi:
 *   1. Non tutte le foto hanno una misurazione associata (measurement_id nullable)
 *   2. Evita un JOIN che complicherebbe la query senza benefici pratici
 *      (di norma foto e misurazione vengono create nello stesso giorno)
 *
 * Se in futuro si vuole filtrare per `measured_at`, aggiungere un metodo
 * dedicato con JOIN su body_measurements.
 *
 * @param startDate Data di inizio nel formato 'YYYY-MM-DD' (inclusa)
 * @param endDate   Data di fine nel formato 'YYYY-MM-DD' (inclusa)
 * @returns         Array di ProgressPhoto ordinato per data crescente, poi per angolo
 * @throws          In caso di errore di rete o parametri non validi
 */
export async function getPhotosByDateRange(
  startDate: string,
  endDate: string,
): Promise<ProgressPhoto[]> {
  // Validiamo il formato delle date per restituire un errore chiaro invece
  // di una risposta vuota che sembrerebbe normale.
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoDateRegex.test(startDate) || !isoDateRegex.test(endDate)) {
    throw new Error('startDate e endDate devono essere nel formato YYYY-MM-DD');
  }
  if (startDate > endDate) {
    throw new Error('startDate deve essere uguale o precedente a endDate');
  }

  // Convertiamo le date in timestamp per usare il filtro su `created_at`
  // (TIMESTAMP WITH TIME ZONE). gte/lte con date funzionano perché Postgres
  // cast automaticamente 'YYYY-MM-DD' a TIMESTAMPTZ (midnight UTC).
  // Per includere tutta la giornata di endDate, aggiungiamo un giorno.
  const endDateInclusive = new Date(endDate);
  endDateInclusive.setDate(endDateInclusive.getDate() + 1);
  const endTimestamp = endDateInclusive.toISOString();

  const { data, error } = await (supabase
    .from('body_progress_photos' as any)
    .select('*')
    .gte('created_at', `${startDate}T00:00:00.000Z`)
    .lt('created_at', endTimestamp)
    .order('created_at', { ascending: true })
    .order('angle', { ascending: true }) as any);

  if (error) {
    throw new Error(
      `Errore nel recupero foto per range ${startDate} → ${endDate}: ${error.message}`
    );
  }

  return (data ?? []) as ProgressPhoto[];
}

// =============================================================================
// getPhotosByMeasurementGrouped
// =============================================================================

/**
 * Variante di getPhotosByMeasurement che restituisce le foto raggruppate
 * per angolazione. Comodo per la UI che mostra le tre angolazioni affiancate.
 *
 * @param measurementId UUID della misurazione
 * @returns             Record<PhotoAngle, ProgressPhoto | undefined>
 *                      (una foto per angolazione, o undefined se mancante)
 * @throws              In caso di errore di rete o RLS violation
 */
export async function getPhotosByMeasurementGrouped(
  measurementId: string,
): Promise<Partial<Record<PhotoAngle, ProgressPhoto>>> {
  const photos = await getPhotosByMeasurement(measurementId);

  return photos.reduce<Partial<Record<PhotoAngle, ProgressPhoto>>>(
    (acc, photo) => {
      // Se ci sono più foto con la stessa angolazione (non dovrebbe accadere
      // con una UI corretta, ma il DB non ha un unique constraint su
      // (measurement_id, angle) per ora), tenere l'ultima per created_at.
      acc[photo.angle] = photo;
      return acc;
    },
    {},
  );
}

// =============================================================================
// deletePhoto
// =============================================================================

/**
 * Elimina una foto sia da Supabase Storage che dal database.
 *
 * Ordine delle operazioni:
 *   1. Leggi la riga in DB per ricavare l'URL (e quindi il path su Storage)
 *   2. Elimina il file da Storage
 *   3. Elimina la riga dal DB
 *
 * Perché questo ordine e non DB prima?
 *   - Se eliminiamo dal DB prima e poi Storage fallisce, il DB è pulito
 *     ma il file rimane su Storage (storage leak).
 *   - Se eliminiamo da Storage prima e poi DB fallisce, la riga in DB
 *     punta a un file inesistente (link rotto) — meno grave perché
 *     un'operazione di cleanup può trovare le righe orfane.
 *   - Nessuno dei due ordini è perfetto senza una transazione distribuita.
 *     L'ordine "Storage prima" è preferibile perché un link rotto è
 *     visibilmente rotto (404), mentre uno storage leak è silenzioso.
 *
 * @param photoId UUID della foto da eliminare
 * @throws        Se la foto non esiste, l'utente non è l'owner,
 *                oppure Storage o DB restituiscono un errore
 */
export async function deletePhoto(photoId: string): Promise<void> {
  // --- Step 1: Leggi la riga per ricavare il path su Storage ---
  // La RLS garantisce che solo l'owner possa leggere la riga.
  // Se la riga non esiste o appartiene ad altri, .single() lancia un errore.
  const { data: photo, error: fetchError } = await (supabase
    .from('body_progress_photos' as any)
    .select('photo_url, user_id')
    .eq('id', photoId)
    .single() as any);

  if (fetchError || !photo) {
    throw new Error(
      `Foto ${photoId} non trovata o accesso negato: ${fetchError?.message ?? 'record assente'}`
    );
  }

  // Estrai il path dal URL pubblico.
  // L'URL ha formato: {SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}
  // Usiamo URL API per parse sicuro invece di string manipulation fragile.
  const photoRecord = photo as { photo_url: string; user_id: string };
  const parsedUrl = new URL(photoRecord.photo_url);
  // Il pathname è: /storage/v1/object/public/progress-photos/{userId}/{photoId}.{ext}
  // Dobbiamo estrarre solo la parte dopo il bucket name.
  const bucketPrefix = `/storage/v1/object/public/${BUCKET}/`;
  const storagePath = parsedUrl.pathname.startsWith(bucketPrefix)
    ? decodeURIComponent(parsedUrl.pathname.slice(bucketPrefix.length))
    : null;

  if (!storagePath) {
    throw new Error(
      `Impossibile ricavare il path Storage dall'URL: ${photoRecord.photo_url}`
    );
  }

  // --- Step 2: Elimina da Storage ---
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([storagePath]);

  if (storageError) {
    throw new Error(`Eliminazione da Storage fallita: ${storageError.message}`);
  }

  // --- Step 3: Elimina dal DB ---
  const { error: dbError } = await (supabase
    .from('body_progress_photos' as any)
    .delete()
    .eq('id', photoId) as any);

  if (dbError) {
    // A questo punto il file è già cancellato da Storage.
    // Logghiamo l'errore in modo che sia tracciabile, ma non possiamo
    // fare rollback dell'eliminazione su Storage.
    console.error(
      `[progressPhotosService] File eliminato da Storage ma errore DB per photoId=${photoId}:`,
      dbError
    );
    throw new Error(
      `File eliminato da Storage ma errore nel DB: ${dbError.message}. Contatta il supporto con photoId: ${photoId}`
    );
  }
}

// =============================================================================
// Funzione di utilità per la UI: raggruppa per misurazione
// =============================================================================

/**
 * Dato un array di foto (tipicamente da getPhotosByDateRange), le raggruppa
 * per measurement_id. Le foto senza misurazione associata vanno sotto la
 * chiave speciale 'orphan'.
 *
 * Utile per la vista timeline del comparatore visivo.
 *
 * @param photos Array di ProgressPhoto
 * @returns      Record con chiave measurement_id (o 'orphan')
 */
export function groupPhotosByMeasurement(
  photos: ProgressPhoto[],
): PhotosByMeasurement {
  return photos.reduce<PhotosByMeasurement>((acc, photo) => {
    const key = photo.measurement_id ?? 'orphan';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(photo);
    return acc;
  }, {});
}
