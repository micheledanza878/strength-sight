import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// La chiave API risiede esclusivamente nell'ambiente server-side.
// Viene configurata con: supabase secrets set GEMINI_API_KEY=<valore>
// e NON è mai inclusa nel bundle JavaScript pubblico.
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

// A differenza di generate-workout-plan/gemini-recipe (output breve, un
// tetto uniforme di 8192 token basta), l'estrazione di una dieta settimanale
// intera (7 giorni x pasti x alimenti, ognuno con nome/id/confidenza/warning)
// produce facilmente output molto più lunghi — osservato in produzione:
// risposta troncata a metà stringa con MAX_TOKENS a 8192 su un PDF reale.
// gemini-2.0-flash e gemini-2.0-flash-lite sono comunque limitati a 8192
// (non è possibile chiedere di più), quindi gemini-2.5-flash — che supporta
// fino a 65536 — va provato PER PRIMO, non per ultimo: è l'unico dei tre
// realisticamente capace di completare l'estrazione senza troncare.
// gemini-2.5-flash ha il "thinking" (ragionamento esteso) attivo per
// default, che allunga parecchio i tempi di risposta per un compito che è
// essenzialmente estrazione strutturata guidata da un catalogo esplicito,
// non ragionamento multi-step. thinkingBudget:0 lo disattiva — esiste solo
// per i modelli 2.5+, i 2.0 sotto non lo supportano/necessitano.
const MODELS: { url: string; maxOutputTokens: number; thinkingBudget?: number }[] = [
  {
    url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    maxOutputTokens: 65536,
    thinkingBudget: 0,
  },
  {
    url: "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent",
    maxOutputTokens: 8192,
  },
  {
    url: "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent",
    maxOutputTokens: 8192,
  },
];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

// Limite di sicurezza: il limite reale di Gemini per i dati inline (testo +
// tutte le parti) è 20MB per richiesta. Lasciamo margine per il prompt/catalogo.
const MAX_PDF_BYTES = 15 * 1024 * 1024;

// ─── Tipi attesi in input ────────────────────────────────────────────────────

interface RequestBody {
  pdfBase64: string; // PDF codificato in base64, SENZA prefisso "data:application/pdf;base64,"
  mimeType: string; // atteso "application/pdf"
}

// ─── Tipi del catalogo alimenti (da DB) ────────────────────────────────────────

interface FoodCatalogItem {
  id: string;
  name: string;
  category_name: string;
  standard_portion_g: number;
}

// ─── Tipi attesi in output (struttura consumata dal frontend / dalla RPC) ─────
// ATTENZIONE: questa forma è un contratto verbatim con il frontend costruito
// in parallelo. Non rinominare/annidare campi senza coordinarsi.

const VALID_MEAL_TYPES = [
  "colazione",
  "spuntino_mattutino",
  "pranzo",
  "spuntino_pomeridiano",
  "cena",
] as const;
type MealType = (typeof VALID_MEAL_TYPES)[number];

const VALID_CONFIDENCE = ["high", "medium", "low"] as const;
type Confidence = (typeof VALID_CONFIDENCE)[number];

interface ParsedFoodItem {
  raw_name: string;
  matched_food_id: string | null;
  confidence: Confidence;
  portion_g: number;
}

interface ParsedMeal {
  meal_type: MealType;
  foods: ParsedFoodItem[];
}

interface ParsedDay {
  day_of_week: number; // 0 = Lunedì .. 6 = Domenica
  meals: ParsedMeal[];
}

interface ParsedDietPlan {
  detected_format_ok: boolean;
  warnings: string[];
  days: ParsedDay[];
}

// ─── Validazione input ────────────────────────────────────────────────────────

function validateBody(body: unknown): body is RequestBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (typeof b.pdfBase64 !== "string" || b.pdfBase64.trim().length === 0) return false;
  if (typeof b.mimeType !== "string" || b.mimeType.trim().length === 0) return false;
  return true;
}

// ─── Catalogo alimenti ──────────────────────────────────────────────────────
// Recuperiamo l'intero catalogo (foods + food_categories) per iniettarlo nel
// prompt: Gemini deve abbinare semanticamente ogni alimento del PDF a un id
// reale del catalogo, non inventarne uno.

