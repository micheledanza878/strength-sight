import type { FastifyInstance } from 'fastify';
import { format, startOfMonth, endOfMonth, startOfWeek, subDays, getWeek, differenceInDays, parseISO } from 'date-fns';
import { supabase } from '../supabase.js';
import { verifyAuth } from '../middleware/auth.js';
import type { DashboardStats } from '@strength-sight/shared';

export default async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.get('/stats', { preHandler: verifyAuth }, async (request, reply) => {
    const userId = (request as any).userId;
    const { activePlanId } = request.query as { activePlanId?: string };
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });

    const [logsResult, plansResult] = await Promise.all([
      supabase
        .from('workout_logs')
        .select('id, workout_day, started_at, completed_at')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .order('started_at', { ascending: false }),
      supabase
        .from('workout_plans')
        .select('id, user_id, name, duration_weeks')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
    ]);

    const logs = logsResult.data || [];
    const plans = plansResult.data || [];

    let streak = 0;
    let weekCount = 0;
    let monthCount = 0;
    let lastWorkout: { day: string; date: string } | null = null;
    let nextPlanDay = null;

    if (logs.length > 0) {
      lastWorkout = { day: logs[0].workout_day, date: logs[0].started_at };

      const monthLogs = logs.filter((l) => {
        const d = parseISO(l.started_at);
        return d >= monthStart && d <= monthEnd;
      });
      monthCount = monthLogs.length;
      weekCount = logs.filter((l) => parseISO(l.started_at) >= weekStart).length;

      const daySet = new Set(logs.map((l) => format(parseISO(l.started_at), 'yyyy-MM-dd')));
      let check = new Date();
      if (!daySet.has(format(check, 'yyyy-MM-dd'))) check = subDays(check, 1);
      while (daySet.has(format(check, 'yyyy-MM-dd'))) { streak++; check = subDays(check, 1); }
    }

    let planDaysQuery = supabase
      .from('workout_plan_days')
      .select('*')
      .order('day_number', { ascending: true });
    if (activePlanId) planDaysQuery = planDaysQuery.eq('workout_plan_id', activePlanId);

    const [planDaysResult, monthSetsResult, recentLogsResult, allSetsResult, measurementsResult] =
      await Promise.all([
        planDaysQuery,
        supabase
          .from('set_logs')
          .select('weight, reps')
          .eq('user_id', userId)
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString()),
        supabase
          .from('workout_logs')
          .select('id, workout_day, started_at, set_logs(weight, reps)')
          .eq('user_id', userId)
          .not('completed_at', 'is', null)
          .order('started_at', { ascending: false })
          .limit(8),
        supabase
          .from('set_logs')
          .select('weight, reps, workout_logs(started_at)')
          .eq('user_id', userId)
          .gte('created_at', subDays(now, 56).toISOString()),
        supabase
          .from('body_measurements')
          .select('measured_at')
          .eq('user_id', userId)
          .order('measured_at', { ascending: false })
          .limit(1),
      ]);

    const planDays = planDaysResult.data || [];
    if (planDays.length > 0) {
      if (lastWorkout) {
        const lastIdx = planDays.findIndex((d) => d.day_name === lastWorkout!.day);
        nextPlanDay = planDays[(lastIdx + 1) % planDays.length];
      } else {
        nextPlanDay = planDays[0];
      }
    }

    const monthVolume = (monthSetsResult.data || []).reduce((acc, s) => acc + s.weight * s.reps, 0);

    const volumeChart = (recentLogsResult.data || [])
      .map((log) => {
        const sets = (log.set_logs as { weight: number; reps: number }[]) || [];
        const vol = sets.reduce((acc, s) => acc + s.weight * s.reps, 0);
        return { date: format(parseISO(log.started_at), 'd/M'), volume: vol, day: log.workout_day };
      })
      .filter((p) => p.volume > 0)
      .reverse();

    const weeklyMap: Record<string, number> = {};
    (allSetsResult.data || []).forEach((s) => {
      const logDate = (s.workout_logs as any)?.started_at;
      if (logDate) {
        const week = `W${getWeek(parseISO(logDate))}`;
        weeklyMap[week] = (weeklyMap[week] || 0) + s.weight * s.reps;
      }
    });
    const weeklyVolumeChart = Object.entries(weeklyMap).sort().slice(-8).map(([week, volume]) => ({ week, volume }));

    const prLogsResult = await supabase
      .from('workout_logs')
      .select('id, set_logs(exercise_name, weight, reps)')
      .eq('user_id', userId)
      .not('completed_at', 'is', null);

    const prMap: Record<string, { weight: number; reps: number }> = {};
    (prLogsResult.data || []).forEach((log) => {
      const sets = (log.set_logs as { exercise_name: string; weight: number; reps: number }[]) || [];
      sets.forEach((s) => {
        const cur = prMap[s.exercise_name];
        if (!cur || s.weight > cur.weight || (s.weight === cur.weight && s.reps > cur.reps)) {
          prMap[s.exercise_name] = { weight: s.weight, reps: s.reps };
        }
      });
    });
    const topPRs = Object.entries(prMap)
      .map(([exercise, { weight, reps }]) => ({ exercise, weight, reps }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3);

    const measurements = measurementsResult.data || [];
    const lastMeasurementDaysAgo = measurements.length > 0
      ? differenceInDays(now, parseISO(measurements[0].measured_at))
      : null;

    const stats: DashboardStats = {
      streak,
      weekCount,
      monthCount,
      monthVolume,
      volumeChart,
      weeklyVolumeChart,
      topPRs,
      lastMeasurementDaysAgo,
      lastWorkout,
      nextPlanDay,
      plans,
    };

    return reply.send(stats);
  });
}
