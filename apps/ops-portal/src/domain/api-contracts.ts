import type { TruckPin, ActivityEvent, FleetMetrics, WhatsAppStatus, QrData } from './fleet-dashboard.types.js';

export interface IFleetApiClient {
  getFleetStatus(): Promise<{ success: boolean; trucks: TruckPin[] }>;
  getFleetMetrics(): Promise<{ success: boolean; metrics: FleetMetrics }>;
  getFleetEvents(): Promise<{ success: boolean; events: ActivityEvent[] }>;
}

export interface IWhatsAppApiClient {
  getStatus(): Promise<WhatsAppStatus | null>;
  getQrCode(phone?: string, force?: boolean): Promise<{ status: number; data?: QrData; message?: string }>;
  triggerSetup(): Promise<{ success: boolean; message: string }>;
  logout(): Promise<{ success: boolean; message?: string }>;
}

export interface ICentrifugoAdapter {
  connect(
    onMessage: (channel: string, data: any) => void,
    onStatusChange?: (connected: boolean) => void
  ): () => void;
  disconnect(): void;
  isConnected(): boolean;
}
