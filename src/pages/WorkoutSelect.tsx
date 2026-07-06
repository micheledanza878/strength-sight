import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUserId } from "@/lib/user";
import { useActivePlan } from "@/contexts/ActivePlanContext";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, ArrowLeft, Loader, Plus, Edit2, Trash2, Play } from "lucide-react";
import PageContainer from "@/components/PageContainer";

interface WorkoutPlan {
  id: string;
  name: string;
  description: string | null;
  duration_weeks: number | null;
  day_count?: number;
}

interface WorkoutDay {
  id: string;
  day_number: number;
  day_name: string;
  workout_plan_id: string;
  exercise_count: number;
  muscles: { icon: string; name: string }[];
}

/** Forma raw restituita da Supabase per la query workout_plans con join aggregata */
interface WorkoutPlanRaw {
  id: string;
  name: string;
  description: string | null;
  duration_weeks: number | null;
  workout_plan_days: { count: number }[];
}

/** Forma raw di un giorno con join agli esercizi e alle parti del corpo */
interface WorkoutPlanDayRaw {
  id: string;
  day_number: number;
  day_name: string;
  workout_plan_id: string;
  workout_plan_exercises: WorkoutPlanExerciseRaw[];
}

interface WorkoutPlanExerciseRaw {
  primary_body_part_id: string | null;
  body_parts: { name: string; icon: string } | null;
}

