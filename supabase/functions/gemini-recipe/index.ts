import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Metodo non consentito" }),
      { status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  if (!ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY non configurata nell'ambiente Supabase");
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

    if (!mealType || !Array.isArray(foods) || foods.length === 0) {
      return new Response(
        JSON.stringify({ error: "Parametri mancanti: mealType e foods sono obbligatori" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

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

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const errMsg = (err as { error?: { message?: string } })?.error?.message ?? `HTTP ${response.status}`;
      console.error("Anthropic API error:", errMsg);
      return new Response(
        JSON.stringify({ error: "Generazione ricetta non disponibile al momento. Riprova tra qualche istante." }),
        { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const text: string = data?.content?.[0]?.text ?? "";

    if (!text) {
      console.error("Risposta vuota da Anthropic");
      return new Response(
        JSON.stringify({ error: "Generazione ricetta non disponibile al momento. Riprova tra qualche istante." }),
        { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ recipe: text }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Errore chiamata Anthropic:", err);
    return new Response(
      JSON.stringify({ error: "Generazione ricetta non disponibile al momento. Riprova tra qualche istante." }),
      { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
