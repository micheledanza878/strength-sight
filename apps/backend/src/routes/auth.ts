import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../supabase.js';
import { verifyAuth } from '../middleware/auth.js';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/login', async (request, reply) => {
    const body = LoginSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'Invalid input' });

    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.data.email,
      password: body.data.password,
    });

    if (error) return reply.code(401).send({ error: error.message });

    return reply.send({
      accessToken: data.session.access_token,
      user: { id: data.user.id, email: data.user.email },
    });
  });

  fastify.post('/register', async (request, reply) => {
    const body = RegisterSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'Invalid input' });

    const { data, error } = await supabase.auth.signUp({
      email: body.data.email,
      password: body.data.password,
    });

    if (error) return reply.code(400).send({ error: error.message });

    return reply.code(201).send({
      user: { id: data.user?.id, email: data.user?.email },
      message: 'Registration successful',
    });
  });

  fastify.post('/logout', { preHandler: verifyAuth }, async (_request, reply) => {
    return reply.send({ success: true });
  });

  fastify.get('/me', { preHandler: verifyAuth }, async (request, reply) => {
    const userId = (request as any).userId;
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error) return reply.code(404).send({ error: 'User not found' });
    return reply.send({ id: data.user.id, email: data.user.email });
  });
}
