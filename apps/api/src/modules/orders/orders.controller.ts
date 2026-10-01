import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  FlexibleTelemetryPingRequestSchema,
  TelemetryResponse,
  validateContract,
} from '@gasconnect/contracts';
import { registerOrdersRoutes } from './presentation/orders.controller.js';
import { CompleteOrderUseCase } from './application/complete-order.use-case.js';
import { prismaOrderRepository } from './infrastructure/prisma-order.repository.js';
import { prismaFleetRepository } from '../fleet/infrastructure/prisma-fleet.repository.js';
import { registerDispatchRoutes } from '../dispatch/presentation/dispatch.controller.js';
import { HandleDispatchDecisionUseCase } from '../dispatch/application/handle-dispatch-decision.use-case.js';
import { inMemoryDispatchSessionRepository } from '../dispatch/infrastructure/in-memory-dispatch-session.repository.js';
import { UpdateTruckPositionUseCase } from '../fleet/application/update-truck-position.use-case.js';

export * from './presentation/orders.controller.js';

/**
 * Backward-compatible router for legacy server registrations
 */
export async function ordersRoutes(server: FastifyInstance) {
  const completeOrderUseCase = new CompleteOrderUseCase(prismaOrderRepository, prismaFleetRepository);
  registerOrdersRoutes(server, { completeOrderUseCase });

  const handleDispatchDecisionUseCase = new HandleDispatchDecisionUseCase(
    inMemoryDispatchSessionRepository,
    prismaOrderRepository,
    prismaFleetRepository
  );
  registerDispatchRoutes(server, { handleDispatchDecisionUseCase });

  const updateTruckPositionUseCase = new UpdateTruckPositionUseCase(prismaFleetRepository);
  server.post('/api/v1/trucks/telemetry', async (request: FastifyRequest, reply: FastifyReply): Promise<TelemetryResponse> => {
    const validation = validateContract(FlexibleTelemetryPingRequestSchema, request.body);
    if (!validation.success) {
      return reply.status(400).send({ error: 'Invalid telemetry payload', fieldErrors: validation.fieldErrors });
    }
    const data = validation.data as { truckId: string; latitude: number; longitude: number; currentStock: number };
    const { truckId, latitude, longitude, currentStock } = data;
    await updateTruckPositionUseCase.execute({ truckId, latitude, longitude, currentStock });
    return reply.status(200).send({ status: 'ok', truckId, receivedAt: new Date().toISOString() });
  });
}
