import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Trophy, RotateCcw, Clock, Play, Loader, Edit2 } from "lucide-react";
import { apiRequest } from "@/api/client";
import RestTimer from "@/components/RestTimer";
import { useToast } from "@/hooks/use-toast";
import type { WorkoutPlanDay, WorkoutPlanExercise } from "@strength-sight/shared";

interface SetEntry { reps: string; weight: string; done: boolean; }
interface CompletionStats { duration: number; sets: number; volume: number; }

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function getExerciseIcon(exerciseName: string): string {
  const name = exerciseName.toLowerCase();
  if (name.includes("squat") || name.includes("leg press") || name.includes("calf") || name.includes("leg") || name.includes("lunge")) return "🦵";
  if (name.includes("curl") || name.includes("braccia") || name.includes("braccio")) return "💪";
  if (name.includes("bench") || name.includes("petto") || name.includes("chest") || name.includes("push")) return "🏋️";
  if (name.includes("row") || name.includes("pull") || name.includes("lat") || name.includes("schiena")) return "📌";
  if (name.includes("shoulder") || name.includes("spalla") || name.includes("press")) return "🎯";
  if (name.includes("dead") || name.includes("stacco")) return "⚡";
  if (name.includes("plank") || name.includes("crunch") || name.includes("addominali") || name.includes("abs")) return "🫀";
  return "🏋️";
}

interface DayWithExercises extends WorkoutPlanDay {
  workout_plan_exercises: WorkoutPlanExercise[];
}

