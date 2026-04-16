import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { ChevronRight, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WORKOUT_DAYS, getNextWorkoutDay } from "@/data/workouts";
import type { WorkoutDay } from "@/data/workouts";

export default function Dashboard() {
  const navigate = useNavigate();
  const [lastWorkout, setLastWorkout] = useState<{ day: string; date: string } | null>(null);
  const [nextWorkout, setNextWorkout] = useState<WorkoutDay>(WORKOUT_DAYS[0]);
  const [workoutDates, setWorkoutDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        loadData();
      }
    };
    getUser();
  }, []);

  async function loadData() {
    if (!userId) return;

    // Last workout
    const { data: logs } = await supabase
      .from("workout_logs")
      .select("workout_day, started_at")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(1);

    if (logs && logs.length > 0) {
      setLastWorkout({ day: logs[0].workout_day, date: logs[0].started_at });
      setNextWorkout(getNextWorkoutDay(logs[0].workout_day));
    }

    // Calendar data - this month
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    const { data: monthLogs } = await supabase
      .from("workout_logs")
      .select("started_at")
      .eq("user_id", userId)
      .gte("started_at", start.toISOString())
      .lte("started_at", end.toISOString());

    if (monthLogs) {
      setWorkoutDates(monthLogs.map((l) => parseISO(l.started_at)));
    }

    setLoading(false);
  }

  const now = new Date();
  const monthDays = eachDayOfInterval({ start: startOfMonth(now), end: endOfMonth(now) });
  const firstDayOffset = (startOfMonth(now).getDay() + 6) % 7; // Monday start

  const lastDayData = lastWorkout
    ? WORKOUT_DAYS.find((d) => d.id === lastWorkout.day)
    : null;

  return (
    <div className="px-5 pt-14 pb-24 min-h-screen">
      <h1 className="text-3xl font-bold mb-1">Workout</h1>
      <p className="text-muted-foreground text-sm mb-6">
        {format(now, "EEEE d MMMM", { locale: it })}
      </p>

      {/* Next Workout Card */}
      <button
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
      </button>

      {/* Last Workout */}
      {lastDayData && lastWorkout && (
        <div className="bg-card rounded-2xl p-5 mb-6">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Ultimo allenamento</p>
          <p className="text-lg font-semibold">{lastDayData.label} — {lastDayData.title}</p>
          <p className="text-sm text-muted-foreground">
            {format(parseISO(lastWorkout.date), "d MMMM, HH:mm", { locale: it })}
          </p>
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
