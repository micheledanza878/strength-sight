/**
 * progressionService.ts
 *
 * Implementa l'algoritmo di Double Progression:
 * - Se nella sessione precedente l'utente ha completato TUTTI i set di un esercizio
 *   raggiungendo o superando il numero massimo di reps previste (reps_max),
 *   viene suggerito un incremento di peso per la sessione corrente, e le reps
 *   ripartono dal minimo del range (reps_min) sul nuovo peso.
 * - Altrimenti il peso rimane invariato e la progressione avviene sulle reps:
 *   ogni set punta a +1 rep rispetto allo stesso set della sessione precedente
 *   (fino al tetto reps_max), così ogni allenamento prova a fare meglio del
 *   precedente anche senza aver ancora raggiunto reps_max.
 *
 * L'incremento di peso è differenziato per tipo di esercizio:
 * - Esercizi compound (squat, deadlift, bench press, row, press...): +5kg
 * - Esercizi isolati / accessori: +2.5kg
 */

/** Lista di parole chiave che identificano esercizi compound (multi-articolari). */
const COMPOUND_KEYWORDS = [
  "squat",
  "deadlift",
  "stacco",
  "bench",
  "panca",
  "row",
  "rematore",
  "pull-up",
  "pullup",
  "chin-up",
  "chinup",
  "press",
  "overhead",
  "leg press",
  "hip thrust",
  "Romanian",
  "RDL",
  "clean",
  "snatch",
  "farmer",
];

/**
 * Determina se un esercizio è compound in base al nome.
 * Il confronto è case-insensitive.
 */