interface FoodRow {
  id: string;
  name: string;
  standard_portion_g: number | string;
  food_categories: { name: string } | { name: string }[] | null;
}

// Alias riutilizzato per il tipo del client: passare due volte
// `ReturnType<typeof createClient>` in punti diversi porta a due
// istanziazioni generiche distinte (e quindi incompatibili) in TypeScript.
type SupabaseAdmin = ReturnType<typeof createClient>;

async function fetchFoodCatalog(
  supabaseAdmin: SupabaseAdmin
): Promise<FoodCatalogItem[]> {
  const { data, error } = await supabaseAdmin
    .from("foods")
    .select("id, name, standard_portion_g, food_categories(name)")
    .order("name");

  if (error) {
    throw new Error(`Errore recupero catalogo alimenti: ${error.message}`);
  }
  if (!data || data.length === 0) {
    throw new Error("Catalogo alimenti vuoto: impossibile procedere con l'abbinamento");
  }

  return (data as unknown as FoodRow[]).map((row) => {
    const rel = row.food_categories;
    const categoryName = Array.isArray(rel) ? rel[0]?.name : rel?.name;
    return {
      id: row.id,
      name: row.name,
      category_name: categoryName ?? "Senza categoria",
      standard_portion_g: Number(row.standard_portion_g) || 0,
    };
  });
}

// Formato compatto: una riga per alimento, id|nome|categoria|porzione_standard_g.
// Con ~158 alimenti resta comunque leggibile e non va troncato: il modello ha
// bisogno della lista COMPLETA per poter dire "nessun match" con cognizione di causa.
function formatCatalog(items: FoodCatalogItem[]): string {
  return items.map((f) => `${f.id}|${f.name}|${f.category_name}|${f.standard_portion_g}`).join("\n");
}

// ─── Costruzione del prompt ───────────────────────────────────────────────────

function buildPrompt(catalogText: string): string {
  return `Sei un assistente esperto in estrazione di dati nutrizionali da documenti PDF. Riceverai in allegato il PDF di un piano alimentare settimanale e devi estrarne la struttura in formato JSON, abbinando ogni alimento a una voce del catalogo fornito.

CATALOGO ALIMENTI DISPONIBILE (una riga per alimento, formato: id|nome|categoria|porzione_standard_g):
${catalogText}

REGOLE OBBLIGATORIE:
1. Analizza il PDF allegato: è atteso un piano alimentare settimanale con pasti organizzati per giorno e relative grammature in grammi.
2. Se il documento allegato NON sembra affatto un piano alimentare settimanale con grammature (es. è un documento di altro tipo, una pagina illeggibile, un testo generico senza pasti/grammi), imposta "detected_format_ok": false e restituisci "days": []. NON inventare una struttura plausibile solo per riempire il JSON: è meglio dichiarare il fallimento che restituire dati fabbricati.
3. Se il documento È un piano alimentare ma alcuni giorni non hanno pasti chiaramente identificabili, mantieni "detected_format_ok": true, includi comunque quei giorni con "meals": [] e aggiungi una voce in "warnings" che lo segnali.
4. "day_of_week" è un intero da 0 (Lunedì) a 6 (Domenica): deducilo dall'intestazione della sezione nel PDF (es. "Lunedì", "Giorno 1", nomi dei giorni in italiano o abbreviati).
5. "meal_type" deve essere ESATTAMENTE uno di questi 5 valori, senza eccezioni e senza inventarne altri: "colazione", "spuntino_mattutino", "pranzo", "spuntino_pomeridiano", "cena". Se il PDF usa etichette diverse (es. "merenda" = spuntino_pomeridiano) deducine il significato più plausibile in base all'orario o alla posizione nel documento, ma usa SEMPRE uno di questi 5 valori esatti come output.
6. Per ogni alimento elencato in un pasto, popola:
   - "raw_name": il nome dell'alimento come scritto nel PDF (trascrizione fedele, anche se manoscritto).
   - "matched_food_id": l'id del catalogo che corrisponde SEMANTICAMENTE all'alimento, gestendo le normali variazioni di formulazione e morfologia italiana (es. "petto di pollo" deve corrispondere a una voce catalogo tipo "Pollo, petto"; "olio evo" a "Olio extravergine di oliva"; plurali, sinonimi, ordine delle parole invertito sono tutti ammessi). Se NON esiste alcuna corrispondenza ragionevole nel catalogo, usa null: non forzare mai un abbinamento sbagliato solo per restituire un id.
   - "confidence": una tua autovalutazione onesta dell'abbinamento, uno tra "high" (corrispondenza chiara), "medium" (plausibile ma con qualche incertezza), "low" (abbinamento incerto o assente).
   - "portion_g": la grammatura in grammi, come numero puro. Se il PDF indica la porzione in un'altra unità (es. "1 uovo", "2 fette", "1 cucchiaio") stima i grammi usando la porzione standard del catalogo per l'alimento abbinato e segnala l'assunzione fatta in "warnings".
7. Popola "warnings" (array di stringhe leggibili in ITALIANO) con qualunque cosa tu non sia riuscito a risolvere con piena certezza: un giorno senza pasti individuabili, una grammatura ambigua o assente, testo manoscritto poco leggibile, un alimento senza corrispondenza nel catalogo, un'unità di misura convertita in grammi, pasti duplicati nello stesso giorno, ecc. Se non c'è nulla da segnalare, restituisci un array vuoto.
8. Rispondi ESCLUSIVAMENTE con il JSON valido, senza blocchi \`\`\`json, senza testo o spiegazioni prima o dopo.

FORMATO DI OUTPUT OBBLIGATORIO (rispetta esattamente questi nomi di campo e questa struttura):
{
  "detected_format_ok": true,
  "warnings": ["stringa leggibile in italiano", "..."],
  "days": [
    {
      "day_of_week": 0,
      "meals": [
        {
          "meal_type": "colazione",
          "foods": [
            { "raw_name": "Petto di pollo", "matched_food_id": "uuid-oppure-null", "confidence": "high", "portion_g": 150 }
          ]
        }
      ]
    }
  ]
}`;
}

