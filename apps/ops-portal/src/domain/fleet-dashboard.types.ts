export interface TruckPin {
  id: string;
  licensePlate: string;
  driverName: string;
  helperName: string;
  helperPhone?: string;
  status: 'IDLE' | 'IN_TRANSIT' | 'RESTOCKING' | 'OFFLINE';
  currentStockFull: number;
  currentStockEmpty: number;
  lastLatitude: number;
  lastLongitude: number;
  zone: string;
  etaMinutes?: number;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  type: 'ORDER_RECEIVED' | 'OFFER_ACCEPTED' | 'ORDER_DELIVERED' | 'STOCK_LOW' | 'TELEMETRY';
  title: string;
  description: string;
  zone: string;
}

export interface FleetMetrics {
  totalTrucksActive: number;
  totalStockAvailable: number;
  completedOrdersToday: number;
  totalCollectedToday: number;
  lowStockAlertsCount: number;
}

export interface WhatsAppStatus {
  instanceName: string;
  baseUrl: string;
  state: 'open' | 'connecting' | 'close' | 'disconnected' | string;
  connected: boolean;
}

export interface QrData {
  pairingCode?: string;
  code?: string;
  base64?: string;
  count?: number;
}
