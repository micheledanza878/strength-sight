import type { WorkoutSession } from "./types";
import { buildAdherenceMatrix, type AdherenceMatrix } from "./utils";
import { round } from "./chartTheme";
import { ChartCard } from "./ChartCard";
import { EmptyState } from "./EmptyState";

interface SplitAdherenceHeatmapProps {
  /** Path mock: sessioni grezze da cui costruire la matrice. Ignorato se `matrix` è passata. */
  sessions?: WorkoutSession[];
  weeks?: number;
  /** Path dati reali: matrice già pre-costruita dall'adapter (`useSkillDashboardData`). */
  matrix?: AdherenceMatrix;
}

const DEFAULT_WEEKS = 8;

export function SplitAdherenceHeatmap({ sessions = [], weeks = DEFAULT_WEEKS, matrix: matrixProp }: SplitAdherenceHeatmapProps) {
  // Path mock invariato: nessuna matrice passata e nessuna sessione → empty state immediato.
  if (!matrixProp && sessions.length === 0) {
    return (
      <ChartCard
        title="Aderenza allo split"
        subtitle={`ultime ${weeks} settimane`}
        summary="Nessuna sessione registrata."
      >
        <EmptyState title="Nessuna sessione registrata" subtitle="Le sessioni completate popoleranno questa heatmap." />
      </ChartCard>
    );
  }

  const matrix = matrixProp ?? buildAdherenceMatrix(sessions, weeks);

  // Path dati reali: matrice "vuota" (nessun giorno scheda, es. nessuna scheda attiva)
  // → stesso empty state del path mock, per coerenza visiva.
  if (matrix.rows.length === 0 || matrix.weeks.length === 0) {
    return (
      <ChartCard
        title="Aderenza allo split"
        subtitle={`ultime ${weeks} settimane`}
        summary="Nessuna sessione registrata."
      >
        <EmptyState title="Nessuna sessione registrata" subtitle="Le sessioni completate popoleranno questa heatmap." />
      </ChartCard>
    );
  }

  const totalCells = matrix.rows.length * matrix.weeks.length;
  const completedCells = matrix.rows.reduce(
    (acc, row) => acc + row.cells.filter((cell) => cell.completed).length,
    0
  );
  const completionPct = totalCells > 0 ? round((completedCells / totalCells) * 100) : 0;
  const summary = `${completionPct}% delle sessioni pianificate completate nelle ultime ${weeks} settimane (${completedCells} su ${totalCells}).`;

  // Griglia CSS: 1 colonna etichette riga + 1 colonna per settimana.
  const gridTemplateColumns = `minmax(64px, auto) repeat(${matrix.weeks.length}, minmax(28px, 1fr))`;

  return (
    <ChartCard title="Aderenza allo split" subtitle={`ultime ${weeks} settimane`} summary={summary}>
      <div className="overflow-x-auto">
        <div className="min-w-[420px]" style={{ display: "grid", gridTemplateColumns, gap: "4px" }}>
          {/* Header: cella vuota per la colonna etichette + una per settimana */}
          <div />
          {matrix.weeks.map((week) => (
            <div key={week.weekStart.toISOString()} className="text-[9px] text-muted-foreground text-center truncate">
              {week.weekLabel}
            </div>
          ))}

          {matrix.rows.map((row) => (
            <div key={row.splitDay} style={{ display: "contents" }}>
              <div className="text-xs text-muted-foreground flex items-center truncate pr-1">{row.splitLabel}</div>
              {row.cells.map((cell) => (
                <div
                  key={`${row.splitDay}-${cell.weekStart.toISOString()}`}
                  role="img"
                  title={`${cell.splitLabel}, settimana del ${cell.weekLabel}: ${cell.completed ? "completato" : "non fatto"}`}
                  aria-label={`${cell.splitLabel}, settimana del ${cell.weekLabel}: ${cell.completed ? "completato" : "non fatto"}`}
                  className={`h-6 aspect-square rounded-md ${cell.completed ? "bg-success" : "bg-secondary"}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}

export default SplitAdherenceHeatmap;
