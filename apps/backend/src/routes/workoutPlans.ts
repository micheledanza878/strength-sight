import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../supabase.js';
import { verifyAuth } from '../middleware/auth.js';

const ExerciseSchema = z.object({
  exercise_name: z.string().min(1),
  order_number: z.number().int().positive(),
  sets: z.number().int().positive(),
  reps_min: z.number().int().positive().nullable().optional(),
  reps_max: z.number().int().positive().nullable().optional(),
  rest_seconds: z.number().int().nonnegative().nullable().optional(),
  notes: z.string().nullable().optional(),
  primary_body_part_id: z.string().uuid().nullable().optional(),
});

const DaySchema = z.object({
  day_name: z.string().min(1),
  day_number: z.number().int().positive(),
  exercises: z.array(ExerciseSchema),
});

const CreatePlanSchema = z.object({
  name: z.string().min(1),
  duration_weeks: z.number().int().positive().nullable().optional(),
  days: z.array(DaySchema),
});

const UpdatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  duration_weeks: z.number().int().positive().nullable().optional(),
  days: z.array(DaySchema.extend({ id: z.string().uuid().optional() })).optional(),
});

export default async function workoutPlanRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: verifyAuth }, async (request, reply) => {
    const userId = (request as any).userId;
    const { data, error } = await supabase
      .from('workout_plans')
      .select('id, name, description, duration_weeks, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return reply.code(500).send({ error: error.message });
    return reply.send(data);
  });

  fastify.get('/:id', { preHandler: verifyAuth }, async (request, reply) => {
    const userId = (request as any).userId;
    const { id } = request.params as { id: string };

    const { data: plan, error } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) return reply.code(404).send({ error: 'Plan not found' });

    const { data: days } = await supabase
      .from('workout_plan_days')
      .select('*')
      .eq('workout_plan_id', id)
      .order('day_number', { ascending: true });

    const daysWithExercises = await Promise.all(
      (days || []).map(async (day) => {
        const { data: exercises } = await supabase
          .from('workout_plan_exercises')
          .select('*')
          .eq('workout_plan_day_id', day.id)
          .order('order_number', { ascending: true });
        return { ...day, workout_plan_exercises: exercises || [] };
      })
    );

    return reply.send({ ...plan, workout_plan_days: daysWithExercises });
  });

  fastify.post('/', { preHandler: verifyAuth }, async (request, reply) => {
    const userId = (request as any).userId;
    const body = CreatePlanSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues });

    const { data: plan, error: planError } = await supabase
      .from('workout_plans')
      .insert({ user_id: userId, name: body.data.name, duration_weeks: body.data.duration_weeks ?? null })
      .select('id')
      .single();

    if (planError) return reply.code(500).send({ error: planError.message });

    for (const day of body.data.days) {
      const { data: dayData, error: dayError } = await supabase
        .from('workout_plan_days')
        .insert({ workout_plan_id: plan.id, day_number: day.day_number, day_name: day.day_name })
        .select('id')
        .single();

      if (dayError) return reply.code(500).send({ error: dayError.message });

      if (day.exercises.length > 0) {
        const { error: exError } = await supabase
          .from('workout_plan_exercises')
          .insert(day.exercises.map((ex) => ({ ...ex, workout_plan_day_id: dayData.id })));
        if (exError) return reply.code(500).send({ error: exError.message });
      }
    }

    return reply.code(201).send({ id: plan.id });
  });

  fastify.put('/:id', { preHandler: verifyAuth }, async (request, reply) => {
    const userId = (request as any).userId;
    const { id } = request.params as { id: string };
    const body = UpdatePlanSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues });

    const { error: planError } = await supabase
      .from('workout_plans')
      .update({ name: body.data.name, duration_weeks: body.data.duration_weeks })
      .eq('id', id)
      .eq('user_id', userId);

    if (planError) return reply.code(500).send({ error: planError.message });

    if (body.data.days) {
      const { data: existingDays } = await supabase
        .from('workout_plan_days')
        .select('id')
        .eq('workout_plan_id', id);

      const incomingDayIds = body.data.days.filter((d) => d.id).map((d) => d.id!);
      const toDelete = (existingDays || []).filter((d) => !incomingDayIds.includes(d.id));

      for (const d of toDelete) {
        await supabase.from('workout_plan_exercises').delete().eq('workout_plan_day_id', d.id);
        await supabase.from('workout_plan_days').delete().eq('id', d.id);
      }

      for (const day of body.data.days) {
        let dayId = day.id;
        if (dayId) {
          await supabase.from('workout_plan_days').update({ day_name: day.day_name }).eq('id', dayId);
        } else {
          const { data: newDay } = await supabase
            .from('workout_plan_days')
            .insert({ workout_plan_id: id, day_number: day.day_number, day_name: day.day_name })
            .select('id')
            .single();
          dayId = newDay?.id;
        }

        await supabase.from('workout_plan_exercises').delete().eq('workout_plan_day_id', dayId);
        if (day.exercises.length > 0) {
          await supabase.from('workout_plan_exercises').insert(
            day.exercises.map((ex) => ({ ...ex, workout_plan_day_id: dayId }))
          );
        }
      }
    }

    return reply.send({ success: true });
  });

  fastify.delete('/:id', { preHandler: verifyAuth }, async (request, reply) => {
    const userId = (request as any).userId;
    const { id } = request.params as { id: string };

    const { error } = await supabase
      .from('workout_plans')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) return reply.code(500).send({ error: error.message });
    return reply.send({ success: true });
  });
}
