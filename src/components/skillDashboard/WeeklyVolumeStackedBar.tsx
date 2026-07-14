import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WorkoutSession } from "./types";
import { aggregateWeeklyCategoryVolume, categorySummary } from "./utils";
import { CATEGORY_COLORS, CATEGORY_LABELS, axisTickStyle, gridProps, tooltipContentStyle, tooltipLabelStyle } from "./chartTheme";
import { ChartCard } from "./ChartCard";
import { EmptyState } from "./EmptyState";

interface WeeklyVolumeStackedBarProps {
  sessions: WorkoutSession[];
}

const CATEGORY_KEYS = ["push", "pull", "legs"] as const;

export function WeeklyVolumeStackedBar({ sessions }: WeeklyVolumeStackedBarProps) {
  const data = aggregateWeeklyCategoryVolume(sessions);

  if (data.length < 2) {
    return (
      <ChartCard
        title="Volume settimanale per categoria"
        subtitle="Serie totali · push/pull/legs"
        summary="Servono almeno 2 settimane di dati per confrontare il volume."
      >
        <EmptyState
          title="Servono almeno 2 settimane di dati"
          subtitle="Continua a registrare le sessioni per vedere qui il confronto settimanale."
        />
      </ChartCard>
    );
  }

  const lastWeek = data[data.length - 1];
  const summary = `Ultima settimana (${lastWeek.weekLabel}): ${categorySummary(lastWeek)}`;

  return (
    <ChartCard title="Volume settimanale per categoria" subtitle="Serie totali · push/pull/legs" summary={summary}>
      {/* Legenda custom con i colori/etichette semantici di categoria, coerenti col resto della dashboard. */}
      <div className="flex gap-3 mb-2">
        {CATEGORY_KEYS.map((key) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[key] }} />
            <span className="text-[11px] text-muted-foreground">{CATEGORY_LABELS[key]}</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="weekLabel" tick={axisTickStyle} />
          <YAxis tick={axisTickStyle} />
          <Tooltip contentStyle={tooltipContentStyle} labelStyle={tooltipLabelStyle} />
          {CATEGORY_KEYS.map((key) => (
            <Bar key={key} dataKey={key} name={CATEGORY_LABELS[key]} stackId="v" fill={CATEGORY_COLORS[key]} radius={[0, 0, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export default WeeklyVolumeStackedBar;
