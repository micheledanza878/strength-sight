import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../supabase.js';
import { verifyAuth } from '../middleware/auth.js';

const CreateSessionSchema = z.object({
  workout_day: z.string().min(1),
  workout_plan_day_id: z.string().uuid().nullable().optional(),
});

export default async function workoutSessionRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: verifyAuth }, async (request, reply) => {
    const userId = (request as any).userId;
    const { includeSets, planId } = request.query as { includeSets?: string; planId?: string };

    const select = includeSets === 'true'
      ? 'id, workout_day, started_at, completed_at, set_logs(exercise_name, set_number, reps, weight)'
      : 'id, workout_day, started_at, completed_at';

    let query = supabase
      .from('workout_logs')
      .select(select)
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('started_at', { ascending: false });

    const { data, error } = await query;
    if (error) return reply.code(500).send({ error: error.message });
    return reply.send(data);
  });

  fastify.post('/', { preHandler: verifyAuth }, async (request, reply) => {
    const userId = (request as any).userId;
    const body = CreateSessionSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues });

    const { data, error } = await supabase
      .from('workout_logs')
      .insert({ user_id: userId, workout_day: body.data.workout_day, workout_plan_day_id: body.data.workout_plan_day_id ?? null })
      .select('id')
      .single();

    if (error) return reply.code(500).send({ error: error.message });
    return reply.code(201).send({ id: data.id });
  });

  fastify.patch('/:id/complete', { preHandler: verifyAuth }, async (request, reply) => {
    const userId = (request as any).userId;
    const { id } = request.params as { id: string };

    const { error } = await supabase
      .from('workout_logs')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) return reply.code(500).send({ error: error.message });
    return reply.send({ success: true });
  });

  fastify.get('/in-progress', { preHandler: verifyAuth }, async (request, reply) => {
    const userId = (request as any).userId;
    const { workoutDay } = request.query as { workoutDay: string };

    const { data, error } = await supabase
      .from('workout_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('workout_day', workoutDay)
      .is('completed_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return reply.code(500).send({ error: error.message });
    return reply.send(data);
  });

  fastify.get('/last', { preHandler: verifyAuth }, async (request, reply) => {
    const userId = (request as any).userId;
    const { workoutDay } = request.query as { workoutDay: string };

    const { data, error } = await supabase
      .from('workout_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('workout_day', workoutDay)
      .not('completed_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return reply.code(500).send({ error: error.message });
    return reply.send(data);
  });
}
