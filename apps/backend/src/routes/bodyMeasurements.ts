import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../supabase.js';
import { verifyAuth } from '../middleware/auth.js';

const MeasurementSchema = z.object({
  measured_at: z.string().optional(),
  weight: z.number().nullable().optional(),
  height_cm: z.number().nullable().optional(),
  collo_cm: z.number().nullable().optional(),
  braccio_front_cm: z.number().nullable().optional(),
  avambraccio_cm: z.number().nullable().optional(),
  petto_torace_cm: z.number().nullable().optional(),
  vita_cm: z.number().nullable().optional(),
  fianchi_cm: z.number().nullable().optional(),
  schiena_altezza_dorsali_cm: z.number().nullable().optional(),
  spalle_ampiezza_cm: z.number().nullable().optional(),
  glutei_circonferenza_cm: z.number().nullable().optional(),
  coscia_cm: z.number().nullable().optional(),
  polpaccio_cm: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export default async function bodyMeasurementRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: verifyAuth }, async (request, reply) => {
    const userId = (request as any).userId;
    const { limit } = request.query as { limit?: string };

    let query = supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', userId)
      .order('measured_at', { ascending: true });

    if (limit) query = query.limit(Number(limit));

    const { data, error } = await query;
    if (error) return reply.code(500).send({ error: error.message });
    return reply.send(data);
  });

  fastify.post('/', { preHandler: verifyAuth }, async (request, reply) => {
    const userId = (request as any).userId;
    const body = MeasurementSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues });

    const { error } = await supabase.from('body_measurements').insert({
      ...body.data,
      user_id: userId,
      measured_at: body.data.measured_at || new Date().toISOString(),
    });

    if (error) return reply.code(500).send({ error: error.message });
    return reply.code(201).send({ success: true });
  });
}
