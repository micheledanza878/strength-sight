import { subWeeks, format, startOfWeek, addDays } from "date-fns";
import type { SkillGroup, SkillLog, SkillRepsThreshold, WorkoutSession, Category } from "./types";

/**
 * MOCK DATA per la Skill Dashboard.
 *
 * Serve solo a rendere la dashboard renderizzabile/testabile senza backend:
 * il frontend non è la fonte di verità di questi dati. Quando sarà definito
 * il contratto API dal Backend Agent, `mockSkillLogs`/`mockSessions` andranno
 * sostituiti dai dati reali passati via props a <SkillDashboard />.
 *
 * Le date sono generate relativamente a "oggi" (settimane fa → oggi) così i
 * grafici restano sempre popolati con dati "recenti" indipendentemente da
 * quando la dashboard viene aperta. I valori sono hardcoded in progressioni
 * crescenti credibili (NON casuali) per garantire un test riproducibile.
 */

const today = new Date();

/** Data ISO (yyyy-MM-dd) di N settimane fa rispetto a oggi. */
function weeksAgoIso(weeksAgo: number): string {
  return format(subWeeks(today, weeksAgo), "yyyy-MM-dd");
}

// ── Progressioni settimanali (9 punti: da 8 settimane fa a oggi) ───────────
// Front lever: isometrica, in avvicinamento alla soglia (non ancora raggiunta).
const FRONT_LEVER_HOLDS = [11, 13, 14, 16, 16, 19, 21, 23, 26];
const FRONT_LEVER_THRESHOLD = 30;

// Straddle planche: isometrica, ancora lontana dalla soglia.
const STRADDLE_PLANCHE_HOLDS = [7, 8, 9, 11, 12, 14, 16, 17, 19];
const STRADDLE_PLANCHE_THRESHOLD = 25;

// Handstand: isometrica, soglia raggiunta/superata nelle ultime settimane
// (utile per testare lo stato "raggiunto" delle tile).
const HANDSTAND_HOLDS = [34, 38, 41, 45, 48, 52, 56, 60, 65];
const HANDSTAND_THRESHOLD = 60;

// Muscle-up: dinamica (reps), soglia raggiunta/superata di recente.
const MUSCLE_UP_REPS = [3, 4, 4, 5, 6, 6, 7, 8, 9];
const MUSCLE_UP_THRESHOLD_REPS = 8;

function buildIsometricLogs(
  skillName: string,
  holds: number[],
  thresholdSeconds: number,
  category: SkillGroup
): SkillLog[] {
  return holds.map((holdSeconds, idx) => ({
    id: `${skillName}-${idx}`,
    skillName,
    date: weeksAgoIso(holds.length - 1 - idx),
    holdSeconds,
    thresholdSeconds,
    category,
  }));
}

function buildDynamicLogs(skillName: string, repsList: number[], category: SkillGroup): SkillLog[] {
  // holdSeconds è un campo obbligatorio dello schema anche per skill dinamiche:
  // qui viene stimato come tempo sotto tensione (~2s per rep, concentrica+eccentrica)
  // e non è usato da alcun grafico (il line chart tratta solo skill isometriche).
  return repsList.map((reps, idx) => ({
    id: `${skillName}-${idx}`,
    skillName,
    date: weeksAgoIso(repsList.length - 1 - idx),
    holdSeconds: reps * 2,
    reps,
    category,
  }));
}

export const mockSkillLogs: SkillLog[] = [
  // Front lever: skill di trazione (statiche-trazione).
  ...buildIsometricLogs("front_lever", FRONT_LEVER_HOLDS, FRONT_LEVER_THRESHOLD, "pull"),
  // Straddle planche e handstand: skill di spinta (statiche-spinta).
  ...buildIsometricLogs("straddle_planche", STRADDLE_PLANCHE_HOLDS, STRADDLE_PLANCHE_THRESHOLD, "push"),
  ...buildIsometricLogs("handstand", HANDSTAND_HOLDS, HANDSTAND_THRESHOLD, "push"),
  // Muscle-up: skill dinamica di trazione (dinamiche-trazione).
  ...buildDynamicLogs("muscle_up", MUSCLE_UP_REPS, "pull"),
];

/** Soglie reps per le skill dinamiche (non presenti in SkillLog.thresholdSeconds). */
export const mockSkillRepsThresholds: SkillRepsThreshold[] = [
  { skillName: "muscle_up", thresholdReps: MUSCLE_UP_THRESHOLD_REPS },
];

