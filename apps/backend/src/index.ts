import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import workoutPlanRoutes from './routes/workoutPlans.js';
import workoutDayRoutes from './routes/workoutDays.js';
import workoutSessionRoutes from './routes/workoutSessions.js';
import setLogRoutes from './routes/setLogs.js';
import bodyMeasurementRoutes from './routes/bodyMeasurements.js';
import dietRoutes from './routes/diet.js';
import foodRoutes from './routes/foods.js';
import dashboardRoutes from './routes/dashboard.js';

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: config.frontendUrl,
  credentials: true,
});

app.register(authRoutes, { prefix: '/api/auth' });
app.register(workoutPlanRoutes, { prefix: '/api/workout-plans' });
app.register(workoutDayRoutes, { prefix: '/api/workout-days' });
app.register(workoutSessionRoutes, { prefix: '/api/workout-sessions' });
app.register(setLogRoutes, { prefix: '/api/set-logs' });
app.register(bodyMeasurementRoutes, { prefix: '/api/body-measurements' });
app.register(dietRoutes, { prefix: '/api/diet' });
app.register(foodRoutes, { prefix: '/api' });
app.register(dashboardRoutes, { prefix: '/api/dashboard' });

app.get('/health', async () => ({ status: 'ok' }));

app.listen({ port: config.port, host: '0.0.0.0' }, (err) => {
  if (err) { app.log.error(err); process.exit(1); }
});
