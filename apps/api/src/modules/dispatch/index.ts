import type { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import type { IRoutingPort } from '../routing/domain/routing.port.js';
import { OsrmHttpClient } from '../routing/infrastructure/osrm-http.client.js';
import type { IFleetRepository } from '../fleet/domain/fleet.repository.js';
import type { IFleetBroadcaster } from '../fleet/domain/fleet-broadcaster.port.js';
import { prismaFleetRepository } from '../fleet/infrastructure/prisma-fleet.repository.js';
import type { IOrderRepository } from '../orders/domain/order.repository.js';
import { prismaOrderRepository } from '../orders/infrastructure/prisma-order.repository.js';
import type { ITruckCandidateRepository } from './domain/truck-candidate.repository.js';
import type { IDispatchSessionRepository } from './domain/dispatch-session.repository.js';
import { PrismaTruckCandidateRepository } from './infrastructure/prisma-truck-candidate.repository.js';
import {
  inMemoryDispatchSessionRepository,
  InMemoryDispatchSessionRepository,
} from './infrastructure/in-memory-dispatch-session.repository.js';
import { StartDispatchUseCase } from './application/start-dispatch.use-case.js';
import { HandleDispatchDecisionUseCase } from './application/handle-dispatch-decision.use-case.js';
import { registerDispatchRoutes, DispatchRoutesDependencies } from './presentation/dispatch.controller.js';

export type { ITruckCandidateRepository, IDispatchSessionRepository, DispatchRoutesDependencies };
export {
  StartDispatchUseCase,
  HandleDispatchDecisionUseCase,
  PrismaTruckCandidateRepository,
  InMemoryDispatchSessionRepository,
  inMemoryDispatchSessionRepository,
  registerDispatchRoutes,
};

export interface DispatchModuleDeps {
  routingClient?: IRoutingPort;
  fleetRepo?: IFleetRepository;
  fleetBroadcaster?: IFleetBroadcaster;
  orderRepo?: IOrderRepository;
  truckCandidateRepo?: ITruckCandidateRepository;
  dispatchSessionRepo?: IDispatchSessionRepository;
  startDispatchUseCase?: StartDispatchUseCase;
  handleDispatchDecisionUseCase?: HandleDispatchDecisionUseCase;
  dispatchTimeoutSeconds?: number;
}

export function createDispatchModule(deps: DispatchModuleDeps = {}) {
  const routingClient = deps.routingClient ?? new OsrmHttpClient(process.env.OSRM_URL || 'http://localhost:5001');
  const fleetRepo = deps.fleetRepo ?? prismaFleetRepository;
  const orderRepo = deps.orderRepo ?? prismaOrderRepository;
  const dispatchSessionRepo = deps.dispatchSessionRepo ?? inMemoryDispatchSessionRepository;
  const truckCandidateRepo = deps.truckCandidateRepo ?? new PrismaTruckCandidateRepository(prisma, routingClient);

  const startDispatchUseCase =
    deps.startDispatchUseCase ??
    new StartDispatchUseCase(
      truckCandidateRepo,
      dispatchSessionRepo,
      deps.dispatchTimeoutSeconds ?? 45,
      deps.fleetBroadcaster
    );

  const handleDispatchDecisionUseCase =
    deps.handleDispatchDecisionUseCase ??
    new HandleDispatchDecisionUseCase(dispatchSessionRepo, orderRepo, fleetRepo, deps.fleetBroadcaster);

  return {
    truckCandidateRepo,
    dispatchSessionRepo,
    useCases: {
      startDispatchUseCase,
      handleDispatchDecisionUseCase,
    },
    registerRoutes(server: FastifyInstance) {
      registerDispatchRoutes(server, { handleDispatchDecisionUseCase });
    },
  };
}
