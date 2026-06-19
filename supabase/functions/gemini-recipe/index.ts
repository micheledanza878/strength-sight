import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// La chiave API risiede esclusivamente nell'ambiente server-side.
// Viene configurata con: supabase secrets set GEMINI_API_KEY=<valore>
// e NON è mai inclusa nel bundle JavaScript pubblico.
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

// Elenco di modelli in ordine di preferenza: si tenta il successivo in caso
// di sovraccarico (503) o quota esaurita (429).
const MODELS = [
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent",
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent",
];

// Headers CORS necessari per consentire le chiamate dal frontend (origine del
// progetto Vite in sviluppo e dal dominio di produzione Vercel).
// L'header Authorization è esplicitamente incluso perché il frontend Supabase
// client lo aggiunge automaticamente.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

serve(async (req: Request) => {
  // Preflight CORS: il browser invia OPTIONS prima della richiesta POST reale.
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Metodo non consentito" }),
      { status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // Verifica critica: la secret deve essere configurata nell'ambiente Supabase.
  // Se manca, restituiamo 500 senza esporre dettagli al client.
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY non configurata nell'ambiente Supabase");
    return new Response(
      JSON.stringify({ error: "Servizio di generazione ricette non disponibile" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  let mealType: string;
  let foods: Array<{ name: string; portion: number; categoryName: string }>;

  try {
    const body = await req.json();
    mealType = body.mealType;
    foods = body.foods;

    // Validazione input: entrambi i campi sono obbligatori.
    if (!mealType || !Array.isArray(foods) || foods.length === 0) {
      return new Response(
        JSON.stringify({ error: "Parametri mancanti: mealType e foods sono obbligatori" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Validazione struttura degli alimenti per prevenire injection nel prompt.
    for (const food of foods) {
      if (
        typeof food.name !== "string" ||
        typeof food.portion !== "number" ||
        food.portion <= 0
      ) {
        return new Response(
          JSON.stringify({ error: "Struttura degli alimenti non valida" }),
          { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }
    }
  } catch {
    return new Response(
      JSON.stringify({ error: "Corpo della richiesta non valido (JSON malformato)" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // Costruzione del prompt identica alla versione originale lato client,
  // così non cambia il comportamento dell'AI.
  const mealLabel =
    mealType === "colazione" ? "colazione" : mealType === "pranzo" ? "pranzo" : "cena";

  const ingredientsList = foods
    .map((f) => `- ${f.name}: ${f.portion}g`)
    .join("\n");

  const prompt = `Sei un esperto chef e nutrizionista italiano. Devo preparare la ${mealLabel} seguendo i principi della mia dieta.

Ecco gli ingredienti scelti e le grammature ESATTE:
${ingredientsList}

Crea una ricetta semplice e gustosa. Devi rispettare TASSATIVAMENTE queste regole nutrizionali e di preparazione:
1. I pesi degli ingredienti si intendono da crudo e senza guscio.
2. Usa gli ingredienti forniti rispettando le grammature al grammo.
3. Non aggiungere ingredienti principali extra.
4. CONDIMENTI PERMESSI: Usa il sale al minimo indispensabile. Sfrutta liberamente spezie e succo di limone per dare sapore.
5. SALSE PERMESSE: Puoi usare massimo 1 o 2 cucchiai di salsa di soia, oppure aceto di vino bianco a piacere. Se usi aceto balsamico, massimo 20ml (MAI la glassa).
6. JOLLY: Se serve per la ricetta, puoi aggiungere fino a 100g di passata di pomodoro anche se non è nella lista degli ingredienti.

REGOLE DI FORMATTAZIONE OBBLIGATORIE:
- NON aggiungere NESSUNA frase introduttiva, saluto o commento conclusivo (es. non scrivere "Certamente", "Ecco la ricetta", ecc.).
- Il tuo output DEVE iniziare DIRETTAMENTE con "**Nome del piatto**:".

Rispondi in italiano usando ESCLUSIVAMENTE questo formato esatto:
**Nome del piatto**: [nome creativo]
**Ingredienti**: [lista con grammature + eventuali spezie/limone/passata usati]
**Preparazione**: [steps numerati, max 5 passaggi chiari]
**Tempo di preparazione**: [minuti totali]
**Consiglio dello chef**: [un suggerimento rapido sulla cottura o su come insaporire il piatto con le spezie]`;

  const geminiBody = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
  });

  // Fallback automatico sui modelli in caso di errori temporanei.
  let lastError = "";
  for (const modelUrl of MODELS) {
    let response: Response;
    try {
      response = await fetch(`${modelUrl}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: geminiBody,
      });
    } catch (networkErr) {
      lastError = `Errore di rete verso Gemini: ${networkErr}`;
      continue;
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      // Logghiamo lato server il dettaglio dell'errore Gemini,
      // ma NON lo inoltriamo al client per non esporre info interne.
      lastError = (err as { error?: { message?: string } })?.error?.message ?? `HTTP ${response.status}`;
      console.error(`Gemini model ${modelUrl} error:`, lastError);

      // Errore 400 (bad request) è permanente: inutile provare altri modelli.
      if (response.status === 400) break;
      // 429 e 503 sono transitori: proviamo il modello successivo.
      continue;
    }

    const data = await response.json();
    const parts: Array<{ text?: string; thought?: boolean }> =
      data?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.filter((p) => !p.thought).map((p) => p.text ?? "").join("");

    if (text) {
      return new Response(
        JSON.stringify({ recipe: text }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    lastError = "Risposta vuota dal modello";
  }

  // Tutti i modelli hanno fallito: restituiamo un errore generico senza
  // esporre i dettagli interni (lastError è già loggato server-side).
  console.error("Tutti i modelli Gemini non disponibili. Ultimo errore:", lastError);
  return new Response(
    JSON.stringify({ error: "Generazione ricetta non disponibile al momento. Riprova tra qualche istante." }),
    { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
});
