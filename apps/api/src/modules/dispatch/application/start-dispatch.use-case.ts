import type { Coordinates } from '../../../shared/coordinates.types.js';
import type { CandidateTruck } from '../domain/candidate-truck.entity.js';
import type { DispatchSession } from '../domain/dispatch-session.entity.js';
import type { ITruckCandidateRepository } from '../domain/truck-candidate.repository.js';
import type { IDispatchSessionRepository } from '../domain/dispatch-session.repository.js';
import type { IFleetBroadcaster } from '../../fleet/domain/fleet-broadcaster.port.js';

export interface StartDispatchDto {
  orderId: string;
  quantityRequested: number;
  deliveryLocation: Coordinates;
  addressLandmark?: string;
  mockCandidates?: CandidateTruck[];
}

export class StartDispatchUseCase {
  constructor(
    private readonly candidateRepo: ITruckCandidateRepository,
    private readonly sessionRepo: IDispatchSessionRepository,
    private readonly timeoutSeconds: number = 45,
    private readonly broadcaster?: IFleetBroadcaster
  ) {}

  async execute(dto: StartDispatchDto): Promise<DispatchSession> {
    const { orderId, quantityRequested, deliveryLocation, addressLandmark, mockCandidates } = dto;

    const candidates =
      mockCandidates ||
      (await this.candidateRepo.findCandidates(deliveryLocation, {
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

    this.sessionRepo.save(session);

    if (candidates.length === 0) {
      session.status = 'NO_TRUCKS_AVAILABLE';
      return session;
    }

    this.offerToCandidate(session, 0);
    return session;
  }

  offerToCandidate(session: DispatchSession, candidateIndex: number): void {
    if (candidateIndex >= session.candidates.length) {
      session.status = 'EXPIRED';
      return;
    }

    session.currentCandidateIndex = candidateIndex;
    session.status = 'OFFERED';
    session.currentAttemptId = `attempt-${session.orderId}-${candidateIndex + 1}`;

    const candidate = session.candidates[candidateIndex];
    if (this.broadcaster && candidate) {
      this.broadcaster.publishDispatchOffer?.(candidate.id, {
        dispatchAttemptId: session.currentAttemptId,
        orderId: session.orderId,
        timeoutSeconds: this.timeoutSeconds,
        cylinderType: 'DOMESTIC_15KG',
        quantity: session.quantityRequested,
        totalPrice: session.quantityRequested * 3.0,
        hasEmptyCylinders: true,
        customerSector: 'Los Ceibos (Calle Los Sauces)',
        landmark: session.addressLandmark || 'Dirección de entrega',
        estimatedDetourMeters: candidate.roadDistanceMeters ?? 280,
        estimatedEtaMinutes: candidate.etaMinutes ?? 2.5,
        destination: {
          latitude: session.deliveryLocation.lat,
          longitude: session.deliveryLocation.lng,
        },
      });

      this.broadcaster.publishEvent?.({
        id: `evt-${Date.now()}`,
        timestamp: 'Ahora mismo',
        type: 'ORDER_OFFERED',
        title: `Despacho ofrecido a ${candidate.licensePlate}`,
        description: `Orden #${session.orderId} enviada a cabina de ${candidate.helperName || candidate.driverName}.`,
        zone: 'Ibarra',
      });
    }

    if (session.activeTimeoutHandle) {
      clearTimeout(session.activeTimeoutHandle);
    }

    session.activeTimeoutHandle = setTimeout(() => {
      this.handleTimeout(session.orderId, session.currentAttemptId!);
    }, this.timeoutSeconds * 1000);
  }

  handleTimeout(orderId: string, attemptId: string): void {
    const session = this.sessionRepo.get(orderId);
    if (!session || session.status !== 'OFFERED') return;
    if (session.currentAttemptId !== attemptId) return;

    this.cascadeToNext(session);
  }

  cascadeToNext(session: DispatchSession): void {
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
}
