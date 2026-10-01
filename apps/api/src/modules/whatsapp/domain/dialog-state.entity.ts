import type { Coordinates } from '../../../shared/coordinates.types.js';

export type DialogStep =
  | 'IDLE'
  | 'AWAITING_LOCATION'
  | 'AWAITING_LANDMARK'
  | 'AWAITING_CYLINDER_TYPE'
  | 'AWAITING_QUANTITY'
  | 'AWAITING_EMPTY_VERIFICATION'
  | 'DISPATCH_IN_PROGRESS'
  | 'AWAITING_EMERGENCY_SPLIT_DECISION';

export interface UserSession {
  phoneNumber: string;
  currentStep: DialogStep;
  deliveryLocation?: Coordinates;
  landmark?: string;
  cylinderType?: 'DOMESTIC_15KG' | 'INDUSTRIAL_45KG';
  quantityRequested?: number;
  hasEmptyCylinders?: boolean;
  orderId?: string;
  activeTruckId?: string;
  createdAt: Date;
  updatedAt: Date;
}
