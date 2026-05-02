import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../supabase.js';
import { verifyAuth } from '../middleware/auth.js';

const SetLogSchema = z.object({
  workout_log_id: z.string().uuid(),
  exercise_name: z.string().min(1),
  set_number: z.number().int().positive(),
  reps: z.number().int().nonnegative(),
  weight: z.number().nonnegative(),
});

export default async function setLogRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: verifyAuth }, async (request, reply) => {
    const userId = (request as any).userId;
    const { workoutLogId } = request.query as { workoutLogId?: string };

    let query = supabase
      .from('set_logs')
      .select('exercise_name, set_number, reps, weight')
      .eq('user_id', userId)
      .order('set_number', { ascending: true });

    if (workoutLogId) query = query.eq('workout_log_id', workoutLogId);

    const { data, error } = await query;
    if (error) return reply.code(500).send({ error: error.message });
    return reply.send(data);
  });

  fastify.post('/', { preHandler: verifyAuth }, async (request, reply) => {
    const userId = (request as any).userId;
    const body = z.array(SetLogSchema).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues });

    const records = body.data.map((s) => ({ ...s, user_id: userId }));
    const { error } = await supabase.from('set_logs').insert(records);
    if (error) return reply.code(500).send({ error: error.message });
    return reply.code(201).send({ success: true });
  });
}
