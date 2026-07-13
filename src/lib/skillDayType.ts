import { Skill, SkillCategory } from "@/services/skillsService";

/**
 * Classificazione semplificata usata per capire in quali giorni ha senso
 * allenare una skill: 'pull' e 'push' non vanno mai mischiati (una skill di
 * trazione in un giorno di spinta confonderebbe un principiante), mentre
 * 'core' è compatibile con qualsiasi giorno (per progressioni_skill.md è
 * un finisher universale).
 */
type DayType = "pull" | "push" | "legs" | "core";

const CATEGORY_TO_DAY_TYPE: Record<SkillCategory, DayType> = {
  "statiche-trazione": "pull",
  "dinamiche-trazione": "pull",
  "statiche-spinta": "push",
  "dinamiche-spinta": "push",
  gambe: "legs",
  core: "core",
};

function getSkillDayType(skill: Skill): DayType {
  return CATEGORY_TO_DAY_TYPE[skill.category];
}

/**
 * Riconosce il tipo di un giorno dal suo nome (es. "Pull A", "Push", "Gambe/Core").
 * Riconosce sia i nomi puliti di una scheda calisthenics dedicata (Pull/Push/Gambe)
 * sia parole chiave italiane più generiche, per restare utile anche su schede
 * "miste" tipo bodybuilding. Ritorna null se il nome non dà indicazioni chiare
 * (es. giorno misto "Petto/Dorso" con entrambe le parole chiave presenti).
 */
export function getDayTypeFromName(dayName: string): DayType | null {
  const name = dayName.toLowerCase();

  const hasPull = /\bpull\b|trazion|dorso|schiena|dorsali|bicip/.test(name);
  const hasPush = /\bpush\b|spinta|petto|pett\b|spall|tricip/.test(name);
  const hasLegs = /gambe|legs|quadricip|femoral|glute/.test(name);
  const hasCore = /\bcore\b|addomin/.test(name);

  if (hasLegs) return "legs";
  if (hasPull && hasPush) return null; // giorno misto, es. "Petto/Dorso"
  if (hasPull) return "pull";
  if (hasPush) return "push";
  if (hasCore) return "core";
  return null;
}

const DAY_TYPE_LABELS: Record<DayType, string> = {
  pull: "trazione (pull)",
  push: "spinta (push)",
  legs: "gambe",
  core: "core",
};

function getDayTypeLabel(type: DayType): string {
  return DAY_TYPE_LABELS[type];
}

/**
 * true se la skill è coerente col tipo del giorno. Le skill core e i giorni
 * senza tipo riconosciuto (misti o nome ambiguo) sono sempre compatibili:
 * qui si vuole solo evitare l'errore più comune per un principiante
 * (skill di trazione in un giorno di sola spinta e viceversa).
 */
export function isSkillCompatibleWithDay(skill: Skill, dayType: DayType | null): boolean {
  if (skill.category === "core") return true;
  if (dayType === null || dayType === "core") return true;
  return getSkillDayType(skill) === dayType;
}

export function describeMismatch(skill: Skill, dayType: DayType | null): string | null {
  if (isSkillCompatibleWithDay(skill, dayType)) return null;
  const skillType = getSkillDayType(skill);
  return `Questo è un giorno di ${getDayTypeLabel(dayType as DayType)}, mentre ${skill.name} è una skill di ${getDayTypeLabel(skillType)}: di solito si allenano in giorni diversi.`;
}
