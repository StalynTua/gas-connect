import type { Coordinates } from '../../../shared/coordinates.types.js';
import type { CandidateTruck } from './candidate-truck.entity.js';

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
