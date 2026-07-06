import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, X, Loader, ChevronRight, ChevronUp, ChevronDown, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getUserId } from "@/lib/user";
import { useToast } from "@/hooks/use-toast";
import PageContainer from "@/components/PageContainer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkillPickerDialog } from "@/components/Exercise/SkillPickerDialog";
import { Skill } from "@/data/skills";

interface BodyPart {
  id: string;
  slug: string;
  name: string;
  icon: string;
}

interface Exercise {
  exercise_name: string;
  sets: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number;
  notes: string;
  primary_body_part_id?: string;
  tracking_unit?: "reps" | "seconds";
  skill_slug?: string | null;
}

interface WorkoutDay {
  day_name: string;
  exercises: Exercise[];
}

type Step = "plan" | "days" | "exercises";

export default function CreateWorkoutPlan() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("plan");
  const [planName, setPlanName] = useState("");
  const [durationWeeks, setDurationWeeks] = useState("4");
  const [numDays, setNumDays] = useState("4");
  const [days, setDays] = useState<WorkoutDay[]>([]);
  const [currentDayIdx, setCurrentDayIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [bodyParts, setBodyParts] = useState<BodyPart[]>([]);
  const [skillPickerOpen, setSkillPickerOpen] = useState(false);

  useEffect(() => {
    loadBodyParts();
  }, []);

  async function loadBodyParts() {
    try {
      const { data } = await supabase
        .from("body_parts")
        .select("id, slug, name, icon")
        .order("name", { ascending: true });

      if (data) {
        setBodyParts(data);
      }
    } catch (error) {
      console.error("Errore caricamento body parts:", error);
    }
  }

  // Step 1: Create plan base
  function handlePlanNext() {
    if (!planName.trim()) {
      toast({ title: "Errore", description: "Inserisci il nome della scheda", variant: "destructive" });
      return;
    }

    const num = parseInt(numDays) || 1;
    const newDays: WorkoutDay[] = Array.from({ length: num }, (_, i) => ({
      day_name: `Giorno ${i + 1}`,
      exercises: [],
    }));
    setDays(newDays);
    setStep("days");
  }

  // Step 2: Configure days
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

  // Add/remove exercises
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

  function addSkillExercise(skill: Skill) {
    const firstStep = skill.steps[0];
    const updated = [...days];
    updated[currentDayIdx].exercises.push({
      exercise_name: skill.name,
      sets: skill.recommendedSets,
      reps_min: firstStep.targetMin,
      reps_max: firstStep.targetMax ?? firstStep.targetMin,
      rest_seconds: skill.recommendedRestSeconds,
      notes: skill.warning || `Skill neurologica, a inizio seduta da fresco. Step 1: ${firstStep.name}.`,
      tracking_unit: firstStep.targetType,
      skill_slug: skill.slug,
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

  // Step 3: Save everything
  async function savePlan() {
    // Validate all exercises
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
      // Create workout plan
      const userId = await getUserId();
      const { data: planData, error: planError } = await supabase
        .from("workout_plans")
        .insert({
          user_id: userId,
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
          primary_body_part_id: ex.primary_body_part_id || null,
          tracking_unit: ex.tracking_unit || "reps",
          skill_slug: ex.skill_slug || null,
        }));

        const { error: exError } = await supabase
          .from("workout_plan_exercises")
          .insert(exercisesToInsert);

        if (exError) throw exError;
      }

      toast({ title: "Successo", description: "Scheda creata con successo!" });
      localStorage.setItem('activePlanId', planId);
      navigate("/workout");
    } catch (error) {
      console.error("Errore salvataggio scheda:", error);
      toast({ title: "Errore", description: "Impossibile salvare la scheda", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

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
          <h1 className="text-xl font-bold tracking-tight">Nuova Scheda</h1>
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
          <div>
            <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block mb-2">Numero di giorni</label>
            <input type="number" placeholder="4" value={numDays}
              onChange={(e) => setNumDays(e.target.value)} min="1" max="7" className={inputClass} />
          </div>
        </div>
      )}

      {/* ── STEP 2: Giorni ── */}
      {step === "days" && (
        <div className="space-y-3 mb-8">
          {days.map((day, idx) => (
            <div key={idx} className="bg-card border border-border rounded-2xl p-4">
              <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-2">
                Giorno {idx + 1}
              </label>
              <input type="text" placeholder="es. Upper A, Petto, Lower B..."
                value={day.day_name} onChange={(e) => updateDayName(idx, e.target.value)}
                className={smallInputClass} />
            </div>
          ))}
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
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    Esercizio {exIdx + 1}
                    {ex.skill_slug && (
                      <span className="inline-flex items-center gap-1 normal-case font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                        <Sparkles className="w-3 h-3" /> Skill
                      </span>
                    )}
                  </p>
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
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <input type="text" placeholder="Nome esercizio" value={ex.exercise_name}
                  onChange={(e) => updateExercise(exIdx, "exercise_name", e.target.value)}
                  className={smallInputClass} />

                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1.5">Parte del corpo</label>
                  <Select value={ex.primary_body_part_id || ""} onValueChange={(val) => updateExercise(exIdx, "primary_body_part_id", val)}>
                    <SelectTrigger className="w-full h-10 bg-secondary border border-border rounded-xl text-sm">
                      <SelectValue placeholder="Seleziona muscolo" />
                    </SelectTrigger>
                    <SelectContent>
                      {bodyParts.map((bp) => (
                        <SelectItem key={bp.id} value={bp.id}>{bp.icon} {bp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1.5">Serie</label>
                    <input type="number" value={ex.sets}
                      onChange={(e) => updateExercise(exIdx, "sets", parseInt(e.target.value) || 0)}
                      min="1" max="10" className="w-full h-10 bg-secondary rounded-xl px-3 text-sm text-center outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1.5">
                      {ex.tracking_unit === "seconds" ? "Sec min" : "Rep min"}
                    </label>
                    <input type="number" value={ex.reps_min}
                      onChange={(e) => updateExercise(exIdx, "reps_min", parseInt(e.target.value) || 0)}
                      min="1" className="w-full h-10 bg-secondary rounded-xl px-3 text-sm text-center outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1.5">
                      {ex.tracking_unit === "seconds" ? "Sec max" : "Rep max"}
                    </label>
                    <input type="number" value={ex.reps_max}
                      onChange={(e) => updateExercise(exIdx, "reps_max", parseInt(e.target.value) || 0)}
                      min="1" className="w-full h-10 bg-secondary rounded-xl px-3 text-sm text-center outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1.5">Riposo (sec)</label>
                    <input type="number" value={ex.rest_seconds}
                      onChange={(e) => updateExercise(exIdx, "rest_seconds", parseInt(e.target.value) || 0)}
                      min="0" step="15" className="w-full h-10 bg-secondary rounded-xl px-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
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

            <div className="grid grid-cols-2 gap-2">
              <button onClick={addExercise}
                className="h-12 rounded-2xl bg-secondary border border-dashed border-border text-muted-foreground font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                <Plus className="w-4 h-4" />
                Esercizio
              </button>
              <button onClick={() => setSkillPickerOpen(true)}
                className="h-12 rounded-2xl bg-primary/10 border border-dashed border-primary/40 text-primary font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                <Sparkles className="w-4 h-4" />
                Skill
              </button>
            </div>
          </div>
        </div>
      )}

      <SkillPickerDialog open={skillPickerOpen} onOpenChange={setSkillPickerOpen} onSelect={addSkillExercise} />

      {/* ── Bottom CTA ── */}
      <div className="fixed bottom-6 left-4 right-4 max-w-[412px] mx-auto md:sticky md:bottom-6 md:left-auto md:right-auto md:max-w-none md:w-full">
        {step === "exercises" ? (
          <button onClick={savePlan} disabled={saving}
            className="w-full h-14 rounded-2xl gradient-primary glow-primary text-white font-bold text-base flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60">
            {saving ? <><Loader className="w-5 h-5 animate-spin" /> Salvataggio...</> : "✓ Salva Scheda"}
          </button>
        ) : (
          <button onClick={step === "plan" ? handlePlanNext : handleDaysNext}
            className="w-full h-14 rounded-2xl gradient-primary glow-primary text-white font-bold text-base flex items-center justify-center gap-2 active:scale-95 transition-all">
            Avanti <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </PageContainer>
  );
}
