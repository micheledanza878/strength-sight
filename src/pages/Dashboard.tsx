import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, parseISO, startOfWeek, subDays, getWeek, differenceInDays, addMonths, subMonths,
} from "date-fns";
import { it } from "date-fns/locale";
import { ChevronRight, Flame, Trophy, ChevronLeft, LogOut } from "lucide-react";
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
  const [weekCount, setWeekCount] = useState(0);
  const [monthCount, setMonthCount] = useState(0);
  const [monthVolume, setMonthVolume] = useState(0);
  const [volumeChart, setVolumeChart] = useState<VolumePoint[]>([]);
  const [weeklyVolumeChart, setWeeklyVolumeChart] = useState<{ week: string; volume: number }[]>([]);
  const [topPRs, setTopPRs] = useState<{ exercise: string; weight: number; reps: number }[]>([]);
  const [lastMeasurementDaysAgo, setLastMeasurementDaysAgo] = useState<number | null>(null);

  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

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
      allSets.forEach((s) => {
        const logDate = (s.workout_logs as any)?.started_at;
        if (logDate) {
          const week = `W${getWeek(parseISO(logDate))}`;
          weeklyMap[week] = (weeklyMap[week] || 0) + s.weight * s.reps;
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
    <div className="px-5 pt-14 pb-24 min-h-screen">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-3xl font-bold">Workout</h1>
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
      <p className="text-muted-foreground text-sm mb-4">
        {format(now, "EEEE d MMMM", { locale: it })}
      </p>

      {/* Workout Plan Selector */}
      {plans.length > 0 && (
        <div className="mb-6">
          <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-2">
            Scheda allenamento
          </label>
          <Select value={activePlanId || ""} onValueChange={changePlan}>
            <SelectTrigger className="w-full bg-card border-0 h-12">
              <SelectValue placeholder="Seleziona scheda" />
            </SelectTrigger>
            <SelectContent>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name}
                  {plan.duration_weeks && ` • ${plan.duration_weeks} sett.`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Next Workout Card skeleton */}
      {loading && (
        <div className="space-y-3 mb-4">
          <Skeleton className="w-full h-24 rounded-2xl" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
          </div>
          <Skeleton className="w-full h-20 rounded-2xl" />
        </div>
      )}

      {/* Next Workout Card */}
      {!loading && nextPlanDay && <button
        onClick={() => navigate(`/session/${nextPlanDay.id}`)}
        className="w-full bg-card rounded-2xl p-5 mb-4 text-left flex items-center justify-between active:scale-[0.98] transition-transform"
      >
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Prossimo</p>
          <p className="text-xl font-bold">{nextPlanDay.day_name}</p>
          <p className="text-xs text-muted-foreground mt-1">Giorno {nextPlanDay.day_number}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary/10">
            <Flame className="w-6 h-6 text-primary" />
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </button>}

      {/* Summary Card */}
      {!loading && (
        <div className="bg-card rounded-2xl p-5 mb-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-4">Riassunto</p>
          <div className="space-y-3">
            {topPRs.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">🏆 Top PR</p>
                <p className="text-sm font-semibold">{topPRs[0].exercise}</p>
                <p className="text-xs text-muted-foreground">{topPRs[0].weight}kg × {topPRs[0].reps} rep</p>
              </div>
            )}
            {lastMeasurementDaysAgo !== null && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">📅 Ultima misurazione</p>
                <p className="text-sm font-semibold">{lastMeasurementDaysAgo} giorni fa</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Row */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold">{streak}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">🔥 streak</p>
          </div>
          <div className="bg-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold">{weekCount}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">questa sett.</p>
          </div>
          <div className="bg-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold">{monthCount}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">questo mese</p>
          </div>
        </div>
      )}

      {/* Last Workout */}
      {lastDayData && lastWorkout && (
        <div className="bg-card rounded-2xl p-5 mb-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Ultimo allenamento</p>
          <p className="text-lg font-semibold">{lastDayData.label}</p>
          <p className="text-sm text-muted-foreground">
            {format(parseISO(lastWorkout.date), "d MMMM, HH:mm", { locale: it })}
          </p>
        </div>
      )}

      {/* Weekly Volume Chart */}
      {weeklyVolumeChart.length > 1 && (
        <div className="bg-card rounded-2xl p-5 mb-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-4">Volume settimanale</p>
          <div className="h-44">
            <ResponsiveContainer width="95%" height="100%" style={{ margin: "0 auto" }}>
              <LineChart data={weeklyVolumeChart} margin={{ top: 5, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 11 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(v: number) => [`${v.toLocaleString()} kg`, "Volume"]}
                />
                <Line
                  type="monotone"
                  dataKey="volume"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Volume Chart */}
      {volumeChart.length > 1 && (
        <div className="bg-card rounded-2xl p-5 mb-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-4">Volume per sessione</p>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeChart} barSize={20}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 11 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(v: number) => [`${v.toLocaleString()} kg`, "Volume"]}
                />
                <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {monthVolume > 0 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              {monthVolume.toLocaleString()} kg sollevati questo mese
            </p>
          )}
        </div>
      )}

      {/* Compact Calendar */}
      <div className="bg-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            {format(selectedMonth, "MMMM yyyy", { locale: it })}
          </p>
          <button
            onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {["L", "M", "M", "G", "V", "S", "D"].map((d, i) => (
            <span key={i} className="text-[10px] text-muted-foreground font-medium pb-1">{d}</span>
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
                className={`w-9 h-9 flex items-center justify-center rounded-full text-xs font-medium mx-auto
                  ${isToday ? "ring-1 ring-primary text-primary" : ""}
                  ${hasWorkout ? "bg-primary text-primary-foreground" : "text-muted-foreground"}
                `}
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
