import type {
  ICabApiClient,
  DispatchDecisionParams,
  CompleteOrderParams,
  TelemetryParams,
} from '../domain/api-contracts.js';
import type { ActiveOffer } from '../domain/cab-state.types.js';
import type { LoginCredentials, LoginResponse } from '../domain/auth.types.js';

async function safeFetch(path: string, init?: RequestInit): Promise<Response> {
  if (typeof window === 'undefined') {
    return { ok: false, json: async () => ({}) } as Response;
  }
  return fetch(path, init);
}

export class CabApiClient implements ICabApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const res = await safeFetch(`${this.baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = (await res.json().catch(() => ({}))) as any;
      if (res.ok && data.success) {
        return {
          success: true,
          token: data.token,
          truckId: data.truckId,
          licensePlate: data.licensePlate,
          helperName: data.helperName,
        };
      }
      return {
        success: false,
        error: data.error || (res.status === 401 ? 'Credenciales inválidas' : `Error (${res.status})`),
        attemptsRemaining: typeof data.attemptsRemaining === 'number' ? data.attemptsRemaining : undefined,
        lockedUntil: data.lockedUntil,
        isLocked: Boolean(data.isLocked || res.status === 423 || res.status === 429),
        statusCode: res.status,
      };
    } catch (err) {
      console.warn('[CabApiClient] login network error:', err);
      return {
        success: false,
        error: 'Sin conexión con el servidor. Verifique su red.',
      };
    }
  }

  async logout(token: string) {
    try {
      const res = await safeFetch(`${this.baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        return (await res.json()) as { success: boolean; message?: string };
      }
      return { success: false };
    } catch (err) {
      console.warn('[CabApiClient] logout error:', err);
      return { success: false, message: String(err) };
    }
  }

  async postDispatchDecision(params: DispatchDecisionParams) {
    try {
      const res = await safeFetch(`${this.baseUrl}/api/v1/dispatch/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return (await res.json()) as { success: boolean; status?: string; message?: string };
      }
      return { success: false, message: `Status ${res.status}` };
    } catch (err) {
      console.warn('[CabApiClient] postDispatchDecision error:', err);
      return { success: false, message: String(err) };
    }
  }

  async completeOrder(params: CompleteOrderParams) {
    try {
      const res = await safeFetch(`${this.baseUrl}/api/v1/orders/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return (await res.json()) as { success: boolean; orderId?: string; status?: string };
      }
      return { success: false };
    } catch (err) {
      console.warn('[CabApiClient] completeOrder error:', err);
      return { success: false };
    }
  }

  async sendTelemetry(params: TelemetryParams) {
    try {
      const res = await safeFetch(`${this.baseUrl}/api/v1/trucks/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return { success: true };
      }
      return { success: false, message: `Status ${res.status}` };
    } catch (err) {
      console.warn('[CabApiClient] sendTelemetry error:', err);
      return { success: false, message: String(err) };
    }
  }

  async syncWithBackend(truckId: string) {
    try {
      const res = await safeFetch(`${this.baseUrl}/api/v1/fleet/status`);
      if (res.ok) {
        const json = await res.json();
        const trucks = Array.isArray(json) ? json : (json as any).trucks || [];
        const myTruck = trucks.find((t: any) => t.id === truckId);
        if (myTruck) {
          return {
            success: true,
            truck: {
              id: myTruck.id,
              plateNumber: myTruck.licensePlate,
              helperName: myTruck.helperName,
              stock: myTruck.currentStockFull,
            },
          };
        }
      }
      return { success: false };
    } catch (err) {
      console.warn('[CabApiClient] syncWithBackend error:', err);
      return { success: false };
    }
  }

  async simulateOrder(): Promise<ActiveOffer | null> {
    try {
      const res = await safeFetch(`${this.baseUrl}/api/v1/whatsapp/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'SIMULATE_ORDER',
          latitude: 0.3475,
          longitude: -78.1285,
          quantity: 2,
          landmark: 'Casa esquinera amarilla de 2 pisos, reja negra con flores',
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as any;
        if (json && json.order) {
          return json.order as ActiveOffer;
        }
      }
      return null;
    } catch (err) {
      console.warn('[CabApiClient] simulateOrder error:', err);
      return null;
    }
  }

  async updateTruckStatus(truckId: string, status: 'IDLE' | 'IN_TRANSIT' | 'OFF_DUTY') {
    try {
      const res = await safeFetch(`${this.baseUrl}/api/v1/fleet/trucks/${truckId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        return (await res.json()) as { success: boolean; message?: string };
      }
      return { success: false, message: `Status ${res.status}` };
    } catch (err) {
      console.warn('[CabApiClient] updateTruckStatus error:', err);
      return { success: false, message: String(err) };
    }
  }
}

export const cabApiClient = new CabApiClient();
