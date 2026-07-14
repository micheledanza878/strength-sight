import type { SkillLog, SkillRepsThreshold, WorkoutSession } from "./types";
import { buildThresholdItems } from "./utils";
import type { SkillDashboardData } from "./useSkillDashboardData";
import { mockSkillLogs, mockSkillRepsThresholds, mockSessions } from "./mockData";
import { SkillThresholdTiles } from "./SkillThresholdTiles";
import { SkillProgressLineChart } from "./SkillProgressLineChart";
import { WeeklyVolumeStackedBar } from "./WeeklyVolumeStackedBar";
import { SplitAdherenceHeatmap } from "./SplitAdherenceHeatmap";
import { SkillRadarChart } from "./SkillRadarChart";
import { Skeleton } from "@/components/ui/skeleton";

interface SkillDashboardProps {
  /** Log skill (isometriche/dinamiche). Ignorato se `data` è passato. Path mock: default ai mock. */
  skillLogs?: SkillLog[];
  /** Sessioni di allenamento (volume settimanale + aderenza allo split). Path mock: default ai mock. */
  sessions?: WorkoutSession[];
  /** Soglie reps per le skill dinamiche. Ignorato se `data` è passato. Path mock: default ai mock. */
  repsThresholds?: SkillRepsThreshold[];
  /**
   * Dati reali pre-aggregati dall'adapter `useSkillDashboardData`. Quando il
   * chiamante passa questo prop (o `loading`, vedi sotto) la dashboard entra
   * in "modalità reale" e NON ricade mai sui MOCK_DATA, nemmeno se `data` è
   * `undefined`/vuoto: in quel caso i singoli grafici mostrano il proprio
   * empty state con array vuoti. Questo distingue la rotta demo
   * `/skill-dashboard` (nessun prop → mock) dalla Dashboard reale, che passa
   * sempre `loading` (booleano) anche mentre `data` non è ancora arrivato.
   */
  data?: SkillDashboardData;
  /**
   * Se passato (anche `false`), segnala "modalità reale": vedi `data` sopra.
   * Quando `true` la dashboard mostra uno skeleton al posto dei grafici.
   */
  loading?: boolean;
}

/**
 * Compone la Skill Dashboard completa: fascia di tile soglia in cima, poi i
 * grafici in griglia. Line chart e heatmap occupano l'intera larghezza su
 * desktop (md:col-span-2) perché entrambi hanno bisogno di spazio orizzontale
 * per restare leggibili (rispettivamente: molte date sull'asse X, e fino a
 * 6 colonne settimanali nella heatmap).
 */
export function SkillDashboard({ skillLogs, sessions, repsThresholds, data, loading }: SkillDashboardProps) {
  // "Modalità reale": il chiamante ha passato esplicitamente `data` e/o `loading`.
  // In questo caso NON si deve mai ricadere sui mock (vedi commento sul prop `data`).
  const isRealMode = data !== undefined || loading !== undefined;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="w-full h-24 rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2 min-w-0">
          <Skeleton className="w-full h-56 rounded-2xl md:col-span-2" />
          <Skeleton className="w-full h-56 rounded-2xl" />
          <Skeleton className="w-full h-56 rounded-2xl" />
          <Skeleton className="w-full h-40 rounded-2xl md:col-span-2" />
        </div>
      </div>
    );
  }

  const resolvedSkillLogs = isRealMode ? data?.skillLogs ?? skillLogs ?? [] : skillLogs ?? mockSkillLogs;
  const resolvedRepsThresholds = isRealMode
    ? data?.repsThresholds ?? repsThresholds ?? []
    : repsThresholds ?? mockSkillRepsThresholds;
  const resolvedSessions = isRealMode ? sessions ?? [] : sessions ?? mockSessions;

  const items = buildThresholdItems(resolvedSkillLogs, resolvedRepsThresholds);

  return (
    <div className="space-y-4">
      <SkillThresholdTiles items={items} />

      <div className="grid gap-4 md:grid-cols-2 min-w-0">
        <div className="md:col-span-2 min-w-0">
          <SkillProgressLineChart logs={resolvedSkillLogs} />
        </div>

        <div className="min-w-0">
          <SkillRadarChart logs={resolvedSkillLogs} repsThresholds={resolvedRepsThresholds} />
        </div>

        <div className="min-w-0">
          <WeeklyVolumeStackedBar sessions={resolvedSessions} data={data?.weeklyVolume} />
        </div>

        <div className="md:col-span-2 min-w-0">
          <SplitAdherenceHeatmap sessions={resolvedSessions} matrix={data?.adherenceMatrix} />
        </div>
      </div>
    </div>
  );
}

export default SkillDashboard;
