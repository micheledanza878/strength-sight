import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Plus, Loader, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getUserId } from "@/lib/user";
import { useActivePlan } from "@/contexts/ActivePlanContext";
import { useToast } from "@/hooks/use-toast";
import PageContainer from "@/components/PageContainer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { SKILLS, Skill, SkillCategory, getSkill, getSkillStep } from "@/data/skills";
import { SkillProgressRow } from "@/services/skillProgressionService";
import { SkillLadderCard } from "@/components/Exercise/SkillLadderCard";

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  "statiche-spinta": "Statiche — spinta",
  "statiche-trazione": "Statiche — trazione",
  core: "Core / compressione",
  "dinamiche-trazione": "Dinamiche — trazione",
  "dinamiche-spinta": "Dinamiche — spinta",
  gambe: "Gambe",
};

const CATEGORY_ORDER: SkillCategory[] = [
  "statiche-spinta",
  "statiche-trazione",
  "core",
  "dinamiche-trazione",
  "dinamiche-spinta",
  "gambe",
];

interface PlanDay {
  id: string;
  day_number: number;
  day_name: string;
}

export default function SkillsLibrary() {
  const navigate = useNavigate();
  const { activePlanId } = useActivePlan();
  const { toast } = useToast();

  const [progressBySlug, setProgressBySlug] = useState<Record<string, SkillProgressRow>>({});
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [days, setDays] = useState<PlanDay[]>([]);
  const [dayPickerSkill, setDayPickerSkill] = useState<Skill | null>(null);
  const [addingToDay, setAddingToDay] = useState<string | null>(null);
  const [ladderSkillSlug, setLadderSkillSlug] = useState<string | null>(null);

  useEffect(() => {
    loadProgress();
  }, []);

  useEffect(() => {
    if (activePlanId) loadDays(activePlanId);
  }, [activePlanId]);

  async function loadProgress() {
    try {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from("user_skill_progress")
        .select("skill_slug, current_step_order, consecutive_clean_sessions, last_trained_at")
        .eq("user_id", userId);
      if (error) throw error;
      const map: Record<string, SkillProgressRow> = {};
      (data || []).forEach((row) => {
        map[row.skill_slug] = row;
      });
      setProgressBySlug(map);
    } catch (error) {
      console.error("Errore caricamento progresso skill:", error);
    } finally {
      setLoadingProgress(false);
    }
  }

  async function loadDays(planId: string) {
    try {
      const { data, error } = await supabase
        .from("workout_plan_days")
        .select("id, day_number, day_name")
        .eq("workout_plan_id", planId)
        .order("day_number", { ascending: true });
      if (error) throw error;
      setDays(data || []);
    } catch (error) {
      console.error("Errore caricamento giorni:", error);
    }
  }

  async function addSkillToDay(skill: Skill, dayId: string) {
    setAddingToDay(dayId);
    try {
      const { data: existing, error: existingError } = await supabase
        .from("workout_plan_exercises")
        .select("order_number")
        .eq("workout_plan_day_id", dayId)
        .order("order_number", { ascending: false })
        .limit(1);
      if (existingError) throw existingError;

      const nextOrder = (existing?.[0]?.order_number ?? 0) + 1;
      const firstStep = skill.steps[0];

      const { error } = await supabase.from("workout_plan_exercises").insert({
        workout_plan_day_id: dayId,
        exercise_name: skill.name,
        order_number: nextOrder,
        sets: skill.recommendedSets,
        reps_min: firstStep.targetMin,
        reps_max: firstStep.targetMax ?? firstStep.targetMin,
        rest_seconds: skill.recommendedRestSeconds,
        notes: skill.warning || `Skill neurologica, a inizio seduta da fresco. Step 1: ${firstStep.name}.`,
        tracking_unit: firstStep.targetType,
        skill_slug: skill.slug,
      });
      if (error) throw error;

      toast({ title: "Skill aggiunta", description: `${skill.name} è stata aggiunta alla scheda.` });
      setDayPickerSkill(null);
    } catch (error) {
      console.error("Errore aggiunta skill al giorno:", error);
      toast({ title: "Errore", description: "Impossibile aggiungere la skill al giorno", variant: "destructive" });
    } finally {
      setAddingToDay(null);
    }
  }

  return (
    <PageContainer variant="default" className="px-4 pt-14 pb-32 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground active:scale-90 transition-transform"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Skill Calisthenics</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Progressioni statiche e dinamiche</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground bg-secondary rounded-xl p-3 mb-5">
        <Star className="w-3 h-3 inline text-primary mb-0.5" /> = le 4 skill consigliate ora. Il resto è un menù per
        i cicli futuri: meglio non aggiungerlo finché non chiudi almeno il muscle-up.
      </p>

      {!activePlanId && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-5 text-xs text-amber-500">
          Nessuna scheda attiva: seleziona una scheda in "Schede" prima di poter aggiungere una skill a un giorno.
        </div>
      )}

      {loadingProgress ? (
        <div className="flex items-center justify-center h-40">
          <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-5">
          {CATEGORY_ORDER.map((category) => {
            const skillsInCategory = SKILLS.filter((s) => s.category === category);
            if (skillsInCategory.length === 0) return null;
            return (
              <div key={category}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {CATEGORY_LABELS[category]}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {skillsInCategory.map((skill) => {
                    const progress = progressBySlug[skill.slug];
                    const currentStep = progress ? getSkillStep(skill, progress.current_step_order) : null;
                    return (
                      <div key={skill.slug} className="bg-card border border-border rounded-2xl p-4">
                        <button
                          type="button"
                          onClick={() => setLadderSkillSlug(skill.slug)}
                          className="w-full text-left"
                        >
                          <p className="font-semibold text-sm flex items-center gap-1.5">
                            {skill.isPriority && <Star className="w-3.5 h-3.5 text-primary fill-primary shrink-0" />}
                            {skill.name}
                          </p>
                          {currentStep ? (
                            <p className="text-xs text-primary mt-1">
                              Step {currentStep.order}/{skill.steps.length} · {currentStep.name}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">Non ancora iniziata</p>
                          )}
                          {skill.warning && (
                            <p className="text-[11px] text-amber-500 mt-1 line-clamp-2">{skill.warning}</p>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDayPickerSkill(skill)}
                          disabled={!activePlanId}
                          className="mt-3 w-full h-9 rounded-xl bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform disabled:opacity-40"
                        >
                          <Plus className="w-3.5 h-3.5" /> Aggiungi a un giorno
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Day picker */}
      <Dialog open={!!dayPickerSkill} onOpenChange={(open) => !open && setDayPickerSkill(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Aggiungi {dayPickerSkill?.name} a...</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {days.length === 0 && <p className="text-sm text-muted-foreground">Nessun giorno nella scheda attiva.</p>}
            {days.map((day) => (
              <button
                key={day.id}
                type="button"
                disabled={addingToDay === day.id}
                onClick={() => dayPickerSkill && addSkillToDay(dayPickerSkill, day.id)}
                className="w-full text-left bg-secondary rounded-xl p-3 flex items-center justify-between active:scale-95 transition-transform disabled:opacity-60"
              >
                <span className="text-sm font-medium">Giorno {day.day_number} · {day.day_name}</span>
                {addingToDay === day.id ? (
                  <Loader className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  <Check className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Ladder drawer */}
      <Drawer open={!!ladderSkillSlug} onOpenChange={(open) => !open && setLadderSkillSlug(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{ladderSkillSlug ? getSkill(ladderSkillSlug)?.name : ""}</DrawerTitle>
          </DrawerHeader>
          <div
            className="overflow-y-auto px-4 pb-8"
            style={{ maxHeight: "calc(75vh - 80px)", WebkitOverflowScrolling: "touch" }}
            data-vaul-no-drag
          >
            {ladderSkillSlug && <SkillLadderCard skillSlug={ladderSkillSlug} />}
          </div>
        </DrawerContent>
      </Drawer>
    </PageContainer>
  );
}
