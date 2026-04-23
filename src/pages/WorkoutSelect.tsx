import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUserId } from "@/lib/user";
import { useActivePlan } from "@/contexts/ActivePlanContext";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, ArrowLeft, Loader, Plus, Edit2, Trash2 } from "lucide-react";

interface WorkoutPlan {
  id: string;
  name: string;
  description: string | null;
  duration_weeks: number | null;
}

interface State {
  selectedPlan: string | null;
  activePlanId: string | null;
}

interface WorkoutDay {
  id: string;
  day_number: number;
  day_name: string;
  workout_plan_id: string;
}

interface PlanDay {
  id: string;
  exercise_name: string;
  sets: number;
  reps_min: number | null;
  reps_max: number | null;
}

export default function WorkoutSelect() {
  const navigate = useNavigate();
  const { activePlanId, setActivePlanId } = useActivePlan();
  const { toast } = useToast();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [days, setDays] = useState<WorkoutDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    // Auto-select plan if activePlanId exists from context
    if (activePlanId && plans.length > 0) {
      setSelectedPlan(activePlanId);
      loadDays(activePlanId);
    }
  }, [plans, activePlanId]);

  async function deletePlan(planId: string) {
    if (!window.confirm("Sei sicuro di voler eliminare questa scheda? Non potrai annullare l'azione.")) {
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("workout_plans")
        .delete()
        .eq("id", planId);

      if (error) throw error;

      // Se era il piano attivo, deselezionalo
      if (activePlanId === planId) {
        setActivePlanId(null);
      }

      toast({
        title: "Successo",
        description: "Scheda eliminata con successo",
      });

      setSelectedPlan(null);
      loadPlans();
    } catch (error) {
      console.error("Errore eliminazione scheda:", error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la scheda",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  async function loadPlans() {
    try {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from("workout_plans")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPlans(data || []);
      if (data && data.length > 0) {
        setSelectedPlan(data[0].id);
      }
    } catch (error) {
      console.error("Errore caricamento schede:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadDays(planId: string) {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("workout_plan_days")
        .select("*")
        .eq("workout_plan_id", planId)
        .order("day_number", { ascending: true });

      if (error) throw error;
      setDays(data || []);
    } catch (error) {
      console.error("Errore caricamento giorni:", error);
    } finally {
      setLoading(false);
    }
  }

  if (selectedPlan) {
    const plan = plans.find(p => p.id === selectedPlan);
    return (
      <div className="px-5 pt-14 pb-24 min-h-screen">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedPlan(null)}
              className="text-muted-foreground"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold">{plan?.name}</h1>
              <p className="text-muted-foreground text-sm">{plan?.description}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/edit-plan/${selectedPlan}`)}
              className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:bg-secondary/80 transition-colors"
            >
              <Edit2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => selectedPlan && deletePlan(selectedPlan)}
              disabled={deleting}
              className="w-11 h-11 rounded-full bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {days.map((day) => (
              <button
                key={day.id}
                onClick={() => {
                  localStorage.setItem('activePlanId', selectedPlan);
                  navigate(`/session/${day.id}`);
                }}
                className="w-full bg-card rounded-2xl p-5 text-left flex items-center justify-between active:scale-[0.98] transition-transform"
              >
                <div>
                  <p className="font-semibold text-base">{day.day_name}</p>
                  <p className="text-sm text-muted-foreground">Giorno {day.day_number}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-5 pt-14 pb-24 min-h-screen">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-3xl font-bold">Schede</h1>
        <button
          onClick={() => navigate("/create-plan")}
          className="w-11 h-11 rounded-full bg-primary flex items-center justify-center"
        >
          <Plus className="w-5 h-5 text-primary-foreground" />
        </button>
      </div>
      <p className="text-muted-foreground text-sm mb-6">Scegli il tuo programma</p>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 animate-spin text-muted-foreground" />
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
              className={`w-full rounded-2xl p-5 text-left flex items-center justify-between active:scale-[0.98] transition-all ${
                isActive
                  ? "bg-primary/10 border-2 border-primary"
                  : "bg-card border-2 border-transparent"
              }`}
            >
              <div>
                <p className="font-semibold text-base">{plan.name}</p>
                {plan.duration_weeks && (
                  <p className="text-sm text-muted-foreground">{plan.duration_weeks} settimane</p>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          );
          })}
        </div>
      )}
    </div>
  );
}
