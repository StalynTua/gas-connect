import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import type { CompositionRootDependencies } from './server.types.js';
import { createRoutingModule } from './modules/routing/index.js';
import { createFleetModule } from './modules/fleet/index.js';
import { createOrdersModule } from './modules/orders/index.js';
import { createDispatchModule } from './modules/dispatch/index.js';
import { createWhatsappModule } from './modules/whatsapp/index.js';

export function buildServer(overrides: CompositionRootDependencies = {}): FastifyInstance {
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

  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'];

  server.register(cors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(null, false);
      }
    },
  });

  server.register(helmet, {
    contentSecurityPolicy: false,
  });

  // Healthcheck endpoint
  server.get('/api/health', async () => ({
    status: 'ok',
    service: 'gasconnect-ibarra-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }));

  // ── Ensamblado de Módulos (Topología Limpia) ─────────────────────────────
  const routing = createRoutingModule({
    routingClient: overrides.routingClient,
  });

  const fleet = createFleetModule({
    fleetRepo: overrides.fleetRepo,
    fleetBroadcaster: overrides.fleetBroadcaster,
    getFleetStatusUseCase: overrides.getFleetStatusUseCase,
    getFleetMetricsUseCase: overrides.getFleetMetricsUseCase,
    getActivityEventsUseCase: overrides.getActivityEventsUseCase,
    updateTruckPositionUseCase: overrides.updateTruckPositionUseCase,
    updateTruckStatusUseCase: overrides.updateTruckStatusUseCase,
  });

  const orders = createOrdersModule({
    orderRepo: overrides.orderRepo,
    fleetRepo: fleet.fleetRepo,
    fleetBroadcaster: fleet.fleetBroadcaster,
    completeOrderUseCase: overrides.completeOrderUseCase,
  });

  const dispatch = createDispatchModule({
    routingClient: routing.routingClient,
    fleetRepo: fleet.fleetRepo,
    fleetBroadcaster: fleet.fleetBroadcaster,
    orderRepo: orders.orderRepo,
    dispatchSessionRepo: overrides.dispatchSessionRepo,
    truckCandidateRepo: overrides.truckCandidateRepo,
    startDispatchUseCase: overrides.startDispatchUseCase,
    handleDispatchDecisionUseCase: overrides.handleDispatchDecisionUseCase,
  });

  const whatsapp = createWhatsappModule({
    orderRepo: orders.orderRepo,
    startDispatchUseCase: dispatch.useCases.startDispatchUseCase,
    evolutionClient: overrides.evolutionClient,
    userSessionRepo: overrides.userSessionRepo,
    processInboundMessageUseCase: overrides.processInboundMessageUseCase,
    simulateOrderUseCase: overrides.simulateOrderUseCase,
  });

  // ── Registro de Rutas por Módulo ─────────────────────────────────────────
  fleet.registerRoutes(server);
  orders.registerRoutes(server);
  dispatch.registerRoutes(server);
  whatsapp.registerRoutes(server);

  return server;
}
