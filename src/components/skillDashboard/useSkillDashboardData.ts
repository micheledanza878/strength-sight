import { useEffect, useState } from "react";
import { format, startOfWeek } from "date-fns";
import { it } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { getUserId } from "@/lib/user";
import { fetchSkills, type Skill } from "@/services/skillsService";
import { getDayTypeFromName, getSkillDayType } from "@/lib/skillDayType";
import type { SkillLog, SkillRepsThreshold } from "./types";
import { buildAdherenceMatrix, type AdherenceMatrix, type WeeklyCategoryVolumePoint } from "./utils";

/**
 * Adapter tra i dati grezzi Supabase e la forma attesa dai componenti della
 * Skill Dashboard. Il frontend non è la fonte di verità: si limita a
 * leggere/aggregare quanto già persistito da `set_logs`/`workout_logs`/
 * `user_skill_progress` (scritti da skillProgressionService lato sessione).
 */
export interface SkillDashboardData {
  /** Serie storica per skill (thresholdSeconds valorizzato per le isometriche). */
  skillLogs: SkillLog[];
  /** Soglia reps per le skill dinamiche. */
  repsThresholds: SkillRepsThreshold[];
  /** Volume settimanale per categoria (push/pull/legs), pre-aggregato per il bar chart. */
  weeklyVolume: WeeklyCategoryVolumePoint[];
  /** Matrice giorni-scheda × settimane, pre-costruita per la heatmap di aderenza. */
  adherenceMatrix: AdherenceMatrix;
}

/** Riga `set_logs` così come selezionata (solo i campi rilevanti per le skill). */
interface SkillSetLogRow {
  skill_slug: string | null;
  skill_step_order: number | null;
  hold_seconds: number | null;
  reps: number | null;
}

/** Riga `workout_logs` con la join annidata ai suoi `set_logs`. */
interface WorkoutLogWithSetsRow {
  id: string;
  workout_day: string;
  started_at: string;
  set_logs: SkillSetLogRow[] | null;
}

/** Matrice di aderenza vuota, usata quando non c'è una scheda attiva da cui derivare i giorni. */
const EMPTY_ADHERENCE_MATRIX: AdherenceMatrix = { weeks: [], rows: [] };

/**
 * Determina lo step "rappresentativo" di una skill per una sessione, dati i
 * set loggati in quella sessione: se i set hanno `skill_step_order`
 * valorizzato, usa quello più frequente (a parità di frequenza, il primo
 * incontrato); altrimenti ricade sullo step corrente da `user_skill_progress`
 * (o 1 se la skill non è mai stata tracciata).
 */
function resolveStepOrder(
  setsForSkill: SkillSetLogRow[],
  slug: string,
  currentStepBySlug: Map<string, number>
): number {
  const orders = setsForSkill
    .map((s) => s.skill_step_order)
    .filter((o): o is number => o !== null);

  if (orders.length === 0) {
    return currentStepBySlug.get(slug) ?? 1;
  }

  const freq = new Map<number, number>();
  orders.forEach((o) => freq.set(o, (freq.get(o) ?? 0) + 1));

  let best = orders[orders.length - 1];
  let bestCount = 0;
  freq.forEach((count, order) => {
    if (count > bestCount) {
      bestCount = count;
      best = order;
    }
  });
  return best;
}

/** max(...) sicuro anche con array vuoto/tutti null (ritorna 0 invece di -Infinity). */
function maxOrZero(values: (number | null)[]): number {
  let max = 0;
  for (const v of values) {
    if (v !== null && v > max) max = v;
  }
  return max;
}

/**
 * Hook che carica ed aggrega i dati reali per la Skill Dashboard a partire da
 * Supabase: catalogo skill + progressione utente + sessioni completate con i
 * relativi set, più i giorni della scheda attiva (per la heatmap di aderenza).
 */
