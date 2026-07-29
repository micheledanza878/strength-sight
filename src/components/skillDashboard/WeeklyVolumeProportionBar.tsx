import type { WeeklyCategoryVolumePoint } from "./utils";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "./chartTheme";

const CATEGORY_KEYS = ["push", "pull", "legs"] as const;

interface WeeklyVolumeProportionBarProps {
  /** Punti pre-aggregati per settimana (stessa forma usata dal grafico trend in Grafici). Si mostra solo l'ultimo. */
  data?: WeeklyCategoryVolumePoint[];
}

/**
 * Versione compatta per la Home: non un trend multi-settimana (quello resta
 * nella tab Grafici), ma una singola barra di proporzione che risponde a
 * "come si sono distribuiti i set dell'ultima settimana allenata" — pensata
 * per occupare poco spazio verticale accanto a hero/stat/calendario.
 */
export function WeeklyVolumeProportionBar({ data = [] }: WeeklyVolumeProportionBarProps) {
  const lastWeek = data[data.length - 1];
  const total = lastWeek ? lastWeek.push + lastWeek.pull + lastWeek.legs : 0;

  if (!lastWeek || total === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bilanciamento set</p>
        <p className="text-[11px] text-muted-foreground">{lastWeek.weekLabel}</p>
      </div>

      <div className="flex h-2 rounded-full overflow-hidden mb-2">
        {CATEGORY_KEYS.map((key) => {
          const value = lastWeek[key];
          if (value === 0) return null;
          return (
            <div
              key={key}
              style={{ width: `${(value / total) * 100}%`, backgroundColor: CATEGORY_COLORS[key] }}
            />
          );
        })}
      </div>

      <div className="flex gap-3">
        {CATEGORY_KEYS.map((key) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[key] }} />
            <span className="text-[11px] text-muted-foreground">
              {CATEGORY_LABELS[key]}{" "}
              <span className="font-semibold text-foreground">
                {Math.round((lastWeek[key] / total) * 100)}%
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WeeklyVolumeProportionBar;
