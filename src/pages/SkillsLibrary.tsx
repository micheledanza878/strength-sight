import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Plus, Loader, Check, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getUserId } from "@/lib/user";
import { useToast } from "@/hooks/use-toast";
import PageContainer from "@/components/PageContainer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { SKILLS, Skill, SkillCategory, getSkill, getSkillStep, getNextStep, getRelatedSkills } from "@/data/skills";
import { SkillProgressRow } from "@/services/skillProgressionService";
import { SkillLadderCard } from "@/components/Exercise/SkillLadderCard";
import { getDayTypeFromName, isSkillCompatibleWithDay, describeMismatch } from "@/lib/skillDayType";

/** Nome della scheda dedicata al calisthenics: le skill si aggiungono sempre lì, mai in una scheda mista. */
const CALISTHENICS_PLAN_NAME = "Calisthenics";

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
  const { toast } = useToast();

  const [progressBySlug, setProgressBySlug] = useState<Record<string, SkillProgressRow>>({});
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [calisthenicsPlanId, setCalisthenicsPlanId] = useState<string | null>(null);
  const [planLookupDone, setPlanLookupDone] = useState(false);
  const [days, setDays] = useState<PlanDay[]>([]);
  const [dayPickerSkill, setDayPickerSkill] = useState<Skill | null>(null);
  const [addingToDay, setAddingToDay] = useState<string | null>(null);
  const [ladderSkillSlug, setLadderSkillSlug] = useState<string | null>(null);

  useEffect(() => {
    loadProgress();
    loadCalisthenicsPlan();
  }, []);

  // Le skill si aggiungono sempre alla scheda "Calisthenics" (giorni Pull/Push/Gambe
  // puliti), mai a una scheda mista tipo ipertrofia dove i giorni mescolano petto/dorso.
  async function loadCalisthenicsPlan() {
    try {
      const userId = await getUserId();
      // ilike invece di un confronto esatto: tollera maiuscole/minuscole diverse,
      // spazi in più nel nome, e non va in errore se per sbaglio esistono più
      // schede con "Calisthenics" nel nome (prende la più recente).
      const { data, error } = await supabase
        .from("workout_plans")
        .select("id, created_at")
        .eq("user_id", userId)
        .ilike("name", `%${CALISTHENICS_PLAN_NAME}%`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const plan = data?.[0];
      if (plan) {
        setCalisthenicsPlanId(plan.id);
        loadDays(plan.id);
      }
    } catch (error) {
      console.error("Errore ricerca scheda Calisthenics:", error);
    } finally {
      setPlanLookupDone(true);
    }
  }

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
      // Usa lo step che l'utente ha già sbloccato (se esiste un progresso), altrimenti
      // il primo step della progressione: mai la skill "completa".
      const progress = progressBySlug[skill.slug];
      const currentStep = getSkillStep(skill, progress?.current_step_order ?? 1) ?? skill.steps[0];

      const { error } = await supabase.from("workout_plan_exercises").insert({
        workout_plan_day_id: dayId,
        exercise_name: `${skill.name} — ${currentStep.name}`,
        order_number: nextOrder,
        sets: skill.recommendedSets,
        reps_min: currentStep.targetMin,
        reps_max: currentStep.targetMax ?? currentStep.targetMin,
        rest_seconds: skill.recommendedRestSeconds,
        notes: skill.warning || `Skill neurologica, a inizio seduta da fresco. Step ${currentStep.order}/${skill.steps.length}.`,
        tracking_unit: currentStep.targetType,
        skill_slug: skill.slug,
      });
      if (error) throw error;

      toast({ title: "Skill aggiunta", description: `${skill.name} — ${currentStep.name} è stata aggiunta alla scheda.` });
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

      {planLookupDone && !calisthenicsPlanId && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-5 text-xs text-amber-500">
          Non trovo una scheda chiamata "{CALISTHENICS_PLAN_NAME}": creane una da "Schede" con giorni Pull/Push/Gambe
          per poter aggiungere le skill.
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
                    const nextStep = currentStep
                      ? getNextStep(skill, currentStep.order)
                      : getSkillStep(skill, 1);
                    const related = getRelatedSkills(skill);
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
                              Ora: Step {currentStep.order}/{skill.steps.length} · {currentStep.name}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">Non ancora iniziata</p>
                          )}
                          {nextStep ? (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              → Prossimo allenamento: {nextStep.name}
                            </p>
                          ) : currentStep ? (
                            <p className="text-xs text-emerald-500 mt-0.5">🏁 Skill completata</p>
                          ) : null}
                          {skill.warning && (
                            <p className="text-[11px] text-amber-500 mt-1 line-clamp-2">{skill.warning}</p>
                          )}
                        </button>

                        {related.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {related.map(({ skill: relatedSkill, relation }) => (
                              <button
                                key={relatedSkill.slug}
                                type="button"
                                onClick={() => setLadderSkillSlug(relatedSkill.slug)}
                                title={relation.note}
                                className="text-[10px] font-medium bg-secondary rounded-full px-2 py-1 text-muted-foreground active:scale-95 transition-transform"
                              >
                                {relation.type === "prerequisite" ? "richiede" : "propedeutica"}: {relatedSkill.name}
                              </button>
                            ))}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setDayPickerSkill(skill)}
                          disabled={!calisthenicsPlanId}
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

          {dayPickerSkill &&
            getRelatedSkills(dayPickerSkill)
              .filter(({ skill: relatedSkill }) => !progressBySlug[relatedSkill.slug])
              .map(({ skill: relatedSkill, relation }) => (
                <div key={relatedSkill.slug} className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs">
                  <p className="text-amber-500">
                    {relation.type === "prerequisite" ? "Serve prima" : "Consigliata prima"}: <strong>{relatedSkill.name}</strong> — non
                    l'hai ancora avviata. {relation.note}
                  </p>
                  <button
                    type="button"
                    onClick={() => setDayPickerSkill(relatedSkill)}
                    className="mt-2 text-[11px] font-semibold text-amber-500 underline underline-offset-2"
                  >
                    Aggiungi {relatedSkill.name} invece
                  </button>
                </div>
              ))}

          <div className="space-y-2">
            {days.length === 0 && (
              <p className="text-sm text-muted-foreground">Nessun giorno nella scheda "{CALISTHENICS_PLAN_NAME}".</p>
            )}
            {dayPickerSkill &&
              [...days]
                .sort((a, b) => {
                  const aCompat = isSkillCompatibleWithDay(dayPickerSkill, getDayTypeFromName(a.day_name));
                  const bCompat = isSkillCompatibleWithDay(dayPickerSkill, getDayTypeFromName(b.day_name));
                  return aCompat === bCompat ? a.day_number - b.day_number : aCompat ? -1 : 1;
                })
                .map((day) => {
                  const dayType = getDayTypeFromName(day.day_name);
                  const mismatch = describeMismatch(dayPickerSkill, dayType);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      disabled={addingToDay === day.id}
                      onClick={() => addSkillToDay(dayPickerSkill, day.id)}
                      className={`w-full text-left rounded-xl p-3 active:scale-95 transition-transform disabled:opacity-60 ${
                        mismatch ? "bg-amber-500/10 border border-amber-500/30" : "bg-secondary"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Giorno {day.day_number} · {day.day_name}</span>
                        {addingToDay === day.id ? (
                          <Loader className="w-4 h-4 animate-spin text-muted-foreground" />
                        ) : mismatch ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        ) : (
                          <Check className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      {mismatch && <p className="text-[11px] text-amber-500 mt-1">{mismatch}</p>}
                    </button>
                  );
                })}
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
            {ladderSkillSlug && (
              <SkillLadderCard skillSlug={ladderSkillSlug} onNavigateSkill={setLadderSkillSlug} />
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </PageContainer>
  );
}
