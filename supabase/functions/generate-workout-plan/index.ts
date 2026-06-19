import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// La chiave API risiede esclusivamente nell'ambiente server-side.
// Viene configurata con: supabase secrets set GEMINI_API_KEY=<valore>
// e NON è mai inclusa nel bundle JavaScript pubblico.
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

// Stessa lista di modelli di gemini-recipe: fallback automatico in caso di
// sovraccarico (503) o quota esaurita (429).
const MODELS = [
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent",
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent",
];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

// ─── Tipi attesi in input ────────────────────────────────────────────────────

interface RequestBody {
  goal: string;         // "forza" | "massa" | "dimagrimento" | "resistenza"
  days_per_week: number; // 2..5
  equipment: string;   // "palestra" | "casa" | "nessuna"
  level: string;       // "principiante" | "intermedio" | "avanzato"
  focus_muscles?: string; // campo libero opzionale, es. "petto e tricipiti"
}

// ─── Tipi attesi in output (struttura compatibile col progetto) ───────────────

interface GeneratedExercise {
  name: string;
  sets: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number;
}

interface GeneratedDay {
  day_name: string;
  exercises: GeneratedExercise[];
}

interface GeneratedPlan {
  name: string;
  days: GeneratedDay[];
}

// ─── Validazione input ────────────────────────────────────────────────────────

const VALID_GOALS = ["forza", "massa", "dimagrimento", "resistenza"];
const VALID_EQUIPMENT = ["palestra", "casa", "nessuna"];
const VALID_LEVELS = ["principiante", "intermedio", "avanzato"];

function validateBody(body: unknown): body is RequestBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (!VALID_GOALS.includes(b.goal as string)) return false;
  if (typeof b.days_per_week !== "number" || b.days_per_week < 2 || b.days_per_week > 5) return false;
  if (!VALID_EQUIPMENT.includes(b.equipment as string)) return false;
  if (!VALID_LEVELS.includes(b.level as string)) return false;
  if (b.focus_muscles !== undefined && typeof b.focus_muscles !== "string") return false;
  return true;
}

// ─── Costruzione del prompt ───────────────────────────────────────────────────
// Il prompt è progettato per ottenere JSON puro parsabile senza testo extra.
// Usiamo esempi concreti nel prompt (few-shot leggero) per ancorare il formato.

function buildPrompt(body: RequestBody): string {
  const goalLabels: Record<string, string> = {
    forza: "aumento della forza massimale (basse reps, alti carichi)",
    massa: "ipertrofia muscolare (volume moderato-alto, rep 6-15)",
    dimagrimento: "dimagrimento e tonificazione (circuit training, rest brevi)",
    resistenza: "resistenza muscolare e cardiovascolare (rep alte, rest brevi)",
  };
  const equipmentLabels: Record<string, string> = {
    palestra: "palestra completa (bilancieri, manubri, macchine isotoniche, cavi)",
    casa: "allenamento a casa (manubri leggeri, corpo libero, elastici)",
    nessuna: "solo corpo libero, nessuna attrezzatura",
  };
  const levelLabels: Record<string, string> = {
    principiante: "principiante (meno di 6 mesi di esperienza, movimenti base)",
    intermedio: "intermedio (1-3 anni, padronanza dei fondamentali)",
    avanzato: "avanzato (3+ anni, tecniche avanzate come drop-set, superset)",
  };

  const focusLine = body.focus_muscles
    ? `\n- Muscoli da privilegiare: ${body.focus_muscles}`
    : "";

  return `Sei un personal trainer esperto. Devi generare una scheda di allenamento settimanale completa.

PARAMETRI UTENTE:
- Obiettivo: ${goalLabels[body.goal]}
- Giorni di allenamento a settimana: ${body.days_per_week}
- Attrezzatura disponibile: ${equipmentLabels[body.equipment]}
- Livello: ${levelLabels[body.level]}${focusLine}

REGOLE OBBLIGATORIE:
1. Genera ESATTAMENTE ${body.days_per_week} giorni di allenamento.
2. Ogni giorno deve avere tra 4 e 8 esercizi appropriati per il livello indicato.
3. I nomi degli esercizi devono essere in italiano e chiari (es. "Panca piana con bilanciere", "Squat al multipower").
4. Per attrezzatura "casa" o "nessuna" usa solo esercizi fattibili senza macchinari da palestra.
5. Adatta serie, rep e riposo all'obiettivo: forza (3-5 serie, 3-6 rep, 120-180s rest), massa (3-5 serie, 8-12 rep, 60-90s rest), dimagrimento (3-4 serie, 12-20 rep, 30-60s rest), resistenza (3-4 serie, 15-25 rep, 30-45s rest).
6. Il campo "name" della scheda deve essere descrittivo e includere l'obiettivo e i giorni (es. "Forza 4 giorni - Upper/Lower").

OUTPUT:
Rispondi SOLO con il JSON valido qui sotto, senza markdown, senza spiegazioni, senza testo prima o dopo.

{
  "name": "Nome scheda descrittivo",
  "days": [
    {
      "day_name": "Nome giorno (es. Upper A, Petto e Tricipiti, Full Body 1)",
      "exercises": [
        {
          "name": "Nome esercizio in italiano",
          "sets": 4,
          "reps_min": 8,
          "reps_max": 12,
          "rest_seconds": 90
        }
      ]
    }
  ]
}`;
}

