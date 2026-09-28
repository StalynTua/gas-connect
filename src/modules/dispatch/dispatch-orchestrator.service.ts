import { CandidateTruck, truckFinderService } from './truck-finder.service.js';
import { Coordinates } from '../routing/osrm.service.js';

export type DispatchSessionStatus =
  | 'SEARCHING'
  | 'OFFERED'
  | 'ASSIGNED'
  | 'EXPIRED'
  | 'REJECTED'
  | 'OFFERING_PARTIAL'
  | 'NO_TRUCKS_AVAILABLE';

export interface DispatchSession {
  orderId: string;
  quantityRequested: number;
  deliveryLocation: Coordinates;
  addressLandmark?: string;
  candidates: CandidateTruck[];
  currentCandidateIndex: number;
  status: DispatchSessionStatus;
  currentAttemptId?: string;
  activeTimeoutHandle?: NodeJS.Timeout;
  emergencySplitDetails?: {
    immediateTruckId: string;
    immediateStock: number;
    immediateEtaMinutes: number;
    fullTruckEtaMinutes: number;
  };
  assignedTruck?: CandidateTruck;
  createdAt: Date;
}

export class DispatchOrchestratorService {
  private activeSessions = new Map<string, DispatchSession>();
  private timeoutSeconds = 45;

  constructor(timeoutSeconds = 45) {
    this.timeoutSeconds = timeoutSeconds;
  }

  /**
   * Inicia el proceso de orquestación de despacho oportuno para un pedido
   */
  async startDispatch(params: {
    orderId: string;
    quantityRequested: number;
    deliveryLocation: Coordinates;
    addressLandmark?: string;
    mockCandidates?: CandidateTruck[]; // Permite inyectar candidatos para tests
  }): Promise<DispatchSession> {
    const { orderId, quantityRequested, deliveryLocation, addressLandmark, mockCandidates } = params;

    const candidates = mockCandidates || (await truckFinderService.findCandidates(deliveryLocation, {
      quantityRequested,
      maxRadiusMeters: 1500,
    }));

    const session: DispatchSession = {
      orderId,
      quantityRequested,
      deliveryLocation,
      addressLandmark,
      candidates,
      currentCandidateIndex: 0,
      status: 'SEARCHING',
      createdAt: new Date(),
    };

    this.activeSessions.set(orderId, session);

    // Caso A: No hay ningún camión en el radio
    if (candidates.length === 0) {
      session.status = 'NO_TRUCKS_AVAILABLE';
      return session;
    }

    // Caso B: Despacho normal al camión óptimo #1
    this.offerToCandidate(session, 0);
    return session;
  }

  /**
   * Envía la oferta exclusiva a un camión específico de la lista
   */
  offerToCandidate(session: DispatchSession, candidateIndex: number): void {
    if (candidateIndex >= session.candidates.length) {
      session.status = 'EXPIRED';
      return;
    }

    session.currentCandidateIndex = candidateIndex;
    session.status = 'OFFERED';
    session.currentAttemptId = `attempt-${session.orderId}-${candidateIndex + 1}`;

    // Limpiar timeout previo si existía
    if (session.activeTimeoutHandle) {
      clearTimeout(session.activeTimeoutHandle);
    }

    // Programar timeout de 45 segundos
    session.activeTimeoutHandle = setTimeout(() => {
      this.handleTimeout(session.orderId, session.currentAttemptId!);
    }, this.timeoutSeconds * 1000);
  }

  /**
   * Procesa la decisión explícita tomada por el ayudante en la PWA de cabina
   */
  handleDecision(
    orderId: string,
    truckId: string,
    decision: 'ACCEPTED' | 'REJECTED'
  ): { success: boolean; sessionStatus: DispatchSessionStatus; assignedTruck?: CandidateTruck } {
    const session = this.activeSessions.get(orderId);
    if (!session || session.status !== 'OFFERED') {
      return { success: false, sessionStatus: session?.status || 'EXPIRED' };
    }

    const currentCandidate = session.candidates[session.currentCandidateIndex];
    if (currentCandidate.id !== truckId) {
      return { success: false, sessionStatus: session.status };
    }

    // Limpiar temporizador activo
    if (session.activeTimeoutHandle) {
      clearTimeout(session.activeTimeoutHandle);
      session.activeTimeoutHandle = undefined;
    }

    if (decision === 'ACCEPTED') {
      session.status = 'ASSIGNED';
      session.assignedTruck = currentCandidate;
      return { success: true, sessionStatus: 'ASSIGNED', assignedTruck: currentCandidate };
    } else {
      // Rechazado explícitamente: salta inmediatamente al siguiente candidato
      this.cascadeToNext(session);
      return { success: true, sessionStatus: session.status };
    }
  }

  /**
   * Maneja el vencimiento de los 45 segundos sin respuesta
   */
  handleTimeout(orderId: string, attemptId: string): void {
    const session = this.activeSessions.get(orderId);
    if (!session || session.status !== 'OFFERED') return;
    if (session.currentAttemptId !== attemptId) return;

    this.cascadeToNext(session);
  }

  /**
   * Pasa la oferta al siguiente candidato en la lista ordenada
   */
  private cascadeToNext(session: DispatchSession): void {
    const nextIndex = session.currentCandidateIndex + 1;
    if (nextIndex < session.candidates.length) {
      this.offerToCandidate(session, nextIndex);
    } else {
      session.status = 'EXPIRED';
      if (session.activeTimeoutHandle) {
        clearTimeout(session.activeTimeoutHandle);
        session.activeTimeoutHandle = undefined;
      }
    }
  }

  /**
   * Obtiene la sesión activa de un pedido
   */
  getSession(orderId: string): DispatchSession | undefined {
    return this.activeSessions.get(orderId);
  }

  /**
   * Limpia sesiones terminadas
   */
  cleanupSession(orderId: string): void {
    const session = this.activeSessions.get(orderId);
    if (session?.activeTimeoutHandle) {
      clearTimeout(session.activeTimeoutHandle);
    }
    this.activeSessions.delete(orderId);
  }
}

export const dispatchOrchestrator = new DispatchOrchestratorService();
