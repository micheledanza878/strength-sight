/**
 * skillsService.ts
 *
 * Catalogo delle skill calisthenics, letto da Supabase (public.skills,
 * public.skill_steps, public.skill_relations) invece che dal vecchio mock
 * statico src/data/skills.ts.
 *
 * Le 3 tabelle sono dati di catalogo condivisi e read-only (RLS: SELECT
 * pubblica per utenti autenticati, nessuna scrittura client-side), quindi il
 * risultato di `fetchSkills()` viene tenuto in cache in memoria per la durata
 * della sessione: evita di ripetere le stesse 3 query ogni volta che un
 * componente (libreria skill, picker, ladder card, ...) monta.
 *
 * Ordinamento: la query su `skills` ordina per `difficulty_rank` ASC. Poiché
 * i componenti raggruppano per categoria filtrando l'array già ordinato
 * (Array.filter preserva l'ordine), le skill risultano ordinate per
 * difficoltà crescente ANCHE dentro ogni categoria, senza bisogno di un sort
 * lato client.
 */

import { supabase } from "@/integrations/supabase/client";

export type SkillCategory =
  | "statiche-spinta"
  | "statiche-trazione"
  | "core"
  | "dinamiche-trazione"
  | "dinamiche-spinta"
  | "gambe";

export type SkillType = "static" | "dynamic" | "eccentric";

export interface SkillStep {
  order: number;
  name: string;
  targetType: "seconds" | "reps";
  targetMin: number;
  targetMax?: number;
  /** Sedute consecutive a target richieste prima di avanzare allo step successivo. */
  criteriaSessions: number;
  notes?: string;
}

type SkillRelationType = "prerequisite" | "propedeutico";

export interface SkillRelation {
  /** slug dell'altra skill collegata */
  slug: string;
  type: SkillRelationType;
  note: string;
}

export interface Skill {
  slug: string;
  name: string;
  category: SkillCategory;
  type: SkillType;
  warning?: string;
  /** Prerequisito di sblocco specifico, se presente. */
  prerequisite?: string;
  /** true per le skill consigliate ora; le altre restano un menù per cicli futuri. */
  isPriority?: boolean;
  /** Altre skill del catalogo collegate a questa (prerequisito o propedeutica). */
  relatedSkills?: SkillRelation[];
  recommendedSets: number;
  recommendedRestSeconds: number;
  steps: SkillStep[];
}

let cachedSkills: Skill[] | null = null;
let inFlightRequest: Promise<Skill[]> | null = null;

async function loadSkillsFromDb(): Promise<Skill[]> {
  // Le 3 tabelle vengono lette in parallelo: sono indipendenti, l'assemblaggio
  // (steps/relations raggruppati per skill_slug) avviene lato client dopo.
  const [skillsRes, stepsRes, relationsRes] = await Promise.all([
    supabase
      .from("skills")
      .select("slug, name, category, type, warning, prerequisite, is_priority, recommended_sets, recommended_rest_seconds, difficulty_rank")
      .order("difficulty_rank", { ascending: true }),
    supabase
      .from("skill_steps")
      .select("skill_slug, step_order, name, target_type, target_min, target_max, criteria_sessions, notes")
      .order("step_order", { ascending: true }),
    supabase
      .from("skill_relations")
      .select("skill_slug, related_skill_slug, relation_type, note"),
  ]);

  if (skillsRes.error) throw skillsRes.error;
  if (stepsRes.error) throw stepsRes.error;
  if (relationsRes.error) throw relationsRes.error;

  const stepsBySlug = new Map<string, SkillStep[]>();
  (stepsRes.data ?? []).forEach((row) => {
    const step: SkillStep = {
      order: row.step_order,
      name: row.name,
      targetType: row.target_type as SkillStep["targetType"],
      targetMin: row.target_min,
      targetMax: row.target_max ?? undefined,
      criteriaSessions: row.criteria_sessions,
      notes: row.notes ?? undefined,
    };
    const list = stepsBySlug.get(row.skill_slug) ?? [];
    list.push(step);
    stepsBySlug.set(row.skill_slug, list);
  });

  const relationsBySlug = new Map<string, SkillRelation[]>();
  (relationsRes.data ?? []).forEach((row) => {
    const relation: SkillRelation = {
      slug: row.related_skill_slug,
      type: row.relation_type as SkillRelationType,
      note: row.note ?? "",
    };
    const list = relationsBySlug.get(row.skill_slug) ?? [];
    list.push(relation);
    relationsBySlug.set(row.skill_slug, list);
  });

  return (skillsRes.data ?? []).map((row) => ({
    slug: row.slug,
    name: row.name,
    category: row.category as SkillCategory,
    type: row.type as SkillType,
    warning: row.warning ?? undefined,
    prerequisite: row.prerequisite ?? undefined,
    isPriority: row.is_priority,
    relatedSkills: relationsBySlug.get(row.slug),
    recommendedSets: row.recommended_sets,
    recommendedRestSeconds: row.recommended_rest_seconds,
    steps: stepsBySlug.get(row.slug) ?? [],
  }));
}

/**
 * Ritorna il catalogo completo delle skill (con step e collegamenti già
 * risolti), ordinato per categoria di appartenenza + difficoltà crescente.
 * Cache in memoria: le chiamate successive nella stessa sessione riusano lo
 * stesso risultato senza rifare le query.
 */
export async function fetchSkills(): Promise<Skill[]> {
  if (cachedSkills) return cachedSkills;
  if (inFlightRequest) return inFlightRequest;

  inFlightRequest = loadSkillsFromDb()
    .then((skills) => {
      cachedSkills = skills;
      return skills;
    })
    .finally(() => {
      inFlightRequest = null;
    });

  return inFlightRequest;
}

export function getSkill(skills: Skill[], slug: string): Skill | undefined {
  return skills.find((s) => s.slug === slug);
}

export function getSkillStep(skill: Skill, stepOrder: number): SkillStep | undefined {
  return skill.steps.find((s) => s.order === stepOrder);
}

/**
 * Riferimento esplicito al prossimo step da allenare dopo quello corrente,
 * oppure undefined se lo step corrente è già l'ultimo (skill completa).
 */
export function getNextStep(skill: Skill, currentStepOrder: number): SkillStep | undefined {
  return getSkillStep(skill, currentStepOrder + 1);
}

export function getRelatedSkills(skill: Skill, allSkills: Skill[]): { skill: Skill; relation: SkillRelation }[] {
  if (!skill.relatedSkills) return [];
  return skill.relatedSkills
    .map((relation) => {
      const related = getSkill(allSkills, relation.slug);
      return related ? { skill: related, relation } : null;
    })
    .filter((v): v is { skill: Skill; relation: SkillRelation } => v !== null);
}
