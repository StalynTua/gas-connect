import type { FastifyInstance } from 'fastify';
import type { IEvolutionInstancePort } from './domain/evolution-instance.port.js';
import type { IMessageSender } from './domain/message-sender.port.js';
import type { IUserSessionRepository } from './domain/user-session.repository.js';
import type { IOrderRepository } from '../orders/domain/order.repository.js';
import { prismaOrderRepository } from '../orders/infrastructure/prisma-order.repository.js';
import type { StartDispatchUseCase } from '../dispatch/application/start-dispatch.use-case.js';
import {
  EvolutionHttpClient,
  evolutionHttpClient,
} from './infrastructure/evolution-http.client.js';
import {
  InMemoryUserSessionRepository,
  inMemoryUserSessionRepository,
} from './infrastructure/in-memory-user-session.repository.js';
import { ProcessInboundMessageUseCase } from './application/process-inbound-message.use-case.js';
import { SimulateOrderUseCase } from './application/simulate-order.use-case.js';
import { registerWhatsappRoutes, WhatsappRouteDeps } from './presentation/webhook.controller.js';

export type { IEvolutionInstancePort, IMessageSender, IUserSessionRepository, WhatsappRouteDeps };
export {
  EvolutionHttpClient,
  evolutionHttpClient,
  InMemoryUserSessionRepository,
  inMemoryUserSessionRepository,
  ProcessInboundMessageUseCase,
  SimulateOrderUseCase,
  registerWhatsappRoutes,
};

export interface WhatsappModuleDeps {
  evolutionClient?: IEvolutionInstancePort & IMessageSender;
  userSessionRepo?: IUserSessionRepository;
  orderRepo?: IOrderRepository;
  startDispatchUseCase: StartDispatchUseCase;
  processInboundMessageUseCase?: ProcessInboundMessageUseCase;
  simulateOrderUseCase?: SimulateOrderUseCase;
}

export function createWhatsappModule(deps: WhatsappModuleDeps) {
  const evolutionClient = deps.evolutionClient ?? evolutionHttpClient;
  const userSessionRepo = deps.userSessionRepo ?? inMemoryUserSessionRepository;
  const orderRepo = deps.orderRepo ?? prismaOrderRepository;

  const processInboundMessageUseCase =
    deps.processInboundMessageUseCase ??
    new ProcessInboundMessageUseCase(
      userSessionRepo,
      evolutionClient,
      orderRepo,
      deps.startDispatchUseCase
    );

  const simulateOrderUseCase =
    deps.simulateOrderUseCase ??
    new SimulateOrderUseCase(orderRepo, deps.startDispatchUseCase);

  return {
    evolutionClient,
    userSessionRepo,
    useCases: {
      processInboundMessageUseCase,
      simulateOrderUseCase,
    },
    registerRoutes(server: FastifyInstance) {
      registerWhatsappRoutes(server, {
        evolutionClient,
        processInboundMessageUseCase,
        simulateOrderUseCase,
      });
    },
  };
}
