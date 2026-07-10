/**
 * dietAdherenceService.ts
 *
 * Gestisce il tracking dell'aderenza al piano alimentare:
 * - Salvataggio dei pasti consumati (upsert su diet_daily_logs)
 * - Recupero dei log per una data specifica
 * - Calcolo dell'aderenza settimanale rispetto al piano
 *
 * Database target: PostgreSQL via Supabase.
 * Tabelle coinvolte: diet_daily_logs, diet_weekly_plans, diet_meals.
 * RLS attiva: tutte le operazioni rispettano l'utente autenticato.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import {
  DietDailyLog,
  LoggedFoodItem,
  SaveDietLogPayload,
  DayAdherence,
  WeekAdherence,
} from '@/types/diet';

// ---------------------------------------------------------------------------
// Utilità interne
// ---------------------------------------------------------------------------

/**
 * Calcola i totali nutrizionali sommando gli alimenti loggati.
 * I totali vengono persistiti nella riga per velocizzare le query di riepilogo
 * ed evitare aggregazioni ripetute sul JSONB a ogni lettura.
 */
function computeTotals(foods: LoggedFoodItem[]): {
  total_kcal: number;
  total_protein: number;
  total_carbs: number;
  total_fats: number;
} {
  return foods.reduce(
    (acc, f) => ({
      total_kcal: acc.total_kcal + (f.calories ?? 0),
      total_protein: acc.total_protein + (f.protein_g ?? 0),
      total_carbs: acc.total_carbs + (f.carbs_g ?? 0),
      total_fats: acc.total_fats + (f.fats_g ?? 0),
    }),
    { total_kcal: 0, total_protein: 0, total_carbs: 0, total_fats: 0 }
  );
}

/**
 * Ricava il giorno della settimana (0=Lunedì … 6=Domenica) da una stringa 'YYYY-MM-DD'.
 * JavaScript Date usa 0=Domenica, quindi normalizziamo.
 * Parsando la data come UTC evitiamo sorprese di fuso orario locale.
 */
function dayOfWeekFromDateString(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Costruiamo in UTC per evitare che il fuso locale sposti la data
  const d = new Date(Date.UTC(year, month - 1, day));
  const jsDay = d.getUTCDay(); // 0=Sun, 1=Mon, …, 6=Sat
  // Convertiamo in convenzione del piano: 0=Lun … 6=Dom
  return jsDay === 0 ? 6 : jsDay - 1;
}

/**
 * Restituisce la data Lunedì della settimana a cui appartiene `dateStr`.
 * Formato output: 'YYYY-MM-DD'.
 */
function getMondayOfWeek(dateStr: string): string {
  const dow = dayOfWeekFromDateString(dateStr); // 0=Lun
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

/**
 * Aggiunge `n` giorni a una data 'YYYY-MM-DD' e restituisce 'YYYY-MM-DD'.
 */
function addDays(dateStr: string, n: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day + n));
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// 1. Salvare un pasto consumato
// ---------------------------------------------------------------------------

/**
 * Salva (o aggiorna) il log di un pasto consumato in una data.
 *
 * Strategia: upsert su (user_id, log_date, meal_type).
 * Se l'utente logga lo stesso pasto due volte nello stesso giorno,
 * il log precedente viene sovrascritto — comportamento intenzionale,
 * perché un giorno ha un solo "risultato" per tipo di pasto.
 *
 * I totali nutrizionali vengono calcolati qui prima del salvataggio
 * così le query di aggregazione lato DB rimangono semplici.
 *
 * @param userId - UUID dell'utente autenticato (da auth.user.id)
 * @param payload - Dati del pasto da salvare
 * @returns Il record salvato
 * @throws Error se la query fallisce (es. violazione RLS, DB offline)
 */
