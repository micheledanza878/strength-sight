import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Loader, ChevronUp, ChevronDown, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  id?: string;
  exercise_name: string;
  sets: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number;
  notes: string;
  order_number?: number;
  primary_body_part_id?: string;
  tracking_unit?: "reps" | "seconds";
  skill_slug?: string | null;
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
  const [bodyParts, setBodyParts] = useState<BodyPart[]>([]);
  const [skillPickerOpen, setSkillPickerOpen] = useState(false);

  useEffect(() => {
    loadBodyParts();
    if (dayId) loadDay();
  }, [dayId]);

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
          primary_body_part_id: ex.primary_body_part_id,
          tracking_unit: ex.tracking_unit || "reps",
          skill_slug: ex.skill_slug,
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

  function addSkillExercise(skill: Skill) {
    if (!day) return;
    const firstStep = skill.steps[0];
    setDay({
      ...day,
      exercises: [
        ...day.exercises,
        {
          exercise_name: skill.name,
          sets: skill.recommendedSets,
          reps_min: firstStep.targetMin,
          reps_max: firstStep.targetMax ?? firstStep.targetMin,
          rest_seconds: skill.recommendedRestSeconds,
          notes: skill.warning || `Skill neurologica, a inizio seduta da fresco. Step 1: ${firstStep.name}.`,
          tracking_unit: firstStep.targetType,
          skill_slug: skill.slug,
        },
      ],
    });
  }

  function removeExercise(exIdx: number) {
    if (day) {
      const updated = [...day.exercises];
      updated.splice(exIdx, 1);
      setDay({ ...day, exercises: updated });
    }
  }

  function moveExercise(idx: number, dir: 'up' | 'down') {
    if (!day) return;
    const updated = [...day.exercises];
    const to = dir === 'up' ? idx - 1 : idx + 1;
    if (to < 0 || to >= updated.length) return;
    [updated[idx], updated[to]] = [updated[to], updated[idx]];
    setDay({ ...day, exercises: updated });
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
        primary_body_part_id: ex.primary_body_part_id || null,
        tracking_unit: ex.tracking_unit || "reps",
        skill_slug: ex.skill_slug || null,
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

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
  if (!day) return (
    <div className="px-4 pt-14 text-muted-foreground text-sm">Giorno non trovato</div>
  );

  const inputClass = "w-full h-12 bg-secondary border border-border rounded-xl px-4 text-foreground text-sm outline-none focus:ring-2 focus:ring-primary transition-all";
  const smallInputClass = "w-full h-10 bg-secondary border border-border rounded-xl px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary transition-all";

  return (
    <PageContainer variant="narrow" className="min-h-screen px-4 pt-14 pb-32">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground active:scale-90 transition-transform flex-shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Modifica Allenamento</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Giorno {day.day_number} · {day.day_name}</p>
        </div>
      </div>

      {/* ── Nome giorno ── */}
      <div className="mb-6">
        <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block mb-2">Nome giorno</label>
        <input type="text" value={day.day_name}
          onChange={(e) => updateDayName(e.target.value)} className={inputClass} />
      </div>

      {/* ── Esercizi ── */}
      <div className="space-y-3 mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Esercizi <span className="text-primary">({day.exercises.length})</span>
        </p>

        {day.exercises.map((ex, exIdx) => (
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
                <button onClick={() => moveExercise(exIdx, 'down')} disabled={exIdx === day.exercises.length - 1}
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
                  onChange={(e) => updateExercise(exIdx, "sets", parseInt(e.target.value))}
                  className="w-full h-10 bg-secondary rounded-xl px-3 text-sm text-center outline-none focus:ring-2 focus:ring-primary" min="1" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1.5">
                  {ex.tracking_unit === "seconds" ? "Sec min" : "Rep min"}
                </label>
                <input type="number" value={ex.reps_min}
                  onChange={(e) => updateExercise(exIdx, "reps_min", parseInt(e.target.value))}
                  className="w-full h-10 bg-secondary rounded-xl px-3 text-sm text-center outline-none focus:ring-2 focus:ring-primary" min="1" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1.5">
                  {ex.tracking_unit === "seconds" ? "Sec max" : "Rep max"}
                </label>
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

      <SkillPickerDialog open={skillPickerOpen} onOpenChange={setSkillPickerOpen} onSelect={addSkillExercise} />

      {/* ── Bottom CTA ── */}
      <div className="fixed bottom-6 left-4 right-4 max-w-[412px] mx-auto flex gap-3 md:sticky md:bottom-6 md:left-auto md:right-auto md:max-w-none md:w-full">
        <button onClick={() => navigate(-1)}
          className="flex-1 h-14 rounded-2xl bg-secondary text-foreground font-semibold active:scale-95 transition-transform">
          Annulla
        </button>
        <button onClick={saveDay} disabled={saving}
          className="flex-1 h-14 rounded-2xl gradient-primary glow-primary text-white font-bold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60">
          {saving ? <><Loader className="w-4 h-4 animate-spin" /> Salvataggio...</> : "✓ Salva"}
        </button>
      </div>
    </PageContainer>
  );
}
