import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WORKOUT_DAYS } from "@/data/workouts";
import type { Exercise } from "@/data/workouts";
import RestTimer from "@/components/RestTimer";
import { useToast } from "@/hooks/use-toast";

interface SetEntry {
  reps: string;
  weight: string;
  done: boolean;
}

export default function WorkoutSession() {
  const { dayId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const workout = WORKOUT_DAYS.find((d) => d.id === dayId);

  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [sets, setSets] = useState<Record<string, SetEntry[]>>({});
  const [showTimer, setShowTimer] = useState(false);
  const [workoutLogId, setWorkoutLogId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [prevSets, setPrevSets] = useState<Record<string, { reps: number; weight: number }[]>>({});

  useEffect(() => {
    // Get current user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!workout || !userId) return;
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

    // Load previous session weights
    loadPrevSession(userId, workout.id);

    // Create workout log
    createWorkoutLog();
  }, [workout, userId]);

  async function loadPrevSession(uid: string, workoutId: string) {
    const { data: lastLog } = await supabase
      .from("workout_logs")
      .select("id")
      .eq("user_id", uid)
      .eq("workout_day", workoutId)
      .not("completed_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastLog) return;

    const { data: lastSets } = await supabase
      .from("set_logs")
      .select("exercise_name, set_number, reps, weight")
      .eq("workout_log_id", lastLog.id)
      .order("set_number", { ascending: true });

    if (lastSets) {
      const grouped: Record<string, { reps: number; weight: number }[]> = {};
      lastSets.forEach((s) => {
        if (!grouped[s.exercise_name]) grouped[s.exercise_name] = [];
        grouped[s.exercise_name].push({ reps: s.reps, weight: s.weight });
      });
      setPrevSets(grouped);
    }
  }

  async function createWorkoutLog() {
    if (!workout || !userId) return;
    const { data, error } = await supabase
      .from("workout_logs")
      .insert({
        workout_day: workout.id,
        user_id: userId
      })
      .select("id")
      .single();

    if (error) {
      console.error("Errore creazione workout log:", error);
      toast({
        title: "Errore",
        description: "Impossibile iniziare l'allenamento",
        variant: "destructive"
      });
      return;
    }

    if (data) {
      setWorkoutLogId(data.id);
      toast({
        title: "Allenamento avviato ✓",
        description: `${workout.label} - ${workout.title}`,
      });
    }
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
    if (!workoutLogId || !userId) return;
    setSaving(true);

    try {
      // Save all set logs
      const allSets = Object.entries(sets).flatMap(([exName, exSets]) =>
        exSets.filter((s) => s.done).map((s, i) => ({
          workout_log_id: workoutLogId,
          user_id: userId,
          exercise_name: exName,
          set_number: i + 1,
          reps: parseInt(s.reps) || 0,
          weight: parseFloat(s.weight) || 0,
        }))
      );

      if (allSets.length > 0) {
        const { error: setError } = await supabase.from("set_logs").insert(allSets);
        if (setError) throw setError;
      }

      const { error: logError } = await supabase
        .from("workout_logs")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", workoutLogId);

      if (logError) throw logError;

      toast({
        title: "Allenamento completato! ✓",
        description: `${allSets.length} serie salvate con successo`,
      });

      setTimeout(() => navigate("/"), 800);
    } catch (error) {
      console.error("Errore salvataggio allenamento:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare l'allenamento",
        variant: "destructive"
      });
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen px-5 pt-14 pb-24 max-w-full overflow-x-hidden">
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
      <div className="flex flex-wrap gap-2 pb-3 mb-5">
        {workout.exercises.map((ex, i) => {
          const done = (sets[ex.name] || []).every((s) => s.done);
          return (
            <button
              key={ex.name}
              onClick={() => setCurrentExIdx(i)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors
                ${i === currentExIdx ? "bg-primary text-primary-foreground" : done ? "bg-success/20 text-success" : "bg-secondary text-secondary-foreground"}
              `}
            >
              {ex.name.length > 12 ? ex.name.slice(0, 12) + "…" : ex.name}
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
            <div key={i} className="flex flex-col gap-1">
              {prevSets[exercise.name]?.[i] && (
                <p className="text-[11px] text-muted-foreground ml-9">
                  Ultima volta:{" "}
                  {prevSets[exercise.name][i].weight > 0
                    ? `${prevSets[exercise.name][i].weight}kg × `
                    : ""}
                  {prevSets[exercise.name][i].reps} rep
                </p>
              )}
            <div className="flex items-center gap-2">
              <span className="w-7 text-xs text-muted-foreground font-medium shrink-0">S{i + 1}</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="Reps"
                value={s.reps}
                onChange={(e) => updateSet(i, "reps", e.target.value)}
                disabled={s.done}
                className="flex-1 min-w-0 h-12 bg-secondary rounded-xl px-3 text-foreground text-base placeholder:text-muted-foreground disabled:opacity-50 outline-none"
              />
              <input
                type="number"
                inputMode="decimal"
                placeholder="Kg"
                value={s.weight}
                onChange={(e) => updateSet(i, "weight", e.target.value)}
                disabled={s.done}
                className="flex-1 min-w-0 h-12 bg-secondary rounded-xl px-3 text-foreground text-base placeholder:text-muted-foreground disabled:opacity-50 outline-none"
              />
              <button
                onClick={() => completeSet(i)}
                disabled={s.done}
                className={`w-11 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors
                  ${s.done ? "bg-success text-success-foreground" : "bg-secondary text-muted-foreground"}
                `}
              >
                <Check className="w-5 h-5" />
              </button>
            </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 fixed bottom-24 left-4 right-4 max-w-[412px] mx-auto">
        {currentExIdx > 0 && (
          <button
            onClick={() => setCurrentExIdx((i) => i - 1)}
            className="flex-1 h-14 rounded-2xl bg-secondary text-foreground font-semibold transition-transform active:scale-95"
          >
            Precedente
          </button>
        )}
        {currentExIdx < totalExercises - 1 ? (
          <button
            onClick={() => setCurrentExIdx((i) => i + 1)}
            className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-semibold transition-transform active:scale-95"
          >
            Prossimo
          </button>
        ) : (
          <button
            onClick={finishWorkout}
            disabled={saving}
            className="flex-1 h-14 rounded-2xl bg-success text-success-foreground font-bold transition-all active:scale-95 disabled:opacity-60"
          >
            {saving ? "Salvataggio..." : "✓ Completa"}
          </button>
        )}
      </div>
    </div>
  );
}
