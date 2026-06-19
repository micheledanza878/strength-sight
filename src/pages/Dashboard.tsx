import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, parseISO, startOfWeek, subDays, getWeek, differenceInDays, addMonths, subMonths,
} from "date-fns";
import { it } from "date-fns/locale";
import { ChevronRight, Flame, Trophy, ChevronLeft, LogOut, Zap, TrendingUp, Bell, BellOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useActivePlan } from "@/contexts/ActivePlanContext";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, CartesianGrid } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { getUserId } from "@/lib/user";
import { WORKOUT_DAYS, getNextWorkoutDay } from "@/data/workouts";
import type { WorkoutDay } from "@/data/workouts";
import { useNotifications } from "@/hooks/use-notifications";
import { maybeNotifyStreakAtRisk, maybeNotifyMeasurementOverdue } from "@/lib/notifications";

interface VolumePoint {
  date: string;
  volume: number;
  day: string;
}

interface PlanDay {
  id: string;
  day_number: number;
  day_name: string;
}

interface WorkoutPlan {
  id: string;
  name: string;
  duration_weeks: number | null;
}

/**
 * Forma raw di un set_log con la join a workout_logs restituita dalla query
 * `set_logs.select("weight, reps, workout_logs(started_at)")`.
 * Supabase restituisce la relazione come oggetto singolo (not-null quando presente).
 */
interface SetLogWithWorkoutLog {
  weight: number | null;
  reps: number;
  workout_logs: { started_at: string } | null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { activePlanId, setActivePlanId } = useActivePlan();
  const [lastWorkout, setLastWorkout] = useState<{ day: string; date: string } | null>(null);
  const [nextWorkout, setNextWorkout] = useState<WorkoutDay>(WORKOUT_DAYS[0]);
  const [nextPlanDay, setNextPlanDay] = useState<PlanDay | null>(null);
  const [workoutDates, setWorkoutDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);

  const [streak, setStreak] = useState(0);
  const [hasWorkedOutToday, setHasWorkedOutToday] = useState(false);
  const [weekCount, setWeekCount] = useState(0);
  const [monthCount, setMonthCount] = useState(0);
  const [monthVolume, setMonthVolume] = useState(0);
  const [volumeChart, setVolumeChart] = useState<VolumePoint[]>([]);
  const [weeklyVolumeChart, setWeeklyVolumeChart] = useState<{ week: string; volume: number }[]>([]);
  const [topPRs, setTopPRs] = useState<{ exercise: string; weight: number; reps: number }[]>([]);
  const [lastMeasurementDaysAgo, setLastMeasurementDaysAgo] = useState<number | null>(null);

  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // ── Notifiche ──────────────────────────────────────────────────────────────
  const { isEnabled, isSupported, isLoading: notifLoading, toggle: toggleNotifications } = useNotifications();

  useEffect(() => {
    const initializeData = async () => {
      try {
        await loadPlans();
        const userId = await getUserId();
        await loadData(userId);
      } catch (error) {
        console.error("Errore inizializzazione:", error);
      }
    };
    initializeData();
  }, []);

  // Ricarica i dati quando cambia il piano attivo
  useEffect(() => {
    if (activePlanId) {
      const reloadData = async () => {
        try {
          const userId = await getUserId();
          await loadData(userId);
        } catch (error) {
          console.error("Errore ricaricamento dati:", error);
        }
      };
      reloadData();
    }
  }, [activePlanId]);

  // ── Trigger notifiche locali dopo il caricamento dei dati ─────────────────
  // Scatta quando loading diventa false (dati pronti) e le notifiche sono abilitate.
  // Le funzioni maybeNotify* controllano internamente se la notifica è già stata
  // mostrata oggi (via localStorage) per evitare spam.
  useEffect(() => {
    if (loading || !isEnabled) return;

    const triggerNotifications = async () => {
      // Notifica 1: streak in pericolo (streak > 0 e non ha allenato oggi)
      await maybeNotifyStreakAtRisk(streak, hasWorkedOutToday);

      // Notifica 2: misurazioni in ritardo (soglia: 14 giorni)
      await maybeNotifyMeasurementOverdue(lastMeasurementDaysAgo, 14);
    };

    triggerNotifications();
  }, [loading, isEnabled, streak, hasWorkedOutToday, lastMeasurementDaysAgo]);

  async function loadPlans() {
    try {
      const userId = await getUserId();
      const { data } = await supabase
        .from("workout_plans")
        .select("id, name, duration_weeks")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (data) {
        setPlans(data);
        if (data.length > 0 && !activePlanId) {
          setActivePlanId(data[0].id);
        }
      }
    } catch (error) {
      console.error("Errore caricamento schede:", error);
    }
  }