export default function WorkoutSelect() {
  const navigate = useNavigate();
  const { activePlanId, setActivePlanId } = useActivePlan();
  const { toast } = useToast();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [days, setDays] = useState<WorkoutDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysLoading, setDaysLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    if (activePlanId && plans.length > 0) {
      setSelectedPlan(activePlanId);
      loadDays(activePlanId);
    }
  }, [plans, activePlanId]);

  async function loadPlans() {
    try {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from("workout_plans")
        .select("*, workout_plan_days(count)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPlans(
        ((data || []) as WorkoutPlanRaw[]).map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          duration_weeks: p.duration_weeks,
          day_count: p.workout_plan_days?.[0]?.count ?? 0,
        }))
      );
    } catch (error) {
      console.error("Errore caricamento schede:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadDays(planId: string) {
    try {
      setDaysLoading(true);
      const { data, error } = await supabase
        .from("workout_plan_days")
        .select(`*, workout_plan_exercises(primary_body_part_id, body_parts(name, icon))`)
        .eq("workout_plan_id", planId)
        .order("day_number", { ascending: true });

      if (error) throw error;
      setDays(
        ((data || []) as WorkoutPlanDayRaw[]).map((d) => {
          const exs: WorkoutPlanExerciseRaw[] = d.workout_plan_exercises || [];
          const muscleMap = new Map<string, { icon: string; name: string }>();
          for (const ex of exs) {
            if (ex.body_parts && ex.primary_body_part_id) {
              muscleMap.set(ex.primary_body_part_id, ex.body_parts);
            }
          }
          return {
            id: d.id,
            day_number: d.day_number,
            day_name: d.day_name,
            workout_plan_id: d.workout_plan_id,
            exercise_count: exs.length,
            muscles: Array.from(muscleMap.values()).slice(0, 4),
          };
        })
      );
    } catch (error) {
      console.error("Errore caricamento giorni:", error);
    } finally {
      setDaysLoading(false);
    }
  }

  async function deletePlan(planId: string) {
    if (!window.confirm("Eliminare questa scheda? L'azione è irreversibile.")) return;

    setDeleting(true);
    try {
      const { error } = await supabase.from("workout_plans").delete().eq("id", planId);
      if (error) throw error;
      if (activePlanId === planId) setActivePlanId(null);
      toast({ title: "Scheda eliminata" });
      setSelectedPlan(null);
      loadPlans();
    } catch (error) {
      toast({ title: "Errore", description: "Impossibile eliminare la scheda", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  // ── VISTA GIORNI ──────────────────────────────────────────────
  if (selectedPlan) {
    const plan = plans.find(p => p.id === selectedPlan);
    const isActive = activePlanId === selectedPlan;

    return (
      <PageContainer variant="default" className="px-4 pt-14 pb-32 min-h-screen">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSelectedPlan(null)}
              className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground active:scale-90 transition-transform flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight truncate">{plan?.name}</h1>
                {isActive && (
                  <span className="flex-shrink-0 text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5 uppercase tracking-wider">
                    Attiva
                  </span>
                )}
              </div>
              {plan?.duration_weeks && (
                <p className="text-xs text-muted-foreground mt-0.5">{plan.duration_weeks} settimane</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-shrink-0 ml-2">
            <button
              onClick={() => navigate(`/edit-plan/${selectedPlan}`)}
              className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground active:scale-90 transition-transform"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => selectedPlan && deletePlan(selectedPlan)}
              disabled={deleting}
              className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive active:scale-90 transition-transform disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days list */}
        {daysLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : days.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center">
            <p className="text-2xl mb-2">🏋️</p>
            <p className="text-sm font-medium text-muted-foreground">Nessun giorno configurato</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {days.map((day) => (
              <div
                key={day.id}
                className="bg-card border border-border rounded-2xl overflow-hidden"
              >
                <div className="flex items-stretch gap-0">

                  {/* Day number badge — tappable → start session */}
                  <button
                    onClick={() => {
                      localStorage.setItem('activePlanId', selectedPlan);
                      navigate(`/session/${day.id}`);
                    }}
                    className="flex flex-col items-center justify-center px-4 gradient-primary active:opacity-80 transition-opacity flex-shrink-0"
                  >
                    <span className="text-white font-black text-xl leading-none">{day.day_number}</span>
                    <span className="text-white/70 text-[9px] font-semibold uppercase tracking-wider mt-0.5">Giorno</span>
                  </button>

                  {/* Day info — tappable → start session */}
                  <button
                    onClick={() => {
                      localStorage.setItem('activePlanId', selectedPlan);
                      navigate(`/session/${day.id}`);
                    }}
                    className="flex-1 p-4 text-left active:bg-secondary/30 transition-colors min-w-0"
                  >
                    <p className="font-bold text-sm leading-tight">{day.day_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {day.exercise_count > 0 ? `${day.exercise_count} esercizi` : "Nessun esercizio"}
                    </p>
                    {day.muscles.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {day.muscles.map((m, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-0.5 text-[10px] bg-secondary rounded-lg px-2 py-0.5 text-muted-foreground font-medium"
                          >
                            {m.icon} {m.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>

                  {/* Actions */}
                  <div className="flex flex-col items-center justify-center gap-2 pr-3 pl-2 flex-shrink-0">
                    <button
                      onClick={() => navigate(`/edit-day/${day.id}`)}
                      className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground active:scale-90 transition-transform"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        localStorage.setItem('activePlanId', selectedPlan);
                        navigate(`/session/${day.id}`);
                      }}
                      className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <Play className="w-3.5 h-3.5 text-white fill-white" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageContainer>
    );
  }

  // ── VISTA LISTA SCHEDE ────────────────────────────────────────
  return (
    <PageContainer variant="default" className="px-4 pt-14 pb-32 min-h-screen">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schede</h1>
          <p className="text-muted-foreground text-xs mt-0.5">I tuoi programmi</p>
        </div>
        <button
          onClick={() => navigate("/create-plan")}
          className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center glow-primary-sm active:scale-90 transition-transform"
        >
          <Plus className="w-5 h-5 text-white" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <p className="text-2xl mb-2">💪</p>
          <p className="text-sm font-medium mb-1">Nessuna scheda</p>
          <p className="text-xs text-muted-foreground">Crea la tua prima scheda di allenamento</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {plans.map((plan) => {
            const isActive = activePlanId === plan.id;
            return (
              <button
                key={plan.id}
                onClick={() => {
                  setActivePlanId(plan.id);
                  setSelectedPlan(plan.id);
                  loadDays(plan.id);
                }}
                className={[
                  "w-full rounded-2xl p-4 text-left active:scale-[0.98] transition-all",
                  isActive ? "card-hero" : "bg-card border border-border"
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {isActive && (
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1.5 block">
                        ● In corso
                      </span>
                    )}
                    <p className={`font-bold text-base leading-tight ${isActive ? "text-foreground" : "text-foreground"}`}>
                      {plan.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      {(plan.day_count ?? 0) > 0 && (
                        <span className="text-xs text-muted-foreground">{plan.day_count} giorni</span>
                      )}
                      {plan.duration_weeks && (
                        <span className="text-xs text-muted-foreground">{plan.duration_weeks} sett.</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
