// La chiave API Gemini NON è presente nel frontend.
// Tutte le chiamate a Gemini transitano per Supabase Edge Functions che
// detengono la chiave in modo sicuro tramite la variabile d'ambiente
// GEMINI_API_KEY (configurata con `supabase secrets set GEMINI_API_KEY=<valore>`).

import { supabase } from "@/integrations/supabase/client";

export interface MealFood {
  name: string;
  portion: number;
  categoryName: string;
}

export async function generateRecipe(mealType: string, foods: MealFood[]): Promise<string> {
  // supabase.functions.invoke gestisce automaticamente l'URL della Edge Function
  // e aggiunge gli header di autenticazione Supabase necessari.
  const { data, error } = await supabase.functions.invoke("gemini-recipe", {
    body: { mealType, foods },
  });

  if (error) {
    // FunctionsHttpError contiene il corpo della risposta HTTP dell'edge function.
    // FunctionsRelayError / FunctionsFetchError indicano problemi di rete/relay.
    // In tutti i casi esponiamo un messaggio leggibile senza dettagli interni.
    const message =
      (error as { message?: string }).message ||
      "Errore nella generazione della ricetta";
    throw new Error(message);
  }

  if (!data?.recipe) {
    throw new Error("Risposta non valida dal servizio ricette");
  }

  return data.recipe as string;
}

// ── Coach AI post-sessione ──────────────────────────────────────────────────

export interface WorkoutSetEntry {
  exercise_name: string;
  weight: number;
  reps: number;
  set_number: number;
}

export interface PREntry {
  exercise_name: string;
  weight: number;
}

export interface WorkoutSessionData {
  sets: WorkoutSetEntry[];
  pr_achieved: PREntry[];
  previous_session_volume: number;
  current_session_volume: number;
}

/**
 * Chiama la Edge Function "workout-coach" per ottenere un feedback narrativo
 * post-sessione generato da Gemini.
 *
 * La funzione NON lancia eccezioni: in caso di errore di rete, di quota o di
 * risposta vuota restituisce null, così il chiamante può fare silently fail
 * senza interrompere il flusso UI.
 */
export async function getWorkoutFeedback(
  sessionData: WorkoutSessionData
): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("workout-coach", {
      body: sessionData,
    });

    // FunctionsHttpError, FunctionsRelayError o FunctionsFetchError:
    // logghiamo lato client per debugging ma non propaghiamo all'UI.
    if (error) {
      console.warn("workout-coach edge function error:", error);
      return null;
    }

    const feedback = data?.feedback;
    if (typeof feedback !== "string" || feedback.trim() === "") {
      console.warn("workout-coach: risposta priva di feedback", data);
      return null;
    }

    return feedback.trim();
  } catch (err) {
    // Errore di rete o eccezione inattesa: silently fail
    console.warn("getWorkoutFeedback: eccezione non gestita", err);
    return null;
  }
}
