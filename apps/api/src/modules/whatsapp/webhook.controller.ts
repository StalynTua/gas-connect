import type { FastifyInstance } from 'fastify';
import { registerWhatsappRoutes } from './presentation/webhook.controller.js';
import { evolutionHttpClient } from './infrastructure/evolution-http.client.js';
import { inMemoryUserSessionRepository } from './infrastructure/in-memory-user-session.repository.js';
import { ProcessInboundMessageUseCase } from './application/process-inbound-message.use-case.js';
import { SimulateOrderUseCase } from './application/simulate-order.use-case.js';
import { prismaOrderRepository } from '../orders/infrastructure/prisma-order.repository.js';
import { StartDispatchUseCase } from '../dispatch/application/start-dispatch.use-case.js';
import { inMemoryDispatchSessionRepository } from '../dispatch/infrastructure/in-memory-dispatch-session.repository.js';
import { truckFinderService } from '../dispatch/truck-finder.service.js';

export * from './presentation/webhook.controller.js';

export async function whatsappRoutes(server: FastifyInstance) {
  const startDispatchUseCase = new StartDispatchUseCase(
    truckFinderService,
    inMemoryDispatchSessionRepository,
    45
  );

  const processInboundMessageUseCase = new ProcessInboundMessageUseCase(
    inMemoryUserSessionRepository,
    evolutionHttpClient,
    prismaOrderRepository,
    startDispatchUseCase
  );

  const simulateOrderUseCase = new SimulateOrderUseCase(
    prismaOrderRepository,
    startDispatchUseCase
  );

  registerWhatsappRoutes(server, {
    evolutionClient: evolutionHttpClient,
    processInboundMessageUseCase,
    simulateOrderUseCase,
  });
}
