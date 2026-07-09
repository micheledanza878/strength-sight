import { useEffect, useState } from "react";
import { Check, Lock, Loader2, Loader, PlayCircle, ChevronDown, ChevronUp } from "lucide-react";
import { fetchSkills, getSkill, getRelatedSkills, Skill, SkillStep } from "@/services/skillsService";
import { loadSkillProgress, SkillProgressRow } from "@/services/skillProgressionService";
import { getUserId } from "@/lib/user";
import { getExerciseInsights, ExerciseInsights } from "@/services/exerciseInsightsService";

interface SkillLadderCardProps {
  skillSlug: string;
  /** Se fornita, rende le skill collegate cliccabili per saltare alla loro scala. */
  onNavigateSkill?: (slug: string) => void;
}

/** Query pulita per la ricerca AI/YouTube: niente frecce o parentesi, un esercizio per volta. */
function buildStepQuery(skill: Skill, step: SkillStep): string {
  const cleanName = step.name.replace(/→/g, "a").replace(/\s*\([^)]*\)/g, "").trim();
  return `${skill.name} - ${cleanName}`;
}

export function SkillLadderCard({ skillSlug, onNavigateSkill }: SkillLadderCardProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [skillsError, setSkillsError] = useState(false);
  const [progress, setProgress] = useState<SkillProgressRow | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [videoByStep, setVideoByStep] = useState<Record<number, ExerciseInsights | null>>({});
  const [videoLoading, setVideoLoading] = useState<number | null>(null);

  // Il catalogo skill è cache-ato da fetchSkills(): qui serve solo per
  // risolvere skillSlug → Skill completa (con step e collegamenti).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchSkills();
        if (!cancelled) setSkills(data);
      } catch (error) {
        console.error("Errore caricamento catalogo skill:", error);
        if (!cancelled) setSkillsError(true);
      } finally {
        if (!cancelled) setSkillsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const userId = await getUserId();
        const p = await loadSkillProgress(userId, skillSlug);
        if (!cancelled) setProgress(p);
      } catch (error) {
        console.error("Errore caricamento progresso skill:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [skillSlug]);

  if (skillsLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4 mb-4 flex items-center justify-center h-24">
        <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (skillsError) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4 mb-4">
        <p className="text-sm text-destructive">Impossibile caricare il catalogo skill. Riprova più tardi.</p>
      </div>
    );
  }

  const skill = getSkill(skills, skillSlug);
  if (!skill) return null;

  const currentStepOrder = progress?.current_step_order ?? 1;
  const related = getRelatedSkills(skill, skills);

  async function toggleStepVideo(step: SkillStep) {
    if (!skill) return;
    if (expandedStep === step.order) {
      setExpandedStep(null);
      return;
    }
    setExpandedStep(step.order);
    if (videoByStep[step.order] !== undefined) return; // già in cache (anche null)

    setVideoLoading(step.order);
    const insights = await getExerciseInsights(buildStepQuery(skill, step));
    setVideoByStep((prev) => ({ ...prev, [step.order]: insights }));
    setVideoLoading(null);
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 mb-4">
      <p className="text-sm font-bold mb-1">{skill.name} — scala di progressione</p>
      {skill.warning && <p className="text-xs text-amber-500 mb-1">{skill.warning}</p>}
      {skill.prerequisite && (
        <p className="text-xs text-muted-foreground mb-1">Prerequisito: {skill.prerequisite}</p>
      )}
      {related.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {related.map(({ skill: relatedSkill, relation }) =>
            onNavigateSkill ? (
              <button
                key={relatedSkill.slug}
                type="button"
                onClick={() => onNavigateSkill(relatedSkill.slug)}
                title={relation.note}
                className="text-[10px] font-medium bg-secondary rounded-full px-2 py-1 text-muted-foreground active:scale-95 transition-transform"
              >
                {relation.type === "prerequisite" ? "richiede" : "propedeutica"}: {relatedSkill.name}
              </button>
            ) : (
              <span
                key={relatedSkill.slug}
                title={relation.note}
                className="text-[10px] font-medium bg-secondary rounded-full px-2 py-1 text-muted-foreground"
              >
                {relation.type === "prerequisite" ? "richiede" : "propedeutica"}: {relatedSkill.name}
              </span>
            )
          )}
        </div>
      )}

      <div className="space-y-2">
        {skill.steps.map((step) => {
          const done = step.order < currentStepOrder;
          const active = step.order === currentStepOrder;
          const isNextUp = step.order === currentStepOrder + 1;
          const isExpanded = expandedStep === step.order;
          const video = videoByStep[step.order];
          const isLoading = videoLoading === step.order;

          return (
            <div key={step.order} className={`rounded-xl overflow-hidden ${active ? "bg-primary/10 border border-primary/30" : "bg-secondary/50"}`}>
              <button
                type="button"
                onClick={() => toggleStepVideo(step)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left"
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    done ? "bg-primary/20 text-primary" : active ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="w-3.5 h-3.5" /> : step.order}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium flex items-center gap-1.5 ${active ? "text-primary" : ""}`}>
                    {step.name}
                    {isNextUp && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-1.5 py-0.5 shrink-0">
                        ▶ Prossimo
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Target {step.targetMin}
                    {step.targetMax ? `-${step.targetMax}` : ""}
                    {step.targetType === "seconds" ? "s" : " reps"}
                    {active ? ` · ${progress?.consecutive_clean_sessions ?? 0}/${step.criteriaSessions} sedute pulite` : ""}
                  </p>
                  {step.notes && <p className="text-[11px] text-muted-foreground/80 mt-0.5">{step.notes}</p>}
                </div>
                {!done && !active && <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="px-3 pb-3">
                  {isLoading && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cerco un tutorial su come si fa...
                    </div>
                  )}
                  {!isLoading && video && (
                    <div className="space-y-2">
                      {video.technique && (
                        <p className="text-xs text-muted-foreground">{video.technique}</p>
                      )}
                      {video.youtubeUrl && (
                        <a
                          href={video.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 bg-red-500/10 rounded-full px-3 py-1.5"
                        >
                          <PlayCircle className="w-3.5 h-3.5" /> Guarda il tutorial su YouTube
                        </a>
                      )}
                    </div>
                  )}
                  {!isLoading && videoByStep[step.order] === null && (
                    <p className="text-xs text-muted-foreground">Nessun tutorial trovato per questo step.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
