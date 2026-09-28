import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import dotenv from 'dotenv';
import { ordersRoutes } from './modules/orders/orders.controller.js';
import { whatsappRoutes } from './modules/whatsapp/webhook.controller.js';
import { fleetRoutes } from './modules/fleet/fleet.controller.js';
import { evolutionClient } from './modules/whatsapp/evolution.client.js';

dotenv.config();

export function buildServer(): FastifyInstance {
  const server = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
      transport:
        process.env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
  });

  server.register(cors, {
    origin: '*',
  });

  server.register(helmet, {
    contentSecurityPolicy: false,
  });

  // Healthcheck endpoint
  server.get('/api/health', async () => {
    return {
      status: 'ok',
      service: 'gasconnect-ibarra-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  // Rutas de pedidos, decisiones de cabina y telemetría
  server.register(ordersRoutes);

  // Rutas de webhook de WhatsApp (Evolution API)
  server.register(whatsappRoutes);

  // Rutas de monitoreo de flota (Ops Portal)
  server.register(fleetRoutes);

  return server;
}

async function start() {
  const server = buildServer();
  const port = Number(process.env.PORT) || 8000;
  const host = process.env.HOST || '0.0.0.0';

  try {
    await server.listen({ port, host });
    console.log(`🚀 GasConnect Ibarra API corriendo en http://${host}:${port}`);

    // Auto-configurar Evolution API en segundo plano
    evolutionClient
      .ensureConfigured()
      .then((status) => {
        console.log(
          `📱 Evolution API WhatsApp configurado. Instancia: "${status.instanceName}", Estado: "${status.state}"`
        );
      })
      .catch((err) => {
        console.warn(`⚠️ No se pudo auto-configurar Evolution API en el arranque:`, err.message);
      });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Start only if executed directly
if (process.env.NODE_ENV !== 'test') {
  start();
}

