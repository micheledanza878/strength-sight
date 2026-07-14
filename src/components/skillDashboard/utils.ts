import { startOfWeek, format, isSameWeek, subWeeks } from "date-fns";
import { it } from "date-fns/locale";
import type {
  Category,
  SkillGroup,
  SkillLog,
  SkillRepsThreshold,
  SkillThresholdItem,
  WorkoutSession,
} from "./types";
import { SPLIT_DAYS, round } from "./chartTheme";

/** Converte uno skillName snake_case in un'etichetta leggibile ("front_lever" → "Front Lever"). */
export function humanizeSkillName(skillName: string): string {
  return skillName
    .split("_")
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Ritorna il log più recente per ciascuna skill presente nell'elenco. */
export function getLatestLogPerSkill(logs: SkillLog[]): Map<string, SkillLog> {
  const latest = new Map<string, SkillLog>();
  for (const log of logs) {
    const current = latest.get(log.skillName);
    if (!current || log.date > current.date) {
      latest.set(log.skillName, log);
    }
  }
  return latest;
}

/**
 * Costruisce gli item pronti per le SkillThresholdTiles a partire dai log grezzi.
 *
 * Per ogni skill viene preso l'ultimo log (per data): se ha `thresholdSeconds`
 * viene trattata come isometrica (unità = sec, current = holdSeconds); in
 * alternativa, se la skill compare in `repsThresholds`, viene trattata come
 * dinamica (unità = reps, current = reps del log, default 0 se assente).
 * Le skill senza alcuna soglia nota vengono escluse (non c'è nulla da mostrare
 * come target).
 */
export function buildThresholdItems(
  logs: SkillLog[],
  repsThresholds: SkillRepsThreshold[] = []
): SkillThresholdItem[] {
  const repsThresholdMap = new Map(repsThresholds.map((t) => [t.skillName, t.thresholdReps]));
  const latestBySkill = getLatestLogPerSkill(logs);

  const items: SkillThresholdItem[] = [];
  latestBySkill.forEach((log, skillName) => {
    if (typeof log.thresholdSeconds === "number") {
      items.push({
        skillName,
        label: humanizeSkillName(skillName),
        current: log.holdSeconds,
        threshold: log.thresholdSeconds,
        unit: "sec",
        category: log.category,
      });
    } else if (repsThresholdMap.has(skillName)) {
      items.push({
        skillName,
        label: humanizeSkillName(skillName),
        current: log.reps ?? 0,
        threshold: repsThresholdMap.get(skillName) as number,
        unit: "reps",
        category: log.category,
      });
    }
  });

  return items;
}

/**
 * Costruisce i dati per il RadarChart: un asse per skill, valore =
 * percentuale normalizzata (current/threshold*100) clampata 0-100.
 * Riusa la stessa logica di `buildThresholdItems` per derivare current/threshold,
 * poi normalizza.
 */
export function buildRadarData(
  logs: SkillLog[],
  repsThresholds: SkillRepsThreshold[] = []
): { skill: string; label: string; value: number; category?: SkillGroup }[] {
  return buildThresholdItems(logs, repsThresholds).map((item) => ({
    skill: item.skillName,
    label: item.label ?? humanizeSkillName(item.skillName),
    value: item.threshold > 0 ? clamp(round((item.current / item.threshold) * 100), 0, 100) : 0,
    category: item.category,
  }));
}

export interface WeeklyCategoryVolumePoint {
  /** Etichetta breve per l'asse X (es. "7 lug"). */
  weekLabel: string;
  /** Lunedì della settimana, usato per ordinamento cronologico. */
  weekStart: Date;
  push: number;
  pull: number;
  legs: number;
}

/**
 * Aggrega le sessioni per settimana (inizio lunedì), sommando le serie totali
 * per categoria (push/pull/legs). Include tutte le sessioni presenti a
 * prescindere da `completed`: le serie eseguite contano come volume anche se
 * la sessione non è stata segnata come completata per intero.
 */
export function aggregateWeeklyCategoryVolume(
  sessions: WorkoutSession[]
): WeeklyCategoryVolumePoint[] {
  const weekMap = new Map<string, WeeklyCategoryVolumePoint>();

  for (const session of sessions) {
    const weekStart = startOfWeek(new Date(session.date), { weekStartsOn: 1 });
    const key = format(weekStart, "yyyy-MM-dd");

    let point = weekMap.get(key);
    if (!point) {
      point = {
        weekLabel: format(weekStart, "d MMM", { locale: it }),
        weekStart,
        push: 0,
        pull: 0,
        legs: 0,
      };
      weekMap.set(key, point);
    }

    for (const exercise of session.exercises) {
      point[exercise.category] += exercise.sets;
    }
  }

  return Array.from(weekMap.values()).sort(
    (a, b) => a.weekStart.getTime() - b.weekStart.getTime()
  );
}

export interface AdherenceCell {
  splitDay: string;
  splitLabel: string;
  weekStart: Date;
  weekLabel: string;
  completed: boolean;
}

export interface AdherenceMatrix {
  /** Colonne, ordinate cronologicamente dalla più vecchia alla più recente. */
  weeks: { weekStart: Date; weekLabel: string }[];
  /** Righe = giorni split; ogni riga ha una cella per settimana. */
  rows: { splitDay: string; splitLabel: string; cells: AdherenceCell[] }[];
}

/** Forma minima richiesta da `buildAdherenceMatrix`: sia le WorkoutSession mock
 * sia le sessioni sintetiche costruite dall'adapter dati reali (una per
 * workout_log completato) rispettano questa forma. */
export interface AdherenceSessionLike {
  splitDay: string;
  completed: boolean;
  date: string;
}

/**
 * Costruisce la matrice righe (giorni split) × colonne (ultime `weeks`
 * settimane) usata dalla heatmap di aderenza. Una cella è "completata" se
 * esiste almeno una sessione con quello splitDay, in quella settimana,
 * con `completed: true`.
 *
 * `splitDays` è opzionale: di default usa i 5 giorni della scheda mock
 * (`SPLIT_DAYS`), ma il chiamante può passare i giorni reali di una scheda
 * (es. da `workout_plan_days`) per generalizzare la heatmap a schede con un
 * numero/nomi di giorni diversi dallo split push/pull/legs a doppia frequenza.
 */
export function buildAdherenceMatrix(
  sessions: AdherenceSessionLike[],
  weeks: number,
  splitDays: { key: string; label: string }[] = SPLIT_DAYS
): AdherenceMatrix {
  const now = new Date();
  const weekStarts: Date[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    weekStarts.push(startOfWeek(subWeeks(now, i), { weekStartsOn: 1 }));
  }

  const weekCols = weekStarts.map((weekStart) => ({
    weekStart,
    weekLabel: format(weekStart, "d MMM", { locale: it }),
  }));

  const rows = splitDays.map(({ key, label }) => ({
    splitDay: key,
    splitLabel: label,
    cells: weekCols.map(({ weekStart, weekLabel }) => {
      const completed = sessions.some(
        (s) =>
          s.splitDay === key &&
          s.completed &&
          isSameWeek(new Date(s.date), weekStart, { weekStartsOn: 1 })
      );
      return { splitDay: key, splitLabel: label, weekStart, weekLabel, completed };
    }),
  }));

  return { weeks: weekCols, rows };
}

/** Etichetta categoria+numero serie per un tooltip/summary testuale. */
export function categorySummary(point: WeeklyCategoryVolumePoint): string {
  return `push ${round(point.push)}, pull ${round(point.pull)}, legs ${round(point.legs)}`;
}

export type { Category };
