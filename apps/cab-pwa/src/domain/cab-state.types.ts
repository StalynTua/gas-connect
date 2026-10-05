export type CabState = 'IDLE' | 'OFFERED' | 'IN_TRANSIT' | 'RESTOCKING' | 'OFF_DUTY';

export interface ActiveOffer {
  dispatchAttemptId: string;
  orderId: string;
  timeoutSeconds: number;
  cylinderType: 'DOMESTIC_15KG' | 'INDUSTRIAL_45KG';
  quantity: number;
  totalPrice: number;
  hasEmptyCylinders: boolean;
  customerSector: string;
  landmark: string;
  estimatedDetourMeters: number;
  estimatedEtaMinutes: number;
  destination: {
    latitude: number;
    longitude: number;
  };
}

export interface CabStoreState {
  truckId: string;
  licensePlate: string;
  helperName: string;
  stockFull: number;
  stockEmpty: number;
  state: CabState;
  activeOffer: ActiveOffer | null;
  activeOrder: ActiveOffer | null;
  isConnected: boolean;
  isDBSynced: boolean;

  setTruckInfo: (info: { truckId: string; licensePlate: string; helperName: string; stock: number }) => void;
  setConnectionStatus: (connected: boolean) => void;
  receiveOffer: (offer: ActiveOffer) => void;
  acceptOffer: () => Promise<void>;
  rejectOffer: () => Promise<void>;
  completeDelivery: () => Promise<void>;
  decrementStock: (qty: number) => void;
  syncWithBackend: () => Promise<void>;
  sendTelemetry: (lat?: number, lng?: number) => Promise<void>;
  setTruckStatus: (status: 'IDLE' | 'IN_TRANSIT') => Promise<void>;
  setDutyStatus: (status: 'IDLE' | 'OFF_DUTY') => Promise<void>;
}
