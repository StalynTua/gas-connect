import type { FastifyInstance } from 'fastify';
import type { IFleetRepository } from './domain/fleet.repository.js';
import type { IFleetBroadcaster } from './domain/fleet-broadcaster.port.js';
import { prismaFleetRepository, PrismaFleetRepository } from './infrastructure/prisma-fleet.repository.js';
import { centrifugoFleetBroadcaster, CentrifugoFleetBroadcaster } from './infrastructure/centrifugo-fleet.broadcaster.js';
import { GetFleetStatusUseCase } from './application/get-fleet-status.use-case.js';
import { GetFleetMetricsUseCase } from './application/get-fleet-metrics.use-case.js';
import { GetActivityEventsUseCase } from './application/get-activity-events.use-case.js';
import { UpdateTruckPositionUseCase } from './application/update-truck-position.use-case.js';
import { UpdateTruckStatusUseCase } from './application/update-truck-status.use-case.js';
import { registerFleetRoutes, FleetRouteDeps } from './presentation/fleet.controller.js';

export type { IFleetRepository, IFleetBroadcaster, FleetRouteDeps };
export * from './domain/fleet-truck.entity.js';
export * from './domain/fleet-metrics.entity.js';
export {
  GetFleetStatusUseCase,
  GetFleetMetricsUseCase,
  GetActivityEventsUseCase,
  UpdateTruckPositionUseCase,
  UpdateTruckStatusUseCase,
  PrismaFleetRepository,
  prismaFleetRepository,
  CentrifugoFleetBroadcaster,
  centrifugoFleetBroadcaster,
  registerFleetRoutes,
};

export interface FleetModuleDeps {
  fleetRepo?: IFleetRepository;
  fleetBroadcaster?: IFleetBroadcaster;
  getFleetStatusUseCase?: GetFleetStatusUseCase;
  getFleetMetricsUseCase?: GetFleetMetricsUseCase;
  getActivityEventsUseCase?: GetActivityEventsUseCase;
  updateTruckPositionUseCase?: UpdateTruckPositionUseCase;
  updateTruckStatusUseCase?: UpdateTruckStatusUseCase;
}

export function createFleetModule(deps: FleetModuleDeps = {}) {
  const fleetRepo = deps.fleetRepo ?? prismaFleetRepository;
  const fleetBroadcaster = deps.fleetBroadcaster ?? centrifugoFleetBroadcaster;
  const getFleetStatusUseCase = deps.getFleetStatusUseCase ?? new GetFleetStatusUseCase(fleetRepo);
  const getFleetMetricsUseCase = deps.getFleetMetricsUseCase ?? new GetFleetMetricsUseCase(fleetRepo);
  const getActivityEventsUseCase = deps.getActivityEventsUseCase ?? new GetActivityEventsUseCase(fleetRepo);
  const updateTruckPositionUseCase =
    deps.updateTruckPositionUseCase ?? new UpdateTruckPositionUseCase(fleetRepo, fleetBroadcaster);
  const updateTruckStatusUseCase =
    deps.updateTruckStatusUseCase ?? new UpdateTruckStatusUseCase(fleetRepo, fleetBroadcaster);

  return {
    fleetRepo,
    fleetBroadcaster,
    useCases: {
      getFleetStatusUseCase,
      getFleetMetricsUseCase,
      getActivityEventsUseCase,
      updateTruckPositionUseCase,
      updateTruckStatusUseCase,
    },
    registerRoutes(server: FastifyInstance) {
      registerFleetRoutes(server, {
        getFleetStatusUseCase,
        getFleetMetricsUseCase,
        getActivityEventsUseCase,
        updateTruckPositionUseCase,
        updateTruckStatusUseCase,
      });
    },
  };
}
