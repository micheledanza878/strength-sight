/**
 * Tipi condivisi dalla Skill Dashboard.
 *
 * Questi tipi rispecchiano lo schema dati di dominio (SkillLog, WorkoutSession)
 * più alcuni tipi derivati usati esclusivamente dai componenti di visualizzazione
 * (tile soglia, radar, ecc.). Il frontend NON è la fonte di verità di questi dati:
 * in assenza di un contratto API definito dal Backend Agent, i componenti
 * accettano i dati via props e ricadono su MOCK_DATA solo a scopo dimostrativo.
 */

/** Log di una singola sessione/tentativo su una skill (isometrica o dinamica). */
export interface SkillLog {
  id: string;
  skillName: string;
  /** Data ISO (yyyy-MM-dd) del log. */
  date: string;
  /** Secondi di tenuta (skill isometriche: front lever, planche, handstand...). */
  holdSeconds: number;
  /** Ripetizioni (skill dinamiche: muscle-up...). */
  reps?: number;
  /** Soglia/target in secondi per le skill isometriche, se applicabile. */
  thresholdSeconds?: number;
  notes?: string;
}

/** I 5 giorni della scheda push/pull/legs a doppia frequenza. */
export type SplitDay = "push_a" | "pull_a" | "legs" | "push_b" | "pull_b";

/** Categoria muscolare/di movimento di un esercizio. */
export type Category = "push" | "pull" | "legs";

export interface WorkoutSession {
  id: string;
  /** Data ISO (yyyy-MM-dd) della sessione. */
  date: string;
  splitDay: SplitDay;
  completed: boolean;
  exercises: {
    name: string;
    category: Category;
    sets: number;
    reps: number[];
  }[];
}

/** Unità di misura di una skill: secondi di tenuta o ripetizioni. */
export type SkillUnit = "sec" | "reps";

/** Item pronto per una tile soglia (SkillThresholdTiles). */
export interface SkillThresholdItem {
  skillName: string;
  /** Etichetta leggibile opzionale (se assente si usa skillName formattato). */
  label?: string;
  current: number;
  threshold: number;
  unit: SkillUnit;
}

/** Soglia dinamica (reps) associata a una skill, usata dal radar per le skill non isometriche. */
export interface SkillRepsThreshold {
  skillName: string;
  thresholdReps: number;
}