// ─── Normalizzazione meal_type ─────────────────────────────────────────────
// Il prompt impone i 5 valori esatti, ma i modelli a volte disobbediscono
// (specie con PDF ambigui). Normalizziamo le varianti INEQUIVOCABILI; per le
// varianti ambigue (es. "spuntino" senza qualificatore) rifiutiamo invece di
// indovinare mattutino/pomeridiano: meglio scartare con warning che inventare.

const MEAL_TYPE_SYNONYMS: Record<string, MealType> = {
  merenda: "spuntino_pomeridiano",
  spuntino_mattina: "spuntino_mattutino",
  spuntino_del_mattino: "spuntino_mattutino",
  spuntino_pomeriggio: "spuntino_pomeridiano",
  spuntino_del_pomeriggio: "spuntino_pomeridiano",
};

function normalizeMealType(raw: unknown): MealType | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if ((VALID_MEAL_TYPES as readonly string[]).includes(v)) return v as MealType;
  return MEAL_TYPE_SYNONYMS[v] ?? null;
}

// ─── Parsing e validazione dell'output Gemini ─────────────────────────────────
// Gemini a volte avvolge il JSON in un blocco markdown ```json ... ```.
// Validazione difensiva: i problemi strutturali fondamentali (campi radice
// mancanti/di tipo sbagliato) fanno rigettare l'intera risposta (si tenta il
// modello successivo); i problemi puntuali (un giorno o un alimento malformato)
// vengono scartati singolarmente con un warning, per non buttare via
// un'estrazione altrimenti valida a causa di un singolo elemento imperfetto.

