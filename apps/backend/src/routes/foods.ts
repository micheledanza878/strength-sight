import type { FastifyInstance } from 'fastify';
import { supabase } from '../supabase.js';
import { verifyAuth } from '../middleware/auth.js';

export default async function foodRoutes(fastify: FastifyInstance) {
  fastify.get('/foods', { preHandler: verifyAuth }, async (request, reply) => {
    const { categoryId } = request.query as { categoryId?: string };

    let query = supabase.from('foods').select('*').order('name', { ascending: true });
    if (categoryId) query = query.eq('category_id', categoryId);

    const { data, error } = await query;
    if (error) return reply.code(500).send({ error: error.message });
    return reply.send(data);
  });

  fastify.get('/food-categories', { preHandler: verifyAuth }, async (_request, reply) => {
    const { data, error } = await supabase
      .from('food_categories')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) return reply.code(500).send({ error: error.message });
    return reply.send(data);
  });

  fastify.get('/body-parts', { preHandler: verifyAuth }, async (_request, reply) => {
    const { data, error } = await supabase
      .from('body_parts')
      .select('id, slug, name, icon')
      .order('name', { ascending: true });

    if (error) return reply.code(500).send({ error: error.message });
    return reply.send(data);
  });
}
