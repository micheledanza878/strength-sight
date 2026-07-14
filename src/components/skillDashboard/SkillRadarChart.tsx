import { useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { SkillGroup, SkillLog, SkillRepsThreshold } from "./types";
import { buildRadarData } from "./utils";
import { axisTickStyle, gridProps, tooltipContentStyle, tooltipLabelStyle } from "./chartTheme";
import { ChartCard } from "./ChartCard";
import { EmptyState } from "./EmptyState";

interface SkillRadarChartProps {
  logs: SkillLog[];
  repsThresholds?: SkillRepsThreshold[];
}

const MIN_AXES = 3;

/** Ordine fisso di visualizzazione dei chip filtro (indipendente dall'ordine di scoperta nei dati). */
const CATEGORY_ORDER: SkillGroup[] = ["push", "pull", "legs", "core"];

const CATEGORY_LABELS: Record<SkillGroup, string> = {
  push: "Spinta",
  pull: "Trazione",
  legs: "Gambe",
  core: "Core",
};

type FilterValue = SkillGroup | "all";

export function SkillRadarChart({ logs, repsThresholds = [] }: SkillRadarChartProps) {
  const [filter, setFilter] = useState<FilterValue>("all");

  const allData = buildRadarData(logs, repsThresholds);

  if (allData.length < MIN_AXES) {
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

  // Categorie presenti nei dati, in ordine fisso; il filtro ha senso solo se
  // c'è più di una categoria (con una sola sarebbe un chip inutile).
  const presentCategories = CATEGORY_ORDER.filter((cat) => allData.some((d) => d.category === cat));
  const showFilter = presentCategories.length > 1;

  const data = filter === "all" ? allData : allData.filter((d) => d.category === filter);

  const filterLabel = filter === "all" ? "Tutte" : CATEGORY_LABELS[filter];
  const summary =
    data.length > 0
      ? `Filtro categoria: ${filterLabel}. ${data.map((point) => `${point.label} ${point.value}%`).join(", ")}`
      : `Filtro categoria: ${filterLabel}. Nessuna skill con soglia in questa categoria.`;

  const toolbar = showFilter ? (
    <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label="Filtra per categoria">
      <button
        type="button"
        onClick={() => setFilter("all")}
        aria-pressed={filter === "all"}
        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
          filter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
        }`}
      >
        Tutte
      </button>
      {presentCategories.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => setFilter(cat)}
          aria-pressed={filter === cat}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            filter === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
          }`}
        >
          {CATEGORY_LABELS[cat]}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <ChartCard title="Vista d'insieme skill" subtitle="% rispetto alla soglia" summary={summary} toolbar={toolbar}>
      {data.length < MIN_AXES ? (
        <EmptyState
          title="Poche skill in questa categoria"
          subtitle="Servono almeno 3 skill con soglia per il radar."
        />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={data} outerRadius="68%" margin={{ top: 12, right: 56, bottom: 12, left: 56 }}>
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
      )}
    </ChartCard>
  );
}

export default SkillRadarChart;
