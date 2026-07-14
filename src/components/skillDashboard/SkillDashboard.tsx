import type { SkillLog, SkillRepsThreshold, WorkoutSession } from "./types";
import { buildThresholdItems } from "./utils";
import { mockSkillLogs, mockSkillRepsThresholds, mockSessions } from "./mockData";
import { SkillThresholdTiles } from "./SkillThresholdTiles";
import { SkillProgressLineChart } from "./SkillProgressLineChart";
import { WeeklyVolumeStackedBar } from "./WeeklyVolumeStackedBar";
import { SplitAdherenceHeatmap } from "./SplitAdherenceHeatmap";
import { SkillRadarChart } from "./SkillRadarChart";

interface SkillDashboardProps {
  /** Log skill (isometriche/dinamiche). In assenza di un contratto API dal Backend Agent, di default usa i mock. */
  skillLogs?: SkillLog[];
  /** Sessioni di allenamento (volume settimanale + aderenza allo split). Default: mock. */
  sessions?: WorkoutSession[];
  /** Soglie reps per le skill dinamiche. Default: mock. */
  repsThresholds?: SkillRepsThreshold[];
}

/**
 * Compone la Skill Dashboard completa: fascia di tile soglia in cima, poi i
 * grafici in griglia. Line chart e heatmap occupano l'intera larghezza su
 * desktop (md:col-span-2) perché entrambi hanno bisogno di spazio orizzontale
 * per restare leggibili (rispettivamente: molte date sull'asse X, e fino a
 * 8 colonne settimanali nella heatmap).
 */
export function SkillDashboard({
  skillLogs = mockSkillLogs,
  sessions = mockSessions,
  repsThresholds = mockSkillRepsThresholds,
}: SkillDashboardProps) {
  const items = buildThresholdItems(skillLogs, repsThresholds);

  return (
    <div className="space-y-4">
      <SkillThresholdTiles items={items} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <SkillProgressLineChart logs={skillLogs} />
        </div>

        <SkillRadarChart logs={skillLogs} repsThresholds={repsThresholds} />

        <WeeklyVolumeStackedBar sessions={sessions} />

        <div className="md:col-span-2">
          <SplitAdherenceHeatmap sessions={sessions} />
        </div>
      </div>
    </div>
  );
}

export default SkillDashboard;
