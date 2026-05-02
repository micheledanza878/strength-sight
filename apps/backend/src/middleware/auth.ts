import type { FastifyRequest, FastifyReply } from 'fastify';
import { jwtVerify } from 'jose';
import { config } from '../config.js';

export async function verifyAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Unauthorized' });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(config.jwtSecret));
    (request as any).userId = payload.sub as string;
  } catch {
    reply.code(401).send({ error: 'Invalid or expired token' });
    return;
  }
}
