import { useMemo, useState } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SkillLog } from "./types";
import { axisTickStyle, gridProps, skillColorAt, tooltipContentStyle, tooltipLabelStyle, fmtSec } from "./chartTheme";
import { humanizeSkillName } from "./utils";
import { ChartCard } from "./ChartCard";
import { EmptyState } from "./EmptyState";

interface SkillProgressLineChartProps {
  logs: SkillLog[];
}

/** Numero massimo di skill selezionabili in contemporanea nel line chart. */
const MAX_SELECTED = 3;
/** Default: le prime 2 skill (in ordine stabile) sono già selezionate all'apertura. */
const DEFAULT_SELECTED_COUNT = 2;

/** Formatta una data ISO (yyyy-MM-dd) in forma breve, es. "7 lug". */
function formatShortDate(iso: string): string {
  return format(new Date(iso), "d MMM", { locale: it });
}

type ChartRow = { date: string } & Record<string, number | string>;

export function SkillProgressLineChart({ logs }: SkillProgressLineChartProps) {
  // Solo skill ISOMETRICHE: quelle i cui log hanno thresholdSeconds definito.
  // L'asse Y è unico (secondi di tenuta), niente doppio asse.
  const isometricLogs = useMemo(
    () => logs.filter((log) => typeof log.thresholdSeconds === "number"),
    [logs]
  );

  // Ordine stabile delle skill isometriche disponibili (alfabetico): usato sia
  // come elenco per i chip di selezione sia come indice colore stabile, così
  // una skill mantiene sempre lo stesso colore indipendentemente da quali
  // altre skill sono selezionate insieme a lei.
  const skillOrder = useMemo(() => {
    const names = new Set(isometricLogs.map((log) => log.skillName));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [isometricLogs]);

  const skillIndex = useMemo(() => {
    const map = new Map<string, number>();
    skillOrder.forEach((name, idx) => map.set(name, idx));
    return map;
  }, [skillOrder]);

  const [selected, setSelected] = useState<string[]>(() => skillOrder.slice(0, DEFAULT_SELECTED_COUNT));

  function toggleSkill(skillName: string) {
    setSelected((prev) => {
      if (prev.includes(skillName)) {
        return prev.filter((s) => s !== skillName);
      }
      if (prev.length < MAX_SELECTED) {
        return [...prev, skillName];
      }
      // Già al massimo: sostituisce la meno recente selezionata (FIFO), non ignora il click.
      return [...prev.slice(1), skillName];
    });
  }

  // Righe del grafico: una per data, con una colonna per ogni skill isometrica
  // presente in quella data (le altre restano undefined → Recharts salta il punto).
  const rows = useMemo<ChartRow[]>(() => {
    const byDate = new Map<string, ChartRow>();
    for (const log of isometricLogs) {
      let row = byDate.get(log.date);
      if (!row) {
        row = { date: log.date };
        byDate.set(log.date, row);
      }
      row[log.skillName] = log.holdSeconds;
    }
    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [isometricLogs]);

  const selectedRows = useMemo(
    () => rows.filter((row) => selected.some((skillName) => typeof row[skillName] === "number")),
    [rows, selected]
  );

  // Soglia da mostrare come ReferenceLine SOLO quando è selezionata una singola
  // skill: con più skill selezionate contemporaneamente ogni skill avrebbe una
  // soglia diversa, e una sola linea tratteggiata sarebbe fuorviante (sembrerebbe
  // valida per tutte). Meglio nasconderla che mostrare un dato ambiguo.
  const singleSelectedThreshold =
    selected.length === 1
      ? isometricLogs.find((log) => log.skillName === selected[0])?.thresholdSeconds
      : undefined;

  if (skillOrder.length === 0) {
    return (
      <ChartCard title="Progressione skill" summary="Nessuna skill isometrica registrata.">
        <EmptyState
          title="Nessuna skill isometrica"
          subtitle="Registra dei log con una soglia in secondi per vedere qui lo storico."
        />
      </ChartCard>
    );
  }

  const summary =
    selectedRows.length < 2
      ? `Dati insufficienti per: ${selected.map(humanizeSkillName).join(", ")}.`
      : selected
          .map((skillName) => {
            const lastRow = [...selectedRows].reverse().find((row) => typeof row[skillName] === "number");
            const lastValue = lastRow ? (lastRow[skillName] as number) : undefined;
            return `${humanizeSkillName(skillName)}: ${lastValue !== undefined ? fmtSec(lastValue) : "n/d"}`;
          })
          .join(", ");

  return (
    <ChartCard title="Progressione skill" subtitle="Secondi di tenuta nel tempo" summary={summary}>
      {/* Selettore a chip: max 3 skill isometriche selezionabili in contemporanea. */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {skillOrder.map((skillName) => {
          const isSelected = selected.includes(skillName);
          const color = skillColorAt(skillIndex.get(skillName) ?? 0);
          return (
            <button
              key={skillName}
              type="button"
              onClick={() => toggleSkill(skillName)}
              aria-pressed={isSelected}
              className="text-[11px] font-medium rounded-full px-2.5 py-1 border transition-colors active:scale-95"
              style={
                isSelected
                  ? { backgroundColor: `${color}26`, borderColor: color, color }
                  : { backgroundColor: "transparent", borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }
              }
            >
              {humanizeSkillName(skillName)}
            </button>
          );
        })}
      </div>

      {selectedRows.length < 2 ? (
        <EmptyState
          title="Storico insufficiente"
          subtitle="Servono almeno 2 log per disegnare una progressione."
        />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={selectedRows}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="date" tickFormatter={formatShortDate} tick={axisTickStyle} />
            <YAxis tick={axisTickStyle} />
            <Tooltip
              contentStyle={tooltipContentStyle}
              labelStyle={tooltipLabelStyle}
              labelFormatter={(value) => formatShortDate(String(value))}
              formatter={(value: number, name: string) => [fmtSec(value), humanizeSkillName(name)]}
            />
            {singleSelectedThreshold !== undefined && (
              <ReferenceLine
                y={singleSelectedThreshold}
                strokeDasharray="4 4"
                stroke="hsl(var(--muted-foreground))"
                label={{ value: "target", position: "insideTopRight", fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              />
            )}
            {selected.map((skillName) => (
              <Line
                key={skillName}
                type="monotone"
                dataKey={skillName}
                name={skillName}
                stroke={skillColorAt(skillIndex.get(skillName) ?? 0)}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export default SkillProgressLineChart;
