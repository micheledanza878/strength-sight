import type { SkillThresholdItem } from "./types";
import { humanizeSkillName } from "./utils";
import { fmtSec, fmtReps, round } from "./chartTheme";
import { EmptyState } from "./EmptyState";

interface SkillThresholdTilesProps {
  items: SkillThresholdItem[];
}

/** Formatta un valore secondo l'unità della skill (sec → "12s", reps → "12"). */
function fmtByUnit(value: number, unit: SkillThresholdItem["unit"]): string {
  return unit === "sec" ? fmtSec(value) : fmtReps(value);
}

/**
 * Fascia di tile compatte in cima alla dashboard: una per skill con soglia
 * nota, con il valore attuale in evidenza e la distanza residua dal target.
 * Non è un grafico (non usa ChartCard), ma è comunque la prima cosa che
 * l'utente legge, quindi il feedback "raggiunto / quanto manca" deve essere
 * immediato a colpo d'occhio.
 */
export function SkillThresholdTiles({ items }: SkillThresholdTilesProps) {
  if (items.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4">
        <EmptyState title="Nessuna skill attiva" subtitle="Registra un log per vedere qui le tue soglie." />
      </div>
    );
  }

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
        Soglie skill
      </p>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => {
          const label = item.label ?? humanizeSkillName(item.skillName);
          const reached = item.current >= item.threshold;
          const remaining = round(item.threshold - item.current);

          return (
            <div key={item.skillName} className="bg-secondary rounded-xl p-3">
              <p className="text-xs text-muted-foreground truncate">{label}</p>
              <p className="text-xl font-bold mt-1">{fmtByUnit(item.current, item.unit)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                target {fmtByUnit(item.threshold, item.unit)}
              </p>
              {reached ? (
                <p className="text-xs font-semibold text-success mt-1.5">✓ raggiunto</p>
              ) : (
                <p className="text-xs font-semibold text-primary mt-1.5">
                  −{remaining}
                  {item.unit === "sec" ? "s" : ""} al target
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SkillThresholdTiles;
