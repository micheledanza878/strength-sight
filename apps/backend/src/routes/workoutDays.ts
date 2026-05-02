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
  primary_body_part_id: z.string().nullable().optional(),
});

const UpdateDaySchema = z.object({
  day_name: z.string().min(1).optional(),
  exercises: z.array(ExerciseSchema).optional(),
});

export default async function workoutDayRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: verifyAuth }, async (request, reply) => {
    const { planId } = request.query as { planId?: string };

    let query = supabase.from('workout_plan_days').select('*').order('day_number', { ascending: true });
    if (planId) query = query.eq('workout_plan_id', planId);

    const { data, error } = await query;
    if (error) return reply.code(500).send({ error: error.message });
    return reply.send(data);
  });

  fastify.get('/:id', { preHandler: verifyAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const { data: day, error } = await supabase
      .from('workout_plan_days')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return reply.code(404).send({ error: 'Day not found' });

    const { data: exercises } = await supabase
      .from('workout_plan_exercises')
      .select('*')
      .eq('workout_plan_day_id', id)
      .order('order_number', { ascending: true });

    return reply.send({ ...day, workout_plan_exercises: exercises || [] });
  });

  fastify.put('/:id', { preHandler: verifyAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = UpdateDaySchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues });

    if (body.data.day_name) {
      await supabase.from('workout_plan_days').update({ day_name: body.data.day_name }).eq('id', id);
    }

    if (body.data.exercises) {
      await supabase.from('workout_plan_exercises').delete().eq('workout_plan_day_id', id);
      if (body.data.exercises.length > 0) {
        const { error } = await supabase.from('workout_plan_exercises').insert(
          body.data.exercises.map((ex) => ({ ...ex, workout_plan_day_id: id }))
        );
        if (error) return reply.code(500).send({ error: error.message });
      }
    }

    return reply.send({ success: true });
  });
}
