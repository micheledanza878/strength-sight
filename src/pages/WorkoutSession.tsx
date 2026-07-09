import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageContainer from "@/components/PageContainer";
import { ArrowLeft, Check, Trophy, RotateCcw, Clock, Play, Loader, Edit2, CloudOff, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import RestTimer from "@/components/RestTimer";
import { useToast } from "@/hooks/use-toast";
import { getUserId } from "@/lib/user";
import { calculateProgression, ProgressionSuggestion } from "@/services/progressionService";
import {
  loadSkillProgress,
  evaluateAndSaveSkillSession,
  SkillProgressRow,
} from "@/services/skillProgressionService";
import { fetchSkills, getSkill, getSkillStep, Skill } from "@/services/skillsService";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ExerciseInsightsCard } from "@/components/Exercise/ExerciseInsightsCard";
import { SkillLadderCard } from "@/components/Exercise/SkillLadderCard";

interface SetEntry {
  reps: string;
  weight: string;
  done: boolean;
}

interface SkillLevelUp {
  skillName: string;
  newStepName: string;
}

interface CompletionStats {
  duration: number;
  sets: number;
  volume: number;
  levelUps: SkillLevelUp[];
}

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

interface PlanExercise {
  id: string;
  exercise_name: string;
  order_number: number;
  sets: number;
  reps_min: number | null;
  reps_max: number | null;
  rest_seconds: number | null;
  notes: string | null;
  tracking_unit: "reps" | "seconds" | null;
  skill_slug: string | null;
}

interface PlanDay {
  id: string;
  day_number: number;
  day_name: string;
  workout_plan_id: string;
}

