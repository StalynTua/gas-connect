import type { UserSession, DialogStep } from './domain/dialog-state.entity.js';
import type { InboundMessage, ConversationReply } from './application/process-inbound-message.use-case.js';
import { ProcessInboundMessageUseCase } from './application/process-inbound-message.use-case.js';
import { SimulateOrderUseCase, SimulateOrderParams, SimulatedOrderResult } from './application/simulate-order.use-case.js';
import { InMemoryUserSessionRepository } from './infrastructure/in-memory-user-session.repository.js';
import { evolutionHttpClient } from './infrastructure/evolution-http.client.js';
import { prismaOrderRepository } from '../orders/infrastructure/prisma-order.repository.js';
import { StartDispatchUseCase } from '../dispatch/application/start-dispatch.use-case.js';
import { inMemoryDispatchSessionRepository } from '../dispatch/infrastructure/in-memory-dispatch-session.repository.js';
import { truckFinderService } from '../dispatch/truck-finder.service.js';

export type { InboundMessage, ConversationReply, UserSession, DialogStep };

export class ConversationService {
  private readonly sessionRepo: InMemoryUserSessionRepository;
  private readonly processUseCase: ProcessInboundMessageUseCase;
  private readonly simulateUseCase: SimulateOrderUseCase;

  constructor() {
    this.sessionRepo = new InMemoryUserSessionRepository();
    const startDispatchUseCase = new StartDispatchUseCase(
      truckFinderService,
      inMemoryDispatchSessionRepository,
      45
    );
    this.processUseCase = new ProcessInboundMessageUseCase(
      this.sessionRepo,
      evolutionHttpClient,
      prismaOrderRepository,
      startDispatchUseCase
    );
    this.simulateUseCase = new SimulateOrderUseCase(
      prismaOrderRepository,
      startDispatchUseCase
    );
  }

  getSession(phoneNumber: string): UserSession {
    return this.sessionRepo.getSession(phoneNumber);
  }

  resetSession(phoneNumber: string): void {
    this.sessionRepo.resetSession(phoneNumber);
  }

  async processInboundMessage(message: InboundMessage): Promise<ConversationReply> {
    return this.processUseCase.execute(message);
  }

  async createSimulatedOrder(params?: SimulateOrderParams): Promise<SimulatedOrderResult> {
    return this.simulateUseCase.execute(params);
  }
}

export const conversationService = new ConversationService();
