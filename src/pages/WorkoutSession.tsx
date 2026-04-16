import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WORKOUT_DAYS } from "@/data/workouts";
import type { Exercise } from "@/data/workouts";
import RestTimer from "@/components/RestTimer";

interface SetEntry {
  reps: string;
  weight: string;
  done: boolean;
}

export default function WorkoutSession() {
  const { dayId } = useParams();
  const navigate = useNavigate();
  const workout = WORKOUT_DAYS.find((d) => d.id === dayId);

  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [sets, setSets] = useState<Record<string, SetEntry[]>>({});
  const [showTimer, setShowTimer] = useState(false);
  const [workoutLogId, setWorkoutLogId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!workout) return;
    // Init sets
    const init: Record<string, SetEntry[]> = {};
    workout.exercises.forEach((ex) => {
      init[ex.name] = Array.from({ length: ex.sets }, () => ({
        reps: ex.reps === "Max" ? "" : ex.reps.split("-")[0],
        weight: ex.weight?.replace("kg", "") || "",
        done: false,
      }));
    });
    setSets(init);

    // Create workout log
    createWorkoutLog();
  }, [workout]);

  async function createWorkoutLog() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !workout) return;
    const { data } = await supabase
      .from("workout_logs")
      .insert({ user_id: user.id, workout_day: workout.id })
      .select("id")
      .single();
    if (data) setWorkoutLogId(data.id);
  }

  if (!workout) return <div className="p-5 pt-14 text-foreground">Scheda non trovata</div>;

  const exercise = workout.exercises[currentExIdx];
  const exSets = sets[exercise.name] || [];

  function updateSet(idx: number, field: "reps" | "weight", val: string) {
    setSets((prev) => {
      const updated = [...(prev[exercise.name] || [])];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, [exercise.name]: updated };
    });
  }

  function completeSet(idx: number) {
    setSets((prev) => {
      const updated = [...(prev[exercise.name] || [])];
      updated[idx] = { ...updated[idx], done: true };
      return { ...prev, [exercise.name]: updated };
    });
    setShowTimer(true);
  }

  const allDone = exSets.every((s) => s.done);
  const totalExercises = workout.exercises.length;
  const completedExercises = workout.exercises.filter((ex) =>
    (sets[ex.name] || []).every((s) => s.done)
  ).length;

  async function finishWorkout() {
    if (!workoutLogId) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Save all set logs
    const allSets = Object.entries(sets).flatMap(([exName, exSets]) =>
      exSets.filter((s) => s.done).map((s, i) => ({
        user_id: user.id,
        workout_log_id: workoutLogId,
        exercise_name: exName,
        set_number: i + 1,
        reps: parseInt(s.reps) || 0,
        weight: parseFloat(s.weight) || 0,
      }))
    );

    if (allSets.length > 0) {
      await supabase.from("set_logs").insert(allSets);
    }

    await supabase
      .from("workout_logs")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", workoutLogId);

    setSaving(false);
    navigate("/");
  }

  return (
    <div className="min-h-screen px-5 pt-14 pb-8">
      {showTimer && (
        <RestTimer
          seconds={90}
          onComplete={() => setShowTimer(false)}
          onDismiss={() => setShowTimer(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-muted-foreground">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{workout.label}</p>
          <p className="text-lg font-bold">{workout.title}</p>
        </div>
        <span className="text-xs text-muted-foreground">{completedExercises}/{totalExercises}</span>
      </div>

      {/* Exercise selector */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-5 -mx-1 px-1 no-scrollbar">
        {workout.exercises.map((ex, i) => {
          const done = (sets[ex.name] || []).every((s) => s.done);
          return (
            <button
              key={ex.name}
              onClick={() => setCurrentExIdx(i)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-colors
                ${i === currentExIdx ? "bg-primary text-primary-foreground" : done ? "bg-success/20 text-success" : "bg-secondary text-secondary-foreground"}
              `}
            >
              {ex.name.length > 14 ? ex.name.slice(0, 14) + "…" : ex.name}
            </button>
          );
        })}
      </div>

      {/* Current exercise */}
      <div className="bg-card rounded-2xl p-5 mb-4">
        <p className="text-lg font-bold mb-1">{exercise.name}</p>
        <p className="text-sm text-muted-foreground mb-4">
          {exercise.sets} × {exercise.reps} {exercise.weight ? `· ${exercise.weight}` : ""}
        </p>

        <div className="space-y-3">
          {exSets.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-8 text-xs text-muted-foreground font-medium">S{i + 1}</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="Reps"
                value={s.reps}
                onChange={(e) => updateSet(i, "reps", e.target.value)}
                disabled={s.done}
                className="flex-1 h-12 bg-secondary rounded-xl px-4 text-foreground text-base placeholder:text-muted-foreground disabled:opacity-50 outline-none"
              />
              <input
                type="number"
                inputMode="decimal"
                placeholder="Kg"
                value={s.weight}
                onChange={(e) => updateSet(i, "weight", e.target.value)}
                disabled={s.done}
                className="flex-1 h-12 bg-secondary rounded-xl px-4 text-foreground text-base placeholder:text-muted-foreground disabled:opacity-50 outline-none"
              />
              <button
                onClick={() => completeSet(i)}
                disabled={s.done}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors
                  ${s.done ? "bg-success text-success-foreground" : "bg-secondary text-muted-foreground"}
                `}
              >
                <Check className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {currentExIdx > 0 && (
          <button
            onClick={() => setCurrentExIdx((i) => i - 1)}
            className="flex-1 h-14 rounded-2xl bg-secondary text-foreground font-semibold"
          >
            Precedente
          </button>
        )}
        {currentExIdx < totalExercises - 1 ? (
          <button
            onClick={() => setCurrentExIdx((i) => i + 1)}
            className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-semibold"
          >
            Prossimo
          </button>
        ) : (
          <button
            onClick={finishWorkout}
            disabled={saving}
            className="flex-1 h-14 rounded-2xl bg-success text-success-foreground font-bold"
          >
            {saving ? "Salvataggio..." : "Completa Allenamento"}
          </button>
        )}
      </div>
    </div>
  );
}
