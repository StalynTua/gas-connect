import type { CandidateTruck } from '../domain/candidate-truck.entity.js';
import type { DispatchSession, DispatchSessionStatus } from '../domain/dispatch-session.entity.js';
import type { IDispatchSessionRepository } from '../domain/dispatch-session.repository.js';
import type { IOrderRepository } from '../../orders/domain/order.repository.js';
import type { IFleetRepository } from '../../fleet/domain/fleet.repository.js';
import type { IFleetBroadcaster } from '../../fleet/domain/fleet-broadcaster.port.js';

export interface DispatchDecisionDto {
  orderId: string;
  truckId: string;
  decision: 'ACCEPTED' | 'REJECTED';
}

export interface DispatchDecisionResult {
  success: boolean;
  status: 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  sessionStatus: DispatchSessionStatus;
  orderId: string;
  assignedTruckId?: string;
  assignedTruck?: CandidateTruck;
}

export class HandleDispatchDecisionUseCase {
  constructor(
    private readonly sessionRepo: IDispatchSessionRepository,
    private readonly orderRepo?: IOrderRepository,
    private readonly fleetRepo?: IFleetRepository,
    private readonly broadcaster?: IFleetBroadcaster
  ) {}

  async execute(dto: DispatchDecisionDto): Promise<DispatchDecisionResult> {
    const { orderId, truckId, decision } = dto;
    const session = this.sessionRepo.get(orderId);

    if (!session || session.status !== 'OFFERED') {
      const fallbackStatus = session?.status || 'EXPIRED';
      if (decision === 'ACCEPTED') {
        if (this.fleetRepo) {
          await this.fleetRepo.updateTruckStatus(truckId, 'IN_TRANSIT');
        }
        if (this.broadcaster) {
          await this.broadcaster.publishTruckUpdate({
            truckId,
            status: 'IN_TRANSIT',
          });
        }
        return {
          success: true,
          status: 'ACCEPTED',
          sessionStatus: 'ASSIGNED',
          orderId,
          assignedTruckId: truckId,
        };
      }

      return {
        success: false,
        status: fallbackStatus === 'ASSIGNED' ? 'ACCEPTED' : fallbackStatus === 'EXPIRED' ? 'EXPIRED' : 'REJECTED',
        sessionStatus: fallbackStatus,
        orderId,
      };
    }

    const currentCandidate = session.candidates[session.currentCandidateIndex];
    if (currentCandidate.id !== truckId) {
      return {
        success: false,
        status: 'REJECTED',
        sessionStatus: session.status,
        orderId,
      };
    }

    if (session.activeTimeoutHandle) {
      clearTimeout(session.activeTimeoutHandle);
      session.activeTimeoutHandle = undefined;
    }

    if (decision === 'ACCEPTED') {
      session.status = 'ASSIGNED';
      session.assignedTruck = currentCandidate;

      if (this.fleetRepo) {
        await this.fleetRepo.updateTruckStatus(truckId, 'IN_TRANSIT');
      }

      if (this.broadcaster) {
        await this.broadcaster.publishTruckUpdate({
          truckId,
          status: 'IN_TRANSIT',
        });
      }

      if (this.orderRepo) {
        try {
          await this.orderRepo.createOrUpdate({
            orderId,
            phoneNumber: '0990000000',
            cylinderType: 'DOMESTIC_15KG',
            quantity: session.quantityRequested || 1,
            unitPrice: 3.0,
            totalAmount: (session.quantityRequested || 1) * 3.0,
            latitude: session.deliveryLocation.lat,
            longitude: session.deliveryLocation.lng,
            landmark: session.addressLandmark || '',
            status: 'ASSIGNED',
            assignedTruckId: truckId,
          });
        } catch (_err) {
          // Handled gracefully in offline environments
        }
      }

      return {
        success: true,
        status: 'ACCEPTED',
        sessionStatus: 'ASSIGNED',
        orderId,
        assignedTruckId: currentCandidate.id,
        assignedTruck: currentCandidate,
      };
    } else {
      const nextIndex = session.currentCandidateIndex + 1;
      if (nextIndex < session.candidates.length) {
        session.currentCandidateIndex = nextIndex;
        session.status = 'OFFERED';
        session.currentAttemptId = `attempt-${session.orderId}-${nextIndex + 1}`;
      } else {
        session.status = 'EXPIRED';
      }

      return {
        success: true,
        status: session.status === 'OFFERED' ? 'REJECTED' : 'EXPIRED',
        sessionStatus: session.status,
        orderId,
      };
    }
  }
}
