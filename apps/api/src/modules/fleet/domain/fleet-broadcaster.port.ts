export interface TruckUpdatePayload {
  truckId: string;
  status?: string;
  latitude?: number;
  longitude?: number;
  currentStockFull?: number;
}

export interface IFleetBroadcaster {
  publishTruckUpdate(payload: TruckUpdatePayload): Promise<void>;
  publishDispatchOffer?(truckId: string, offer: unknown): Promise<void>;
  publishEvent?(event: unknown): Promise<void>;
  publishMetrics?(metrics: unknown): Promise<void>;
}
