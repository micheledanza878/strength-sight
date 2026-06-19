import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// La chiave API risiede esclusivamente nell'ambiente server-side.
// Stessa secret della funzione gemini-recipe: nessuna chiave nel bundle pubblico.
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

// Stessa lista di fallback di gemini-recipe: si tenta il successivo
// in caso di 503 (overload) o 429 (quota esaurita).
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

// Struttura di un singolo set passato dal client
interface SetEntry {
  exercise_name: string;
  weight: number;
  reps: number;
  set_number: number;
}

// Un personal record raggiunto durante la sessione
interface PREntry {
  exercise_name: string;
  weight: number;
}

// Corpo della richiesta atteso dalla Edge Function
interface RequestBody {
  sets: SetEntry[];
  pr_achieved: PREntry[];
  previous_session_volume: number;
  current_session_volume: number;
}

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
      JSON.stringify({ error: "Servizio coach non disponibile" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Corpo della richiesta non valido (JSON malformato)" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const { sets, pr_achieved, previous_session_volume, current_session_volume } = body;

  // Validazione minima: almeno i set devono essere presenti
  if (!Array.isArray(sets) || sets.length === 0) {
    return new Response(
      JSON.stringify({ error: "Parametro 'sets' mancante o vuoto" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // Validazione struttura set: prevenire injection nel prompt tramite campi arbitrari
  for (const s of sets) {
    if (
      typeof s.exercise_name !== "string" ||
      typeof s.weight !== "number" ||
      typeof s.reps !== "number" ||
      typeof s.set_number !== "number"
    ) {
      return new Response(
        JSON.stringify({ error: "Struttura dei set non valida" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }
  }

  // ── Costruzione del prompt ──────────────────────────────────────────────────
  //
  // Raggruppiamo i set per esercizio per rendere il prompt più leggibile
  // e utile al modello, evitando un elenco piatto di righe identiche.
  const grouped: Record<string, { weight: number; reps: number }[]> = {};
  for (const s of sets) {
    if (!grouped[s.exercise_name]) grouped[s.exercise_name] = [];
    grouped[s.exercise_name].push({ weight: s.weight, reps: s.reps });
  }

  const exerciseSummary = Object.entries(grouped)
    .map(([name, exSets]) => {
      const lines = exSets.map((s, i) => `  Serie ${i + 1}: ${s.weight}kg × ${s.reps} reps`).join("\n");
      return `- ${name}:\n${lines}`;
    })
    .join("\n");

  const prSection =
    Array.isArray(pr_achieved) && pr_achieved.length > 0
      ? `\nRecord personali raggiunti oggi:\n${pr_achieved.map((p) => `- ${p.exercise_name}: ${p.weight}kg`).join("\n")}`
      : "";

  const volumeDelta =
    typeof previous_session_volume === "number" && previous_session_volume > 0
      ? (() => {
          const diff = current_session_volume - previous_session_volume;
          const pct = Math.round((diff / previous_session_volume) * 100);
          return `\nVolume sessione attuale: ${Math.round(current_session_volume)}kg totali (${diff >= 0 ? "+" : ""}${pct}% rispetto alla sessione precedente di ${Math.round(previous_session_volume)}kg).`;
        })()
      : `\nVolume sessione attuale: ${Math.round(current_session_volume)}kg totali.`;

  const prompt = `Sei un coach di strength training esperto, diretto e motivante. Un atleta ha appena completato il seguente allenamento:

${exerciseSummary}
${prSection}
${volumeDelta}

Scrivi un feedback post-sessione di esattamente 3-4 righe in italiano. Il tono deve essere concreto e motivante: riconosci l'impegno, commenta brevemente la qualità o il volume della sessione, e lascia una nota positiva per il prossimo allenamento. Non usare frasi vuote o generiche. Non elencare i dati dell'allenamento: quelli l'atleta li vede già. Parla come un coach vero, non come un chatbot.`;

  const geminiBody = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    // Temperature bassa: vogliamo un testo coerente e focalizzato, non creativo
    generationConfig: { temperature: 0.55, maxOutputTokens: 256 },
  });

  // ── Chiamata a Gemini con fallback automatico sui modelli ───────────────────
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
      lastError = (err as { error?: { message?: string } })?.error?.message ?? `HTTP ${response.status}`;
      console.error(`Gemini model ${modelUrl} error:`, lastError);

      // 400 = errore permanente (es. prompt malformato): non proviamo altri modelli
      if (response.status === 400) break;
      // 429 / 503 = transitori: proviamo il prossimo
      continue;
    }

    const data = await response.json();
    // Filtriamo i "thought" chunk (chain-of-thought interni di gemini-2.5)
    const parts: Array<{ text?: string; thought?: boolean }> =
      data?.candidates?.[0]?.content?.parts ?? [];
    const text = parts
      .filter((p) => !p.thought)
      .map((p) => p.text ?? "")
      .join("")
      .trim();

    if (text) {
      return new Response(
        JSON.stringify({ feedback: text }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    lastError = "Risposta vuota dal modello";
  }

  console.error("Tutti i modelli Gemini non disponibili. Ultimo errore:", lastError);
  return new Response(
    JSON.stringify({ error: "Feedback non disponibile al momento. Riprova tra qualche istante." }),
    { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
});
