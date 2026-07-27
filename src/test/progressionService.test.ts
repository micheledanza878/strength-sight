/**
 * progressionService.test.ts
 *
 * Testa la logica di Double Progression:
 * - Classificazione compound vs isolato
 * - Incremento suggerito corretto per categoria
 * - calculateProgression: tutte le condizioni di avanzamento e non
 *
 * Nessuna dipendenza esterna: la logica è pura (no I/O, no DB).
 */

import { describe, it, expect } from "vitest";
import {
  isCompoundExercise,
  getSuggestedIncrement,
  calculateProgression,
  calculateUnitProgression,
} from "@/services/progressionService";

// ---------------------------------------------------------------------------
// isCompoundExercise
// ---------------------------------------------------------------------------

describe("isCompoundExercise", () => {
  it("riconosce esercizi compound con keyword esatta (case-insensitive)", () => {
    expect(isCompoundExercise("Bench Press")).toBe(true);
    expect(isCompoundExercise("SQUAT")).toBe(true);
    expect(isCompoundExercise("Deadlift")).toBe(true);
    expect(isCompoundExercise("Stacco da terra")).toBe(true);
    expect(isCompoundExercise("Rematore con bilanciere")).toBe(true);
    expect(isCompoundExercise("Pull-up")).toBe(true);
    expect(isCompoundExercise("Hip Thrust")).toBe(true);
    expect(isCompoundExercise("Romanian Deadlift")).toBe(true);
  });

  it("classifica come isolato esercizi che non contengono keyword compound", () => {
    expect(isCompoundExercise("Curl con manubri")).toBe(false);
    expect(isCompoundExercise("Lateral raise")).toBe(false);
    expect(isCompoundExercise("Leg extension")).toBe(false);
    expect(isCompoundExercise("Crunch")).toBe(false);
    expect(isCompoundExercise("Tricep kickback")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getSuggestedIncrement
// ---------------------------------------------------------------------------

describe("getSuggestedIncrement", () => {
  it("ritorna 5 kg per esercizi compound", () => {
    expect(getSuggestedIncrement("Squat")).toBe(5);
    expect(getSuggestedIncrement("Overhead Press")).toBe(5);
  });

  it("ritorna 2.5 kg per esercizi isolati", () => {
    expect(getSuggestedIncrement("Curl con bilanciere")).toBe(2.5);
    expect(getSuggestedIncrement("Leg extension")).toBe(2.5);
  });
});

// ---------------------------------------------------------------------------
// calculateProgression — helper per costruire set uniformi
// ---------------------------------------------------------------------------

/** Genera `count` set tutti con le stesse reps e weight. */
function buildSets(
  count: number,
  reps: number,
  weight: number
): { reps: number; weight: number }[] {
  return Array.from({ length: count }, () => ({ reps, weight }));
}

describe("calculateProgression", () => {
  // --- Caso: nessun dato precedente ---

  it("non suggerisce incremento se non ci sono set precedenti", () => {
    const result = calculateProgression("Bench Press", 10, 3, []);
    expect(result.shouldIncrease).toBe(false);
    expect(result.increment).toBe(0);
    expect(result.suggestedWeight).toBe(0);
  });

  // --- Caso: repsMax null o non valido ---

  it("non suggerisce incremento se repsMax è null", () => {
    const result = calculateProgression("Squat", null, 3, buildSets(3, 10, 100));
    expect(result.shouldIncrease).toBe(false);
  });

  it("non suggerisce incremento se repsMax è 0", () => {
    const result = calculateProgression("Squat", 0, 3, buildSets(3, 5, 100));
    expect(result.shouldIncrease).toBe(false);
  });

  // --- Caso: tutti i reps raggiunti — esercizio compound ---

  it("suggerisce +5 kg per compound quando tutti i set raggiungono repsMax", () => {
    // 3 set da 10 reps su 80 kg — soglia è 10 reps
    const result = calculateProgression("Bench Press", 10, 3, buildSets(3, 10, 80));

    expect(result.shouldIncrease).toBe(true);
    expect(result.increment).toBe(5);
    expect(result.suggestedWeight).toBe(85);
  });

  it("suggerisce incremento anche se i reps superano repsMax (>=, non solo ==)", () => {
    // Atleta ha fatto 12 reps quando il piano prevedeva max 10
    const result = calculateProgression("Squat", 10, 3, buildSets(3, 12, 100));

    expect(result.shouldIncrease).toBe(true);
    expect(result.increment).toBe(5);
    expect(result.suggestedWeight).toBe(105);
  });

  // --- Caso: tutti i reps raggiunti — esercizio isolato ---

  it("suggerisce +2.5 kg per esercizio isolato quando tutti i set raggiungono repsMax", () => {
    const result = calculateProgression("Curl con manubri", 12, 4, buildSets(4, 12, 20));

    expect(result.shouldIncrease).toBe(true);
    expect(result.increment).toBe(2.5);
    expect(result.suggestedWeight).toBe(22.5);
  });

  // --- Caso: reps NON raggiunti in almeno un set ---

  it("non suggerisce incremento se almeno un set è sotto repsMax", () => {
    // Ultimi set da 9 reps — soglia 10 — non raggiunta
    const sets = [
      { reps: 10, weight: 80 },
      { reps: 10, weight: 80 },
      { reps: 9,  weight: 80 }, // set fallito
    ];
    const result = calculateProgression("Bench Press", 10, 3, sets);

    expect(result.shouldIncrease).toBe(false);
    expect(result.increment).toBe(0);
    // Deve comunque restituire il peso precedente come riferimento
    expect(result.suggestedWeight).toBe(80);
  });

  // --- Caso: set completati insufficienti ---

  it("non suggerisce incremento se i set eseguiti sono meno di quelli previsti", () => {
    // Previsti 4 set, eseguiti solo 2
    const result = calculateProgression("Squat", 8, 4, buildSets(2, 8, 100));

    expect(result.shouldIncrease).toBe(false);
    expect(result.suggestedWeight).toBe(100);
  });

  // --- Caso: peso zero (dati corrotti) ---

  it("non suggerisce incremento se il peso precedente è 0 (dati non validi)", () => {
    const result = calculateProgression("Deadlift", 5, 3, buildSets(3, 5, 0));

    expect(result.shouldIncrease).toBe(false);
    expect(result.increment).toBe(0);
  });

  // --- Caso: set extra ignorati (solo i primi expectedSets contano) ---

  it("considera solo i primi expectedSets set e ignora quelli extra", () => {
    // 5 set inviati ma solo 3 previsti; i primi 3 sono validi, il 4° e 5° irrilevanti
    const sets = [
      { reps: 10, weight: 60 },
      { reps: 10, weight: 60 },
      { reps: 10, weight: 60 },
      { reps: 1,  weight: 60 }, // extra — non deve penalizzare
      { reps: 1,  weight: 60 }, // extra
    ];
    const result = calculateProgression("Lateral raise", 10, 3, sets);

    expect(result.shouldIncrease).toBe(true);
    expect(result.increment).toBe(2.5);
  });

  // --- Progressione sulle reps (rispetto alla sessione precedente, non solo al tetto) ---

  it("suggerisce +1 rep per set quando non tutti i set hanno raggiunto repsMax", () => {
    const sets = [
      { reps: 8, weight: 80 },
      { reps: 7, weight: 80 },
      { reps: 6, weight: 80 },
    ];
    const result = calculateProgression("Bench Press", 10, 3, sets, 6);

    expect(result.shouldIncrease).toBe(false);
    expect(result.suggestedWeight).toBe(80); // peso invariato
    expect(result.suggestedReps).toEqual([9, 8, 7]); // +1 rep rispetto allo stesso set precedente
  });

  it("non fa superare repsMax al target di reps anche se il set precedente era già al limite", () => {
    // Solo l'ultimo set è sotto soglia: gli altri due sono già a reps_max e non devono sforare
    const sets = [
      { reps: 10, weight: 80 },
      { reps: 10, weight: 80 },
      { reps: 9, weight: 80 },
    ];
    const result = calculateProgression("Bench Press", 10, 3, sets, 8);

    expect(result.shouldIncrease).toBe(false);
    expect(result.suggestedReps).toEqual([10, 10, 10]); // capped a repsMax, non 11
  });

  it("quando il peso sale, le reps ripartono da repsMin per tutti i set", () => {
    const result = calculateProgression("Squat", 10, 3, buildSets(3, 10, 100), 6);

    expect(result.shouldIncrease).toBe(true);
    expect(result.suggestedReps).toEqual([6, 6, 6]);
  });

  it("se repsMin non è fornito, il reset del target reps ricade su repsMax", () => {
    const result = calculateProgression("Squat", 10, 3, buildSets(3, 10, 100));

    expect(result.shouldIncrease).toBe(true);
    expect(result.suggestedReps).toEqual([10, 10, 10]);
  });

  it("suggestedReps è vuoto quando non ci sono dati sufficienti per calcolarlo", () => {
    expect(calculateProgression("Squat", null, 3, buildSets(3, 8, 100)).suggestedReps).toEqual([]);
    expect(calculateProgression("Squat", 10, 3, []).suggestedReps).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// calculateUnitProgression — usata sia per le reps sia per i secondi di tenuta
// ---------------------------------------------------------------------------

describe("calculateUnitProgression", () => {
  it("suggerisce +1 unità per set quando non tutti hanno raggiunto il tetto", () => {
    const result = calculateUnitProgression(20, 40, 3, [25, 30, 35]);

    expect(result.reachedCeiling).toBe(false);
    expect(result.suggestedValues).toEqual([26, 31, 36]);
  });

  it("non supera il tetto anche se il valore precedente era già al massimo su un solo set", () => {
    const result = calculateUnitProgression(20, 30, 3, [30, 30, 29]);

    expect(result.reachedCeiling).toBe(false);
    expect(result.suggestedValues).toEqual([30, 30, 30]);
  });

  it("quando tutti i set raggiungono il tetto, i target ripartono dal minimo", () => {
    const result = calculateUnitProgression(15, 30, 3, [30, 30, 30]);

    expect(result.reachedCeiling).toBe(true);
    expect(result.suggestedValues).toEqual([15, 15, 15]);
  });

  it("se min non è fornito, il reset ricade sul tetto stesso", () => {
    const result = calculateUnitProgression(null, 30, 2, [30, 30]);

    expect(result.reachedCeiling).toBe(true);
    expect(result.suggestedValues).toEqual([30, 30]);
  });

  it("suggestedValues è vuoto senza dati precedenti o senza un tetto valido", () => {
    expect(calculateUnitProgression(10, 30, 3, []).suggestedValues).toEqual([]);
    expect(calculateUnitProgression(10, null, 3, [20, 20, 20]).suggestedValues).toEqual([]);
    expect(calculateUnitProgression(10, 0, 3, [20, 20, 20]).suggestedValues).toEqual([]);
  });

  it("usa il fallback min/max per i set senza valore precedente (meno set fatti di quelli previsti)", () => {
    const result = calculateUnitProgression(20, 40, 3, [25]);

    expect(result.reachedCeiling).toBe(false);
    // Set 2 e 3 non hanno storico: si parte da min (20) +1 = 21
    expect(result.suggestedValues).toEqual([26, 21, 21]);
  });
});