function parseAndValidateDiet(text: string, validFoodIds: Set<string>): ParsedDietPlan {
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

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Struttura JSON radice non valida");
  }
  const root = parsed as Record<string, unknown>;

  if (typeof root.detected_format_ok !== "boolean") {
    throw new Error("Campo 'detected_format_ok' mancante o non booleano: risposta fondamentalmente non valida");
  }
  if (!Array.isArray(root.days)) {
    throw new Error("Campo 'days' mancante o non è un array: risposta fondamentalmente non valida");
  }

  const warnings: string[] = Array.isArray(root.warnings)
    ? root.warnings.filter((w): w is string => typeof w === "string" && w.trim().length > 0)
    : [];

  const days: ParsedDay[] = [];

  for (const rawDay of root.days) {
    if (!rawDay || typeof rawDay !== "object") {
      warnings.push("Un elemento in 'days' era malformato ed è stato ignorato.");
      continue;
    }
    const d = rawDay as Record<string, unknown>;
    const dayOfWeek = Number(d.day_of_week);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      warnings.push(`Giorno con indice non valido ("${String(d.day_of_week)}") ignorato.`);
      continue;
    }

    if (!Array.isArray(d.meals)) {
      warnings.push(`Giorno ${dayOfWeek}: nessun pasto individuato o formato non valido.`);
      days.push({ day_of_week: dayOfWeek, meals: [] });
      continue;
    }
    if (d.meals.length === 0) {
      warnings.push(`Giorno ${dayOfWeek}: nessun pasto individuato nel PDF.`);
    }

    // I pasti con lo stesso meal_type nello stesso giorno vengono uniti: a valle
    // esiste un vincolo UNIQUE(weekly_plan_id, day_of_week, meal_type), quindi
    // due "pranzo" nello stesso giorno romperebbero l'inserimento successivo.
    const mealsByType = new Map<MealType, ParsedFoodItem[]>();

    for (const rawMeal of d.meals) {
      if (!rawMeal || typeof rawMeal !== "object") {
        warnings.push(`Giorno ${dayOfWeek}: un pasto malformato è stato ignorato.`);
        continue;
      }
      const m = rawMeal as Record<string, unknown>;
      const mealType = normalizeMealType(m.meal_type);
      if (!mealType) {
        warnings.push(`Giorno ${dayOfWeek}: tipo di pasto non riconosciuto ("${String(m.meal_type)}") e ignorato.`);
        continue;
      }
      if (!Array.isArray(m.foods)) {
        warnings.push(`Giorno ${dayOfWeek}, ${mealType}: elenco alimenti mancante o non valido.`);
        continue;
      }

      const foods: ParsedFoodItem[] = [];
      for (const rawFood of m.foods) {
        if (!rawFood || typeof rawFood !== "object") {
          warnings.push(`Giorno ${dayOfWeek}, ${mealType}: un alimento malformato è stato ignorato.`);
          continue;
        }
        const f = rawFood as Record<string, unknown>;

        const rawName = typeof f.raw_name === "string" ? f.raw_name.trim() : "";
        if (!rawName) {
          warnings.push(`Giorno ${dayOfWeek}, ${mealType}: alimento senza nome ignorato.`);
          continue;
        }

        const portionG = Number(f.portion_g);
        if (!Number.isFinite(portionG) || portionG <= 0) {
          warnings.push(`Giorno ${dayOfWeek}, ${mealType}: grammatura non valida per "${rawName}", alimento ignorato.`);
          continue;
        }

        // Non fidarsi ciecamente dell'id restituito: se il modello ha
        // "allucinato" un uuid inesistente nel catalogo, un downstream insert
        // fallirebbe per violazione della foreign key. Meglio null + warning.
        let matchedFoodId: string | null = typeof f.matched_food_id === "string" ? f.matched_food_id : null;
        if (matchedFoodId && !validFoodIds.has(matchedFoodId)) {
          warnings.push(`Giorno ${dayOfWeek}, ${mealType}: id di catalogo non valido per "${rawName}", trattato come non abbinato.`);
          matchedFoodId = null;
        }

        let confidence = typeof f.confidence === "string" ? f.confidence.toLowerCase() : "";
        if (!(VALID_CONFIDENCE as readonly string[]).includes(confidence)) {
          confidence = "low";
        }

        foods.push({
          raw_name: rawName,
          matched_food_id: matchedFoodId,
          confidence: confidence as Confidence,
          portion_g: Math.round(portionG * 10) / 10,
        });
      }

      if (foods.length === 0) {
        warnings.push(`Giorno ${dayOfWeek}, ${mealType}: nessun alimento valido, pasto ignorato.`);
        continue;
      }

      if (mealsByType.has(mealType)) {
        mealsByType.get(mealType)!.push(...foods);
        warnings.push(`Giorno ${dayOfWeek}: più occorrenze di "${mealType}" sono state unite in un unico pasto.`);
      } else {
        mealsByType.set(mealType, foods);
      }
    }

    const meals: ParsedMeal[] = Array.from(mealsByType.entries()).map(([meal_type, mealFoods]) => ({
      meal_type,
      foods: mealFoods,
    }));

    days.push({ day_of_week: dayOfWeek, meals });
  }

  return {
    detected_format_ok: root.detected_format_ok,
    warnings,
    days,
  };
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
      JSON.stringify({ error: "Servizio di analisi PDF non disponibile" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY non configurate nell'ambiente Supabase");
    return new Response(
      JSON.stringify({ error: "Servizio di analisi PDF non disponibile (configurazione mancante)" }),
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
          error: "Parametri non validi. Sono obbligatori: pdfBase64 (stringa non vuota) e mimeType (stringa non vuota)",
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

  if (!body.mimeType.toLowerCase().startsWith("application/pdf")) {
    return new Response(
      JSON.stringify({ error: "mimeType non supportato: è atteso 'application/pdf'" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // Stima della dimensione decodificata senza decodificare (base64 -> ~0.75x byte).
  // Evita di allocare/decodificare stringhe enormi solo per scoprire che sono
  // troppo grandi, e lascia margine sotto il limite di 20MB di Gemini.
  const approxDecodedBytes = body.pdfBase64.length * 0.75;
  if (approxDecodedBytes > MAX_PDF_BYTES) {
    return new Response(
      JSON.stringify({
        error: `Il PDF è troppo grande (~${(approxDecodedBytes / (1024 * 1024)).toFixed(1)}MB). Limite massimo: ${MAX_PDF_BYTES / (1024 * 1024)}MB.`,
      }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const supabaseAdmin: SupabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── Recupero catalogo alimenti da iniettare nel prompt ──────────────────
  let catalog: FoodCatalogItem[];
  try {
    catalog = await fetchFoodCatalog(supabaseAdmin);
  } catch (catalogErr) {
    console.error("Errore recupero catalogo alimenti:", catalogErr);
    return new Response(
      JSON.stringify({ error: "Impossibile recuperare il catalogo alimenti. Riprova tra qualche istante." }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const validFoodIds = new Set(catalog.map((f) => f.id));
  const prompt = buildPrompt(formatCatalog(catalog));

  // ── Fallback automatico sui modelli ─────────────────────────────────────
  // Il body va ricostruito per ogni modello: ciascuno ha un maxOutputTokens
  // diverso (vedi commento su MODELS), non è più un valore uniforme.
  let lastError = "";
  for (const model of MODELS) {
    const geminiBody = JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            // Forma REST ufficiale di Gemini per i dati inline (snake_case,
            // vedi https://ai.google.dev/api/generate-content): inline_data / mime_type.
            {
              inline_data: {
                mime_type: body.mimeType,
                data: body.pdfBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        // Temperatura bassa: è un compito di estrazione strutturata, non di
        // creatività. 0.2 privilegia fedeltà al documento e coerenza del JSON.
        temperature: 0.2,
        maxOutputTokens: model.maxOutputTokens,
        ...(model.thinkingBudget !== undefined && {
          thinkingConfig: { thinkingBudget: model.thinkingBudget },
        }),
      },
    });

    let response: Response;
    try {
      response = await fetch(`${model.url}?key=${GEMINI_API_KEY}`, {
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
      console.error(`Gemini model ${model.url} error:`, lastError);
      // 400 è permanente (prompt/payload malformato): inutile ritentare con altri modelli
      if (response.status === 400) break;
      continue;
    }

    const data = await response.json();

    const finishReason = data?.candidates?.[0]?.finishReason;
    if (finishReason === "MAX_TOKENS") {
      console.warn(`Gemini model ${model.url}: output troncato per limite di token (MAX_TOKENS, tetto ${model.maxOutputTokens})`);
    }

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
    let result: ParsedDietPlan;
    try {
      result = parseAndValidateDiet(text, validFoodIds);
    } catch (parseErr) {
      lastError = `Errore parsing risposta: ${parseErr}`;
      console.error(lastError, "| Raw text:", text.slice(0, 500));
      continue;
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  console.error("Tutti i modelli Gemini non disponibili. Ultimo errore:", lastError);
  return new Response(
    JSON.stringify({ error: "Analisi del PDF non disponibile al momento. Riprova tra qualche istante." }),
    { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
});
