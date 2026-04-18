import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  id: string;
  day_name: string;
  day_number: number;
  exercises: Exercise[];
  workout_plan_id: string;
}

export default function EditWorkoutDay() {
  const { dayId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [day, setDay] = useState<WorkoutDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (dayId) loadDay();
  }, [dayId]);

  async function loadDay() {
    if (!dayId) return;
    try {
      const { data: dayData, error: dayError } = await supabase
        .from("workout_plan_days")
        .select("*")
        .eq("id", dayId)
        .single();

      if (dayError) throw dayError;

      const { data: exData } = await supabase
        .from("workout_plan_exercises")
        .select("*")
        .eq("workout_plan_day_id", dayId)
        .order("order_number", { ascending: true });

      setDay({
        id: dayData.id,
        day_name: dayData.day_name,
        day_number: dayData.day_number,
        workout_plan_id: dayData.workout_plan_id,
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
    } catch (error) {
      console.error("Errore caricamento giorno:", error);
      toast({ title: "Errore", description: "Impossibile caricare il giorno", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function updateDayName(name: string) {
    if (day) setDay({ ...day, day_name: name });
  }

  function addExercise() {
    if (day) {
      setDay({
        ...day,
        exercises: [
          ...day.exercises,
          {
            exercise_name: "",
            sets: 3,
            reps_min: 8,
            reps_max: 12,
            rest_seconds: 90,
            notes: "",
          },
        ],
      });
    }
  }

  function removeExercise(exIdx: number) {
    if (day) {
      const updated = [...day.exercises];
      updated.splice(exIdx, 1);
      setDay({ ...day, exercises: updated });
    }
  }

  function updateExercise(exIdx: number, field: keyof Exercise, value: any) {
    if (day) {
      const updated = [...day.exercises];
      updated[exIdx] = { ...updated[exIdx], [field]: value };
      setDay({ ...day, exercises: updated });
    }
  }

  async function saveDay() {
    if (!day) return;

    if (!day.day_name.trim()) {
      toast({ title: "Errore", description: "Inserisci il nome del giorno", variant: "destructive" });
      return;
    }

    if (day.exercises.length === 0) {
      toast({ title: "Errore", description: "Aggiungi almeno un esercizio", variant: "destructive" });
      return;
    }

    for (let i = 0; i < day.exercises.length; i++) {
      if (!day.exercises[i].exercise_name.trim()) {
        toast({ title: "Errore", description: `Esercizio ${i + 1} senza nome`, variant: "destructive" });
        return;
      }
    }

    setSaving(true);
    try {
      await supabase
        .from("workout_plan_days")
        .update({ day_name: day.day_name })
        .eq("id", day.id);

      const exercisesToDelete = await supabase
        .from("workout_plan_exercises")
        .select("id")
        .eq("workout_plan_day_id", day.id);

      for (const ex of exercisesToDelete.data || []) {
        await supabase.from("workout_plan_exercises").delete().eq("id", ex.id);
      }

      const exercisesToInsert = day.exercises.map((ex, exIdx) => ({
        workout_plan_day_id: day.id,
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

      toast({ title: "Successo", description: "Giorno aggiornato con successo!" });
      navigate(-1);
    } catch (error) {
      console.error("Errore salvataggio giorno:", error);
      toast({ title: "Errore", description: "Impossibile salvare il giorno", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-5 pt-14 text-foreground">Caricamento...</div>;
  if (!day) return <div className="p-5 pt-14 text-foreground">Giorno non trovato</div>;

  return (
    <div className="min-h-screen px-5 pt-14 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-muted-foreground">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">Modifica Allenamento</h1>
          <p className="text-xs text-muted-foreground mt-1">Giorno {day.day_number}</p>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        <div>
          <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-2">
            Nome Giorno
          </label>
          <input
            type="text"
            value={day.day_name}
            onChange={(e) => updateDayName(e.target.value)}
            className="w-full h-12 bg-card border border-border rounded-xl px-4 text-foreground outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="space-y-3 mb-8">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Esercizi ({day.exercises.length})</p>

        {day.exercises.map((ex, exIdx) => (
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

      <div className="fixed bottom-8 left-4 right-4 max-w-[412px] mx-auto flex gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex-1 h-14 rounded-2xl bg-secondary text-foreground font-semibold transition-transform active:scale-95"
        >
          Annulla
        </button>
        <button
          onClick={saveDay}
          disabled={saving}
          className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-semibold transition-all active:scale-95 disabled:opacity-60"
        >
          {saving ? "Salvataggio..." : "✓ Salva"}
        </button>
      </div>
    </div>
  );
}
