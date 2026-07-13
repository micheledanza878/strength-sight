import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, X, Loader, ChevronRight, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getUserId } from "@/lib/user";
import { useToast } from "@/hooks/use-toast";
import PageContainer from "@/components/PageContainer";

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
      const userId = await getUserId();
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

  function moveExercise(idx: number, dir: 'up' | 'down') {
    const updated = [...days];
    const exs = [...updated[currentDayIdx].exercises];
    const to = dir === 'up' ? idx - 1 : idx + 1;
    if (to < 0 || to >= exs.length) return;
    [exs[idx], exs[to]] = [exs[to], exs[idx]];
    updated[currentDayIdx].exercises = exs;
    setDays(updated);
  }

  function updateExercise<K extends keyof Exercise>(exIdx: number, field: K, value: Exercise[K]) {
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

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  const STEPS = ["Scheda", "Giorni", "Esercizi"];
  const stepIndex = step === "plan" ? 0 : step === "days" ? 1 : 2;
  const inputClass = "w-full h-12 bg-secondary border border-border rounded-xl px-4 text-foreground text-sm outline-none focus:ring-2 focus:ring-primary transition-all";
  const smallInputClass = "w-full h-10 bg-secondary border border-border rounded-xl px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary transition-all";

  return (
    <PageContainer variant="narrow" className="min-h-screen px-4 pt-14 pb-32">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => {
            if (step === "plan") navigate(-1);
            else if (step === "days") setStep("plan");
            else setStep("days");
          }}
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground active:scale-90 transition-transform flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Modifica Scheda</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {step === "plan" && "Informazioni generali"}
            {step === "days" && "Configura i giorni"}
            {step === "exercises" && `Esercizi · ${days[currentDayIdx]?.day_name}`}
          </p>
        </div>
      </div>

      {/* ── Step indicator ── */}
      <div className="flex items-center mb-6">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              <div className={[
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                i < stepIndex ? "bg-primary/20 text-primary" :
                i === stepIndex ? "gradient-primary text-white" :
                "bg-secondary text-muted-foreground"
              ].join(" ")}>
                {i < stepIndex ? "✓" : i + 1}
              </div>
              <span className={`text-[10px] font-semibold ${i === stepIndex ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
            </div>
            {i < 2 && <div className={`flex-1 h-px mx-2 mb-4 ${i < stepIndex ? "bg-primary/40" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      {/* ── STEP 1: Piano ── */}
      {step === "plan" && (
        <div className="space-y-4 mb-8">
          <div>
            <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block mb-2">Nome scheda</label>
            <input type="text" placeholder="es. Upper/Lower 4 Giorni" value={planName}
              onChange={(e) => setPlanName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block mb-2">Durata (settimane)</label>
            <input type="number" placeholder="4" value={durationWeeks}
              onChange={(e) => setDurationWeeks(e.target.value)} min="1" max="52" className={inputClass} />
          </div>
        </div>
      )}

      {/* ── STEP 2: Giorni ── */}
      {step === "days" && (
        <div className="space-y-3 mb-8">
          {days.map((day, idx) => (
            <div key={idx} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Giorno {idx + 1}</label>
                {days.length > 1 && (
                  <button onClick={() => removeDay(idx)}
                    className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive active:scale-90 transition-transform">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <input type="text" value={day.day_name}
                onChange={(e) => updateDayName(idx, e.target.value)} className={smallInputClass} />
            </div>
          ))}

          <button onClick={addDay}
            className="w-full h-12 rounded-2xl bg-secondary border border-dashed border-border text-muted-foreground font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform">
            <Plus className="w-4 h-4" />
            Aggiungi giorno
          </button>
        </div>
      )}

      {/* ── STEP 3: Esercizi ── */}
      {step === "exercises" && (
        <div>
          {/* Day tabs */}
          <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar pb-1">
            {days.map((day, idx) => (
              <button key={idx} onClick={() => setCurrentDayIdx(idx)}
                className={[
                  "flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95",
                  idx === currentDayIdx ? "gradient-primary text-white" : "bg-secondary text-muted-foreground"
                ].join(" ")}>
                {day.day_name}
              </button>
            ))}
          </div>

          <div className="space-y-3 mb-8">
            {days[currentDayIdx]?.exercises.map((ex, exIdx) => (
              <div key={exIdx} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Esercizio {exIdx + 1}</p>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => moveExercise(exIdx, 'up')} disabled={exIdx === 0}
                      className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground disabled:opacity-30 active:scale-90 transition-transform">
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moveExercise(exIdx, 'down')} disabled={exIdx === days[currentDayIdx].exercises.length - 1}
                      className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground disabled:opacity-30 active:scale-90 transition-transform">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeExercise(exIdx)}
                      className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive active:scale-90 transition-transform">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <input type="text" placeholder="Nome esercizio" value={ex.exercise_name}
                  onChange={(e) => updateExercise(exIdx, "exercise_name", e.target.value)} className={smallInputClass} />

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1.5">Serie</label>
                    <input type="number" value={ex.sets}
                      onChange={(e) => updateExercise(exIdx, "sets", parseInt(e.target.value))}
                      className="w-full h-10 bg-secondary rounded-xl px-3 text-sm text-center outline-none focus:ring-2 focus:ring-primary" min="1" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1.5">Rep min</label>
                    <input type="number" value={ex.reps_min}
                      onChange={(e) => updateExercise(exIdx, "reps_min", parseInt(e.target.value))}
                      className="w-full h-10 bg-secondary rounded-xl px-3 text-sm text-center outline-none focus:ring-2 focus:ring-primary" min="1" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1.5">Rep max</label>
                    <input type="number" value={ex.reps_max}
                      onChange={(e) => updateExercise(exIdx, "reps_max", parseInt(e.target.value))}
                      className="w-full h-10 bg-secondary rounded-xl px-3 text-sm text-center outline-none focus:ring-2 focus:ring-primary" min="1" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1.5">Riposo (sec)</label>
                    <input type="number" value={ex.rest_seconds}
                      onChange={(e) => updateExercise(exIdx, "rest_seconds", parseInt(e.target.value))}
                      className="w-full h-10 bg-secondary rounded-xl px-3 text-sm outline-none focus:ring-2 focus:ring-primary" min="0" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1.5">Note (opz.)</label>
                    <input type="text" placeholder="es. RPE 8" value={ex.notes}
                      onChange={(e) => updateExercise(exIdx, "notes", e.target.value)}
                      className="w-full h-10 bg-secondary rounded-xl px-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
              </div>
            ))}

            <button onClick={addExercise}
              className="w-full h-12 rounded-2xl bg-secondary border border-dashed border-border text-muted-foreground font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform">
              <Plus className="w-4 h-4" />
              Aggiungi esercizio
            </button>
          </div>
        </div>
      )}

      {/* ── Bottom CTA ── */}
      <div className="fixed bottom-6 left-3 right-3 sm:left-4 sm:right-4 max-w-[412px] mx-auto flex gap-3 md:sticky md:bottom-6 md:left-auto md:right-auto md:max-w-none md:w-full">
        <button
          onClick={() => {
            if (step === "plan") navigate(-1);
            else if (step === "days") setStep("plan");
            else setStep("days");
          }}
          className="flex-1 h-14 rounded-2xl bg-secondary text-foreground font-semibold active:scale-95 transition-transform"
        >
          Indietro
        </button>

        {step === "exercises" ? (
          <button onClick={savePlan} disabled={saving}
            className="flex-1 h-14 rounded-2xl gradient-primary glow-primary text-white font-bold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60">
            {saving ? <><Loader className="w-4 h-4 animate-spin" /> Salvataggio...</> : "✓ Salva"}
          </button>
        ) : (
          <button onClick={step === "plan" ? handlePlanNext : handleDaysNext}
            className="flex-1 h-14 rounded-2xl gradient-primary glow-primary text-white font-bold flex items-center justify-center gap-2 active:scale-95 transition-all">
            Avanti <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </PageContainer>
  );
}
