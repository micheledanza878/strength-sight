// Servizio per il flusso di import dieta da PDF (analisi AI -> revisione ->
// commit). Le chiamate a Gemini transitano per l'edge function
// `parse-diet-pdf`, che detiene la GEMINI_API_KEY lato server (stesso
// pattern di sicurezza di geminiService.ts / gemini-recipe). Il commit finale
// passa dalla RPC `import_diet_plan`, che scrive tutto in un'unica
// transazione (vedi commento in testa alla migration corrispondente).

import { supabase } from '@/integrations/supabase/client';
import type {
  ImportDietPlanMeal,
  ImportDietPlanNewFood,
  ParsedDietPlan,
} from '@/types/diet';

// Stesso limite (~15MB) imposto lato server in
// supabase/functions/parse-diet-pdf/index.ts: replicato qui per dare
// all'utente un feedback istantaneo invece di un roundtrip di rete che fallirà.
export const MAX_PDF_BYTES = 15 * 1024 * 1024;

export async function parseDietPdf(
  pdfBase64: string,
  mimeType: string
): Promise<ParsedDietPlan> {
  // supabase.functions.invoke gestisce automaticamente l'URL della Edge
  // Function e gli header di autenticazione Supabase necessari.
  const { data, error } = await supabase.functions.invoke('parse-diet-pdf', {
    body: { pdfBase64, mimeType },
  });

  if (error) {
    // FunctionsHttpError contiene il corpo della risposta HTTP dell'edge
    // function nella proprietà `context` (un oggetto Response), non in
    // `.message` (che è sempre il generico "Edge Function returned a
    // non-2xx status code"). Lo leggiamo per mostrare all'utente il
    // messaggio in italiano prodotto dalla function stessa.
    // FunctionsRelayError / FunctionsFetchError indicano invece problemi di
    // rete/relay: in quel caso non c'è un body utile, si usa il fallback.
    let message =
      (error as { message?: string }).message || "Errore nell'analisi del PDF";
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const body = await context.clone().json();
        if (body && typeof body.error === 'string' && body.error.trim()) {
          message = body.error;
        }
      } catch {
        // Corpo non-JSON o già consumato: teniamo il messaggio di fallback.
      }
    }
    throw new Error(message);
  }

  if (
    !data ||
    typeof data.detected_format_ok !== 'boolean' ||
    !Array.isArray(data.days)
  ) {
    throw new Error('Risposta non valida dal servizio di analisi PDF');
  }

  return data as ParsedDietPlan;
}

export async function importDietPlan(
  startDate: string,
  newFoods: ImportDietPlanNewFood[],
  meals: ImportDietPlanMeal[]
): Promise<string> {
  const { data, error } = await supabase.rpc('import_diet_plan', {
    p_start_date: startDate,
    // La RPC accetta null per "nessun alimento nuovo": evitiamo di passare
    // un array vuoto per coerenza con la firma SQL (p_new_foods JSONB).
    p_new_foods: newFoods.length > 0 ? newFoods : null,
    p_meals: meals,
  });

  if (error) {
    // Le eccezioni sollevate dalla RPC (RAISE EXCEPTION) hanno un messaggio
    // leggibile in italiano: lo mostriamo direttamente all'utente, stesso
    // pattern di qualunque altro errore supabase-js.
    throw new Error(error.message);
  }

  const planId = (data as { plan_id?: string } | null)?.plan_id;
  if (!planId) {
    throw new Error("Risposta non valida dal server durante l'importazione");
  }
  return planId;
}
