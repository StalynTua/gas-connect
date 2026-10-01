export interface InstanceStateResponse {
  instanceName: string;
  state: 'open' | 'connecting' | 'close' | 'disconnected' | 'unknown';
  connected: boolean;
}

export interface QrCodeResponse {
  pairingCode?: string;
  code?: string;
  base64?: string;
  count?: number;
}

export interface IEvolutionInstancePort {
  getConnectionState(): Promise<InstanceStateResponse>;
  getBaseUrl(): string;
  getInstanceName(): string;
  createInstance(): Promise<boolean>;
  connectInstance(phoneNumber?: string): Promise<void>;
  getQrCode(phoneNumber?: string): Promise<QrCodeResponse | null>;
  getCachedQr(): QrCodeResponse | null;
  cacheQr(qr: QrCodeResponse): void;
  clearQrCache(): void;
  setWebhook(webhookUrl?: string): Promise<boolean>;
  logoutInstance(): Promise<boolean>;
  restartInstance(): Promise<boolean>;
  ensureConfigured(webhookUrl?: string): Promise<InstanceStateResponse>;
}
