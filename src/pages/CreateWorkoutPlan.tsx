import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, X, Loader } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getUserId } from "@/lib/user";

interface Exercise {
  exercise_name: string;
  sets: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number;
  notes: string;
}

interface WorkoutDay {
  day_name: string;
  exercises: Exercise[];
}

export default function CreateWorkoutPlan() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [planName, setPlanName] = useState("");
  const [durationWeeks, setDurationWeeks] = useState("4");
  const [days, setDays] = useState<WorkoutDay[]>([]);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  function addDay() {
    setDays([...days, { day_name: "", exercises: [] }]);
    setExpandedDay(days.length);
  }

  function removeDay(idx: number) {
    setDays(days.filter((_, i) => i !== idx));
    if (expandedDay === idx) setExpandedDay(null);
  }

  function updateDayName(idx: number, name: string) {
    const updated = [...days];
    updated[idx].day_name = name;
    setDays(updated);
  }

  function addExercise(dayIdx: number) {
    const updated = [...days];
    updated[dayIdx].exercises.push({
      exercise_name: "",
      sets: 3,
      reps_min: 8,
      reps_max: 12,
      rest_seconds: 90,
      notes: "",
    });
    setDays(updated);
  }

  function removeExercise(dayIdx: number, exIdx: number) {
    const updated = [...days];
    updated[dayIdx].exercises.splice(exIdx, 1);
    setDays(updated);
  }

  function updateExercise(dayIdx: number, exIdx: number, field: keyof Exercise, value: any) {
    const updated = [...days];
    updated[dayIdx].exercises[exIdx] = {
      ...updated[dayIdx].exercises[exIdx],
      [field]: value,
    };
    setDays(updated);
  }

  async function savePlan() {
    if (!planName.trim()) {
      toast({ title: "Errore", description: "Inserisci il nome della scheda", variant: "destructive" });
      return;
    }

    if (days.length === 0) {
      toast({ title: "Errore", description: "Aggiungi almeno un giorno di allenamento", variant: "destructive" });
      return;
    }

    // Validate all days and exercises
    for (let i = 0; i < days.length; i++) {
      if (!days[i].day_name.trim()) {
        toast({ title: "Errore", description: `Inserisci il nome del giorno ${i + 1}`, variant: "destructive" });
        return;
      }
      if (days[i].exercises.length === 0) {
        toast({ title: "Errore", description: `Aggiungi almeno un esercizio al giorno "${days[i].day_name}"`, variant: "destructive" });
        return;
      }
      for (let j = 0; j < days[i].exercises.length; j++) {
        if (!days[i].exercises[j].exercise_name.trim()) {
          toast({ title: "Errore", description: `Inserisci il nome dell'esercizio ${j + 1} del giorno "${days[i].day_name}"`, variant: "destructive" });
          return;
        }
      }
    }

    setSaving(true);

    try {
      // Create workout plan
      const { data: planData, error: planError } = await supabase
        .from("workout_plans")
        .insert({
          name: planName,
          duration_weeks: parseInt(durationWeeks) || null,
        })
        .select("id")
        .single();

      if (planError) throw planError;
      if (!planData) throw new Error("Failed to create plan");

      const planId = planData.id;

      // Create days and exercises
      for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
        const day = days[dayIdx];
        const { data: dayData, error: dayError } = await supabase
          .from("workout_plan_days")
          .insert({
            workout_plan_id: planId,
            day_number: dayIdx + 1,
            day_name: day.day_name,
          })
          .select("id")
          .single();

        if (dayError) throw dayError;
        if (!dayData) throw new Error("Failed to create day");

        const dayId = dayData.id;

        // Create exercises for this day
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

        const { error: exError } = await supabase
          .from("workout_plan_exercises")
          .insert(exercisesToInsert);

        if (exError) throw exError;
      }

      toast({ title: "Successo", description: "Scheda creata con successo!" });

      // Set as active plan
      localStorage.setItem('activePlanId', planId);

      // Redirect to history
      navigate("/history");
    } catch (error) {
      console.error("Errore salvataggio scheda:", error);
      toast({ title: "Errore", description: "Impossibile salvare la scheda", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen px-5 pt-14 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-muted-foreground">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">Nuova Scheda</h1>
          <p className="text-xs text-muted-foreground mt-1">Crea il tuo programma di allenamento</p>
        </div>
      </div>

      {/* Plan Info */}
      <div className="space-y-4 mb-8">
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

      {/* Days Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Giorni di allenamento
          </label>
          <button
            onClick={addDay}
            className="flex items-center gap-1.5 text-primary text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            Aggiungi giorno
          </button>
        </div>

        <div className="space-y-2">
          {days.map((day, dayIdx) => (
            <div key={dayIdx} className="bg-card rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedDay(expandedDay === dayIdx ? null : dayIdx)}
                className="w-full p-4 text-left flex items-center justify-between active:bg-secondary/50"
              >
                <div className="flex-1">
                  <p className="font-semibold text-sm">{day.day_name || `Giorno ${dayIdx + 1}`}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{day.exercises.length} esercizi</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDay(dayIdx);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </button>
              </button>

              {expandedDay === dayIdx && (
                <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                  <div>
                    <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-2">
                      Nome giorno
                    </label>
                    <input
                      type="text"
                      placeholder="es. Upper A, Lower B, Petto..."
                      value={day.day_name}
                      onChange={(e) => updateDayName(dayIdx, e.target.value)}
                      className="w-full h-10 bg-secondary border border-border rounded-lg px-3 text-sm text-foreground outline-none focus:border-primary"
                    />
                  </div>

                  {/* Exercises */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        Esercizi
                      </label>
                      <button
                        onClick={() => addExercise(dayIdx)}
                        className="flex items-center gap-1 text-primary text-xs font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Aggiungi
                      </button>
                    </div>

                    <div className="space-y-3">
                      {day.exercises.map((ex, exIdx) => (
                        <div key={exIdx} className="bg-secondary rounded-lg p-3 space-y-2">
                          <div className="flex gap-2 items-start">
                            <input
                              type="text"
                              placeholder="Nome esercizio"
                              value={ex.exercise_name}
                              onChange={(e) => updateExercise(dayIdx, exIdx, "exercise_name", e.target.value)}
                              className="flex-1 h-9 bg-background border border-border rounded px-2 text-sm text-foreground outline-none focus:border-primary"
                            />
                            <button
                              onClick={() => removeExercise(dayIdx, exIdx)}
                              className="text-muted-foreground hover:text-destructive mt-0.5"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-muted-foreground block mb-1">Serie</label>
                              <input
                                type="number"
                                value={ex.sets}
                                onChange={(e) => updateExercise(dayIdx, exIdx, "sets", parseInt(e.target.value) || 0)}
                                min="1"
                                max="10"
                                className="w-full h-8 bg-background border border-border rounded px-2 text-xs text-foreground outline-none focus:border-primary"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground block mb-1">Reps min-max</label>
                              <div className="flex gap-1">
                                <input
                                  type="number"
                                  value={ex.reps_min}
                                  onChange={(e) => updateExercise(dayIdx, exIdx, "reps_min", parseInt(e.target.value) || 0)}
                                  min="1"
                                  max="100"
                                  className="flex-1 h-8 bg-background border border-border rounded px-2 text-xs text-foreground outline-none focus:border-primary"
                                />
                                <input
                                  type="number"
                                  value={ex.reps_max}
                                  onChange={(e) => updateExercise(dayIdx, exIdx, "reps_max", parseInt(e.target.value) || 0)}
                                  min="1"
                                  max="100"
                                  className="flex-1 h-8 bg-background border border-border rounded px-2 text-xs text-foreground outline-none focus:border-primary"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-muted-foreground block mb-1">Rest (sec)</label>
                              <input
                                type="number"
                                value={ex.rest_seconds}
                                onChange={(e) => updateExercise(dayIdx, exIdx, "rest_seconds", parseInt(e.target.value) || 0)}
                                min="0"
                                step="15"
                                className="w-full h-8 bg-background border border-border rounded px-2 text-xs text-foreground outline-none focus:border-primary"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground block mb-1">Note (opz.)</label>
                              <input
                                type="text"
                                placeholder="es. RPE 8"
                                value={ex.notes}
                                onChange={(e) => updateExercise(dayIdx, exIdx, "notes", e.target.value)}
                                className="w-full h-8 bg-background border border-border rounded px-2 text-xs text-foreground outline-none focus:border-primary"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="fixed bottom-8 left-4 right-4 max-w-[412px] mx-auto">
        <button
          onClick={savePlan}
          disabled={saving}
          className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Salvataggio...
            </>
          ) : (
            "✓ Salva Scheda"
          )}
        </button>
      </div>
    </div>
  );
}
