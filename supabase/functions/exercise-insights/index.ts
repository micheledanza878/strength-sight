import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// La chiave API risiede esclusivamente nell'ambiente server-side.
// Viene configurata con: supabase secrets set GEMINI_API_KEY=<valore>
// e NON è mai inclusa nel bundle JavaScript pubblico.
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

// Elenco di modelli in ordine di preferenza: si tenta il successivo in caso
// di sovraccarico (503) o quota esaurita (429).
const MODELS = [
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent",
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

// Struttura attesa dal modello Gemini quando genera insights sull'esercizio.
// Corrisponde 1:1 alle colonne della tabella exercise_ai_info.
interface ExerciseInsight {
  technique: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  variations: string[];
  tips: string[];
  isBodyweight: boolean;
  bodyweightPercentage: number | null;
}

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
      JSON.stringify({ error: "Servizio di analisi esercizi non disponibile" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // Il client Supabase con service role bypassa RLS per poter eseguire
  // UPSERT su exercise_ai_info senza dipendere dall'utente autenticato.
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  let exerciseName: string;

  try {
    const body = await req.json();
    exerciseName = body.exerciseName;

    // Validazione input: stringa non vuota, max 120 caratteri.
    // Il limite previene prompt injection tramite nomi di esercizi molto lunghi.
    if (
      typeof exerciseName !== "string" ||
      exerciseName.trim().length === 0 ||
      exerciseName.trim().length > 120
    ) {
      return new Response(
        JSON.stringify({
          error: "Parametro 'exerciseName' obbligatorio: stringa non vuota, max 120 caratteri",
        }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Pulizia consistente: trim una sola volta e riusare il valore normalizzato
    // sia nel cache-check sia nell'UPSERT per garantire la stessa chiave.
    exerciseName = exerciseName.trim();
  } catch {
    return new Response(
      JSON.stringify({ error: "Corpo della richiesta non valido (JSON malformato)" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // normalized_name è la chiave di cache: lower(trim()) — identico a quanto
  // viene salvato durante l'UPSERT, così il match è garantito.
  const normalizedName = exerciseName.toLowerCase();

  // --- CACHE CHECK ---
  // Prima di invocare Gemini (costoso e lento), cerchiamo un record esistente.
  // Se trovato, rispondiamo immediatamente senza consumare quota API.
  const { data: cached, error: cacheError } = await supabaseAdmin
    .from("exercise_ai_info")
    .select("*")
    .eq("normalized_name", normalizedName)
    .maybeSingle();

  if (cacheError) {
    // Errore DB non bloccante: logghiamo e procediamo verso Gemini.
    console.error("Errore cache check exercise_ai_info:", cacheError.message);
  }

  if (cached) {
    // Cache hit: mappiamo da snake_case a camelCase per il frontend.
    return new Response(
      JSON.stringify({
        exerciseName: cached.exercise_name,
        technique: cached.technique,
        primaryMuscles: cached.primary_muscles ?? [],
        secondaryMuscles: cached.secondary_muscles ?? [],
        variations: cached.variations ?? [],
        tips: cached.tips ?? [],
        isBodyweight: cached.is_bodyweight ?? false,
        bodyweightPercentage: cached.bodyweight_percentage ?? null,
        youtubeUrl: cached.youtube_url,
        youtubeVideoId: cached.youtube_video_id ?? null,
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // --- CHIAMATA GEMINI ---
  // Il prompt richiede output JSON puro; responseMimeType forza il modello
  // a non aggiungere markdown attorno all'oggetto JSON.
  const prompt = `Sei un personal trainer e fisioterapista esperto. Analizza l'esercizio "${exerciseName}" e rispondi ESCLUSIVAMENTE con un oggetto JSON valido, senza testo aggiuntivo, con questi campi:

{
  "technique": "Descrizione dettagliata in italiano della corretta esecuzione dell'esercizio, step by step",
  "primaryMuscles": ["muscolo1", "muscolo2"],
  "secondaryMuscles": ["muscolo1", "muscolo2"],
  "variations": ["variante1", "variante2", "variante3"],
  "tips": ["consiglio o errore comune 1", "consiglio o errore comune 2", "consiglio o errore comune 3"],
  "isBodyweight": true,
  "bodyweightPercentage": 1.0
}

Regole:
- Tutti i testi in italiano.
- "technique": almeno 3 frasi che descrivono la posizione di partenza, il movimento e i punti chiave.
- "primaryMuscles": array di stringhe con i muscoli principali coinvolti.
- "secondaryMuscles": array di stringhe con i muscoli secondari/sinergici.
- "variations": 3-5 varianti o progressioni dell'esercizio.
- "tips": 3-5 consigli pratici o errori comuni da evitare.
- "isBodyweight": true se l'esercizio usa principalmente il peso corporeo, false se richiede attrezzi/pesi esterni.
- "bodyweightPercentage": numero da 0 a 1 che indica la percentuale del peso corporeo sollevata (es. 0.65 per i push-up). Se isBodyweight è false, questo campo DEVE essere null.
- Rispondi con il solo oggetto JSON, senza markdown, senza backtick, senza commenti.`;

  const geminiBody = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
      // Forza il modello a produrre JSON puro, evitando wrapping in markdown.
      responseMimeType: "application/json",
    },
  });

  // Fallback automatico sui modelli in caso di errori temporanei.
  let lastError = "";
  let insight: ExerciseInsight | null = null;
  let modelUsed = "";

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

    if (!text) {
      lastError = "Risposta vuota dal modello";
      continue;
    }

    try {
      insight = JSON.parse(text) as ExerciseInsight;
      modelUsed = modelUrl;
      break;
    } catch (parseErr) {
      lastError = `JSON non valido dalla risposta Gemini: ${parseErr}`;
      console.error(`Parse error model ${modelUrl}:`, lastError, "Raw text:", text);
      // Parsing fallito: potrebbe essere un problema del modello specifico,
      // proviamo il successivo.
      continue;
    }
  }

  if (!insight) {
    console.error("Tutti i modelli Gemini non disponibili. Ultimo errore:", lastError);
    return new Response(
      JSON.stringify({
        error: "Analisi esercizio non disponibile al momento. Riprova tra qualche istante.",
      }),
      { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // --- RICERCA YOUTUBE ---
  // Tentiamo la ricerca tramite API ufficiale; in caso di errore o quota
  // esaurita ricadiamo sul fallback con search query.
  let youtubeUrl: string;
  let youtubeVideoId: string | null = null;

  const youtubeApiKey = Deno.env.get("YOUTUBE_API_KEY");

  if (youtubeApiKey) {
    try {
      const ytQuery = encodeURIComponent(`${exerciseName} tutorial tecnica`);
      const ytResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${ytQuery}&type=video&order=viewCount&maxResults=1&key=${youtubeApiKey}`
      );

      if (ytResponse.ok) {
        const ytData = await ytResponse.json();
        const videoId = ytData?.items?.[0]?.id?.videoId as string | undefined;

        if (videoId) {
          youtubeVideoId = videoId;
          youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
        } else {
          // API risponde ma non ci sono risultati: fallback.
          console.warn("YouTube API: nessun video trovato per", exerciseName);
          youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
            exerciseName + " tutorial tecnica esecuzione"
          )}`;
        }
      } else {
        // Errore HTTP (es. 403 quota): logghiamo e usiamo il fallback.
        const ytErr = await ytResponse.text().catch(() => "");
        console.error(`YouTube API error HTTP ${ytResponse.status}:`, ytErr);
        youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
          exerciseName + " tutorial tecnica esecuzione"
        )}`;
      }
    } catch (ytNetworkErr) {
      // Errore di rete verso YouTube: non deve bloccare la risposta principale.
      console.error("Errore di rete YouTube API:", ytNetworkErr);
      youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
        exerciseName + " tutorial tecnica esecuzione"
      )}`;
    }
  } else {
    // YOUTUBE_API_KEY non configurata: usiamo sempre il fallback con search query.
    youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
      exerciseName + " tutorial tecnica esecuzione"
    )}`;
  }

  // --- UPSERT IN CACHE ---
  // Salviamo il risultato per evitare di richiamare Gemini in futuro.
  // ON CONFLICT su normalized_name aggiorna tutti i campi (dati più freschi).
  const { error: upsertError } = await supabaseAdmin.from("exercise_ai_info").upsert(
    {
      exercise_name: exerciseName,
      normalized_name: normalizedName,
      technique: insight.technique,
      primary_muscles: insight.primaryMuscles,
      secondary_muscles: insight.secondaryMuscles,
      variations: insight.variations,
      tips: insight.tips,
      is_bodyweight: insight.isBodyweight,
      bodyweight_percentage: insight.bodyweightPercentage,
      youtube_url: youtubeUrl,
      youtube_video_id: youtubeVideoId,
      model_used: modelUsed,
    },
    { onConflict: "normalized_name" }
  );

  if (upsertError) {
    // L'UPSERT fallito non è bloccante per il client: l'utente riceve comunque
    // la risposta corretta; il prossimo accesso rigenererà semplicemente il dato.
    console.error("Errore UPSERT exercise_ai_info:", upsertError.message);
  }

  // --- RISPOSTA FINALE ---
  // Tutti i nomi di campo sono in camelCase come atteso dal frontend.
  return new Response(
    JSON.stringify({
      exerciseName: exerciseName,
      technique: insight.technique,
      primaryMuscles: insight.primaryMuscles,
      secondaryMuscles: insight.secondaryMuscles,
      variations: insight.variations,
      tips: insight.tips,
      isBodyweight: insight.isBodyweight,
      bodyweightPercentage: insight.bodyweightPercentage ?? null,
      youtubeUrl: youtubeUrl,
      youtubeVideoId: youtubeVideoId,
    }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
});
