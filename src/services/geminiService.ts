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

  const prompt = `Sei un esperto chef e nutrizionista italiano. Devo preparare la ${mealLabel} con ESATTAMENTE questi ingredienti e grammature:
${ingredientsList}

Crea una ricetta semplice e gustosa che utilizzi ESATTAMENTE questi ingredienti rispettando LE GRAMMATURE indicate. Non aggiungere altri ingredienti principali (solo sale, pepe e spezie a piacere sono permessi).

Rispondi in italiano con questo formato:
**Nome del piatto**: [nome creativo]
**Ingredienti**: [lista con grammature]
**Preparazione**: [steps numerati, max 5 passaggi]
**Tempo di preparazione**: [minuti totali]
**Consiglio dello chef**: [un suggerimento breve]`;

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
