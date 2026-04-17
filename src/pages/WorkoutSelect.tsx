import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, ArrowLeft, Loader, Plus } from "lucide-react";

interface WorkoutPlan {
  id: string;
  name: string;
  description: string | null;
  duration_weeks: number | null;
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
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [days, setDays] = useState<WorkoutDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    try {
      const { data, error } = await supabase
        .from("workout_plans")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPlans(data || []);
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
        <div className="flex items-center gap-3 mb-6">
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
                  <p className="font-semibold text-base">Giorno {day.day_number}</p>
                  <p className="text-sm text-muted-foreground">{day.day_name}</p>
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
          className="flex items-center gap-1.5 text-primary text-sm font-semibold"
        >
          <Plus className="w-5 h-5" />
          Nuova
        </button>
      </div>
      <p className="text-muted-foreground text-sm mb-6">Scegli il tuo programma</p>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => {
                setSelectedPlan(plan.id);
                loadDays(plan.id);
              }}
              className="w-full bg-card rounded-2xl p-5 text-left flex items-center justify-between active:scale-[0.98] transition-transform"
            >
              <div>
                <p className="font-semibold text-base">{plan.name}</p>
                {plan.duration_weeks && (
                  <p className="text-sm text-muted-foreground">{plan.duration_weeks} settimane</p>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
