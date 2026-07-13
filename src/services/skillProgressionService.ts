/**
 * skillProgressionService.ts
 *
 * Progressione per le skill calisthenics (front lever, handstand, planche, muscle-up):
 * a differenza della double progression a peso (vedi progressionService.ts), qui si
 * avanza di STEP (tuck → advanced tuck → straddle → full) quando il target della
 * skill (secondi di tenuta o reps) viene raggiunto su un numero di sedute consecutive
 * definito dallo step stesso (criteriaSessions).
 */

import { supabase } from "@/integrations/supabase/client";
import { Skill, SkillStep, getSkillStep } from "@/services/skillsService";

export interface SkillProgressRow {
  skill_slug: string;
  current_step_order: number;
  consecutive_clean_sessions: number;
  last_trained_at: string | null;
}

/** Progresso di default per una skill mai allenata prima (parte dallo step 1). */
function defaultProgress(skillSlug: string): SkillProgressRow {
  return {
    skill_slug: skillSlug,
    current_step_order: 1,
    consecutive_clean_sessions: 0,
    last_trained_at: null,
  };
}

export async function loadSkillProgress(userId: string, skillSlug: string): Promise<SkillProgressRow> {
  const { data, error } = await supabase
    .from("user_skill_progress")
    .select("skill_slug, current_step_order, consecutive_clean_sessions, last_trained_at")
    .eq("user_id", userId)
    .eq("skill_slug", skillSlug)
    .maybeSingle();

  if (error) throw error;
  return data ?? defaultProgress(skillSlug);
}

/**
 * Un set logga "reps" (drill dinamici) o "hold_seconds" (tenute statiche),
 * a seconda del targetType dello step corrente.
 */
interface LoggedSetValue {
  value: number;
}

/**
 * true se TUTTI i set previsti per la seduta hanno raggiunto il target dello step.
 * Nessun giudizio automatico sulla "tecnica pulita": come per la double progression
 * a peso, ci si fida di quello che l'utente ha effettivamente segnato.
 */
function evaluateSession(step: SkillStep, loggedSets: LoggedSetValue[], expectedSets: number): boolean {
  if (loggedSets.length < expectedSets) return false;
  return loggedSets.slice(0, expectedSets).every((s) => s.value >= step.targetMin);
}

interface ProgressionResult {
  progress: SkillProgressRow;
  leveledUp: boolean;
  newStep?: SkillStep;
}

/**
 * Applica l'esito di una seduta al progresso corrente:
 * - se il target è stato raggiunto, incrementa il contatore di sedute pulite;
 *   se raggiunge il criterio dello step, avanza allo step successivo e resetta il contatore
 * - se il target NON è stato raggiunto, il contatore si azzera (serve consecutività)
 */
function applyProgressionResult(skill: Skill, progress: SkillProgressRow, passed: boolean): ProgressionResult {
  const currentStep = getSkillStep(skill, progress.current_step_order);
  if (!currentStep) return { progress, leveledUp: false };

  if (!passed) {
    return {
      progress: { ...progress, consecutive_clean_sessions: 0 },
      leveledUp: false,
    };
  }

  const consecutive = progress.consecutive_clean_sessions + 1;
  if (consecutive < currentStep.criteriaSessions) {
    return {
      progress: { ...progress, consecutive_clean_sessions: consecutive },
      leveledUp: false,
    };
  }

  const nextStep = getSkillStep(skill, currentStep.order + 1);
  if (!nextStep) {
    // Ultimo step della skill: resta lì, ma azzera il contatore per evitare overflow.
    return {
      progress: { ...progress, consecutive_clean_sessions: 0 },
      leveledUp: false,
    };
  }

  return {
    progress: { ...progress, current_step_order: nextStep.order, consecutive_clean_sessions: 0 },
    leveledUp: true,
    newStep: nextStep,
  };
}

/**
 * Valuta la seduta appena conclusa per una skill e persiste il nuovo stato su Supabase.
 * Ritorna il risultato (utile per mostrare un messaggio di avanzamento nella schermata finale).
 *
 * Il chiamante passa direttamente l'oggetto `skill` (già caricato dal catalogo
 * via skillsService.fetchSkills()): questo servizio non ha più un catalogo
 * globale da cui recuperarlo per slug, dato che le skill vivono ora su Supabase.
 */
export async function evaluateAndSaveSkillSession(
  userId: string,
  skill: Skill,
  loggedSets: LoggedSetValue[],
  expectedSets: number
): Promise<ProgressionResult | null> {
  const progress = await loadSkillProgress(userId, skill.slug);
  const currentStep = getSkillStep(skill, progress.current_step_order);
  if (!currentStep) return null;

  const passed = evaluateSession(currentStep, loggedSets, expectedSets);
  const result = applyProgressionResult(skill, progress, passed);

  const { error } = await supabase.from("user_skill_progress").upsert(
    {
      user_id: userId,
      skill_slug: skill.slug,
      current_step_order: result.progress.current_step_order,
      consecutive_clean_sessions: result.progress.consecutive_clean_sessions,
      last_trained_at: new Date().toISOString(),
    },
    { onConflict: "user_id,skill_slug" }
  );
  if (error) throw error;

  return result;
}
