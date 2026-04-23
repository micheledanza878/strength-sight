import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { it } from "date-fns/locale";
import { ChevronDown, ChevronUp, Trophy, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WORKOUT_DAYS } from "@/data/workouts";
import { getUserId } from "@/lib/user";

interface BodyPart {
  id: string;
  slug: string;
  name: string;
  icon: string;
}

interface SetLog {
  exercise_name: string;
  set_number: number;
  reps: number;
  weight: number | null;
}

interface WorkoutLog {
  id: string;
  workout_day: string;
  started_at: string;
  completed_at: string;
  set_logs: SetLog[];
}

interface PlanDay {
  id: string;
  day_number: number;
  day_name: string;
  workout_plan_id: string;
}

interface WorkoutPlan {
  id: string;
  name: string;
  duration_weeks: number | null;
}

export default function History() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"history" | "records">("history");
  const [loading, setLoading] = useState(true);
  const [planDays, setPlanDays] = useState<PlanDay[]>([]);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null);
  const [bodyParts, setBodyParts] = useState<BodyPart[]>([]);
  const [exerciseBodyPartMap, setExerciseBodyPartMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const initializeData = async () => {
      try {
        await loadBodyParts();
        await loadPlans();
        const userId = await getUserId();
        await loadData(userId);
      } catch (error) {
        console.error("Errore inizializzazione:", error);
      }
    };
    initializeData();
  }, []);

  async function loadBodyParts() {
    try {
      const { data } = await supabase
        .from("body_parts")
        .select("id, slug, name, icon")
        .order("name", { ascending: true });

      if (data) {
        setBodyParts(data);
      }

      // Load exercise-body_part mappings
      const { data: mappings } = await supabase
        .from("workout_plan_exercises")
        .select("exercise_name, primary_body_part_id, body_parts(id, name)")
        .not("primary_body_part_id", "is", null);

      if (mappings) {
        const map: Record<string, string> = {};
        mappings.forEach((m: any) => {
          if (m.body_parts?.id) {
            map[m.exercise_name] = m.body_parts.id;
          }
        });
        setExerciseBodyPartMap(map);
      }
    } catch (error) {
      console.error("Errore caricamento body parts:", error);
    }
  }

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
        if (data.length > 0) {
          setCurrentPlanId(data[0].id);
        }
      }
    } catch (error) {
      console.error("Errore caricamento schede:", error);
    }
  }

  async function changePlan(planId: string) {
    setCurrentPlanId(planId);
    const userId = await getUserId();
    loadData(userId);
  }

  async function loadData(uid: string) {
    const { data } = await supabase
      .from("workout_logs")
      .select("id, workout_day, started_at, completed_at, set_logs (exercise_name, set_number, reps, weight)")
      .eq("user_id", uid)
      .not("completed_at", "is", null)
      .order("started_at", { ascending: false });

    // Load plan days for filtering
    const activePlanId = localStorage.getItem('activePlanId');
    if (activePlanId) {
      const { data: days } = await supabase
        .from("workout_plan_days")
        .select("*")
        .eq("workout_plan_id", activePlanId);
      if (days) setPlanDays(days);
    }

    if (data) setLogs(data as WorkoutLog[]);
    setLoading(false);
  }

  // Filter logs by selected plan
  const planDayNames = new Set(planDays.map((d) => d.day_name));
  let filteredLogs = planDays.length > 0 ? logs.filter((log) => planDayNames.has(log.workout_day)) : logs;

  // Filter by body part if selected
  if (selectedBodyPart) {
    filteredLogs = filteredLogs.map((log) => ({
      ...log,
      set_logs: log.set_logs.filter((set) => exerciseBodyPartMap[set.exercise_name] === selectedBodyPart),
    })).filter((log) => log.set_logs.length > 0);
  }

  // Get unique body parts from all exercises
  const usedBodyParts = new Set(
    logs.flatMap((log) =>
      log.set_logs
        .map((set) => exerciseBodyPartMap[set.exercise_name])
        .filter((id) => !!id)
    )
  );
  const uniqueBodyParts = bodyParts.filter((bp) => usedBodyParts.has(bp.id));

  // Compute PRs from filtered set_logs
  const prMap: Record<string, { weight: number; reps: number; date: string }> = {};
  filteredLogs.forEach((log) => {
    log.set_logs.forEach((s) => {
      const cur = prMap[s.exercise_name];
      if (!cur || s.weight > cur.weight || (s.weight === cur.weight && s.reps > cur.reps)) {
        prMap[s.exercise_name] = { weight: s.weight, reps: s.reps, date: log.started_at };
      }
    });
  });
  const prs = Object.entries(prMap).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="px-5 pt-14 pb-24 min-h-screen">
      <h1 className="text-3xl font-bold mb-1">Storico</h1>
      <p className="text-muted-foreground text-sm mb-4">I tuoi allenamenti</p>

      {/* Workout Plan Selector */}
      {plans.length > 0 && (
        <div className="mb-6">
          <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-2">
            Scheda allenamento
          </label>
          <Select value={currentPlanId || ""} onValueChange={changePlan}>
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

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${activeTab === "history" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
        >
          Allenamenti
        </button>
        <button
          onClick={() => setActiveTab("records")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${activeTab === "records" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
        >
          🏆 Record
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="w-full h-20 rounded-2xl" />
          ))}
        </div>
      )}

      {activeTab === "history" && !loading && (
        (() => {
          return filteredLogs.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 text-center py-16">
              <p className="text-3xl mb-3">🏋️</p>
              <p className="text-muted-foreground text-sm font-medium">Nessun allenamento completato</p>
              <p className="text-muted-foreground text-xs mt-2">Inizia il tuo primo allenamento per vedere i dati qui</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => {
              const day = WORKOUT_DAYS.find((d) => d.id === log.workout_day);
              const duration = differenceInMinutes(parseISO(log.completed_at), parseISO(log.started_at));
              const totalSets = log.set_logs.length;
              const totalVolume = log.set_logs.reduce((acc, s) => acc + s.weight * s.reps, 0);
              const isExpanded = expanded === log.id;

              const byExercise: Record<string, SetLog[]> = {};
              log.set_logs
                .slice()
                .sort((a, b) => a.set_number - b.set_number)
                .forEach((s) => {
                  if (!byExercise[s.exercise_name]) byExercise[s.exercise_name] = [];
                  byExercise[s.exercise_name].push(s);
                });

              return (
                <div key={log.id} className="bg-card rounded-2xl overflow-hidden">
                  <button
                    className="w-full p-5 text-left flex items-center justify-between active:bg-secondary/50 transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : log.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: (day?.color || "#888") + "22" }}
                      >
                        <span className="text-lg">
                          {day?.emoji || log.workout_day.slice(0, 1)}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{day?.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(log.started_at), "d MMMM yyyy", { locale: it })}
                        </p>
                        <div className="flex gap-3 mt-1">
                          {totalSets > 0 && <span className="text-xs text-muted-foreground">{totalSets} serie</span>}
                          {totalVolume > 0 && <span className="text-xs text-muted-foreground">{totalVolume.toLocaleString()} kg vol.</span>}
                          {duration > 0 && <span className="text-xs text-muted-foreground">{duration} min</span>}
                        </div>
                      </div>
                    </div>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    }
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
                      {Object.entries(byExercise).map(([exName, exSets]) => (
                        <div key={exName}>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            {exName}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {exSets.map((s, i) => (
                              <span key={i} className="bg-secondary rounded-lg px-3 py-2 text-xs">
                                <p className="font-bold">{s.weight}kg</p>
                                <p className="text-muted-foreground">{s.reps} rep</p>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          );
        })()
      )}

      {activeTab === "records" && !loading && (
        <>
          {/* Body Part Filter */}
          <div className="mb-6">
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-2">
              Filtro muscoli
            </label>
            <Select value={selectedBodyPart || "all"} onValueChange={(val) => setSelectedBodyPart(val === "all" ? null : val)}>
              <SelectTrigger className="w-full bg-card border-0 h-12">
                <SelectValue placeholder="Tutti i muscoli" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i muscoli</SelectItem>
                {uniqueBodyParts.map((bp) => (
                  <SelectItem key={bp.id} value={bp.id}>
                    {bp.icon} {bp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {prs.length === 0 ? (
          <div className="bg-card rounded-2xl p-8 text-center py-16">
            <p className="text-3xl mb-3">🏆</p>
            <p className="text-muted-foreground text-sm font-medium">Nessun record ancora</p>
            <p className="text-muted-foreground text-xs mt-2">Completa un allenamento per registrare i tuoi PR</p>
          </div>
        ) : (
          <div className="space-y-2">
            {prs.map(([exercise, pr]) => (
              <div key={exercise} className="bg-card rounded-2xl p-4 flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <p className="font-semibold text-sm">{exercise}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(pr.date), "d MMM yyyy", { locale: it })}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <div className="text-right">
                    <p className="font-bold text-sm">{pr.weight}kg</p>
                    <p className="text-xs text-muted-foreground">{pr.reps} rep</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
          }
        </>
      )}
    </div>
  );
}
