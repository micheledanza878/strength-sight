import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, parseISO, startOfWeek, subDays,
} from "date-fns";
import { it } from "date-fns/locale";
import { ChevronRight, Flame } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { WORKOUT_DAYS, getNextWorkoutDay } from "@/data/workouts";
import type { WorkoutDay } from "@/data/workouts";

interface VolumePoint {
  date: string;
  volume: number;
  day: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [lastWorkout, setLastWorkout] = useState<{ day: string; date: string } | null>(null);
  const [nextWorkout, setNextWorkout] = useState<WorkoutDay>(WORKOUT_DAYS[0]);
  const [workoutDates, setWorkoutDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);

  const [streak, setStreak] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [monthCount, setMonthCount] = useState(0);
  const [monthVolume, setMonthVolume] = useState(0);
  const [volumeChart, setVolumeChart] = useState<VolumePoint[]>([]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) loadData(user.id);
    };
    getUser();
  }, []);

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

    setLoading(false);
  }

  const now = new Date();
  const monthDays = eachDayOfInterval({ start: startOfMonth(now), end: endOfMonth(now) });
  const firstDayOffset = (startOfMonth(now).getDay() + 6) % 7;
  const lastDayData = lastWorkout ? WORKOUT_DAYS.find((d) => d.id === lastWorkout.day) : null;

  return (
    <div className="px-5 pt-14 pb-24 min-h-screen">
      <h1 className="text-3xl font-bold mb-1">Workout</h1>
      <p className="text-muted-foreground text-sm mb-6">
        {format(now, "EEEE d MMMM", { locale: it })}
      </p>

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
      {!loading && <button
        onClick={() => navigate(`/session/${nextWorkout.id}`)}
        className="w-full bg-card rounded-2xl p-5 mb-4 text-left flex items-center justify-between active:scale-[0.98] transition-transform"
      >
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Prossimo</p>
          <p className="text-xl font-bold">{nextWorkout.label}</p>
          <p className="text-sm text-muted-foreground">{nextWorkout.title}</p>
          <p className="text-xs text-muted-foreground mt-1">{nextWorkout.exercises.length} esercizi</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: nextWorkout.color + "22" }}>
            <Flame className="w-6 h-6" style={{ color: nextWorkout.color }} />
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </button>}

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
          <p className="text-lg font-semibold">{lastDayData.label} — {lastDayData.title}</p>
          <p className="text-sm text-muted-foreground">
            {format(parseISO(lastWorkout.date), "d MMMM, HH:mm", { locale: it })}
          </p>
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
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">
          {format(now, "MMMM yyyy", { locale: it })}
        </p>
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
