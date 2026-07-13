import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { it } from "date-fns/locale";
import { ChevronDown, ChevronUp, Trophy, Filter, ChevronRight } from "lucide-react";
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
import PageContainer from "@/components/PageContainer";

interface BodyPart {
  id: string;
  slug: string;
  name: string;
  icon: string;
}

/** Forma raw del mapping esercizio → parte del corpo restituita da Supabase */
interface ExerciseBodyPartMapping {
  exercise_name: string;
  primary_body_part_id: string | null;
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
  const navigate = useNavigate();
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
      // Load all body parts
      const { data: allBodyParts } = await supabase
        .from("body_parts")
        .select("id, slug, name, icon")
        .order("name", { ascending: true });

      if (allBodyParts) {
        setBodyParts(allBodyParts);
        console.log("Body parts loaded:", allBodyParts.length);
      }

      // Load exercise-body_part mappings
      const { data: mappings, error: mappingsError } = await supabase
        .from("workout_plan_exercises")
        .select("exercise_name, primary_body_part_id")
        .not("primary_body_part_id", "is", null);

      if (mappingsError) {
        console.error("Errore caricamento mappings:", mappingsError);
      }

      if (mappings && mappings.length > 0) {
        const map: Record<string, string> = {};
        (mappings as ExerciseBodyPartMapping[]).forEach((m) => {
          if (m.primary_body_part_id) {
            map[m.exercise_name] = m.primary_body_part_id;
          }
        });
        setExerciseBodyPartMap(map);
        console.log("Exercise body part map created with", Object.keys(map).length, "mappings");
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
    <PageContainer variant="wide" className="px-4 pt-14 pb-32 min-h-screen">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Storico</h1>
        <p className="text-muted-foreground text-xs mt-0.5">I tuoi allenamenti</p>
      </div>

      {/* Workout Plan Selector */}
      {plans.length > 0 && (
        <div className="mb-4">
          <Select value={currentPlanId || ""} onValueChange={changePlan}>
            <SelectTrigger className="w-full bg-secondary border-0 h-11 text-sm font-medium rounded-xl">
              <SelectValue placeholder="Seleziona scheda" />
            </SelectTrigger>
            <SelectContent>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name}
                  {plan.duration_weeks && ` · ${plan.duration_weeks} sett.`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex gap-2 mb-5 bg-secondary p-1 rounded-xl">
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-2 rounded-[10px] text-sm font-semibold transition-all ${activeTab === "history" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          Allenamenti
        </button>
        <button
          onClick={() => setActiveTab("records")}
          className={`flex-1 py-2 rounded-[10px] text-sm font-semibold transition-all ${activeTab === "records" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 lg:gap-6 items-start">
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

              const dayTitle = day?.label || log.workout_day;

              return (
                <div key={log.id} className="bg-card rounded-2xl overflow-hidden">
                  <button
                    className="w-full p-4 text-left flex items-center justify-between active:bg-secondary/50 transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : log.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {day?.emoji ? (
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: (day?.color || "#888") + "22" }}
                        >
                          <span className="text-lg">{day.emoji}</span>
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
                          <span className="text-primary font-bold text-sm">
                            {dayTitle.slice(0, 1).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{dayTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(log.started_at), "d MMMM yyyy", { locale: it })}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                          {totalSets > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              {totalSets} serie
                            </span>
                          )}
                          {totalVolume > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              <span className="text-foreground font-semibold">{totalVolume.toLocaleString()}</span> kg
                            </span>
                          )}
                          {duration > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              {duration} min
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    }
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                      {Object.entries(byExercise).map(([exName, exSets]) => (
                        <div key={exName}>
                          <button
                            onClick={() => navigate(`/exercise/${encodeURIComponent(exName)}`)}
                            className="flex items-center gap-1 group mb-2"
                            aria-label={`Analisi ${exName}`}
                          >
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
                              {exName}
                            </p>
                            <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                          <div className="flex flex-wrap gap-2">
                            {exSets.map((s, i) => (
                              <span key={i} className="bg-secondary rounded-lg px-3 py-2 text-xs">
                                {(s.weight ?? 0) > 0 ? (
                                  <>
                                    <p className="font-bold">{s.weight}kg</p>
                                    <p className="text-muted-foreground">{s.reps} rep</p>
                                  </>
                                ) : (
                                  <>
                                    <p className="font-bold">{s.reps}</p>
                                    <p className="text-muted-foreground">rep</p>
                                  </>
                                )}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 lg:gap-6">
            {prs.map(([exercise, pr]) => {
              const hasWeight = (pr.weight ?? 0) > 0;
              return (
                <div
                  key={exercise}
                  className="bg-card rounded-2xl p-4 flex items-center justify-between border border-amber-400/10"
                >
                  <button
                    onClick={() => navigate(`/exercise/${encodeURIComponent(exercise)}`)}
                    className="flex-1 mr-4 text-left group min-w-0"
                    aria-label={`Analisi ${exercise}`}
                  >
                    <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{exercise}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(pr.date), "d MMM yyyy", { locale: it })}
                    </p>
                  </button>
                  <div className="flex items-center gap-3 shrink-0">
                    <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="text-right">
                      {hasWeight ? (
                        <>
                          <p className="text-base font-bold text-foreground">{pr.weight} kg</p>
                          <p className="text-xs text-muted-foreground">{pr.reps} rep</p>
                        </>
                      ) : (
                        <>
                          <p className="text-base font-bold text-foreground">{pr.reps} rep</p>
                          <span className="inline-block mt-0.5 rounded-md bg-success/15 px-1.5 py-0.5 text-[10px] font-medium text-success">
                            corpo libero
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
          }
        </>
      )}
    </PageContainer>
  );
}
