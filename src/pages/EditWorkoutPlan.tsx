import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, X, Loader, ChevronRight, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getUserId } from "@/lib/user";
import { useToast } from "@/hooks/use-toast";

interface Exercise {
  id?: string;
  exercise_name: string;
  sets: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number;
  notes: string;
  order_number?: number;
}

interface WorkoutDay {
  id?: string;
  day_name: string;
  day_number: number;
  exercises: Exercise[];
}

type Step = "plan" | "days" | "exercises";

export default function EditWorkoutPlan() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("plan");
  const [planName, setPlanName] = useState("");
  const [durationWeeks, setDurationWeeks] = useState("4");
  const [days, setDays] = useState<WorkoutDay[]>([]);
  const [originalDayIds, setOriginalDayIds] = useState<string[]>([]);
  const [currentDayIdx, setCurrentDayIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (planId) loadPlan();
  }, [planId]);

  async function loadPlan() {
    if (!planId) return;
    try {
      const userId = getUserId();
      const { data: planData, error: planError } = await supabase
        .from("workout_plans")
        .select("*")
        .eq("id", planId)
        .eq("user_id", userId)
        .single();

      if (planError) throw planError;
      setPlanName(planData.name);
      setDurationWeeks(String(planData.duration_weeks || 4));

      const { data: daysData, error: daysError } = await supabase
        .from("workout_plan_days")
        .select("*")
        .eq("workout_plan_id", planId)
        .order("day_number", { ascending: true });

      if (daysError) throw daysError;

      const daysWithExercises: WorkoutDay[] = [];
      const originalIds: string[] = [];

      for (const day of daysData || []) {
        originalIds.push(day.id);

        const { data: exData } = await supabase
          .from("workout_plan_exercises")
          .select("*")
          .eq("workout_plan_day_id", day.id)
          .order("order_number", { ascending: true });

        daysWithExercises.push({
          id: day.id,
          day_name: day.day_name,
          day_number: day.day_number,
          exercises: (exData || []).map(ex => ({
            id: ex.id,
            exercise_name: ex.exercise_name,
            sets: ex.sets,
            reps_min: ex.reps_min,
            reps_max: ex.reps_max,
            rest_seconds: ex.rest_seconds,
            notes: ex.notes || "",
            order_number: ex.order_number,
          })),
        });
      }
      setDays(daysWithExercises);
      setOriginalDayIds(originalIds);
    } catch (error) {
      console.error("Errore caricamento scheda:", error);
      toast({ title: "Errore", description: "Impossibile caricare la scheda", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function handlePlanNext() {
    if (!planName.trim()) {
      toast({ title: "Errore", description: "Inserisci il nome della scheda", variant: "destructive" });
      return;
    }
    setStep("days");
  }

  function handleDaysNext() {
    for (let i = 0; i < days.length; i++) {
      if (!days[i].day_name.trim()) {
        toast({ title: "Errore", description: `Inserisci il nome del giorno ${i + 1}`, variant: "destructive" });
        return;
      }
    }
    setStep("exercises");
    setCurrentDayIdx(0);
  }

  function addExercise() {
    const updated = [...days];
    updated[currentDayIdx].exercises.push({
      exercise_name: "",
      sets: 3,
      reps_min: 8,
      reps_max: 12,
      rest_seconds: 90,
      notes: "",
    });
    setDays(updated);
  }

  function removeExercise(exIdx: number) {
    const updated = [...days];
    updated[currentDayIdx].exercises.splice(exIdx, 1);
    setDays(updated);
  }

  function updateExercise(exIdx: number, field: keyof Exercise, value: any) {
    const updated = [...days];
    updated[currentDayIdx].exercises[exIdx] = {
      ...updated[currentDayIdx].exercises[exIdx],
      [field]: value,
    };
    setDays(updated);
  }

  function updateDayName(idx: number, name: string) {
    const updated = [...days];
    updated[idx].day_name = name;
    setDays(updated);
  }

  function addDay() {
    const maxDayNumber = days.length > 0 ? Math.max(...days.map(d => d.day_number)) : 0;
    const newDay: WorkoutDay = {
      day_name: `Giorno ${maxDayNumber + 1}`,
      day_number: maxDayNumber + 1,
      exercises: [],
    };
    setDays([...days, newDay]);
  }

  function removeDay(idx: number) {
    if (days.length === 1) {
      toast({ title: "Errore", description: "Deve esserci almeno un giorno", variant: "destructive" });
      return;
    }
    const updated = days.filter((_, i) => i !== idx);
    setDays(updated);
  }

  async function savePlan() {
    for (let i = 0; i < days.length; i++) {
      if (days[i].exercises.length === 0) {
        toast({ title: "Errore", description: `Aggiungi almeno un esercizio a "${days[i].day_name}"`, variant: "destructive" });
        return;
      }
      for (let j = 0; j < days[i].exercises.length; j++) {
        if (!days[i].exercises[j].exercise_name.trim()) {
          toast({ title: "Errore", description: `Esercizio ${j + 1} in "${days[i].day_name}" senza nome`, variant: "destructive" });
          return;
        }
      }
    }

    setSaving(true);
    try {
      if (!planId) throw new Error("Plan ID non trovato");

      // Delete days that were removed
      const currentDayIds = days.filter(d => d.id).map(d => d.id!);
      const daysToDelete = originalDayIds.filter(id => !currentDayIds.includes(id));

      for (const dayIdToDelete of daysToDelete) {
        // Delete all exercises for this day
        const { data: exToDelete } = await supabase
          .from("workout_plan_exercises")
          .select("id")
          .eq("workout_plan_day_id", dayIdToDelete);

        for (const ex of exToDelete || []) {
          await supabase.from("workout_plan_exercises").delete().eq("id", ex.id);
        }

        // Delete the day
        await supabase.from("workout_plan_days").delete().eq("id", dayIdToDelete);
      }

      await supabase
        .from("workout_plans")
        .update({ name: planName, duration_weeks: parseInt(durationWeeks) || null })
        .eq("id", planId);

      for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
        const day = days[dayIdx];
        let dayId = day.id;

        if (dayId) {
          // Update existing day
          await supabase
            .from("workout_plan_days")
            .update({ day_name: day.day_name })
            .eq("id", dayId);
        } else {
          // Insert new day
          const { data: newDayData, error: newDayError } = await supabase
            .from("workout_plan_days")
            .insert({
              workout_plan_id: planId,
              day_number: dayIdx + 1,
              day_name: day.day_name,
            })
            .select("id")
            .single();

          if (newDayError) throw newDayError;
          if (!newDayData) throw new Error("Failed to create day");
          dayId = newDayData.id;
        }

        // Delete and re-insert exercises
        const exercisesToDelete = await supabase
          .from("workout_plan_exercises")
          .select("id")
          .eq("workout_plan_day_id", dayId);

        for (const ex of exercisesToDelete.data || []) {
          await supabase.from("workout_plan_exercises").delete().eq("id", ex.id);
        }

        const exercisesToInsert = day.exercises.map((ex, exIdx) => ({
          workout_plan_day_id: dayId,
          exercise_name: ex.exercise_name,
          order_number: exIdx + 1,
          sets: ex.sets,
          reps_min: ex.reps_min,
          reps_max: ex.reps_max,
          rest_seconds: ex.rest_seconds,
          notes: ex.notes || null,
        }));

        if (exercisesToInsert.length > 0) {
          await supabase.from("workout_plan_exercises").insert(exercisesToInsert);
        }
      }

      toast({ title: "Successo", description: "Scheda aggiornata con successo!" });
      navigate("/workout");
    } catch (error) {
      console.error("Errore salvataggio scheda:", error);
      toast({ title: "Errore", description: "Impossibile salvare la scheda", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-5 pt-14 text-foreground">Caricamento...</div>;

  return (
    <div className="min-h-screen px-5 pt-14 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => {
            if (step === "plan") navigate(-1);
            else if (step === "days") setStep("plan");
            else setStep("days");
          }}
          className="text-muted-foreground"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">Modifica Scheda</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {step === "plan" && "Informazioni generali"}
            {step === "days" && "Configura i giorni"}
            {step === "exercises" && `Esercizi - ${days[currentDayIdx]?.day_name}`}
          </p>
        </div>
      </div>

      {step === "plan" && (
        <div className="space-y-4 mb-8 animate-in fade-in duration-300">
          <div>
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-2">
              Nome scheda
            </label>
            <input
              type="text"
              placeholder="es. Upper/Lower 4 Giorni"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="w-full h-12 bg-card border border-border rounded-xl px-4 text-foreground outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-2">
              Durata (settimane)
            </label>
            <input
              type="number"
              placeholder="4"
              value={durationWeeks}
              onChange={(e) => setDurationWeeks(e.target.value)}
              min="1"
              max="52"
              className="w-full h-12 bg-card border border-border rounded-xl px-4 text-foreground outline-none focus:border-primary"
            />
          </div>
        </div>
      )}

      {step === "days" && (
        <div className="space-y-3 mb-8 animate-in fade-in duration-300">
          {days.map((day, idx) => (
            <div key={idx}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Giorno {idx + 1}
                </label>
                {days.length > 1 && (
                  <button
                    onClick={() => removeDay(idx)}
                    className="text-red-500 hover:bg-red-500/10 p-1 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <input
                type="text"
                value={day.day_name}
                onChange={(e) => updateDayName(idx, e.target.value)}
                className="w-full h-12 bg-card border border-border rounded-xl px-4 text-foreground outline-none focus:border-primary"
              />
            </div>
          ))}

          <button
            onClick={addDay}
            className="w-full h-12 rounded-xl bg-secondary text-secondary-foreground font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-secondary/80 mt-4"
          >
            <Plus className="w-5 h-5" />
            Aggiungi Giorno
          </button>
        </div>
      )}

      {step === "exercises" && (
        <div className="space-y-4 mb-8 animate-in fade-in duration-300">
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {days.map((day, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentDayIdx(idx)}
                className={`px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-colors ${
                  currentDayIdx === idx
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {day.day_name}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {days[currentDayIdx]?.exercises.map((ex, exIdx) => (
              <div key={exIdx} className="bg-card rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">Esercizio {exIdx + 1}</p>
                  <button
                    onClick={() => removeExercise(exIdx)}
                    className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Nome esercizio"
                  value={ex.exercise_name}
                  onChange={(e) => updateExercise(exIdx, "exercise_name", e.target.value)}
                  className="w-full h-10 bg-secondary border border-border rounded-xl px-3 text-sm outline-none focus:border-primary"
                />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Serie</label>
                    <input
                      type="number"
                      value={ex.sets}
                      onChange={(e) => updateExercise(exIdx, "sets", parseInt(e.target.value))}
                      className="w-full h-10 bg-secondary rounded-xl px-3 text-sm outline-none focus:border-primary"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Riposo (sec)</label>
                    <input
                      type="number"
                      value={ex.rest_seconds}
                      onChange={(e) => updateExercise(exIdx, "rest_seconds", parseInt(e.target.value))}
                      className="w-full h-10 bg-secondary rounded-xl px-3 text-sm outline-none focus:border-primary"
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Rep Min</label>
                    <input
                      type="number"
                      value={ex.reps_min}
                      onChange={(e) => updateExercise(exIdx, "reps_min", parseInt(e.target.value))}
                      className="w-full h-10 bg-secondary rounded-xl px-3 text-sm outline-none focus:border-primary"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Rep Max</label>
                    <input
                      type="number"
                      value={ex.reps_max}
                      onChange={(e) => updateExercise(exIdx, "reps_max", parseInt(e.target.value))}
                      className="w-full h-10 bg-secondary rounded-xl px-3 text-sm outline-none focus:border-primary"
                      min="1"
                    />
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Note (opzionale)"
                  value={ex.notes}
                  onChange={(e) => updateExercise(exIdx, "notes", e.target.value)}
                  className="w-full h-10 bg-secondary rounded-xl px-3 text-sm outline-none focus:border-primary"
                />
              </div>
            ))}

            <button
              onClick={addExercise}
              className="w-full h-12 rounded-xl bg-secondary text-secondary-foreground font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-secondary/80"
            >
              <Plus className="w-5 h-5" />
              Aggiungi Esercizio
            </button>
          </div>
        </div>
      )}

      <div className="fixed bottom-8 left-4 right-4 max-w-[412px] mx-auto flex gap-3">
        <button
          onClick={() => {
            if (step === "plan") navigate(-1);
            else if (step === "days") setStep("plan");
            else setStep("days");
          }}
          className="flex-1 h-14 rounded-2xl bg-secondary text-foreground font-semibold transition-transform active:scale-95"
        >
          Indietro
        </button>

        {step === "exercises" ? (
          <button
            onClick={savePlan}
            disabled={saving}
            className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-semibold transition-all active:scale-95 disabled:opacity-60"
          >
            {saving ? "Salvataggio..." : "✓ Salva"}
          </button>
        ) : (
          <button
            onClick={step === "plan" ? handlePlanNext : handleDaysNext}
            className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            Avanti
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
