/**
 * bodweightVolumeService.ts
 *
 * Calcola il volume effettivo per gli esercizi a corpo libero.
 *
 * Problema: quando l'utente non inserisce un peso (esercizi bodyweight come
 * push-up, pull-up, dip, ecc.), il campo `weight` in `set_logs` viene salvato
 * come 0 o NULL. Questo fa sì che il volume nel dashboard rimanga a 0,
 * rendendo i grafici inutili per chi si allena prevalentemente a corpo libero.
 *
 * Soluzione: stimare il peso effettivo moltiplicando il peso corporeo dell'utente
 * per una percentuale basata sul tipo di esercizio. La stima è conservativa
 * e segue le percentuali validate dalla letteratura biomeccanica.
 *
 * Fonte percentuali:
 * - Push-up: ~65% BW (Suprak et al., Journal of Strength & Conditioning)
 * - Pull-up / Chin-up: ~100% BW (tutto il peso viene sollevato)
 * - Dip: ~80% BW (stima conservativa per dip con appoggio parziale)
 * - Squat / Lunge / Step-up: ~67% BW (peso del corpo meno il contributo del suolo)
 * - Default (esercizi BW non riconosciuti): ~70% BW
 */

/** Peso corporeo di fallback (kg) usato quando l'utente non ha registrato misurazioni. */
export const DEFAULT_BODYWEIGHT_KG = 70;

/**
 * Mappa di keyword → percentuale del peso corporeo.
 * L'ordine conta: le prime corrispondenze hanno priorità.
 * Le keyword sono testate in lowercase sul nome dell'esercizio.
 */
const BODYWEIGHT_PERCENTAGE_RULES: Array<{ keywords: string[]; percentage: number }> = [
  // Pull-up / Chin-up: 100% BW
  { keywords: ["pull-up", "pullup", "pull up", "chin-up", "chinup", "chin up", "trazioni"], percentage: 1.0 },

  // Dip: 80% BW
  { keywords: ["dip", "dips", "parallel bar", "piegamenti alle parallele"], percentage: 0.8 },

  // Push-up: 65% BW
  { keywords: ["push-up", "pushup", "push up", "piegamenti", "flessioni"], percentage: 0.65 },

  // Squat / Lunge / Step-up: 67% BW
  {
    keywords: [
      "squat",
      "lunge",
      "affondo",
      "step-up",
      "step up",
      "stepup",
      "pistol",
      "bulgarian",
      "sissy",
    ],
    percentage: 0.67,
  },

  // Australian row / inverted row: 70% BW (approssimato)
  { keywords: ["australian", "inverted row", "ring row"], percentage: 0.7 },

  // Dip a corpo libero su anelli / sedia: già coperto da "dip" sopra
];

/**
 * Restituisce la percentuale di peso corporeo da applicare a un dato esercizio.
 * Se nessuna keyword corrisponde, restituisce il default (0.7 = 70%).
 */
export function getBodyweightPercentage(exerciseName: string): number {
  const lower = exerciseName.toLowerCase();
  for (const rule of BODYWEIGHT_PERCENTAGE_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.percentage;
    }
  }
  return 0.7; // default per esercizi bodyweight non riconosciuti
}

/**
 * Calcola il peso effettivo da usare per il volume di un set.
 *
 * - Se `weight` è > 0: l'utente ha inserito un peso esplicito, lo usa direttamente.
 * - Se `weight` è 0 o null e `isBodyweight` è true: stima il peso dal bodyweight.
 * - Se `weight` è 0 o null e `isBodyweight` è false: peso 0 (es. esercizio non classificato).
 *
 * @param weight              Peso registrato nel set (null o 0 = non inserito)
 * @param exerciseName        Nome dell'esercizio (usato per identificare il tipo BW)
 * @param userBodyweight      Peso corporeo dell'utente in kg
 * @param overridePercentage  (opzionale) Percentuale BW da usare al posto del lookup
 *                            keyword. Utile quando la percentuale è già nota (es. da AI).
 *                            Viene applicata solo se `weight` è 0/null.
 * @returns                   Peso effettivo in kg da usare nel calcolo del volume
 */
export function getEffectiveWeight(
  weight: number | null,
  exerciseName: string,
  userBodyweight: number,
  overridePercentage?: number
): number {
  // Se c'è un peso esplicito (> 0), usalo senza alterazioni
  if (weight !== null && weight > 0) return weight;

  // Se viene fornita una percentuale di override, ha precedenza sul lookup keyword
  if (overridePercentage !== undefined) {
    return Math.round(userBodyweight * overridePercentage * 10) / 10;
  }

  // Peso non inserito: controlla se è un esercizio bodyweight per nome
  const percentage = detectBodyweightPercentage(exerciseName);
  if (percentage !== null) {
    return Math.round(userBodyweight * percentage * 10) / 10;
  }

  // Non riconosciuto come bodyweight: volume 0 (manteniamo il comportamento originale)
  return 0;
}

/**
 * Controlla se un nome di esercizio corrisponde a un pattern bodyweight.
 * @returns La percentuale da applicare, o null se non è un esercizio bodyweight.
 */
function detectBodyweightPercentage(exerciseName: string): number | null {
  const lower = exerciseName.toLowerCase();
  for (const rule of BODYWEIGHT_PERCENTAGE_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.percentage;
    }
  }
  return null;
}

/**
 * Calcola il volume di un singolo set, gestendo esercizi bodyweight.
 *
 * @param weight              Peso registrato (null o 0 = bodyweight)
 * @param reps                Ripetizioni
 * @param exerciseName        Nome dell'esercizio
 * @param userBodyweight      Peso corporeo dell'utente in kg
 * @param overridePercentage  (opzionale) Percentuale BW da passare a `getEffectiveWeight`
 * @returns                   Volume del set (peso_effettivo × reps)
 */
export function calculateSetVolume(
  weight: number | null,
  reps: number,
  exerciseName: string,
  userBodyweight: number,
  overridePercentage?: number
): number {
  const effectiveWeight = getEffectiveWeight(weight, exerciseName, userBodyweight, overridePercentage);
  return effectiveWeight * reps;
}
