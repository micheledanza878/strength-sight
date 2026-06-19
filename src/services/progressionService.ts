/**
 * progressionService.ts
 *
 * Implementa l'algoritmo di Double Progression:
 * - Se nella sessione precedente l'utente ha completato TUTTI i set di un esercizio
 *   raggiungendo o superando il numero massimo di reps previste (reps_max),
 *   viene suggerito un incremento di peso per la sessione corrente.
 * - Altrimenti il peso rimane invariato (nessun suggerimento).
 *
 * L'incremento è differenziato per tipo di esercizio:
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

export interface ProgressionSuggestion {
  /** true → suggerisci incremento; false → mantieni stesso peso */
  shouldIncrease: boolean;
  /** kg da aggiungere (0 se shouldIncrease è false) */
  increment: number;
  /** peso suggerito per la prossima sessione (prevWeight + increment) */
  suggestedWeight: number;
}

/**
 * Calcola il suggerimento di progressione per un singolo esercizio.
 *
 * @param exerciseName  - Nome dell'esercizio (usato per capire se è compound)
 * @param repsMax       - Numero massimo di reps previsto dalla scheda (reps_max)
 * @param expectedSets  - Numero di serie previste dalla scheda
 * @param prevSets      - Set eseguiti nella sessione precedente: { reps, weight }[]
 *
 * La condizione per l'incremento è:
 *   - Ci sono dati dalla sessione precedente
 *   - Il numero di set completati è >= a quelli previsti
 *   - In OGNI set, le reps eseguite >= reps_max
 */
export function calculateProgression(
  exerciseName: string,
  repsMax: number | null,
  expectedSets: number,
  prevSets: { reps: number; weight: number }[]
): ProgressionSuggestion {
  // Nessun dato precedente → niente suggerimento
  if (!prevSets || prevSets.length === 0) {
    return { shouldIncrease: false, increment: 0, suggestedWeight: 0 };
  }

  // Se reps_max non è definito non possiamo valutare la soglia
  if (repsMax === null || repsMax <= 0) {
    return { shouldIncrease: false, increment: 0, suggestedWeight: 0 };
  }

  // Il peso di riferimento è quello usato nel primo set della sessione precedente
  // (assumiamo peso costante per tutti i set, come è comune nella pratica)
  const prevWeight = prevSets[0]?.weight ?? 0;
  if (prevWeight <= 0) {
    return { shouldIncrease: false, increment: 0, suggestedWeight: 0 };
  }

  // Controlla che ci siano abbastanza set e che tutti abbiano reps >= reps_max
  const relevantSets = prevSets.slice(0, expectedSets);
  const allSetsMaxReps =
    relevantSets.length >= expectedSets &&
    relevantSets.every((s) => s.reps >= repsMax);

  if (!allSetsMaxReps) {
    return { shouldIncrease: false, increment: 0, suggestedWeight: prevWeight };
  }

  const increment = getSuggestedIncrement(exerciseName);
  return {
    shouldIncrease: true,
    increment,
    suggestedWeight: prevWeight + increment,
  };
}
