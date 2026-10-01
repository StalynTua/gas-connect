import type { ActiveOffer } from './cab-state.types.js';

export interface DispatchDecisionParams {
  orderId: string;
  truckId: string;
  decision: 'ACCEPTED' | 'REJECTED';
  reason?: string;
}

export interface CompleteOrderParams {
  orderId: string;
  truckId: string;
  quantityDelivered: number;
  paymentMethod?: 'CASH' | 'TRANSFER';
  amountCollected?: number;
}

export interface TelemetryParams {
  truckId: string;
  latitude: number;
  longitude: number;
  currentStock?: number;
  status?: 'IDLE' | 'IN_TRANSIT' | 'OFF_DUTY';
}

export interface ICabApiClient {
  postDispatchDecision(params: DispatchDecisionParams): Promise<{ success: boolean; status?: string; message?: string }>;
  completeOrder(params: CompleteOrderParams): Promise<{ success: boolean; orderId?: string; status?: string }>;
  sendTelemetry(params: TelemetryParams): Promise<{ success: boolean; message?: string }>;
  syncWithBackend(truckId: string): Promise<{ success: boolean; truck?: { id: string; plateNumber: string; helperName: string; stock: number } }>;
  simulateOrder(): Promise<ActiveOffer | null>;
  updateTruckStatus(truckId: string, status: 'IDLE' | 'IN_TRANSIT' | 'OFF_DUTY'): Promise<{ success: boolean; message?: string }>;
}
