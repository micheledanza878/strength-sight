import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getUserId } from "@/lib/user";
import { format, parseISO, startOfWeek, endOfWeek } from "date-fns";
import { it } from "date-fns/locale";
import { ArrowLeft, Trophy, TrendingUp, Dumbbell, BarChart3 } from "lucide-react";
import { ExerciseInsightsCard } from "@/components/Exercise/ExerciseInsightsCard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// ── Tipi ───────────────────────────────────────────────────────────────────────

interface RawSetLog {
  id: string;
  reps: number;
  weight: number | null;
  set_number: number;
  workout_log_id: string;
  exercise_name: string;
  workout_logs: {
    started_at: string;
  } | null;
}

interface SessionGroup {
  /** Data ISO (solo data, senza orario) */
  date: string;
  started_at: string;
  sets: { reps: number; weight: number; set_number: number }[];
  /** 1RM massimo stimato in questa sessione */
  best1RM: number;
  /** Volume totale della sessione su questo esercizio */
  volume: number;
}

interface WeeklyVolume {
  week: string; // label tipo "12 mag"
  weekStart: string;
  volume: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Formula di Epley: stima 1RM da un singolo set */
function epley1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/** Raggruppa i set raw per sessione (workout_log_id / started_at) */
function groupBySessions(rows: RawSetLog[]): SessionGroup[] {
  const map = new Map<string, SessionGroup>();

  rows.forEach((row) => {
    if (!row.workout_logs || row.weight === null) return;
    const key = row.workout_log_id;
    if (!map.has(key)) {
      const dateLabel = format(parseISO(row.workout_logs.started_at), "yyyy-MM-dd");
      map.set(key, {
        date: dateLabel,
        started_at: row.workout_logs.started_at,
        sets: [],
        best1RM: 0,
        volume: 0,
      });
    }
    const session = map.get(key)!;
    const rm = epley1RM(row.weight, row.reps);
    session.sets.push({ reps: row.reps, weight: row.weight, set_number: row.set_number });
    session.best1RM = Math.max(session.best1RM, rm);
    session.volume += row.weight * row.reps;
  });

  // Ordina per data crescente
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
  );
}