export default function WorkoutSession() {
  const { dayId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const startedAt = useRef<Date>(new Date());

  const [dayData, setDayData] = useState<PlanDay | null>(null);
  const [exercises, setExercises] = useState<PlanExercise[]>([]);
  const [dayLoading, setDayLoading] = useState(true);

  const [phase, setPhase] = useState<"preview" | "active">("preview");
  const [elapsed, setElapsed] = useState(0);
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [sets, setSets] = useState<Record<string, SetEntry[]>>({});
  const [showTimer, setShowTimer] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [workoutLogId, setWorkoutLogId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [prevSets, setPrevSets] = useState<Record<string, { reps: number; weight: number; hold_seconds: number }[]>>({});
  // Progresso corrente (step + sedute pulite) per ogni skill presente nel giorno, keyed by skill_slug
  const [skillProgress, setSkillProgress] = useState<Record<string, SkillProgressRow>>({});
  // Catalogo skill (letto da Supabase, cache-ato da skillsService): serve per
  // risolvere skill_slug → nome/step/warning degli esercizi di tipo skill.
  const [skills, setSkills] = useState<Skill[]>([]);
  const [justDone, setJustDone] = useState<string | null>(null);
  const [completion, setCompletion] = useState<CompletionStats | null>(null);
  const [resumeDialog, setResumeDialog] = useState<string | null>(null);
  const [insightsExercise, setInsightsExercise] = useState<string | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  // Mappa esercizio → suggerimento di progressione calcolato dalla sessione precedente
  const [progressionSuggestions, setProgressionSuggestions] = useState<Record<string, ProgressionSuggestion>>({});

  // Autosave state: tiene traccia dello stato dell'ultimo salvataggio automatico
  type AutosaveStatus = "idle" | "saving" | "error";
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  // Ref per workoutLogId: le callback async lo leggono da qui per evitare
  // closure stale (il ref è sempre aggiornato, lo stato React no in async).
  const workoutLogIdRef = useRef<string | null>(null);

  // ── AUTOSAVE ─────────────────────────────────────────────────────
  //
  // Persiste immediatamente un singolo set su Supabase via upsert.
  // La chiave di conflitto è (workout_log_id, exercise_name, set_number):
  // se l'utente de-marca e ri-marca un set il record viene aggiornato,
  // non duplicato. RICHIEDE un UNIQUE constraint nel DB su queste tre colonne:
  //   ALTER TABLE set_logs ADD CONSTRAINT set_logs_unique_set
  //   UNIQUE (workout_log_id, exercise_name, set_number);
  const autosaveSet = useCallback(
    async (ex: PlanExercise, setIdx: number, reps: string, weight: string, currentStepOrder: number | null) => {
      const logId = workoutLogIdRef.current;
      if (!logId) return; // log non ancora creato (raro ma possibile se la rete è lenta)

      const isSkillHold = ex.tracking_unit === "seconds";

      setAutosaveStatus("saving");
      try {
        const userId = await getUserId();
        const { error } = await supabase.from("set_logs").upsert(
          {
            user_id: userId,
            workout_log_id: logId,
            exercise_name: ex.exercise_name,
            set_number: setIdx + 1,
            reps: isSkillHold ? null : parseInt(reps) || 0,
            hold_seconds: isSkillHold ? parseInt(reps) || 0 : null,
            weight: isSkillHold ? 0 : parseFloat(weight) || 0,
            skill_slug: ex.skill_slug,
            skill_step_order: ex.skill_slug ? currentStepOrder ?? 1 : null,
          },
          { onConflict: "workout_log_id,exercise_name,set_number" }
        );
        if (error) throw error;
        setAutosaveStatus("idle");
      } catch (err) {
        console.error("Autosave set fallito:", err);
        setAutosaveStatus("error");
      }
    },
    [] // stabile: legge workoutLogIdRef.current, non dipende da state React
  );

  // Rimuove il record dal DB quando l'utente de-seleziona "done",
  // mantenendo coerenza tra stato locale e dati persistiti.
  const autounsaveSet = useCallback(
    async (exName: string, setIdx: number) => {
      const logId = workoutLogIdRef.current;
      if (!logId) return;

      setAutosaveStatus("saving");
      try {
        const { error } = await supabase
          .from("set_logs")
          .delete()
          .eq("workout_log_id", logId)
          .eq("exercise_name", exName)
          .eq("set_number", setIdx + 1);
        if (error) throw error;
        setAutosaveStatus("idle");
      } catch (err) {
        console.error("Autounsave set fallito:", err);
        setAutosaveStatus("error");
      }
    },
    []
  );

  useEffect(() => {
    loadDayData();
  }, [dayId]);

  // Catalogo skill: indipendente dal giorno caricato, si carica una sola
  // volta (fetchSkills() è cache-ato) e serve a risolvere skill_slug → Skill.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchSkills();
        if (!cancelled) setSkills(data);
      } catch (error) {
        console.error("Errore caricamento catalogo skill:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadDayData() {
    if (!dayId) return;
    try {
      const { data: day, error: dayError } = await supabase
        .from("workout_plan_days")
        .select("*")
        .eq("id", dayId)
        .single();

      if (dayError) throw dayError;
      setDayData(day);

      const { data: exs, error: exError } = await supabase
        .from("workout_plan_exercises")
        .select("*")
        .eq("workout_plan_day_id", dayId)
        .order("order_number", { ascending: true });

      if (exError) throw exError;
      setExercises(exs || []);

      if (day) {
        loadPrevSession(day.day_name);

        // Check for in-progress workout
        try {
          const userId = await getUserId();
          const { data: inProgressLog } = await supabase
            .from("workout_logs")
            .select("id")
            .eq("user_id", userId)
            .eq("workout_day", day.day_name)
            .is("completed_at", null)
            .order("started_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (inProgressLog) {
            setResumeDialog(inProgressLog.id);
          }
        } catch (error) {
          console.error("Errore check allenamento in corso:", error);
        }
      }
    } catch (error) {
      console.error("Errore caricamento giorno:", error);
      toast({ title: "Errore", description: "Impossibile caricare il giorno", variant: "destructive" });
    } finally {
      setDayLoading(false);
    }
  }

  // Init sets on load (for preview)
  useEffect(() => {
    if (exercises.length === 0) return;
    const init: Record<string, SetEntry[]> = {};
    exercises.forEach((ex) => {
      init[ex.exercise_name] = Array.from({ length: ex.sets }, () => ({
        reps: ex.reps_min ? String(ex.reps_min) : "",
        weight: "",
        done: false,
      }));
    });
    setSets(init);
  }, [exercises]);

  // Auto-fill from previous session + calcolo suggerimenti di progressione
  useEffect(() => {
    if (Object.keys(prevSets).length === 0 || exercises.length === 0) return;

    // Calcola i suggerimenti di double progression solo per gli esercizi a peso/reps
    const suggestions: Record<string, ProgressionSuggestion> = {};
    exercises.forEach((ex) => {
      if (ex.tracking_unit === "seconds") return;
      const prev = prevSets[ex.exercise_name];
      if (prev) {
        suggestions[ex.exercise_name] = calculateProgression(
          ex.exercise_name,
          ex.reps_max,
          ex.sets,
          prev
        );
      }
    });
    setProgressionSuggestions(suggestions);

    setSets((prev) => {
      const updated = { ...prev };
      Object.entries(prevSets).forEach(([exName, prevExSets]) => {
        if (!updated[exName]) return;
        const ex = exercises.find((e) => e.exercise_name === exName);

        if (ex?.tracking_unit === "seconds") {
          // Skill a tempo: niente peso, precompila i secondi con la tenuta della sessione precedente
          updated[exName] = updated[exName].map((s, i) => ({
            ...s,
            reps: s.reps === "" && prevExSets[i]?.hold_seconds > 0 ? String(prevExSets[i].hold_seconds) : s.reps,
          }));
          return;
        }

        const suggestion = suggestions[exName];
        // Peso da pre-compilare: suggerito se la condizione è soddisfatta, altrimenti il precedente
        const weightToFill = suggestion?.shouldIncrease
          ? String(suggestion.suggestedWeight)
          : prevExSets[0]?.weight > 0
          ? String(prevExSets[0].weight)
          : "";

        updated[exName] = updated[exName].map((s, i) => ({
          ...s,
          // Per il peso usiamo il valore calcolato sopra (uguale per tutti i set,
          // come avviene tipicamente in un allenamento con peso fisso per serie)
          weight: s.weight === "" && weightToFill !== "" ? weightToFill : s.weight,
          // Per le reps manteniamo quelle del set specifico della sessione precedente
          reps: s.reps === "" && prevExSets[i]?.reps > 0 ? String(prevExSets[i].reps) : s.reps,
        }));
      });
      return updated;
    });
  }, [prevSets, exercises]);

  // Carica lo stato di avanzamento (step corrente + sedute pulite) per ogni skill del giorno
  useEffect(() => {
    const skillSlugs = Array.from(new Set(exercises.map((e) => e.skill_slug).filter((s): s is string => !!s)));
    if (skillSlugs.length === 0) return;

    (async () => {
      try {
        const userId = await getUserId();
        const entries = await Promise.all(
          skillSlugs.map(async (slug) => [slug, await loadSkillProgress(userId, slug)] as const)
        );
        setSkillProgress(Object.fromEntries(entries));
      } catch (error) {
        console.error("Errore caricamento progresso skill:", error);
      }
    })();
  }, [exercises]);

  // Elapsed workout timer
  useEffect(() => {
    if (phase !== "active") return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Save workout on page exit
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (phase === "active" && !completion) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    const handleUnload = () => {
      if (phase === "active" && !completion) {
        savePartialWorkout();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("unload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("unload", handleUnload);
    };
  }, [phase, completion, sets, workoutLogId]);

  async function loadPrevSession(workoutId: string) {
    try {
      const userId = await getUserId();
      const { data: lastLog } = await supabase
        .from("workout_logs")
        .select("id")
        .eq("user_id", userId)
        .eq("workout_day", workoutId)
        .not("completed_at", "is", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!lastLog) return;

      const { data: lastSets } = await supabase
        .from("set_logs")
        .select("exercise_name, set_number, reps, weight, hold_seconds")
        .eq("workout_log_id", lastLog.id)
        .order("set_number", { ascending: true });

      if (lastSets) {
        const grouped: Record<string, { reps: number; weight: number; hold_seconds: number }[]> = {};
        lastSets.forEach((s) => {
          if (!grouped[s.exercise_name]) grouped[s.exercise_name] = [];
          grouped[s.exercise_name].push({ reps: s.reps, weight: s.weight, hold_seconds: s.hold_seconds ?? 0 });
        });
        setPrevSets(grouped);
      }
    } catch (error) {
      console.error("Errore caricamento sessione precedente:", error);
    }
  }

  async function startWorkout() {
    if (!dayData) return;
    startedAt.current = new Date();
    setPhase("active");

    const userId = await getUserId();
    const { data, error } = await supabase
      .from("workout_logs")
      .insert({ user_id: userId, workout_day: dayData.day_name })
      .select("id")
      .single();

    if (error) {
      toast({ title: "Errore", description: "Impossibile iniziare l'allenamento", variant: "destructive" });
      return;
    }
    if (data) {
      setWorkoutLogId(data.id);
      workoutLogIdRef.current = data.id;
    }
  }

  // Info sullo step corrente di una skill (nome step, target, sedute pulite verso l'avanzamento)
  function getSkillStepInfo(ex: PlanExercise) {
    if (!ex.skill_slug) return null;
    const skill = getSkill(skills, ex.skill_slug);
    if (!skill) return null;
    const progress = skillProgress[ex.skill_slug];
    const step = getSkillStep(skill, progress?.current_step_order ?? 1);
    if (!step) return null;
    return {
      skill,
      step,
      stepIndex: skill.steps.findIndex((s) => s.order === step.order) + 1,
      totalSteps: skill.steps.length,
      cleanSessions: progress?.consecutive_clean_sessions ?? 0,
    };
  }

  if (dayLoading) return <div className="p-5 pt-14 text-foreground">Caricamento...</div>;
  if (!dayData) return <div className="p-5 pt-14 text-foreground">Giorno non trovato</div>;

  function handleStartWorkout() {
    if (resumeDialog) {
      setShowResumePrompt(true);
    } else {
      startWorkout();
    }
  }


  // ── PREVIEW SCREEN ──────────────────────────────────────────────
  if (phase === "preview") {
    return (
      <PageContainer variant="narrow" className="min-h-screen px-5 pt-14 pb-32 max-w-full">
        {showResumePrompt && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm px-5">
            <div className="w-full max-w-sm bg-card rounded-2xl p-6 text-center shadow-xl">
              <p className="text-2xl mb-4">⏸️</p>
              <h2 className="text-xl font-bold mb-2">Allenamento in corso</h2>
              <p className="text-muted-foreground text-sm mb-6">Vuoi riprendere l'allenamento precedente?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowResumePrompt(false);
                    setResumeDialog(null);
                    setWorkoutLogId(resumeDialog);
                    workoutLogIdRef.current = resumeDialog;
                    setPhase("active");
                    startedAt.current = new Date();
                  }}
                  className="flex-1 h-12 rounded-xl gradient-primary text-white font-semibold transition-transform active:scale-95"
                >
                  Riprendi
                </button>
                <button
                  onClick={() => {
                    setShowResumePrompt(false);
                    setResumeDialog(null);
                    startWorkout();
                  }}
                  className="flex-1 h-12 rounded-xl bg-secondary text-secondary-foreground font-semibold transition-transform active:scale-95"
                >
                  Nuovo
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/workout")} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground active:scale-90 transition-transform">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <p className="text-xl font-bold">{dayData.day_name}</p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Giorno {dayData.day_number}</p>
          </div>
          <button
            onClick={() => navigate(`/edit-day/${dayData.id}`)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Edit2 className="w-5 h-5" />
          </button>
        </div>

        {/* Color accent banner */}
        <div className="card-hero p-4 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 bg-primary/15 text-primary">
            {dayData.day_number}
          </div>
          <div>
            <p className="font-bold text-primary">{exercises.length} esercizi</p>
            <p className="text-xs text-muted-foreground">Scorri per vedere il programma</p>
          </div>
        </div>

        {/* Exercise list */}
        <div className="space-y-2 mb-8">
          {exercises.map((ex) => {
            const suggestion = progressionSuggestions[ex.exercise_name];
            const isHold = ex.tracking_unit === "seconds";
            const skillInfo = getSkillStepInfo(ex);
            return (
              <div key={ex.id} className="bg-card rounded-2xl px-4 py-3 flex items-center gap-3">
                <span className="text-xl">{isHold ? "🧘" : getExerciseIcon(ex.exercise_name)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{ex.exercise_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {skillInfo
                      ? `Step ${skillInfo.stepIndex}/${skillInfo.totalSteps} · ${skillInfo.step.name} · target ${skillInfo.step.targetMin}${skillInfo.step.targetMax ? `-${skillInfo.step.targetMax}` : ""}${isHold ? "s" : " reps"}`
                      : `${ex.sets} serie × ${ex.reps_min}${ex.reps_max && ex.reps_max !== ex.reps_min ? `-${ex.reps_max}` : ""} ${isHold ? "sec" : "reps"}`}
                    {!isHold && prevSets[ex.exercise_name]?.[0]?.weight > 0
                      ? ` · ${suggestion?.shouldIncrease ? suggestion.suggestedWeight : prevSets[ex.exercise_name][0].weight}kg`
                      : ""}
                  </p>
                </div>
                {/* Badge progressione peso: visibile solo se l'algoritmo suggerisce un incremento */}
                {!isHold && suggestion?.shouldIncrease && (
                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 whitespace-nowrap">
                    +{suggestion.increment}kg
                  </span>
                )}
                <button
                  onClick={() => navigate(`/exercise/${encodeURIComponent(ex.exercise_name)}`)}
                  className="shrink-0 w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground active:scale-90 transition-transform"
                  aria-label={`Info su ${ex.exercise_name}`}
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Start button */}
        <div className="fixed bottom-8 left-3 right-3 sm:left-4 sm:right-4 max-w-[412px] mx-auto md:sticky md:bottom-8 md:left-auto md:right-auto md:max-w-none md:w-full">
          <button
            onClick={handleStartWorkout}
            className="w-full h-16 rounded-2xl font-bold text-white text-lg flex items-center justify-center gap-3 transition-transform active:scale-95 gradient-primary glow-primary"
          >
            <Play className="w-5 h-5 fill-white" />
            Inizia allenamento
          </button>
        </div>
      </PageContainer>
    );
  }

  // ── ACTIVE WORKOUT ───────────────────────────────────────────────
  const exercise = exercises[currentExIdx];
  const exSets = sets[exercise?.exercise_name || ""] || [];
  const isHoldExercise = exercise?.tracking_unit === "seconds";
  const skillInfo = exercise ? getSkillStepInfo(exercise) : null;
  const totalExercises = exercises.length;
  const completedExercises = exercises.filter((ex) =>
    (sets[ex.exercise_name] || []).every((s) => s.done)
  ).length;
  const progressPct = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;

  function updateSet(idx: number, field: "reps" | "weight", val: string) {
    setSets((prev) => {
      const exName = exercise?.exercise_name || "";
      const updated = [...(prev[exName] || [])];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, [exName]: updated };
    });
  }

  function adjustWeight(idx: number, delta: number) {
    setSets((prev) => {
      const exName = exercise?.exercise_name || "";
      const updated = [...(prev[exName] || [])];
      const current = parseFloat(updated[idx].weight) || 0;
      const next = Math.max(0, current + delta);
      updated[idx] = { ...updated[idx], weight: next % 1 === 0 ? String(next) : next.toFixed(1) };
      return { ...prev, [exName]: updated };
    });
  }

  function isNewPR(exName: string, weight: number, reps: number): boolean {
    const prevReps = prevSets[exName]?.[0]?.reps ?? 0;
    const prevWeight = prevSets[exName]?.[0]?.weight ?? 0;
    return weight > prevWeight || (weight === prevWeight && reps > prevReps);
  }

  function isNewHoldPR(exName: string, holdSeconds: number): boolean {
    const prevHold = Math.max(0, ...(prevSets[exName] || []).map((s) => s.hold_seconds ?? 0));
    return holdSeconds > prevHold;
  }

  function toggleSet(idx: number) {
    if (!exercise) return;
    const exName = exercise.exercise_name;
    const current = (sets[exName] || [])[idx];

    if (!current) {
      console.warn("Set non trovato:", exName, idx);
      return;
    }

    if (!current.done) {
      // L'utente ha completato il set: aggiorna lo stato locale e
      // salva immediatamente su Supabase (autosave non bloccante).
      setJustDone(`${exName}-${idx}`);
      setTimeout(() => setJustDone(null), 400);

      setSets((prev) => {
        const updated = [...(prev[exName] || [])];
        updated[idx] = { ...updated[idx], done: true };
        return { ...prev, [exName]: updated };
      });

      // Autosave: leggiamo i valori dal current corrente (che non è ancora
      // aggiornato nello state, ma i campi reps/weight non cambiano qui).
      const currentStepOrder = exercise?.skill_slug ? skillProgress[exercise.skill_slug]?.current_step_order ?? 1 : null;
      autosaveSet(exercise, idx, current.reps, current.weight, currentStepOrder);
    } else {
      // L'utente ha de-selezionato il set: rimuove il record dal DB.
      setSets((prev) => {
        const updated = [...(prev[exName] || [])];
        updated[idx] = { ...updated[idx], done: false };
        return { ...prev, [exName]: updated };
      });

      autounsaveSet(exName, idx);
    }
  }

  async function savePartialWorkout() {
    // Con l'autosave attivo, ogni set completato è già persistito su DB
    // nel momento in cui viene marcato done. Questa funzione rimane come
    // fallback per l'evento "unload" ma non deve più fare insert bulk
    // (che causerebbe duplicati). Non fa nulla di aggiuntivo.
    // Lasciata per compatibilità con l'event listener beforeunload.
  }

  async function finishWorkout() {
    setSaving(true);

    // I set sono già tutti su DB grazie all'autosave.
    // Qui aggiorniamo solo il workout_log segnando la sessione come completata.
    if (workoutLogId) {
      try {
        await supabase
          .from("workout_logs")
          .update({ completed_at: new Date().toISOString() })
          .eq("id", workoutLogId);
      } catch {
        toast({ title: "Avviso", description: "Errore nel chiudere la sessione", variant: "destructive" });
      }
    }

    // Calcola le statistiche direttamente dallo stato locale (già in sync col DB)
    const allDoneSets = Object.entries(sets).flatMap(([, exSets]) =>
      exSets.filter((s) => s.done).map((s) => ({
        reps: parseInt(s.reps) || 0,
        weight: parseFloat(s.weight) || 0,
      }))
    );
    const volume = allDoneSets.reduce((acc, s) => acc + s.weight * s.reps, 0);

    // Valuta l'avanzamento di step per ogni skill allenata in questa seduta
    const levelUps: SkillLevelUp[] = [];
    const skillExercises = exercises.filter((ex) => ex.skill_slug);
    if (skillExercises.length > 0) {
      try {
        const userId = await getUserId();
        for (const ex of skillExercises) {
          const skill = getSkill(skills, ex.skill_slug!);
          if (!skill) continue; // catalogo non ancora caricato o slug sconosciuto: salta senza bloccare il salvataggio

          const loggedSets = (sets[ex.exercise_name] || [])
            .filter((s) => s.done)
            .map((s) => ({ value: parseInt(s.reps) || 0 }));
          if (loggedSets.length === 0) continue;

          const result = await evaluateAndSaveSkillSession(userId, skill, loggedSets, ex.sets);
          if (result?.leveledUp && result.newStep) {
            levelUps.push({ skillName: skill.name, newStepName: result.newStep.name });
          }
        }
      } catch (error) {
        console.error("Errore valutazione progressione skill:", error);
      }
    }

    setCompletion({ duration: Math.round(elapsed / 60), sets: allDoneSets.length, volume, levelUps });
  }

  // Completion screen
  if (completion) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-5">
        <div className="w-full max-w-sm text-center">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 bg-primary/10">
            <Trophy className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-1">Ottimo lavoro!</h2>
          <p className="text-muted-foreground mb-8">Giorno {dayData.day_number} — {dayData.day_name}</p>
          <div className="grid grid-cols-3 gap-3 mb-10">
            <div className="bg-card border border-border rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold">{completion.duration}</p>
              <p className="text-xs text-muted-foreground mt-1">min</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold">{completion.sets}</p>
              <p className="text-xs text-muted-foreground mt-1">serie</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold">
                {completion.volume >= 1000 ? `${(completion.volume / 1000).toFixed(1)}t` : `${completion.volume}`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {completion.volume >= 1000 ? "tonnellate" : "kg vol."}
              </p>
            </div>
          </div>

          {completion.levelUps.length > 0 && (
            <div className="space-y-2 mb-8">
              {completion.levelUps.map((lvl, i) => (
                <div key={i} className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-left">
                  <p className="text-sm font-bold text-emerald-500">🎉 {lvl.skillName}: livello superato!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Nuovo step: {lvl.newStepName}</p>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => navigate("/")}
            className="w-full h-14 rounded-2xl font-bold text-white transition-transform active:scale-95 gradient-primary glow-primary"
          >
            Torna alla home
          </button>
        </div>
      </div>
    );
  }

  if (!exercise || !dayData) return <div className="p-5 pt-14 text-foreground">Caricamento...</div>;

  return (
    <PageContainer variant="narrow" className="min-h-screen px-5 pt-14 pb-24 max-w-full">
      {showTimer && (
        <RestTimer
          key={timerKey}
          seconds={exercise?.rest_seconds || 90}
          onComplete={() => setShowTimer(false)}
          onDismiss={() => setShowTimer(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground active:scale-90 transition-transform">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <p className="text-lg font-bold">{dayData.day_name}</p>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Giorno {dayData.day_number}</p>
        </div>
        {phase === "preview" && dayData && (
          <button
            onClick={() => navigate(`/edit-day/${dayData.id}`)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Edit2 className="w-5 h-5" />
          </button>
        )}
        {phase === "active" && (
          <div className="flex items-center gap-2">
            {/* Indicatore autosave: non bloccante, scompare dopo il salvataggio */}
            {autosaveStatus === "saving" && (
              <div
                aria-label="Salvataggio in corso"
                title="Salvataggio in corso..."
                className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"
              />
            )}
            {autosaveStatus === "error" && (
              <div
                aria-label="Errore di salvataggio"
                title="Salvataggio fallito. I dati potrebbero non essere stati salvati."
                className="flex items-center gap-1 text-destructive"
              >
                <CloudOff className="w-3.5 h-3.5" />
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-secondary rounded-xl px-3 py-1.5">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm font-bold tabular-nums">{formatElapsed(elapsed)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-secondary rounded-full mb-5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 bg-primary"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Exercise selector */}
      <div className="flex flex-wrap gap-1.5 pb-3 mb-5 overflow-x-hidden w-full">
        {exercises.map((ex, i) => {
          const done = (sets[ex.exercise_name] || []).every((s) => s.done);
          const active = i === currentExIdx;
          return (
            <button
              key={ex.id}
              onClick={() => setCurrentExIdx(i)}
              className={[
                "px-2 py-1 rounded-full text-[10px] font-semibold transition-colors flex-shrink-0 whitespace-nowrap",
                active ? "bg-primary text-white" : done ? "bg-primary/20 text-primary" : "bg-secondary text-secondary-foreground"
              ].join(" ")}
            >
              {ex.exercise_name.length > 10 ? ex.exercise_name.slice(0, 10) + "…" : ex.exercise_name}
            </button>
          );
        })}
      </div>

      {/* Current exercise */}
      <div className="bg-card rounded-2xl p-5 mb-4 border-t-2 border-primary">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">{isHoldExercise ? "🧘" : getExerciseIcon(exercise.exercise_name)}</span>
          <p className="text-lg font-bold flex-1">{exercise.exercise_name}</p>
          {/* Badge progressione inline nell'header dell'esercizio */}
          {!isHoldExercise && progressionSuggestions[exercise.exercise_name]?.shouldIncrease && (
            <span className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-500">
              ↑ +{progressionSuggestions[exercise.exercise_name].increment}kg
            </span>
          )}
          <button
            onClick={() => setInsightsExercise(exercise.exercise_name)}
            className="shrink-0 w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground active:scale-90 transition-transform"
            aria-label={`Info su ${exercise.exercise_name}`}
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
        {skillInfo ? (
          <p className="text-sm text-muted-foreground mb-4">
            Step {skillInfo.stepIndex}/{skillInfo.totalSteps} · {skillInfo.step.name} · target {skillInfo.step.targetMin}
            {skillInfo.step.targetMax ? `-${skillInfo.step.targetMax}` : ""}
            {isHoldExercise ? "s" : " reps"} · {skillInfo.cleanSessions}/{skillInfo.step.criteriaSessions} sedute pulite
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mb-4">
            {exercise.sets} × {exercise.reps_min}{exercise.reps_max && exercise.reps_max !== exercise.reps_min ? `-${exercise.reps_max}` : ""} {isHoldExercise ? "sec" : "reps"}
            {exercise.notes ? ` · ${exercise.notes}` : ""}
          </p>
        )}

        <div className="space-y-2">
          {exSets.map((s, i) => {
            const key = `${exercise.name}-${i}`;
            return (
              <div key={i}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => s.done && toggleSet(i)}
                    className="w-7 shrink-0 flex items-center justify-center"
                  >
                    {s.done
                      ? <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
                      : <span className="text-xs text-muted-foreground font-medium">S{i + 1}</span>
                    }
                  </button>

                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder={isHoldExercise ? "Sec" : "Rep"}
                    value={s.reps}
                    onChange={(e) => updateSet(i, "reps", e.target.value)}
                    className={`w-16 h-12 bg-secondary rounded-xl px-2 text-foreground text-base text-center placeholder:text-muted-foreground outline-none transition-opacity ${s.done ? "opacity-50" : ""}`}
                  />

                  {isHoldExercise ? (
                    <div className="flex-1" />
                  ) : (
                    <div className={`flex items-center flex-1 bg-secondary rounded-xl overflow-hidden h-12 transition-opacity ${s.done ? "opacity-50" : ""}`}>
                      <button
                        onClick={() => adjustWeight(i, -2.5)}
                        className="h-full px-3 text-base font-bold text-muted-foreground active:bg-muted transition-colors"
                      >−</button>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="kg"
                        value={s.weight}
                        onChange={(e) => updateSet(i, "weight", e.target.value)}
                        className="flex-1 h-full bg-transparent text-foreground text-base text-center outline-none min-w-0 placeholder:text-muted-foreground"
                      />
                      <button
                        onClick={() => adjustWeight(i, 2.5)}
                        className="h-full px-3 text-base font-bold text-muted-foreground active:bg-muted transition-colors"
                      >+</button>
                    </div>
                  )}

                  <button
                    onClick={() => toggleSet(i)}
                    className={`w-11 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200
                      ${justDone === key ? "scale-110" : "scale-100"}
                      ${s.done ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}
                    `}
                  >
                    <Check className="w-5 h-5" />
                  </button>

                  {s.done && !isHoldExercise && isNewPR(exercise?.exercise_name || "", parseFloat(s.weight) || 0, parseInt(s.reps) || 0) && (
                    <div className="text-amber-400 text-xs font-bold">🏆 PR</div>
                  )}
                  {s.done && isHoldExercise && isNewHoldPR(exercise?.exercise_name || "", parseInt(s.reps) || 0) && (
                    <div className="text-amber-400 text-xs font-bold">🏆 PR</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rest Timer Button */}
      <div className="mb-4">
        <button
          onClick={() => {
            setTimerKey((k) => k + 1);
            setShowTimer(true);
          }}
          className="w-full h-12 rounded-xl font-semibold text-white flex items-center justify-center gap-2 bg-primary active:scale-95 transition-transform"
        >
          <Play className="w-4 h-4 fill-white" />
          Avvia riposo ({exercise?.rest_seconds || 90}s)
        </button>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 fixed bottom-24 left-3 right-3 sm:left-4 sm:right-4 max-w-[412px] mx-auto md:sticky md:bottom-24 md:left-auto md:right-auto md:max-w-none md:w-full">
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
            className="flex-1 h-14 rounded-2xl font-semibold transition-transform active:scale-95 text-white gradient-primary"
          >
            Prossimo
          </button>
        ) : (
          <button
            onClick={finishWorkout}
            disabled={saving}
            className="flex-1 h-14 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-60 text-white gradient-primary"
          >
            {saving ? "Salvataggio..." : "✓ Completa"}
          </button>
        )}
      </div>

      <Drawer open={!!insightsExercise} onOpenChange={(open) => !open && setInsightsExercise(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{insightsExercise}</DrawerTitle>
          </DrawerHeader>
          <div
            className="overflow-y-auto px-4 pb-8"
            style={{ maxHeight: 'calc(75vh - 80px)', WebkitOverflowScrolling: 'touch' }}
            data-vaul-no-drag
          >
            {insightsExercise && exercises.find((e) => e.exercise_name === insightsExercise)?.skill_slug && (
              <SkillLadderCard skillSlug={exercises.find((e) => e.exercise_name === insightsExercise)!.skill_slug!} />
            )}
            {insightsExercise && <ExerciseInsightsCard exerciseName={insightsExercise} />}
          </div>
        </DrawerContent>
      </Drawer>
    </PageContainer>
  );
}
