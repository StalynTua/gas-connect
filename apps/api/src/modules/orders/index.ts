import type { FastifyInstance } from 'fastify';
import type { IOrderRepository } from './domain/order.repository.js';
import type { IFleetRepository } from '../fleet/domain/fleet.repository.js';
import type { IFleetBroadcaster } from '../fleet/domain/fleet-broadcaster.port.js';
import { prismaFleetRepository } from '../fleet/infrastructure/prisma-fleet.repository.js';
import { PrismaOrderRepository, prismaOrderRepository } from './infrastructure/prisma-order.repository.js';
import { CompleteOrderUseCase } from './application/complete-order.use-case.js';
import { registerOrdersRoutes, OrdersRoutesDependencies } from './presentation/orders.controller.js';

export type { IOrderRepository, OrdersRoutesDependencies };
export * from './domain/order.entity.js';
export {
  CompleteOrderUseCase,
  PrismaOrderRepository,
  prismaOrderRepository,
  registerOrdersRoutes,
};

export interface OrdersModuleDeps {
  orderRepo?: IOrderRepository;
  fleetRepo?: IFleetRepository;
  fleetBroadcaster?: IFleetBroadcaster;
  completeOrderUseCase?: CompleteOrderUseCase;
}

export function createOrdersModule(deps: OrdersModuleDeps = {}) {
  const orderRepo = deps.orderRepo ?? prismaOrderRepository;
  const fleetRepo = deps.fleetRepo ?? prismaFleetRepository;
  const completeOrderUseCase =
    deps.completeOrderUseCase ?? new CompleteOrderUseCase(orderRepo, fleetRepo, deps.fleetBroadcaster);

  return {
    orderRepo,
    useCases: { completeOrderUseCase },
    registerRoutes(server: FastifyInstance) {
      registerOrdersRoutes(server, { completeOrderUseCase });
    },
  };
}