  async function changePlan(planId: string) {
    setActivePlanId(planId);
    const userId = await getUserId();
    loadData(userId);
  }

  async function loadData(uid: string) {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });

    // All completed logs
    const { data: logs } = await supabase
      .from("workout_logs")
      .select("id, workout_day, started_at, completed_at")
      .eq("user_id", uid)
      .not("completed_at", "is", null)
      .order("started_at", { ascending: false });

    if (logs && logs.length > 0) {
      setLastWorkout({ day: logs[0].workout_day, date: logs[0].started_at });
      setNextWorkout(getNextWorkoutDay(logs[0].workout_day));

      // Load next plan day from database
      let planDaysQuery = supabase
        .from("workout_plan_days")
        .select("*")
        .order("day_number", { ascending: true });

      if (activePlanId) {
        planDaysQuery = planDaysQuery.eq("workout_plan_id", activePlanId);
      }

      const { data: planDays } = await planDaysQuery;

      if (planDays && planDays.length > 0) {
        const lastDayName = logs[0].workout_day;
        const lastPlanIdx = planDays.findIndex((d) => d.day_name === lastDayName);
        const nextIdx = (lastPlanIdx + 1) % planDays.length;
        setNextPlanDay(planDays[nextIdx]);
      }

      // Calendar: this month
      const monthLogs = logs.filter((l) => {
        const d = parseISO(l.started_at);
        return d >= monthStart && d <= monthEnd;
      });
      setWorkoutDates(monthLogs.map((l) => parseISO(l.started_at)));
      setMonthCount(monthLogs.length);

      // Week count
      setWeekCount(logs.filter((l) => parseISO(l.started_at) >= weekStart).length);

      // Streak
      const daySet = new Set(logs.map((l) => format(parseISO(l.started_at), "yyyy-MM-dd")));
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const workedToday = daySet.has(todayStr);
      setHasWorkedOutToday(workedToday);

      let s = 0;
      let check = new Date();
      if (!daySet.has(format(check, "yyyy-MM-dd"))) check = subDays(check, 1);
      while (daySet.has(format(check, "yyyy-MM-dd"))) {
        s++;
        check = subDays(check, 1);
      }
      setStreak(s);
    } else {
      // No logs yet - load first plan day
      const activePlanId = localStorage.getItem('activePlanId');
      let planDaysQuery = supabase
        .from("workout_plan_days")
        .select("*")
        .order("day_number", { ascending: true })
        .limit(1);

      if (activePlanId) {
        planDaysQuery = planDaysQuery.eq("workout_plan_id", activePlanId);
      }

      const { data: planDays } = await planDaysQuery;

      if (planDays && planDays.length > 0) {
        setNextPlanDay(planDays[0]);
      }
    }

    // Monthly volume from set_logs
    const { data: monthSets } = await supabase
      .from("set_logs")
      .select("weight, reps")
      .eq("user_id", uid)
      .gte("created_at", monthStart.toISOString())
      .lte("created_at", monthEnd.toISOString());

    if (monthSets) {
      setMonthVolume(monthSets.reduce((acc, s) => acc + s.weight * s.reps, 0));
    }

    // Volume per session (last 8 completed)
    const { data: recentLogs } = await supabase
      .from("workout_logs")
      .select("id, workout_day, started_at, set_logs(weight, reps)")
      .eq("user_id", uid)
      .not("completed_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(8);

    if (recentLogs) {
      const points: VolumePoint[] = recentLogs
        .map((log) => {
          const sets = (log.set_logs as { weight: number; reps: number }[]) || [];
          const vol = sets.reduce((acc, s) => acc + s.weight * s.reps, 0);
          return {
            date: format(parseISO(log.started_at), "d/M"),
            volume: vol,
            day: log.workout_day,
          };
        })
        .filter((p) => p.volume > 0)
        .reverse();
      setVolumeChart(points);
    }

    // Weekly volume (last 8 weeks)
    const { data: allSets } = await supabase
      .from("set_logs")
      .select("weight, reps, workout_logs(started_at)")
      .eq("user_id", uid)
      .gte("created_at", subDays(now, 56).toISOString());

    if (allSets) {
      const weeklyMap: Record<string, number> = {};
      (allSets as SetLogWithWorkoutLog[]).forEach((s) => {
        const logDate = s.workout_logs?.started_at;
        if (logDate) {
          const week = `W${getWeek(parseISO(logDate))}`;
          weeklyMap[week] = (weeklyMap[week] || 0) + (s.weight ?? 0) * s.reps;
        }
      });
      const weeklyData = Object.entries(weeklyMap)
        .sort()
        .slice(-8)
        .map(([week, volume]) => ({ week, volume }));
      setWeeklyVolumeChart(weeklyData);
    }

    // Top 3 PRs
    const { data: allLogs } = await supabase
      .from("workout_logs")
      .select("id, set_logs(exercise_name, weight, reps)")
      .eq("user_id", uid)
      .not("completed_at", "is", null);

    if (allLogs) {
      const prMap: Record<string, { weight: number; reps: number }> = {};
      allLogs.forEach((log) => {
        const sets = (log.set_logs as { exercise_name: string; weight: number; reps: number }[]) || [];
        sets.forEach((s) => {
          const cur = prMap[s.exercise_name];
          if (!cur || s.weight > cur.weight || (s.weight === cur.weight && s.reps > cur.reps)) {
            prMap[s.exercise_name] = { weight: s.weight, reps: s.reps };
          }
        });
      });
      const prs = Object.entries(prMap)
        .map(([exercise, { weight, reps }]) => ({ exercise, weight, reps }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 3);
      setTopPRs(prs);
    }

    // Last measurement
    const { data: measurements } = await supabase
      .from("body_measurements")
      .select("measured_at")
      .eq("user_id", uid)
      .order("measured_at", { ascending: false })
      .limit(1);

    if (measurements && measurements.length > 0) {
      const days = differenceInDays(now, parseISO(measurements[0].measured_at));
      setLastMeasurementDaysAgo(days);
    }

    setLoading(false);
  }

  const now = new Date();
  const monthDays = eachDayOfInterval({ start: startOfMonth(selectedMonth), end: endOfMonth(selectedMonth) });
  const firstDayOffset = (startOfMonth(selectedMonth).getDay() + 6) % 7;
  const lastDayData = lastWorkout ? WORKOUT_DAYS.find((d) => d.id === lastWorkout.day) : null;

  const currentPlan = plans.find(p => p.id === activePlanId);

  return (
    <div className="px-4 pt-14 pb-32 min-h-screen">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Ciao, <span className="text-gradient-primary">atleta</span> 👋
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5 capitalize">
            {format(now, "EEEE d MMMM", { locale: it })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle notifiche: visibile solo se il browser le supporta */}
          {isSupported && (
            <button
              onClick={toggleNotifications}
              disabled={notifLoading}
              aria-label={isEnabled ? "Disattiva notifiche" : "Attiva notifiche"}
              title={
                isEnabled
                  ? "Notifiche attive – clicca per disattivare"
                  : "Attiva notifiche push"
              }
              className={[
                "w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95",
                isEnabled
                  ? "bg-primary/20 text-primary"
                  : "bg-secondary text-muted-foreground",
                notifLoading ? "opacity-50 cursor-not-allowed" : "",
              ].join(" ")}
            >
              {isEnabled ? (
                <Bell className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
            </button>
          )}

          <button
            onClick={() => { logout(); navigate("/login"); }}
            className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground active:scale-95 transition-transform"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Plan Selector ── */}
      {plans.length > 0 && (
        <div className="mb-5">
          <Select value={activePlanId || ""} onValueChange={changePlan}>
            <SelectTrigger className="w-full bg-secondary border-0 h-11 text-sm font-medium rounded-xl">
              <SelectValue placeholder="Seleziona scheda" />
            </SelectTrigger>
            <SelectContent>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name}
                  {plan.duration_weeks && ` · ${plan.duration_weeks} settimane`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ── Banner notifiche bloccate dal browser ─────────────────────────── */}
      {/* Mostrato solo se l'utente ha cliccato il toggle MA il browser ha negato */}
      {isSupported && Notification.permission === "denied" && (
        <div
          role="alert"
          className="mb-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 px-4 py-3 text-xs text-yellow-400 leading-relaxed"
        >
          <strong className="font-semibold">Notifiche bloccate.</strong> Vai nelle impostazioni
          del browser e consenti le notifiche per questo sito, poi riprova.
        </div>
      )}

      {/* ── Skeleton ── */}
      {loading && (
        <div className="space-y-3">
          <Skeleton className="w-full h-36 rounded-2xl" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
          <Skeleton className="w-full h-20 rounded-2xl" />
        </div>
      )}

      {/* ── Hero: Next Workout ── */}
      {!loading && nextPlanDay && (
        <button
          onClick={() => navigate(`/session/${nextPlanDay.id}`)}
          className="w-full card-hero p-5 mb-4 text-left active:scale-[0.98] transition-transform glow-primary-sm"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-3">
                <Zap className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs text-primary font-semibold uppercase tracking-widest">Prossimo allenamento</p>
              </div>
              <p className="text-2xl font-bold tracking-tight mb-1">{nextPlanDay.day_name}</p>
              <p className="text-sm text-muted-foreground">
                Giorno {nextPlanDay.day_number}
                {currentPlan && ` · ${currentPlan.name}`}
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center glow-primary ml-3 flex-shrink-0">
              <Flame className="w-7 h-7 text-white" />
            </div>
          </div>

          {/* CTA bar */}
          <div className="mt-4 pt-4 border-t border-primary/20 flex items-center justify-between">
            <span className="text-sm font-semibold text-primary">Inizia sessione</span>
            <ChevronRight className="w-4 h-4 text-primary" />
          </div>
        </button>
      )}

      {/* ── Stats Row ── */}
      {!loading && (
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          <div className="bg-card border border-border rounded-2xl p-3.5 text-center">
            <p className="text-[22px] font-bold leading-none mb-1">{streak}</p>
            <p className="text-[10px] text-muted-foreground font-medium">🔥 Streak</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-3.5 text-center">
            <p className="text-[22px] font-bold leading-none mb-1">{weekCount}</p>
            <p className="text-[10px] text-muted-foreground font-medium">questa sett.</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-3.5 text-center">
            <p className="text-[22px] font-bold leading-none mb-1">{monthCount}</p>
            <p className="text-[10px] text-muted-foreground font-medium">questo mese</p>
          </div>
        </div>
      )}

      {/* ── Top PR Card ── */}
      {!loading && topPRs.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top PR</p>
          </div>
          <div className="space-y-2.5">
            {topPRs.map((pr, i) => (
              <div key={i} className="flex items-center justify-between">
                <p className="text-sm font-medium truncate flex-1 mr-3">{pr.exercise}</p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-sm font-bold text-primary">{pr.weight}kg</span>
                  <span className="text-xs text-muted-foreground">×{pr.reps}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Last Workout ── */}
      {lastDayData && lastWorkout && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-4">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Ultimo allenamento</p>
          <p className="text-base font-semibold">{lastDayData.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(parseISO(lastWorkout.date), "d MMMM · HH:mm", { locale: it })}
          </p>
        </div>
      )}

      {/* ── Weekly Volume Chart ── */}
      {weeklyVolumeChart.length > 1 && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Volume settimanale</p>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="95%" height="100%" style={{ margin: "0 auto" }}>
              <LineChart data={weeklyVolumeChart} margin={{ top: 5, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={40} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 11 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(v: number) => [`${v.toLocaleString()} kg`, "Volume"]}
                />
                <Line
                  type="monotone"
                  dataKey="volume"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ fill: "hsl(var(--primary))", r: 3.5 }}
                  activeDot={{ r: 5.5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Session Volume Chart ── */}
      {volumeChart.length > 1 && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Volume per sessione</p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeChart} barSize={18}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 11 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(v: number) => [`${v.toLocaleString()} kg`, "Volume"]}
                />
                <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {monthVolume > 0 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              <span className="text-foreground font-semibold">{monthVolume.toLocaleString()} kg</span> sollevati questo mese
            </p>
          )}
        </div>
      )}

      {/* ── Calendar ── */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
            className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground active:scale-90 transition-transform"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {format(selectedMonth, "MMMM yyyy", { locale: it })}
          </p>
          <button
            onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
            className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground active:scale-90 transition-transform"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {["L", "M", "M", "G", "V", "S", "D"].map((d, i) => (
            <span key={i} className="text-[10px] text-muted-foreground font-semibold pb-1.5 tracking-wider">{d}</span>
          ))}
          {Array.from({ length: firstDayOffset }).map((_, i) => (
            <span key={`empty-${i}`} />
          ))}
          {monthDays.map((day) => {
            const isToday = isSameDay(day, now);
            const hasWorkout = workoutDates.some((d) => isSameDay(d, day));
            return (
              <div
                key={day.toISOString()}
                className={[
                  "w-8 h-8 flex items-center justify-center rounded-full text-xs font-medium mx-auto transition-colors",
                  isToday && !hasWorkout ? "ring-1.5 ring-primary text-primary" : "",
                  hasWorkout ? "gradient-primary text-white font-semibold" : !isToday ? "text-muted-foreground" : "",
                ].join(" ")}
              >
                {format(day, "d")}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
