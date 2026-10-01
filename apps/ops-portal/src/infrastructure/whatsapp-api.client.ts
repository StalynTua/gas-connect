import type { IWhatsAppApiClient } from '../domain/api-contracts.js';
import type { WhatsAppStatus, QrData } from '../domain/fleet-dashboard.types.js';

async function safeFetch(path: string, init?: RequestInit): Promise<Response> {
  if (typeof window === 'undefined') {
    return { ok: false, json: async () => ({}) } as Response;
  }
  return fetch(path, init);
}

export class WhatsAppApiClient implements IWhatsAppApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  async getStatus(): Promise<WhatsAppStatus | null> {
    try {
      const res = await safeFetch(`${this.baseUrl}/api/v1/whatsapp/status`);
      if (res.ok) {
        return (await res.json()) as WhatsAppStatus;
      }
      return null;
    } catch (err) {
      console.warn('[WhatsAppApiClient] getStatus error:', err);
      return null;
    }
  }

  async getQrCode(phone?: string, force?: boolean): Promise<{ status: number; data?: QrData; message?: string }> {
    try {
      const params = new URLSearchParams();
      if (phone) params.set('number', phone);
      if (force) params.set('force', 'true');
      const query = params.toString() ? `?${params.toString()}` : '';

      const res = await safeFetch(`${this.baseUrl}/api/v1/whatsapp/qr${query}`);
      const data = await res.json().catch(() => ({}));
      return {
        status: res.status,
        data: res.status === 200 ? (data as QrData) : undefined,
        message: data.message,
      };
    } catch (err) {
      console.warn('[WhatsAppApiClient] getQrCode error:', err);
      return { status: 500, message: String(err) };
    }
  }

  async triggerSetup(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await safeFetch(`${this.baseUrl}/api/v1/whatsapp/setup`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      return { success: res.ok, message: data.message || 'Configuración completada' };
    } catch (err) {
      console.warn('[WhatsAppApiClient] triggerSetup error:', err);
      return { success: false, message: String(err) };
    }
  }

  async logout(): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await safeFetch(`${this.baseUrl}/api/v1/whatsapp/logout`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      return { success: res.ok, message: data.message };
    } catch (err) {
      console.warn('[WhatsAppApiClient] logout error:', err);
      return { success: false, message: String(err) };
    }
  }
}

export const whatsappApiClient = new WhatsAppApiClient();
