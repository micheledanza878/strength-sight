const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODELS = [
  'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent',
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent',
];

export interface MealFood {
  name: string;
  portion: number;
  categoryName: string;
}

export async function generateRecipe(mealType: string, foods: MealFood[]): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('VITE_GEMINI_API_KEY non configurata');

  const ingredientsList = foods
    .map(f => `- ${f.name}: ${f.portion}g`)
    .join('\n');

  const mealLabel = mealType === 'colazione' ? 'colazione' : mealType === 'pranzo' ? 'pranzo' : 'cena';

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

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
  });

  let lastError = '';
  for (const modelUrl of MODELS) {
    const response = await fetch(`${modelUrl}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      lastError = err?.error?.message || `HTTP ${response.status}`;
      // retry on overload (503) or quota (429), skip on bad request (400)
      if (response.status === 400) break;
      continue;
    }

    const data = await response.json();
    const parts: Array<{ text?: string; thought?: boolean }> =
      data?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.filter(p => !p.thought).map(p => p.text ?? '').join('');
    if (text) return text;
    lastError = 'Risposta vuota';
  }

  throw new Error(lastError || 'Tutti i modelli non disponibili');
}
