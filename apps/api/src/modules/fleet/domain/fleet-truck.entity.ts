export type TruckStatus = 'IDLE' | 'IN_TRANSIT' | 'OFFLINE';

export interface FleetTruckSummary {
  id: string;
  licensePlate: string;
  driverName: string;
  helperName: string;
  helperPhone: string;
  status: TruckStatus;
  currentStockFull: number;
  currentStockEmpty: number;
  lastLatitude: number;
  lastLongitude: number;
  zone: string;
  updatedAt: Date;
}
