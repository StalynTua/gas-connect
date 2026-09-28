import { CandidateTruck } from './truck-finder.service.js';
import { Coordinates } from '../routing/osrm.service.js';
export type DispatchSessionStatus = 'SEARCHING' | 'OFFERED' | 'ASSIGNED' | 'EXPIRED' | 'REJECTED' | 'OFFERING_PARTIAL' | 'NO_TRUCKS_AVAILABLE';
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
export declare class DispatchOrchestratorService {
    private activeSessions;
    private timeoutSeconds;
    constructor(timeoutSeconds?: number);
    /**
     * Inicia el proceso de orquestación de despacho oportuno para un pedido
     */
    startDispatch(params: {
        orderId: string;
        quantityRequested: number;
        deliveryLocation: Coordinates;
        addressLandmark?: string;
        mockCandidates?: CandidateTruck[];
    }): Promise<DispatchSession>;
    /**
     * Envía la oferta exclusiva a un camión específico de la lista
     */
    offerToCandidate(session: DispatchSession, candidateIndex: number): void;
    /**
     * Procesa la decisión explícita tomada por el ayudante en la PWA de cabina
     */
    handleDecision(orderId: string, truckId: string, decision: 'ACCEPTED' | 'REJECTED'): {
        success: boolean;
        sessionStatus: DispatchSessionStatus;
        assignedTruck?: CandidateTruck;
    };
    /**
     * Maneja el vencimiento de los 45 segundos sin respuesta
     */
    handleTimeout(orderId: string, attemptId: string): void;
    /**
     * Pasa la oferta al siguiente candidato en la lista ordenada
     */
    private cascadeToNext;
    /**
     * Obtiene la sesión activa de un pedido
     */
    getSession(orderId: string): DispatchSession | undefined;
    /**
     * Limpia sesiones terminadas
     */
    cleanupSession(orderId: string): void;
}
export declare const dispatchOrchestrator: DispatchOrchestratorService;