export async function saveDietLog(
  userId: string,
  payload: SaveDietLogPayload
): Promise<DietDailyLog> {
  const totals = computeTotals(payload.foods_eaten);

  const { data, error } = await supabase
    .from('diet_daily_logs')
    .upsert(
      {
        user_id: userId,
        log_date: payload.log_date,
        meal_type: payload.meal_type,
        // foods_eaten è tipizzato come LoggedFoodItem[] lato applicativo ma la
        // colonna DB è JSONB generico (Json in Supabase): il cast passa per
        // `unknown` perché i due tipi non si sovrappongono a sufficienza per
        // un cast diretto (stesso pattern usato nel cast di lettura sotto).
        foods_eaten: payload.foods_eaten as unknown as Json,
        notes: payload.notes ?? null,
        ...totals,
        // updated_at viene gestito dal trigger DB; non lo forziamo qui
      },
      {
        // Colonne che identificano il record da aggiornare se già esiste.
        // Corrispondono al UNIQUE constraint definito nella migration.
        onConflict: 'user_id,log_date,meal_type',
      }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Errore nel salvataggio del log pasto: ${error.message}`);
  }

  // `foods_eaten` arriva dal DB tipizzato come `Json` generico (JSONB),
  // mentre DietDailyLog lo tipizza come LoggedFoodItem[]: i due tipi non si
  // sovrappongono abbastanza per un cast diretto, serve passare da `unknown`.
  return data as unknown as DietDailyLog;
}

// ---------------------------------------------------------------------------
// 2. Recuperare i log di un giorno specifico
// ---------------------------------------------------------------------------

/**
 * Recupera tutti i pasti loggati dall'utente per una data specifica.
 *
 * Restituisce un array vuoto se nessun pasto è stato loggato per quel giorno,
 * anziché lanciare un errore — è il caso normale nei giorni non ancora loggati.
 *
 * @param userId - UUID dell'utente
 * @param date   - Data nel formato 'YYYY-MM-DD'
 * @returns Array di log (0-3 elementi, uno per tipo di pasto)
 */
export async function getDayLogs(
  userId: string,
  date: string
): Promise<DietDailyLog[]> {
  const { data, error } = await supabase
    .from('diet_daily_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('log_date', date)
    .order('meal_type'); // ordine alfabetico: cena, colazione, pranzo — stabile

  if (error) {
    throw new Error(`Errore nel recupero dei log del giorno ${date}: ${error.message}`);
  }

  // Vedi nota su `foods_eaten` (Json vs LoggedFoodItem[]) in saveDietLog.
  return (data ?? []) as unknown as DietDailyLog[];
}

/**
 * Recupera i log di un intervallo di date (estremi inclusi).
 * Utile per costruire la vista settimanale senza N query separate.
 *
 * @param userId    - UUID dell'utente
 * @param dateFrom  - Data iniziale 'YYYY-MM-DD'
 * @param dateTo    - Data finale 'YYYY-MM-DD'
 * @returns Array di log ordinati per data e tipo pasto
 */
export async function getLogsInRange(
  userId: string,
  dateFrom: string,
  dateTo: string
): Promise<DietDailyLog[]> {
  const { data, error } = await supabase
    .from('diet_daily_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('log_date', dateFrom)
    .lte('log_date', dateTo)
    .order('log_date')
    .order('meal_type');

  if (error) {
    throw new Error(
      `Errore nel recupero dei log dal ${dateFrom} al ${dateTo}: ${error.message}`
    );
  }

  // Vedi nota su `foods_eaten` (Json vs LoggedFoodItem[]) in saveDietLog.
  return (data ?? []) as unknown as DietDailyLog[];
}

/**
 * Elimina il log di un singolo pasto.
 * Utile se l'utente ha loggato per errore.
 *
 * @param logId  - UUID del record diet_daily_logs da eliminare
 */
export async function deleteDietLog(logId: string): Promise<void> {
  const { error } = await supabase
    .from('diet_daily_logs')
    .delete()
    .eq('id', logId);

  if (error) {
    throw new Error(`Errore nell'eliminazione del log: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// 3. Calcolare l'aderenza settimanale
// ---------------------------------------------------------------------------

/**
 * Calcola la percentuale di aderenza settimanale.
 *
 * Algoritmo:
 * 1. Determina la settimana (Lunedì-Domenica) che contiene `referenceDate`.
 * 2. Recupera il piano settimanale per sapere quanti pasti sono previsti
 *    per ogni giorno_della_settimana (0-6).
 * 3. Recupera i log effettivi per quei 7 giorni.
 * 4. Per ogni giorno calcola planned vs logged e la % parziale.
 * 5. Aggrega il totale settimanale.
 *
 * Nota sul conteggio "planned": il piano è ciclico (stessa settimana ogni settimana).
 * Confrontiamo il day_of_week del piano con il day_of_week della data reale.
 *
 * @param userId        - UUID dell'utente
 * @param referenceDate - Una qualsiasi data della settimana da analizzare ('YYYY-MM-DD').
 *                        Di default oggi.
 * @returns WeekAdherence con il dettaglio giorno per giorno
 */
export async function getWeeklyAdherence(
  userId: string,
  referenceDate?: string
): Promise<WeekAdherence> {
  // --- Step 1: calcola i 7 giorni della settimana ---
  const today = referenceDate ?? new Date().toISOString().slice(0, 10);
  const weekStart = getMondayOfWeek(today);
  const weekEnd = addDays(weekStart, 6);

  const weekDates: string[] = Array.from({ length: 7 }, (_, i) =>
    addDays(weekStart, i)
  );

  // --- Step 2: recupera il piano dell'utente ---
  // Otteniamo il weekly_plan_id prima, poi i diet_meals aggregati per giorno.
  // Due query separate sono più leggibili e sfruttano gli indici esistenti.
  const { data: planData, error: planError } = await supabase
    .from('diet_weekly_plans')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (planError) {
    throw new Error(`Errore nel recupero del piano: ${planError.message}`);
  }

  // plannedByDow: mappa day_of_week → numero di pasti pianificati
  // Se non esiste piano, tutti i giorni hanno 0 pasti pianificati.
  const plannedByDow: Record<number, number> = {
    0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
  };

  if (planData) {
    const { data: mealsData, error: mealsError } = await supabase
      .from('diet_meals')
      .select('day_of_week, meal_type')
      .eq('weekly_plan_id', planData.id);

    if (mealsError) {
      throw new Error(`Errore nel recupero dei pasti pianificati: ${mealsError.message}`);
    }

    for (const meal of mealsData ?? []) {
      plannedByDow[meal.day_of_week] = (plannedByDow[meal.day_of_week] ?? 0) + 1;
    }
  }

  // --- Step 3: recupera i log effettivi della settimana ---
  const logs = await getLogsInRange(userId, weekStart, weekEnd);

  // loggedByDate: mappa log_date → numero di pasti loggati
  const loggedByDate: Record<string, number> = {};
  for (const log of logs) {
    loggedByDate[log.log_date] = (loggedByDate[log.log_date] ?? 0) + 1;
  }

  // --- Step 4: costruisce il dettaglio giornaliero ---
  let totalPlanned = 0;
  let totalLogged = 0;

  const days: DayAdherence[] = weekDates.map((date, idx) => {
    const dow = idx; // weekDates[0] è sempre Lunedì (dow=0)
    const planned = plannedByDow[dow] ?? 0;
    const logged = Math.min(loggedByDate[date] ?? 0, planned);
    // Clamp: non possiamo loggare più pasti di quelli pianificati ai fini
    // dell'aderenza (es. se l'utente logga uno spuntino extra non nel piano).

    totalPlanned += planned;
    totalLogged += logged;

    return {
      date,
      day_of_week: dow,
      planned_meals: planned,
      logged_meals: logged,
      adherence_pct: planned > 0 ? Math.round((logged / planned) * 100) : null,
    };
  });

  // --- Step 5: aderenza globale settimana ---
  const weekly_adherence_pct =
    totalPlanned > 0 ? Math.round((totalLogged / totalPlanned) * 100) : null;

  return {
    week_start: weekStart,
    days,
    total_planned: totalPlanned,
    total_logged: totalLogged,
    weekly_adherence_pct,
  };
}