/** Aggrega le sessioni in volume settimanale */
function toWeeklyVolume(sessions: SessionGroup[]): WeeklyVolume[] {
  const map = new Map<string, WeeklyVolume>();
  sessions.forEach((s) => {
    const weekStart = format(startOfWeek(parseISO(s.started_at), { weekStartsOn: 1 }), "yyyy-MM-dd");
    if (!map.has(weekStart)) {
      map.set(weekStart, {
        week: format(parseISO(weekStart), "d MMM", { locale: it }),
        weekStart,
        volume: 0,
      });
    }
    map.get(weekStart)!.volume += s.volume;
  });
  return Array.from(map.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

// ── Tooltip personalizzati ─────────────────────────────────────────────────────

function CustomTooltip1RM({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="font-bold text-primary">
        {Number(payload[0].value).toFixed(1)} kg
      </p>
      <p className="text-muted-foreground">1RM stimato</p>
    </div>
  );
}

function CustomTooltipVolume({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="text-muted-foreground mb-1">Sett. {label}</p>
      <p className="font-bold text-blue-400">
        {Number(payload[0].value).toLocaleString()} kg
      </p>
      <p className="text-muted-foreground">volume totale</p>
    </div>
  );
}

// ── Componente principale ──────────────────────────────────────────────────────

export default function ExerciseDetail() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const exerciseName = decodeURIComponent(name ?? "");

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionGroup[]>([]);

  // ── Fetch dati ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!exerciseName) return;

    async function fetchData() {
      setLoading(true);
      try {
        const userId = await getUserId();

        const { data, error } = await supabase
          .from("set_logs")
          .select(
            `id, reps, weight, set_number, workout_log_id, exercise_name,
             workout_logs!inner(started_at)`
          )
          .eq("exercise_name", exerciseName)
          // Filtra per i log dell'utente corrente tramite join
          .eq("workout_logs.user_id", userId)
          .not("weight", "is", null)
          .order("workout_logs(started_at)", { ascending: true });

        if (error) {
          console.error("Errore caricamento set_logs:", error);
        }

        if (data) {
          const rows = data as unknown as RawSetLog[];
          setSessions(groupBySessions(rows));
        }
      } catch (err) {
        console.error("Errore:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [exerciseName]);

  // ── Derivazioni ─────────────────────────────────────────────────────────────

  /** Dati per il grafico 1RM: una entry per sessione */
  const rm1Data = useMemo(
    () =>
      sessions.map((s) => ({
        date: format(parseISO(s.started_at), "d MMM", { locale: it }),
        rm: parseFloat(s.best1RM.toFixed(1)),
      })),
    [sessions]
  );

  /** Volume settimanale */
  const weeklyVolume = useMemo(() => toWeeklyVolume(sessions), [sessions]);

  /** Best set assoluto (peso × reps max 1RM) */
  const bestSet = useMemo(() => {
    let best: { weight: number; reps: number; date: string; rm: number } | null = null;
    sessions.forEach((s) => {
      s.sets.forEach((set) => {
        const rm = epley1RM(set.weight, set.reps);
        if (!best || rm > best.rm) {
          best = { weight: set.weight, reps: set.reps, date: s.started_at, rm };
        }
      });
    });
    return best as { weight: number; reps: number; date: string; rm: number } | null;
  }, [sessions]);

  /** Massimo 1RM registrato (linea di riferimento sul grafico) */
  const maxRM = useMemo(
    () => (rm1Data.length ? Math.max(...rm1Data.map((d) => d.rm)) : 0),
    [rm1Data]
  );

  /** Ultime 5 sessioni (ordine decrescente) */
  const recentSessions = useMemo(() => [...sessions].reverse().slice(0, 5), [sessions]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="px-4 pt-14 pb-32 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0 active:opacity-70 transition-opacity"
          aria-label="Torna indietro"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight truncate">{exerciseName}</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Analisi esercizio</p>
        </div>
      </div>

      {/* Card AI — visibile anche senza storico set, silently-fail se null */}
      <ExerciseInsightsCard exerciseName={exerciseName} />

      {/* Skeleton loading */}
      {loading && (
        <div className="space-y-4">
          <Skeleton className="w-full h-40 rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          <Skeleton className="w-full h-40 rounded-2xl" />
          <Skeleton className="w-full h-32 rounded-2xl" />
        </div>
      )}

      {/* Stato vuoto */}
      {!loading && sessions.length === 0 && (
        <div className="bg-card rounded-2xl p-8 text-center py-16">
          <p className="text-3xl mb-3">🏋️</p>
          <p className="text-muted-foreground text-sm font-medium">Nessun dato disponibile</p>
          <p className="text-muted-foreground text-xs mt-2">
            Completa almeno un allenamento con questo esercizio per vedere le analisi.
          </p>
        </div>
      )}

      {!loading && sessions.length > 0 && (
        <div className="space-y-4">

          {/* ── Card statistiche principali ── */}
          <div className="grid grid-cols-2 gap-3">
            {/* Best set */}
            <div className="bg-card rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Best set</span>
              </div>
              {bestSet ? (
                <>
                  <p className="text-2xl font-bold tracking-tight">{bestSet.weight}kg</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{bestSet.reps} rep</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(parseISO(bestSet.date), "d MMM yyyy", { locale: it })}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground text-xs">Nessun dato</p>
              )}
            </div>

            {/* Max 1RM stimato */}
            <div className="bg-card rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Massimale stimato</span>
              </div>
              <p className="text-2xl font-bold tracking-tight">{maxRM.toFixed(1)}kg</p>
              <p className="text-xs text-muted-foreground mt-0.5">1RM (formula Epley)</p>
              <p className="text-xs text-muted-foreground mt-1">{sessions.length} sessioni</p>
            </div>
          </div>

          {/* ── Grafico 1RM nel tempo ── */}
          {rm1Data.length >= 2 && (
            <div className="bg-card rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Massimale stimato (1RM)</p>
                  <p className="text-xs text-muted-foreground">Progressione nel tempo · formula Epley</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={rm1Data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    domain={["auto", "auto"]}
                    unit="kg"
                  />
                  <Tooltip content={<CustomTooltip1RM />} />
                  <ReferenceLine
                    y={maxRM}
                    stroke="hsl(var(--primary))"
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                  />
                  <Line
                    type="monotone"
                    dataKey="rm"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Messaggio se c'è solo una sessione */}
          {rm1Data.length === 1 && (
            <div className="bg-card rounded-2xl p-4 flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">
                Completa almeno 2 sessioni con questo esercizio per vedere il grafico della progressione.
              </p>
            </div>
          )}

          {/* ── Grafico volume settimanale ── */}
          {weeklyVolume.length >= 1 && (
            <div className="bg-card rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Volume per settimana</p>
                  <p className="text-xs text-muted-foreground">Somma peso × reps di ogni set</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={weeklyVolume} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    unit="kg"
                  />
                  <Tooltip content={<CustomTooltipVolume />} />
                  <Bar dataKey="volume" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Ultime sessioni ── */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
              Ultime sessioni
            </h2>
            <div className="space-y-3">
              {recentSessions.map((session, idx) => {
                const sortedSets = [...session.sets].sort((a, b) => a.set_number - b.set_number);
                return (
                  <div key={session.started_at + idx} className="bg-card rounded-2xl p-4">
                    {/* Header sessione */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
                          <Dumbbell className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-semibold">
                          {format(parseISO(session.started_at), "d MMMM yyyy", { locale: it })}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground bg-secondary rounded-lg px-2 py-1">
                        {session.volume.toLocaleString()} kg vol.
                      </span>
                    </div>

                    {/* Set della sessione */}
                    <div className="flex flex-wrap gap-2">
                      {sortedSets.map((s, i) => (
                        <span
                          key={i}
                          className="bg-secondary rounded-lg px-3 py-2 text-xs flex flex-col items-center min-w-[52px]"
                        >
                          <span className="font-bold">{s.weight}kg</span>
                          <span className="text-muted-foreground">{s.reps} rep</span>
                        </span>
                      ))}
                    </div>

                    {/* 1RM stimato della sessione */}
                    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">1RM stimato sessione</span>
                      <span className="text-xs font-bold text-primary">
                        {session.best1RM.toFixed(1)} kg
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
