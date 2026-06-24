import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

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
      JSON.stringify({ error: "Servizio di analisi esercizi non disponibile" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  let exerciseName: string;

  try {
    const body = await req.json();
    exerciseName = body.exerciseName;

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

    exerciseName = exerciseName.trim();
  } catch {
    return new Response(
      JSON.stringify({ error: "Corpo della richiesta non valido (JSON malformato)" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const normalizedName = exerciseName.toLowerCase();

  // --- CACHE CHECK ---
  const { data: cached, error: cacheError } = await supabaseAdmin
    .from("exercise_ai_info")
    .select("*")
    .eq("normalized_name", normalizedName)
    .maybeSingle();

  if (cacheError) {
    console.error("Errore cache check exercise_ai_info:", cacheError.message);
  }

  if (cached) {
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

  // --- CHIAMATA ANTHROPIC CLAUDE ---
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

  let insight: ExerciseInsight | null = null;
  let modelUsed = "claude-haiku-4-5-20251001";

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: modelUsed,
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const errMsg = (err as { error?: { message?: string } })?.error?.message ?? `HTTP ${response.status}`;
      console.error("Anthropic API error:", errMsg);
      return new Response(
        JSON.stringify({ error: "Analisi esercizio non disponibile al momento. Riprova tra qualche istante." }),
        { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const text: string = data?.content?.[0]?.text ?? "";

    if (!text) {
      console.error("Risposta vuota da Anthropic");
      return new Response(
        JSON.stringify({ error: "Analisi esercizio non disponibile al momento. Riprova tra qualche istante." }),
        { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Rimuovi eventuali backtick markdown se presenti
    const cleanText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    insight = JSON.parse(cleanText) as ExerciseInsight;
  } catch (err) {
    console.error("Errore chiamata Anthropic:", err);
    return new Response(
      JSON.stringify({ error: "Analisi esercizio non disponibile al momento. Riprova tra qualche istante." }),
      { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // --- RICERCA YOUTUBE ---
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
          console.warn("YouTube API: nessun video trovato per", exerciseName);
          youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
            exerciseName + " tutorial tecnica esecuzione"
          )}`;
        }
      } else {
        const ytErr = await ytResponse.text().catch(() => "");
        console.error(`YouTube API error HTTP ${ytResponse.status}:`, ytErr);
        youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
          exerciseName + " tutorial tecnica esecuzione"
        )}`;
      }
    } catch (ytNetworkErr) {
      console.error("Errore di rete YouTube API:", ytNetworkErr);
      youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
        exerciseName + " tutorial tecnica esecuzione"
      )}`;
    }
  } else {
    youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
      exerciseName + " tutorial tecnica esecuzione"
    )}`;
  }

  // --- UPSERT IN CACHE ---
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
    console.error("Errore UPSERT exercise_ai_info:", upsertError.message);
  }

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