export function isCompoundExercise(exerciseName: string): boolean {
  const lower = exerciseName.toLowerCase();
  return COMPOUND_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

/**
 * Calcola l'incremento di peso suggerito (in kg) per un esercizio.
 * Ritorna 2.5 per gli isolati, 5 per i compound.
 */
export function getSuggestedIncrement(exerciseName: string): number {
  return isCompoundExercise(exerciseName) ? 5 : 2.5;
}

export interface UnitProgression {
  /** true quando TUTTI i set hanno raggiunto (o superato) `max` nella sessione precedente */
  reachedCeiling: boolean;
  /**
   * Target per ogni set (stessa lunghezza di expectedSets): se reachedCeiling è
   * true, tutti ripartono da `min`; altrimenti ognuno è il valore dello stesso
   * set della sessione precedente +1, senza superare `max`.
   * Vuoto quando non ci sono abbastanza dati per calcolarlo.
   */
  suggestedValues: number[];
}

/**
 * Progressione generica "+1 unità per set rispetto alla sessione precedente,
 * fino al tetto `max`": è il nucleo condiviso da reps (double progression a
 * peso), secondi di tenuta e target delle skill — stessa logica, unità diversa.
 *
 * @param resetOnCeiling  Quando il tetto è raggiunto su tutti i set, di default
 *  (true) i target ripartono da `min` — corretto per peso/reps e tenute
 *  semplici, dove raggiungere il tetto fa scattare subito una variabile nuova
 *  (peso più alto). Per le skill invece lo step (quindi il target) cambia solo
 *  dopo N sedute consecutive pulite, decise altrove: qui va passato `false`
 *  così il suggerimento resta fermo al tetto finché lo step non cambia
 *  davvero, invece di far sembrare un regresso ogni volta che lo si tocca.
 */
export function calculateUnitProgression(
  min: number | null,
  max: number | null,
  expectedSets: number,
  prevValues: number[],
  resetOnCeiling: boolean = true
): UnitProgression {
  if (!prevValues || prevValues.length === 0 || max === null || max <= 0) {
    return { reachedCeiling: false, suggestedValues: [] };
  }

  const relevant = prevValues.slice(0, expectedSets);
  const reachedCeiling = relevant.length >= expectedSets && relevant.every((v) => v >= max);

  if (reachedCeiling) {
    const target = resetOnCeiling ? min ?? max : max;
    return { reachedCeiling: true, suggestedValues: Array.from({ length: expectedSets }, () => target) };
  }

  const suggestedValues = Array.from({ length: expectedSets }, (_, i) => {
    const prev = relevant[i] ?? min ?? max;
    return Math.min(prev + 1, max);
  });
  return { reachedCeiling: false, suggestedValues };
}

export interface ProgressionSuggestion {
  /** true → suggerisci incremento di peso; false → stesso peso, si punta sulle reps */
  shouldIncrease: boolean;
  /** kg da aggiungere (0 se shouldIncrease è false) */
  increment: number;
  /** peso suggerito per la prossima sessione (prevWeight + increment, o prevWeight invariato) */
  suggestedWeight: number;
  /**
   * Reps target per ogni set (stesso ordine/lunghezza di expectedSets).
   * Se shouldIncrease è true: tutti i set ripartono da reps_min (nuovo peso, nuovo ciclo).
   * Altrimenti: ogni set punta a +1 rep rispetto allo stesso set della sessione
   * precedente, senza superare reps_max.
   * Vuoto quando non ci sono abbastanza dati per calcolare un target.
   */
  suggestedReps: number[];
}

/**
 * Calcola il suggerimento di progressione per un singolo esercizio.
 *
 * @param exerciseName  - Nome dell'esercizio (usato per capire se è compound)
 * @param repsMax       - Numero massimo di reps previsto dalla scheda (reps_max)
 * @param expectedSets  - Numero di serie previste dalla scheda
 * @param prevSets      - Set eseguiti nella sessione precedente: { reps, weight }[]
 * @param repsMin       - Numero minimo di reps previsto dalla scheda (reps_min),
 *                        usato come punto di ripartenza quando il peso sale
 *
 * La condizione per l'incremento di peso è:
 *   - Ci sono dati dalla sessione precedente
 *   - Il numero di set completati è >= a quelli previsti
 *   - In OGNI set, le reps eseguite >= reps_max
 * In tutti gli altri casi (dati sufficienti ma reps_max non ancora raggiunto in
 * tutti i set) la progressione avviene sulle reps, set per set, rispetto alla
 * stessa sessione precedente — non serve aspettare di toccare il tetto.
 */
export function calculateProgression(
  exerciseName: string,
  repsMax: number | null,
  expectedSets: number,
  prevSets: { reps: number; weight: number }[],
  repsMin: number | null = null
): ProgressionSuggestion {
  // Nessun dato precedente → niente suggerimento
  if (!prevSets || prevSets.length === 0) {
    return { shouldIncrease: false, increment: 0, suggestedWeight: 0, suggestedReps: [] };
  }

  // Se reps_max non è definito non possiamo valutare la soglia
  if (repsMax === null || repsMax <= 0) {
    return { shouldIncrease: false, increment: 0, suggestedWeight: 0, suggestedReps: [] };
  }

  // Il peso di riferimento è quello usato nel primo set della sessione precedente
  // (assumiamo peso costante per tutti i set, come è comune nella pratica)
  const prevWeight = prevSets[0]?.weight ?? 0;
  if (prevWeight <= 0) {
    return { shouldIncrease: false, increment: 0, suggestedWeight: 0, suggestedReps: [] };
  }

  const repsProgression = calculateUnitProgression(
    repsMin,
    repsMax,
    expectedSets,
    prevSets.map((s) => s.reps)
  );

  if (repsProgression.reachedCeiling) {
    const increment = getSuggestedIncrement(exerciseName);
    return {
      shouldIncrease: true,
      increment,
      suggestedWeight: prevWeight + increment,
      suggestedReps: repsProgression.suggestedValues,
    };
  }

  return {
    shouldIncrease: false,
    increment: 0,
    suggestedWeight: prevWeight,
    suggestedReps: repsProgression.suggestedValues,
  };
}