export default function WorkoutSession() {
  const { dayId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const startedAt = useRef<Date>(new Date());

  const [dayData, setDayData] = useState<DayWithExercises | null>(null);
  const [dayLoading, setDayLoading] = useState(true);
  const [phase, setPhase] = useState<"preview" | "active">("preview");
  const [elapsed, setElapsed] = useState(0);
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [sets, setSets] = useState<Record<string, SetEntry[]>>({});
  const [showTimer, setShowTimer] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [workoutLogId, setWorkoutLogId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [prevSets, setPrevSets] = useState<Record<string, { reps: number; weight: number }[]>>({});
  const [justDone, setJustDone] = useState<string | null>(null);
  const [completion, setCompletion] = useState<CompletionStats | null>(null);
  const [resumeDialog, setResumeDialog] = useState<string | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  useEffect(() => { loadDayData(); }, [dayId]);

  async function loadDayData() {
    if (!dayId) return;
    try {
      const day = await apiRequest<DayWithExercises>(`/api/workout-days/${dayId}`);
      setDayData(day);
      loadPrevSession(day.day_name);
      try {
        const inProgress = await apiRequest<{ id: string } | null>(`/api/workout-sessions/in-progress?workoutDay=${encodeURIComponent(day.day_name)}`);
        if (inProgress) setResumeDialog(inProgress.id);
      } catch {}
    } catch (error) {
      console.error("Errore caricamento giorno:", error);
      toast({ title: "Errore", description: "Impossibile caricare il giorno", variant: "destructive" });
    } finally {
      setDayLoading(false);
    }
  }

  useEffect(() => {
    if (!dayData) return;
    const exercises = dayData.workout_plan_exercises;
    if (exercises.length === 0) return;
    const init: Record<string, SetEntry[]> = {};
    exercises.forEach((ex) => {
      init[ex.exercise_name] = Array.from({ length: ex.sets }, () => ({ reps: ex.reps_min ? String(ex.reps_min) : "", weight: "", done: false }));
    });
    setSets(init);
  }, [dayData]);

  useEffect(() => {
    if (Object.keys(prevSets).length === 0) return;
    setSets((prev) => {
      const updated = { ...prev };
      Object.entries(prevSets).forEach(([exName, prevExSets]) => {
        if (updated[exName]) {
          updated[exName] = updated[exName].map((s, i) => ({
            ...s,
            weight: s.weight === "" && prevExSets[i]?.weight > 0 ? String(prevExSets[i].weight) : s.weight,
            reps: s.reps === "" && prevExSets[i]?.reps > 0 ? String(prevExSets[i].reps) : s.reps,
          }));
        }
      });
      return updated;
    });
  }, [prevSets]);

  useEffect(() => {
    if (phase !== "active") return;
    const interval = setInterval(() => { setElapsed(Math.floor((Date.now() - startedAt.current.getTime()) / 1000)); }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => { if (phase === "active" && !completion) { e.preventDefault(); e.returnValue = ""; } };
    const handleUnload = () => { if (phase === "active" && !completion) savePartialWorkout(); };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("unload", handleUnload);
    return () => { window.removeEventListener("beforeunload", handleBeforeUnload); window.removeEventListener("unload", handleUnload); };
  }, [phase, completion, sets, workoutLogId]);

  async function loadPrevSession(workoutDay: string) {
    try {
      const lastLog = await apiRequest<{ id: string } | null>(`/api/workout-sessions/last?workoutDay=${encodeURIComponent(workoutDay)}`);
      if (!lastLog) return;
      const lastSets = await apiRequest<{ exercise_name: string; set_number: number; reps: number; weight: number }[]>(`/api/set-logs?workoutLogId=${lastLog.id}`);
      if (lastSets) {
        const grouped: Record<string, { reps: number; weight: number }[]> = {};
        lastSets.forEach((s) => { if (!grouped[s.exercise_name]) grouped[s.exercise_name] = []; grouped[s.exercise_name].push({ reps: s.reps, weight: s.weight }); });
        setPrevSets(grouped);
      }
    } catch {}
  }

  async function startWorkout() {
    if (!dayData) return;
    startedAt.current = new Date();
    setPhase("active");
    try {
      const data = await apiRequest<{ id: string }>('/api/workout-sessions', {
        method: 'POST',
        body: JSON.stringify({ workout_day: dayData.day_name }),
      });
      setWorkoutLogId(data.id);
    } catch {
      toast({ title: "Errore", description: "Impossibile iniziare l'allenamento", variant: "destructive" });
    }
  }

  function handleStartWorkout() {
    if (resumeDialog) setShowResumePrompt(true);
    else startWorkout();
  }

  function updateSet(idx: number, field: "reps" | "weight", val: string) {
    const exName = exercises[currentExIdx]?.exercise_name || "";
    setSets((prev) => { const updated = [...(prev[exName] || [])]; updated[idx] = { ...updated[idx], [field]: val }; return { ...prev, [exName]: updated }; });
  }

  function adjustWeight(idx: number, delta: number) {
    const exName = exercises[currentExIdx]?.exercise_name || "";
    setSets((prev) => { const updated = [...(prev[exName] || [])]; const current = parseFloat(updated[idx].weight) || 0; const next = Math.max(0, current + delta); updated[idx] = { ...updated[idx], weight: next % 1 === 0 ? String(next) : next.toFixed(1) }; return { ...prev, [exName]: updated }; });
  }

  function isNewPR(exName: string, weight: number, reps: number): boolean {
    const prevWeight = prevSets[exName]?.[0]?.weight ?? 0;
    const prevReps = prevSets[exName]?.[0]?.reps ?? 0;
    return weight > prevWeight || (weight === prevWeight && reps > prevReps);
  }

  function toggleSet(idx: number) {
    const exName = exercises[currentExIdx]?.exercise_name || "";
    const current = (sets[exName] || [])[idx];
    if (!current) return;
    if (!current.done) {
      setJustDone(`${exName}-${idx}`);
      setTimeout(() => setJustDone(null), 400);
    }
    setSets((prev) => { const updated = [...(prev[exName] || [])]; updated[idx] = { ...updated[idx], done: !updated[idx].done }; return { ...prev, [exName]: updated }; });
  }

  async function savePartialWorkout() {
    const allSets = Object.entries(sets).flatMap(([exName, exSets]) =>
      exSets.filter((s) => s.done).map((s, i) => ({ workout_log_id: workoutLogId ?? "", exercise_name: exName, set_number: i + 1, reps: parseInt(s.reps) || 0, weight: parseFloat(s.weight) || 0 }))
    );
    if (workoutLogId && allSets.length > 0) {
      try { await apiRequest('/api/set-logs', { method: 'POST', body: JSON.stringify(allSets) }); } catch {}
    }
  }

  async function finishWorkout() {
    setSaving(true);
    const allSets = Object.entries(sets).flatMap(([exName, exSets]) =>
      exSets.filter((s) => s.done).map((s, i) => ({ workout_log_id: workoutLogId ?? "", exercise_name: exName, set_number: i + 1, reps: parseInt(s.reps) || 0, weight: parseFloat(s.weight) || 0 }))
    );
    if (workoutLogId) {
      try {
        if (allSets.length > 0) await apiRequest('/api/set-logs', { method: 'POST', body: JSON.stringify(allSets) });
        await apiRequest(`/api/workout-sessions/${workoutLogId}/complete`, { method: 'PATCH' });
      } catch { toast({ title: "Avviso", description: "Dati salvati parzialmente", variant: "destructive" }); }
    }
    const volume = allSets.reduce((acc, s) => acc + s.weight * s.reps, 0);
    setCompletion({ duration: Math.round(elapsed / 60), sets: allSets.length, volume });
  }

  if (dayLoading) return <div className="p-5 pt-14 text-foreground">Caricamento...</div>;
  if (!dayData) return <div className="p-5 pt-14 text-foreground">Giorno non trovato</div>;

  const exercises = dayData.workout_plan_exercises;
  const dayColor = "hsl(210, 100%, 50%)";

  if (completion) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-5">
        <div className="w-full max-w-sm text-center">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: "hsla(210, 100%, 50%, 0.13)" }}><Trophy className="w-10 h-10" style={{ color: dayColor }} /></div>
          <h2 className="text-3xl font-bold mb-1">Ottimo lavoro!</h2>
          <p className="text-muted-foreground mb-8">Giorno {dayData.day_number} — {dayData.day_name}</p>
          <div className="grid grid-cols-3 gap-3 mb-10">
            <div className="bg-card rounded-2xl p-4 text-center"><p className="text-2xl font-bold">{completion.duration}</p><p className="text-xs text-muted-foreground mt-1">min</p></div>
            <div className="bg-card rounded-2xl p-4 text-center"><p className="text-2xl font-bold">{completion.sets}</p><p className="text-xs text-muted-foreground mt-1">serie</p></div>
            <div className="bg-card rounded-2xl p-4 text-center"><p className="text-2xl font-bold">{completion.volume >= 1000 ? `${(completion.volume / 1000).toFixed(1)}t` : `${completion.volume}`}</p><p className="text-xs text-muted-foreground mt-1">{completion.volume >= 1000 ? "tonnellate" : "kg vol."}</p></div>
          </div>
          <button onClick={() => navigate("/")} className="w-full h-14 rounded-2xl font-bold text-white transition-transform active:scale-95" style={{ backgroundColor: dayColor }}>Torna alla home</button>
        </div>
      </div>
    );
  }

  if (phase === "preview") {
    return (
      <div className="min-h-screen px-5 pt-14 pb-32 max-w-full overflow-x-hidden">
        {showResumePrompt && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm px-5">
            <div className="w-full max-w-sm bg-card rounded-2xl p-6 text-center shadow-xl">
              <p className="text-2xl mb-4">⏸️</p>
              <h2 className="text-xl font-bold mb-2">Allenamento in corso</h2>
              <p className="text-muted-foreground text-sm mb-6">Vuoi riprendere l'allenamento precedente?</p>
              <div className="flex gap-3">
                <button onClick={() => { setShowResumePrompt(false); setResumeDialog(null); setWorkoutLogId(resumeDialog); setPhase("active"); startedAt.current = new Date(); }} className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-semibold transition-transform active:scale-95">Riprendi</button>
                <button onClick={() => { setShowResumePrompt(false); setResumeDialog(null); startWorkout(); }} className="flex-1 h-12 rounded-xl bg-secondary text-secondary-foreground font-semibold transition-transform active:scale-95">Nuovo</button>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/workout")} className="text-muted-foreground"><ArrowLeft className="w-6 h-6" /></button>
          <div className="flex-1"><p className="text-xl font-bold">{dayData.day_name}</p><p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Giorno {dayData.day_number}</p></div>
          <button onClick={() => navigate(`/edit-day/${dayData.id}`)} className="text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="w-5 h-5" /></button>
        </div>
        <div className="rounded-2xl p-4 mb-6 flex items-center gap-4" style={{ backgroundColor: "hsla(210, 100%, 50%, 0.08)" }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0" style={{ backgroundColor: "hsla(210, 100%, 50%, 0.15)", color: dayColor }}>{dayData.day_number}</div>
          <div><p className="font-bold" style={{ color: dayColor }}>{exercises.length} esercizi</p><p className="text-xs text-muted-foreground">Scorri per vedere il programma</p></div>
        </div>
        <div className="space-y-2 mb-8">
          {exercises.map((ex) => (
            <div key={ex.id} className="bg-card rounded-2xl px-4 py-3 flex items-center gap-3">
              <span className="text-xl">{getExerciseIcon(ex.exercise_name)}</span>
              <div className="flex-1">
                <p className="font-medium text-sm">{ex.exercise_name}</p>
                <p className="text-xs text-muted-foreground">{ex.sets} serie × {ex.reps_min}{ex.reps_max && ex.reps_max !== ex.reps_min ? `-${ex.reps_max}` : ""} reps{prevSets[ex.exercise_name]?.[0]?.weight > 0 ? ` · ${prevSets[ex.exercise_name][0].weight}kg` : ""}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="fixed bottom-8 left-4 right-4 max-w-[412px] mx-auto">
          <button onClick={handleStartWorkout} className="w-full h-16 rounded-2xl font-bold text-white text-lg flex items-center justify-center gap-3 transition-transform active:scale-95" style={{ backgroundColor: dayColor }}><Play className="w-5 h-5 fill-white" />Inizia allenamento</button>
        </div>
      </div>
    );
  }

  const exercise = exercises[currentExIdx];
  const exSets = sets[exercise?.exercise_name || ""] || [];
  const totalExercises = exercises.length;
  const completedExercises = exercises.filter((ex) => (sets[ex.exercise_name] || []).every((s) => s.done)).length;
  const progressPct = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;

  if (!exercise || !dayData) return <div className="p-5 pt-14 text-foreground">Caricamento...</div>;

  return (
    <div className="min-h-screen px-5 pt-14 pb-24 max-w-full overflow-x-hidden">
      {showTimer && <RestTimer key={timerKey} seconds={exercise?.rest_seconds || 90} color={dayColor} onComplete={() => setShowTimer(false)} onDismiss={() => setShowTimer(false)} />}
      <div className="flex items-center gap-3 mb-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-6 h-6" /></button>
        <div className="flex-1"><p className="text-lg font-bold">{dayData.day_name}</p><p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Giorno {dayData.day_number}</p></div>
        <div className="flex items-center gap-1.5 bg-secondary rounded-xl px-3 py-1.5"><Clock className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-sm font-bold tabular-nums">{formatElapsed(elapsed)}</span></div>
      </div>
      <div className="h-1.5 w-full bg-secondary rounded-full mb-5 overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, backgroundColor: dayColor }} /></div>
      <div className="flex flex-wrap gap-2 pb-3 mb-5">
        {exercises.map((ex, i) => {
          const done = (sets[ex.exercise_name] || []).every((s) => s.done);
          const active = i === currentExIdx;
          return (
            <button key={ex.id} onClick={() => setCurrentExIdx(i)} className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors" style={active ? { backgroundColor: dayColor, color: "#fff" } : done ? { backgroundColor: "hsla(210, 100%, 50%, 0.2)", color: dayColor } : { backgroundColor: "hsl(var(--secondary))", color: "hsl(var(--secondary-foreground))" }}>
              {ex.exercise_name.length > 12 ? ex.exercise_name.slice(0, 12) + "…" : ex.exercise_name}
            </button>
          );
        })}
      </div>
      <div className="bg-card rounded-2xl p-5 mb-4" style={{ borderTop: `3px solid ${dayColor}` }}>
        <div className="flex items-center gap-3 mb-1"><span className="text-2xl">{getExerciseIcon(exercise.exercise_name)}</span><p className="text-lg font-bold">{exercise.exercise_name}</p></div>
        <p className="text-sm text-muted-foreground mb-4">{exercise.sets} × {exercise.reps_min}{exercise.reps_max && exercise.reps_max !== exercise.reps_min ? `-${exercise.reps_max}` : ""} reps{exercise.notes ? ` · ${exercise.notes}` : ""}</p>
        <div className="space-y-2">
          {exSets.map((s, i) => {
            const key = `${exercise.exercise_name}-${i}`;
            return (
              <div key={i} className="flex items-center gap-2">
                <button onClick={() => s.done && toggleSet(i)} className="w-7 shrink-0 flex items-center justify-center">{s.done ? <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" /> : <span className="text-xs text-muted-foreground font-medium">S{i + 1}</span>}</button>
                <input type="number" inputMode="numeric" placeholder="Rep" value={s.reps} onChange={(e) => updateSet(i, "reps", e.target.value)} className={`w-16 h-12 bg-secondary rounded-xl px-2 text-foreground text-base text-center placeholder:text-muted-foreground outline-none transition-opacity ${s.done ? "opacity-50" : ""}`} />
                <div className={`flex items-center flex-1 bg-secondary rounded-xl overflow-hidden h-12 transition-opacity ${s.done ? "opacity-50" : ""}`}>
                  <button onClick={() => adjustWeight(i, -2.5)} className="h-full px-3 text-base font-bold text-muted-foreground active:bg-muted transition-colors">−</button>
                  <input type="number" inputMode="decimal" placeholder="kg" value={s.weight} onChange={(e) => updateSet(i, "weight", e.target.value)} className="flex-1 h-full bg-transparent text-foreground text-base text-center outline-none min-w-0 placeholder:text-muted-foreground" />
                  <button onClick={() => adjustWeight(i, 2.5)} className="h-full px-3 text-base font-bold text-muted-foreground active:bg-muted transition-colors">+</button>
                </div>
                <button onClick={() => toggleSet(i)} className={`w-11 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${justDone === key ? "scale-110" : "scale-100"} ${s.done ? "text-white" : "bg-secondary text-muted-foreground"}`} style={s.done ? { backgroundColor: dayColor } : undefined}><Check className="w-5 h-5" /></button>
                {s.done && isNewPR(exercise?.exercise_name || "", parseFloat(s.weight) || 0, parseInt(s.reps) || 0) && <div className="text-amber-400 text-xs font-bold">🏆 PR</div>}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mb-4">
        <button onClick={() => { setTimerKey((k) => k + 1); setShowTimer(true); }} className="w-full h-12 rounded-xl font-semibold text-white flex items-center justify-center gap-2" style={{ backgroundColor: dayColor }}><Play className="w-4 h-4 fill-white" />Avvia riposo ({exercise?.rest_seconds || 90}s)</button>
      </div>
      <div className="flex gap-3 fixed bottom-24 left-4 right-4 max-w-[412px] mx-auto">
        {currentExIdx > 0 && <button onClick={() => setCurrentExIdx((i) => i - 1)} className="flex-1 h-14 rounded-2xl bg-secondary text-foreground font-semibold transition-transform active:scale-95">Precedente</button>}
        {currentExIdx < totalExercises - 1 ? (
          <button onClick={() => setCurrentExIdx((i) => i + 1)} className="flex-1 h-14 rounded-2xl font-semibold transition-transform active:scale-95 text-white" style={{ backgroundColor: dayColor }}>Prossimo</button>
        ) : (
          <button onClick={finishWorkout} disabled={saving} className="flex-1 h-14 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-60 text-white" style={{ backgroundColor: dayColor }}>{saving ? "Salvataggio..." : "✓ Completa"}</button>
        )}
      </div>
    </div>
  );
}