export function useSkillDashboardData(activePlanId: string | null) {
  const [data, setData] = useState<SkillDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const uid = await getUserId();

        const [skills, progressRes, logsRes, planDaysRes] = await Promise.all([
          fetchSkills(),
          supabase
            .from("user_skill_progress")
            .select("skill_slug, current_step_order")
            .eq("user_id", uid),
          supabase
            .from("workout_logs")
            .select("id, workout_day, started_at, set_logs(skill_slug, skill_step_order, hold_seconds, reps)")
            .eq("user_id", uid)
            .not("completed_at", "is", null)
            .order("started_at", { ascending: true }),
          activePlanId
            ? supabase
                .from("workout_plan_days")
                .select("day_name, day_number")
                .eq("workout_plan_id", activePlanId)
                .order("day_number", { ascending: true })
            : Promise.resolve({ data: [] as { day_name: string; day_number: number }[], error: null }),
        ]);

        if (progressRes.error) throw progressRes.error;
        if (logsRes.error) throw logsRes.error;
        if (planDaysRes.error) throw planDaysRes.error;

        const skillsBySlug = new Map<string, Skill>(skills.map((s) => [s.slug, s]));
        const currentStepBySlug = new Map<string, number>(
          (progressRes.data ?? []).map((p) => [p.skill_slug, p.current_step_order])
        );

        const logs = (logsRes.data ?? []) as WorkoutLogWithSetsRow[];

        const skillLogs: SkillLog[] = [];
        const weekMap = new Map<string, WeeklyCategoryVolumePoint>();

        for (const log of logs) {
          const setsInSession = log.set_logs ?? [];

          // ── Volume settimanale per categoria (push/pull/legs) ──────────────
          const category = getDayTypeFromName(log.workout_day);
          if (category === "push" || category === "pull" || category === "legs") {
            const weekStart = startOfWeek(new Date(log.started_at), { weekStartsOn: 1 });
            const key = format(weekStart, "yyyy-MM-dd");
            let point = weekMap.get(key);
            if (!point) {
              point = {
                weekLabel: format(weekStart, "d MMM", { locale: it }),
                weekStart,
                push: 0,
                pull: 0,
                legs: 0,
              };
              weekMap.set(key, point);
            }
            point[category] += setsInSession.length;
          }

          // ── Log skill: raggruppa i set della sessione per skill_slug ───────
          const setsBySkill = new Map<string, SkillSetLogRow[]>();
          for (const s of setsInSession) {
            if (!s.skill_slug) continue;
            const list = setsBySkill.get(s.skill_slug) ?? [];
            list.push(s);
            setsBySkill.set(s.skill_slug, list);
          }

          setsBySkill.forEach((setsForSkill, slug) => {
            const skill = skillsBySlug.get(slug);
            if (!skill) return;

            const order = resolveStepOrder(setsForSkill, slug, currentStepBySlug);
            const step = skill.steps.find((s) => s.order === order);
            if (!step) return;

            if (step.targetType === "seconds") {
              skillLogs.push({
                id: `${log.id}-${slug}`,
                skillName: skill.name,
                date: log.started_at,
                holdSeconds: maxOrZero(setsForSkill.map((s) => s.hold_seconds)),
                thresholdSeconds: step.targetMin,
                category: getSkillDayType(skill),
              });
            } else {
              skillLogs.push({
                id: `${log.id}-${slug}`,
                skillName: skill.name,
                date: log.started_at,
                holdSeconds: 0,
                reps: maxOrZero(setsForSkill.map((s) => s.reps)),
                category: getSkillDayType(skill),
              });
            }
          });
        }

        // ── Soglie reps per le skill dinamiche presenti nei log ──────────────
        const dynamicSkillNames = new Set(
          skillLogs.filter((l) => l.reps !== undefined).map((l) => l.skillName)
        );
        const repsThresholds: SkillRepsThreshold[] = [];
        dynamicSkillNames.forEach((skillName) => {
          const skill = skills.find((s) => s.name === skillName);
          if (!skill) return;
          const currentOrder = currentStepBySlug.get(skill.slug) ?? 1;
          const step = skill.steps.find((s) => s.order === currentOrder);
          if (step) repsThresholds.push({ skillName, thresholdReps: step.targetMin });
        });

        const weeklyVolume = Array.from(weekMap.values()).sort(
          (a, b) => a.weekStart.getTime() - b.weekStart.getTime()
        );

        // ── Heatmap di aderenza: giorni della scheda attiva × ultime 8 settimane ──
        let adherenceMatrix: AdherenceMatrix = EMPTY_ADHERENCE_MATRIX;
        if (activePlanId) {
          const splitDays = (planDaysRes.data ?? []).map((d) => ({ key: d.day_name, label: d.day_name }));
          if (splitDays.length > 0) {
            const syntheticSessions = logs.map((log) => ({
              splitDay: log.workout_day,
              completed: true,
              date: log.started_at,
            }));
            adherenceMatrix = buildAdherenceMatrix(syntheticSessions, 8, splitDays);
          }
        }

        if (!cancelled) {
          setData({ skillLogs, repsThresholds, weeklyVolume, adherenceMatrix });
        }
      } catch (error) {
        console.error("Errore caricamento Skill Dashboard:", error);
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [activePlanId]);

  return { data, loading };
}
