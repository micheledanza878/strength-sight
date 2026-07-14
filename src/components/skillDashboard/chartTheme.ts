import type { Category, SplitDay } from "./types";

/**
 * Palette e costanti condivise dai grafici della Skill Dashboard.
 *
 * Regola guida: i colori delle CATEGORIE (push/pull/legs) sono fissi e
 * semantici (mai casuali), così come la palette delle SKILL, assegnata per
 * indice in un ordine stabile (mai random) in modo che una skill mantenga
 * sempre lo stesso colore tra un render e l'altro.
 */

// ── Colori categoria (push/pull/legs) — fissi e semantici ──────────────────
export const CATEGORY_COLORS: Record<Category, string> = {
  push: "#3b82f6", // blu
  pull: "#22c55e", // verde
  legs: "#f59e0b", // ambra
};

export const CATEGORY_LABELS: Record<Category, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
};

// ── Palette skill — ordinata e stabile, assegnata per indice ordinato ──────
export const SKILL_COLORS: string[] = [
  "#3b82f6", // blu
  "#8b5cf6", // viola
  "#14b8a6", // teal
  "#f43f5e", // rosa/rosso
  "#f59e0b", // ambra
];

/** Ritorna un colore stabile della palette SKILL_COLORS dato l'indice (ciclico). */
export function skillColorAt(index: number): string {
  return SKILL_COLORS[index % SKILL_COLORS.length];
}

// ── Assi / griglia theme-aware (dark & light) ───────────────────────────────
export const GRID_STROKE = "hsl(var(--border))";
export const AXIS_TICK_FILL = "hsl(var(--muted-foreground))";

/** Props comuni per i tick degli assi Recharts (XAxis/YAxis), theme-aware. */
export const axisTickStyle = { fontSize: 10, fill: AXIS_TICK_FILL };

/** Props comuni per un CartesianGrid theme-aware. */
export const gridProps = {
  strokeDasharray: "3 3",
  stroke: GRID_STROKE,
};

/** Stile condiviso per il Tooltip Recharts, coerente con la Dashboard esistente. */
export const tooltipContentStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  fontSize: 11,
};

export const tooltipLabelStyle = { color: "hsl(var(--foreground))" };

// ── Formattazione numeri: sempre arrotondati, mai artefatti float ──────────
export const round = (n: number): number => Math.round(n);
export const fmtSec = (n: number): string => `${round(n)}s`;
export const fmtReps = (n: number): string => `${round(n)}`;

// ── I 5 giorni della scheda split ───────────────────────────────────────────
export const SPLIT_DAYS: { key: SplitDay; label: string }[] = [
  { key: "push_a", label: "Push A" },
  { key: "pull_a", label: "Pull A" },
  { key: "legs", label: "Legs" },
  { key: "push_b", label: "Push B" },
  { key: "pull_b", label: "Pull B" },
];
