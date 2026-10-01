import type { Coordinates } from '../../shared/coordinates.types.js';
import type { CandidateTruck } from './domain/candidate-truck.entity.js';
import type { DispatchSession, DispatchSessionStatus } from './domain/dispatch-session.entity.js';
import { truckFinderService } from './truck-finder.service.js';
import {
  InMemoryDispatchSessionRepository,
  inMemoryDispatchSessionRepository,
} from './infrastructure/in-memory-dispatch-session.repository.js';
import { StartDispatchUseCase } from './application/start-dispatch.use-case.js';
import { HandleDispatchDecisionUseCase } from './application/handle-dispatch-decision.use-case.js';
import type { IDispatchSessionRepository } from './domain/dispatch-session.repository.js';
import type { ITruckCandidateRepository } from './domain/truck-candidate.repository.js';

export type { DispatchSession, DispatchSessionStatus };

export class DispatchOrchestratorService {
  private readonly sessionRepo: IDispatchSessionRepository;
  private readonly startDispatchUseCase: StartDispatchUseCase;
  private readonly handleDispatchDecisionUseCase: HandleDispatchDecisionUseCase;

  constructor(
    timeoutSeconds = 45,
    sessionRepo: IDispatchSessionRepository = inMemoryDispatchSessionRepository,
    candidateRepo: ITruckCandidateRepository = truckFinderService
  ) {
    this.sessionRepo = sessionRepo;
    this.startDispatchUseCase = new StartDispatchUseCase(candidateRepo, this.sessionRepo, timeoutSeconds);
    this.handleDispatchDecisionUseCase = new HandleDispatchDecisionUseCase(this.sessionRepo);
  }

  async startDispatch(params: {
    orderId: string;
    quantityRequested: number;
    deliveryLocation: Coordinates;
    addressLandmark?: string;
    mockCandidates?: CandidateTruck[];
  }): Promise<DispatchSession> {
    return this.startDispatchUseCase.execute(params);
  }

  offerToCandidate(session: DispatchSession, candidateIndex: number): void {
    this.startDispatchUseCase.offerToCandidate(session, candidateIndex);
  }

  handleDecision(
    orderId: string,
    truckId: string,
    decision: 'ACCEPTED' | 'REJECTED'
  ): { success: boolean; sessionStatus: DispatchSessionStatus; assignedTruck?: CandidateTruck } {
    const session = this.sessionRepo.get(orderId);
    if (!session || session.status !== 'OFFERED') {
      return { success: false, sessionStatus: session?.status || 'EXPIRED' };
    }

    const currentCandidate = session.candidates[session.currentCandidateIndex];
    if (currentCandidate.id !== truckId) {
      return { success: false, sessionStatus: session.status };
    }

    if (session.activeTimeoutHandle) {
      clearTimeout(session.activeTimeoutHandle);
      session.activeTimeoutHandle = undefined;
    }

    if (decision === 'ACCEPTED') {
      session.status = 'ASSIGNED';
      session.assignedTruck = currentCandidate;
      return { success: true, sessionStatus: 'ASSIGNED', assignedTruck: currentCandidate };
    } else {
      this.cascadeToNext(session);
      return { success: true, sessionStatus: session.status };
    }
  }

  handleTimeout(orderId: string, attemptId: string): void {
    const session = this.sessionRepo.get(orderId);
    if (!session || session.status !== 'OFFERED') return;
    if (session.currentAttemptId !== attemptId) return;

    this.cascadeToNext(session);
  }

  private cascadeToNext(session: DispatchSession): void {
    this.startDispatchUseCase.cascadeToNext(session);
  }

  getSession(orderId: string): DispatchSession | undefined {
    return this.sessionRepo.get(orderId);
  }

  cleanupSession(orderId: string): void {
    this.sessionRepo.delete(orderId);
  }
}

export const dispatchOrchestrator = new DispatchOrchestratorService(
  45,
  inMemoryDispatchSessionRepository,
  truckFinderService
);
