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

