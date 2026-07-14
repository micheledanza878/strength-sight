import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { SkillLog, SkillRepsThreshold } from "./types";
import { buildRadarData } from "./utils";
import { axisTickStyle, gridProps, tooltipContentStyle, tooltipLabelStyle } from "./chartTheme";
import { ChartCard } from "./ChartCard";
import { EmptyState } from "./EmptyState";

interface SkillRadarChartProps {
  logs: SkillLog[];
  repsThresholds?: SkillRepsThreshold[];
}

const MIN_AXES = 3;

export function SkillRadarChart({ logs, repsThresholds = [] }: SkillRadarChartProps) {
  const data = buildRadarData(logs, repsThresholds);

  if (data.length < MIN_AXES) {
    return (
      <ChartCard
        title="Vista d'insieme skill"
        subtitle="% rispetto alla soglia"
        summary="Servono almeno 3 skill con soglia definita per il radar."
      >
        <EmptyState
          title="Servono almeno 3 skill con soglia"
          subtitle="Aggiungi soglie ad altre skill per vedere qui la vista d'insieme."
        />
      </ChartCard>
    );
  }

  const summary = data.map((point) => `${point.label} ${point.value}%`).join(", ");

  return (
    <ChartCard title="Vista d'insieme skill" subtitle="% rispetto alla soglia" summary={summary}>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data}>
          <PolarGrid stroke={gridProps.stroke} />
          <PolarAngleAxis dataKey="label" tick={axisTickStyle} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} />
          <Radar
            dataKey="value"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.35}
          />
          <Tooltip
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            formatter={(value: number) => [`${value}%`, "vs soglia"]}
          />
        </RadarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export default SkillRadarChart;
