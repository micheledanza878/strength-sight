/**
 * exerciseInsightsService.ts
 *
 * Recupera le informazioni AI di un esercizio seguendo una strategia cache-first:
 *  1. SELECT diretto da `exercise_ai_info` (cache hit veloce, senza invocare Edge Function)
 *  2. Se il record non esiste → invoke della Edge Function "exercise-insights"
 *     che genera e persiste i dati, poi li ritorna in camelCase.
 *
 * La funzione NON lancia eccezioni: qualsiasi errore produce un silently-fail
 * con return null, in modo che la UI possa semplicemente non mostrare la card.
 */

import { supabase } from "@/integrations/supabase/client";

// ── Interfaccia pubblica ────────────────────────────────────────────────────────

export interface ExerciseInsights {
  exerciseName: string;
  technique: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  variations: string[];
  tips: string[];
  isBodyweight: boolean;
  bodyweightPercentage: number | null;
  youtubeUrl: string;
  youtubeVideoId: string | null;
}

// ── Mappatura DB (snake_case) → interfaccia (camelCase) ────────────────────────

/**
 * Converte una row della tabella `exercise_ai_info` nell'interfaccia pubblica.
 * I valori null del DB vengono normalizzati con valori di default sicuri
 * in modo che il componente non debba gestire null per ogni campo testuale.
 */
function mapDbRowToInsights(row: {
  exercise_name: string;
  technique: string | null;
  primary_muscles: string[] | null;
  secondary_muscles: string[] | null;
  variations: string[] | null;
  tips: string[] | null;
  is_bodyweight: boolean | null;
  bodyweight_percentage: number | null;
  youtube_url: string | null;
  youtube_video_id: string | null;
}): ExerciseInsights {
  return {
    exerciseName: row.exercise_name,
    technique: row.technique ?? "",
    primaryMuscles: row.primary_muscles ?? [],
    secondaryMuscles: row.secondary_muscles ?? [],
    variations: row.variations ?? [],
    tips: row.tips ?? [],
    isBodyweight: row.is_bodyweight ?? false,
    bodyweightPercentage: row.bodyweight_percentage,
    youtubeUrl: row.youtube_url ?? "",
    youtubeVideoId: row.youtube_video_id ?? null,
  };
}

// ── Funzione principale ────────────────────────────────────────────────────────

/**
 * Ritorna le informazioni AI per un esercizio, con strategia cache-first.
 *
 * @param exerciseName Nome dell'esercizio (es. "Push-up", "Bench Press")
 * @returns            Oggetto `ExerciseInsights` oppure `null` su errore/miss totale
 */
export async function getExerciseInsights(
  exerciseName: string
): Promise<ExerciseInsights | null> {
  try {
    // ── Step 1: cache hit dal DB ───────────────────────────────────────────────
    // Normalizza nello stesso modo in cui il backend popola `normalized_name`
    const normalizedName = exerciseName.trim().toLowerCase();

    const { data: cachedRow, error: dbError } = await supabase
      .from("exercise_ai_info")
      .select(
        "exercise_name, technique, primary_muscles, secondary_muscles, variations, tips, is_bodyweight, bodyweight_percentage, youtube_url, youtube_video_id"
      )
      .eq("normalized_name", normalizedName)
      .maybeSingle(); // null se non esiste, senza errore 406

    if (dbError) {
      // Errore di query: logghiamo ma non blocchiamo, proviamo la Edge Function
      console.warn("exerciseInsightsService: errore SELECT cache", dbError);
    }

    if (cachedRow) {
      // Cache hit: rimappatura snake_case → camelCase
      return mapDbRowToInsights(cachedRow);
    }

    // ── Step 2: cache miss → Edge Function ────────────────────────────────────
    // La risposta della function è già in camelCase, usata direttamente.
    const { data: fnData, error: fnError } = await supabase.functions.invoke(
      "exercise-insights",
      { body: { exerciseName } }
    );

    if (fnError) {
      // FunctionsHttpError / FunctionsRelayError / FunctionsFetchError
      console.warn("exerciseInsightsService: errore Edge Function", fnError);
      return null;
    }

    // La Edge Function deve restituire un oggetto con i campi camelCase;
    // verifichiamo che ci sia almeno `exerciseName` per considerarlo valido.
    if (!fnData || typeof fnData.exerciseName !== "string") {
      console.warn("exerciseInsightsService: risposta Edge Function non valida", fnData);
      return null;
    }

    // Coerciamo i campi opzionali con valori di default in modo consistente
    // con la mappatura del DB, così il componente riceve sempre la stessa forma.
    return {
      exerciseName: fnData.exerciseName,
      technique: typeof fnData.technique === "string" ? fnData.technique : "",
      primaryMuscles: Array.isArray(fnData.primaryMuscles) ? fnData.primaryMuscles : [],
      secondaryMuscles: Array.isArray(fnData.secondaryMuscles) ? fnData.secondaryMuscles : [],
      variations: Array.isArray(fnData.variations) ? fnData.variations : [],
      tips: Array.isArray(fnData.tips) ? fnData.tips : [],
      isBodyweight: typeof fnData.isBodyweight === "boolean" ? fnData.isBodyweight : false,
      bodyweightPercentage:
        typeof fnData.bodyweightPercentage === "number" ? fnData.bodyweightPercentage : null,
      youtubeUrl: typeof fnData.youtubeUrl === "string" ? fnData.youtubeUrl : "",
      youtubeVideoId:
        typeof fnData.youtubeVideoId === "string" ? fnData.youtubeVideoId : null,
    } satisfies ExerciseInsights;
  } catch (err) {
    // Eccezione inattesa (rete, parsing, ecc.): silently fail
    console.warn("getExerciseInsights: eccezione non gestita", err);
    return null;
  }
}