// ── Sessioni di allenamento (ultime 8 settimane) ────────────────────────────

type ExerciseTemplate = { name: string; category: Category; sets: number; reps: number[] };

const PUSH_EXERCISES: ExerciseTemplate[] = [
  { name: "Panca piana", category: "push", sets: 4, reps: [8, 8, 7, 6] },
  { name: "Overhead press", category: "push", sets: 3, reps: [8, 7, 6] },
  { name: "Dip alle parallele", category: "push", sets: 3, reps: [10, 9, 8] },
];

const PULL_EXERCISES: ExerciseTemplate[] = [
  { name: "Trazioni pronate", category: "pull", sets: 4, reps: [8, 7, 6, 5] },
  { name: "Rematore bilanciere", category: "pull", sets: 3, reps: [10, 9, 8] },
  { name: "Curl bicipiti", category: "pull", sets: 3, reps: [12, 10, 10] },
];

const LEGS_EXERCISES: ExerciseTemplate[] = [
  { name: "Back squat", category: "legs", sets: 4, reps: [8, 8, 6, 6] },
  { name: "Affondi bulgari", category: "legs", sets: 3, reps: [10, 10, 8] },
  { name: "Calf raise", category: "legs", sets: 3, reps: [15, 15, 12] },
];

const exercisesFor: Record<"push" | "pull" | "legs", ExerciseTemplate[]> = {
  push: PUSH_EXERCISES,
  pull: PULL_EXERCISES,
  legs: LEGS_EXERCISES,
};

/**
 * Pattern di aderenza per le ultime 8 settimane (indice 0 = 8 settimane fa,
 * indice 7 = settimana corrente). `null` = nessuna sessione registrata per
 * quel giorno in quella settimana; altrimenti `true`/`false` = sessione
 * registrata completata o meno. Il pattern include volutamente dei buchi
 * (per testare la heatmap) e una settimana corrente parziale (siamo a metà
 * settimana: solo i primi giorni sono stati fatti finora).
 */
const ADHERENCE_PATTERN: Record<
  "push_a" | "pull_a" | "legs" | "push_b" | "pull_b",
  (boolean | null)[]
> = {
  push_a: [true, true, true, true, true, true, true, true],
  pull_a: [true, true, true, null, true, true, true, true],
  legs: [true, null, true, true, false, true, true, null],
  push_b: [true, true, true, true, true, null, true, null],
  pull_b: [true, false, true, true, true, true, true, null],
};

const WEEKDAY_OFFSET: Record<keyof typeof ADHERENCE_PATTERN, number> = {
  // Offset (giorni dal lunedì di quella settimana) usato solo per distribuire
  // le sessioni nella settimana in modo realistico.
  push_a: 0, // lunedì
  pull_a: 1, // martedì
  legs: 3, // giovedì
  push_b: 4, // venerdì
  pull_b: 5, // sabato
};

function buildMockSessions(): WorkoutSession[] {
  const sessions: WorkoutSession[] = [];
  const splitDays = Object.keys(ADHERENCE_PATTERN) as (keyof typeof ADHERENCE_PATTERN)[];

  for (const splitDay of splitDays) {
    const category = splitDay.startsWith("push")
      ? "push"
      : splitDay.startsWith("pull")
      ? "pull"
      : "legs";
    const pattern = ADHERENCE_PATTERN[splitDay];

    pattern.forEach((status, weekIdx) => {
      if (status === null) return; // nessuna sessione registrata

      const weeksAgo = pattern.length - 1 - weekIdx;
      // Data = lunedì della settimana (allineato a startOfWeek, weekStartsOn: 1)
      // + offset del giorno split, per finire sempre nella settimana ISO corretta.
      const weekMonday = subWeeks(startOfWeek(today, { weekStartsOn: 1 }), weeksAgo);
      const date = format(addDays(weekMonday, WEEKDAY_OFFSET[splitDay]), "yyyy-MM-dd");

      sessions.push({
        id: `${splitDay}-w${weekIdx}`,
        date,
        splitDay,
        completed: status,
        exercises: exercisesFor[category],
      });
    });
  }

  return sessions.sort((a, b) => a.date.localeCompare(b.date));
}

export const mockSessions: WorkoutSession[] = buildMockSessions();