// ─── Parsing e validazione dell'output Gemini ─────────────────────────────────
// Gemini a volte avvolge il JSON in un blocco markdown ```json ... ```.
// Questa funzione estrae e valida il JSON in modo difensivo.

function parseAndValidatePlan(text: string): GeneratedPlan {
  // Rimuovi eventuale blocco ```json ... ``` o ``` ... ```
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`JSON non parsabile: ${cleaned.slice(0, 200)}`);
  }

  // Validazione strutturale minima: se mancano campi critici, rifiutiamo
  // invece di propagare dati corrotti al frontend.
  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as Record<string, unknown>).name !== "string" ||
    !Array.isArray((parsed as Record<string, unknown>).days)
  ) {
    throw new Error("Struttura JSON mancante: name o days non validi");
  }

  const plan = parsed as GeneratedPlan;

  if (plan.days.length === 0) {
    throw new Error("La scheda generata non contiene giorni");
  }

  for (const day of plan.days) {
    if (typeof day.day_name !== "string" || !Array.isArray(day.exercises)) {
      throw new Error(`Giorno malformato: ${JSON.stringify(day).slice(0, 100)}`);
    }
    for (const ex of day.exercises) {
      // Coerciamo i campi numerici: Gemini a volte restituisce stringhe
      ex.sets = Number(ex.sets) || 3;
      ex.reps_min = Number(ex.reps_min) || 8;
      ex.reps_max = Number(ex.reps_max) || 12;
      ex.rest_seconds = Number(ex.rest_seconds) || 90;
      if (typeof ex.name !== "string" || !ex.name.trim()) {
        throw new Error("Esercizio senza nome");
      }
    }
  }

  return plan;
}

// ─── Handler principale ───────────────────────────────────────────────────────

serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Metodo non consentito" }),
      { status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY non configurata nell'ambiente Supabase");
    return new Response(
      JSON.stringify({ error: "Servizio di generazione schede non disponibile" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // ── Parsing e validazione input ──────────────────────────────────────────
  let body: RequestBody;
  try {
    const raw = await req.json();
    if (!validateBody(raw)) {
      return new Response(
        JSON.stringify({
          error: "Parametri non validi. Verifica: goal (forza/massa/dimagrimento/resistenza), days_per_week (2-5), equipment (palestra/casa/nessuna), level (principiante/intermedio/avanzato)",
        }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }
    body = raw;
  } catch {
    return new Response(
      JSON.stringify({ error: "Corpo della richiesta non valido (JSON malformato)" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const prompt = buildPrompt(body);

  const geminiBody = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      // Temperatura bassa: vogliamo output strutturato e deterministico,
      // non creatività narrativa. 0.4 bilancia varietà e coerenza del JSON.
      temperature: 0.4,
      maxOutputTokens: 4096,
    },
  });

  // ── Fallback automatico sui modelli ─────────────────────────────────────
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
      console.error(lastError);
      continue;
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      lastError = (err as { error?: { message?: string } })?.error?.message ?? `HTTP ${response.status}`;
      console.error(`Gemini model ${modelUrl} error:`, lastError);
      // 400 è permanente (prompt malformato): inutile ritentare con altri modelli
      if (response.status === 400) break;
      continue;
    }

    const data = await response.json();
    const parts: Array<{ text?: string; thought?: boolean }> =
      data?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.filter((p) => !p.thought).map((p) => p.text ?? "").join("");

    if (!text) {
      lastError = "Risposta vuota dal modello";
      console.error(lastError);
      continue;
    }

    // ── Parsing dell'output ────────────────────────────────────────────────
    // Se il parsing fallisce loghiamo e tentiamo il modello successivo:
    // modelli diversi producono formati leggermente diversi.
    let plan: GeneratedPlan;
    try {
      plan = parseAndValidatePlan(text);
    } catch (parseErr) {
      lastError = `Errore parsing risposta: ${parseErr}`;
      console.error(lastError, "| Raw text:", text.slice(0, 500));
      continue;
    }

    return new Response(
      JSON.stringify({ plan }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  console.error("Tutti i modelli Gemini non disponibili. Ultimo errore:", lastError);
  return new Response(
    JSON.stringify({ error: "Generazione scheda non disponibile al momento. Riprova tra qualche istante." }),
    { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
});
