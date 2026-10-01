import type { FastifyInstance } from 'fastify';
import { registerFleetRoutes } from './presentation/fleet.controller.js';
import { GetFleetStatusUseCase } from './application/get-fleet-status.use-case.js';
import { GetFleetMetricsUseCase } from './application/get-fleet-metrics.use-case.js';
import { GetActivityEventsUseCase } from './application/get-activity-events.use-case.js';
import { UpdateTruckPositionUseCase } from './application/update-truck-position.use-case.js';
import { UpdateTruckStatusUseCase } from './application/update-truck-status.use-case.js';
import { prismaFleetRepository } from './infrastructure/prisma-fleet.repository.js';

export * from './presentation/fleet.controller.js';

export async function fleetRoutes(server: FastifyInstance) {
  registerFleetRoutes(server, {
    getFleetStatusUseCase: new GetFleetStatusUseCase(prismaFleetRepository),
    getFleetMetricsUseCase: new GetFleetMetricsUseCase(prismaFleetRepository),
    getActivityEventsUseCase: new GetActivityEventsUseCase(prismaFleetRepository),
    updateTruckPositionUseCase: new UpdateTruckPositionUseCase(prismaFleetRepository),
    updateTruckStatusUseCase: new UpdateTruckStatusUseCase(prismaFleetRepository),
  });
}
