import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Trophy } from "lucide-react";
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

interface CompletionStats {
  duration: number;
  sets: number;
  volume: number;
}

export default function WorkoutSession() {
  const { dayId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const workout = WORKOUT_DAYS.find((d) => d.id === dayId);
  const startedAt = useRef<Date>(new Date());

  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [sets, setSets] = useState<Record<string, SetEntry[]>>({});
  const [showTimer, setShowTimer] = useState(false);
  const [workoutLogId, setWorkoutLogId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [prevSets, setPrevSets] = useState<Record<string, { reps: number; weight: number }[]>>({});
  const [justDone, setJustDone] = useState<string | null>(null);
  const [completion, setCompletion] = useState<CompletionStats | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!workout || !userId) return;
    const init: Record<string, SetEntry[]> = {};
    workout.exercises.forEach((ex) => {
      init[ex.name] = Array.from({ length: ex.sets }, () => ({
        reps: ex.reps === "Max" ? "" : ex.reps.split("-")[0],
        weight: ex.weight?.replace("kg", "") || "",
        done: false,
      }));
    });
    setSets(init);
    startedAt.current = new Date();
    loadPrevSession(userId, workout.id);
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
      .insert({ workout_day: workout.id, user_id: userId })
      .select("id")
      .single();

    if (error) {
      toast({ title: "Errore", description: "Impossibile iniziare l'allenamento", variant: "destructive" });
      return;
    }
    if (data) setWorkoutLogId(data.id);
  }

  if (!workout) return <div className="p-5 pt-14 text-foreground">Scheda non trovata</div>;

  const exercise = workout.exercises[currentExIdx];
  const exSets = sets[exercise.name] || [];
  const allDone = exSets.every((s) => s.done);
  const totalExercises = workout.exercises.length;
  const completedExercises = workout.exercises.filter((ex) =>
    (sets[ex.name] || []).every((s) => s.done)
  ).length;
  const progressPct = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;

  function updateSet(idx: number, field: "reps" | "weight", val: string) {
    setSets((prev) => {
      const updated = [...(prev[exercise.name] || [])];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, [exercise.name]: updated };
    });
  }

  function completeSet(idx: number) {
    const key = `${exercise.name}-${idx}`;
    setJustDone(key);
    setTimeout(() => setJustDone(null), 400);
    setSets((prev) => {
      const updated = [...(prev[exercise.name] || [])];
      updated[idx] = { ...updated[idx], done: true };
      return { ...prev, [exercise.name]: updated };
    });
    setShowTimer(true);
  }

  async function finishWorkout() {
    if (!workoutLogId || !userId) return;
    setSaving(true);

    try {
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

      const duration = Math.round((Date.now() - startedAt.current.getTime()) / 60000);
      const volume = allSets.reduce((acc, s) => acc + s.weight * s.reps, 0);
      setCompletion({ duration, sets: allSets.length, volume });
    } catch {
      toast({ title: "Errore", description: "Impossibile salvare l'allenamento", variant: "destructive" });
      setSaving(false);
    }
  }

  // Completion screen
  if (completion) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-5">
        <div className="w-full max-w-sm text-center">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: workout.color + "22" }}
          >
            <Trophy className="w-10 h-10" style={{ color: workout.color }} />
          </div>
          <h2 className="text-3xl font-bold mb-1">Ottimo lavoro!</h2>
          <p className="text-muted-foreground mb-8">{workout.label} — {workout.title}</p>

          <div className="grid grid-cols-3 gap-3 mb-10">
            <div className="bg-card rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold">{completion.duration}</p>
              <p className="text-xs text-muted-foreground mt-1">min</p>
            </div>
            <div className="bg-card rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold">{completion.sets}</p>
              <p className="text-xs text-muted-foreground mt-1">serie</p>
            </div>
            <div className="bg-card rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold">
                {completion.volume >= 1000
                  ? `${(completion.volume / 1000).toFixed(1)}t`
                  : `${completion.volume}`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {completion.volume >= 1000 ? "tonnellate" : "kg vol."}
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/")}
            className="w-full h-14 rounded-2xl font-bold text-white transition-transform active:scale-95"
            style={{ backgroundColor: workout.color }}
          >
            Torna alla home
          </button>
        </div>
      </div>
    );
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
      <div className="flex items-center gap-3 mb-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{workout.label}</p>
          <p className="text-lg font-bold">{workout.title}</p>
        </div>
        <span className="text-xs text-muted-foreground">{completedExercises}/{totalExercises}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-secondary rounded-full mb-5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%`, backgroundColor: workout.color }}
        />
      </div>

      {/* Exercise selector */}
      <div className="flex flex-wrap gap-2 pb-3 mb-5">
        {workout.exercises.map((ex, i) => {
          const done = (sets[ex.name] || []).every((s) => s.done);
          const active = i === currentExIdx;
          return (
            <button
              key={ex.name}
              onClick={() => setCurrentExIdx(i)}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors"
              style={
                active
                  ? { backgroundColor: workout.color, color: "#fff" }
                  : done
                  ? { backgroundColor: workout.color + "33", color: workout.color }
                  : undefined
              }
              {...(!active && !done ? { className: "px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors bg-secondary text-secondary-foreground" } : {})}
            >
              {ex.name.length > 12 ? ex.name.slice(0, 12) + "…" : ex.name}
            </button>
          );
        })}
      </div>

      {/* Current exercise */}
      <div className="bg-card rounded-2xl p-5 mb-4" style={{ borderTop: `3px solid ${workout.color}` }}>
        <p className="text-lg font-bold mb-1">{exercise.name}</p>
        <p className="text-sm text-muted-foreground mb-4">
          {exercise.sets} × {exercise.reps} {exercise.weight ? `· ${exercise.weight}` : ""}
        </p>

        <div className="space-y-3">
          {exSets.map((s, i) => {
            const key = `${exercise.name}-${i}`;
            return (
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
                    className={`w-11 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200
                      ${justDone === key ? "scale-110" : "scale-100"}
                      ${s.done ? "text-white" : "bg-secondary text-muted-foreground"}
                    `}
                    style={s.done ? { backgroundColor: workout.color } : undefined}
                  >
                    <Check className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
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
            className="flex-1 h-14 rounded-2xl font-semibold transition-transform active:scale-95 text-white"
            style={{ backgroundColor: workout.color }}
          >
            Prossimo
          </button>
        ) : (
          <button
            onClick={finishWorkout}
            disabled={saving}
            className="flex-1 h-14 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-60 text-white"
            style={{ backgroundColor: workout.color }}
          >
            {saving ? "Salvataggio..." : "✓ Completa"}
          </button>
        )}
      </div>
    </div>
  );
}
