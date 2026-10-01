import type { IFleetBroadcaster, TruckUpdatePayload } from '../domain/fleet-broadcaster.port.js';

export class CentrifugoFleetBroadcaster implements IFleetBroadcaster {
  private readonly publishUrl: string;

  constructor(
    apiUrl: string = process.env.CENTRIFUGO_API_URL || 'http://localhost:8001/api',
    private readonly apiKey: string = process.env.CENTRIFUGO_API_KEY || 'gasconnect_centrifugo_secret_api_key_2026',
    private readonly channel: string = 'distributor:default:fleet'
  ) {
    const base = apiUrl.replace(/\/+$/, '');
    this.publishUrl = base.endsWith('/api') ? `${base}/publish` : `${base}/api/publish`;
  }

  async publishTruckUpdate(payload: TruckUpdatePayload): Promise<void> {
    try {
      await fetch(this.publishUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          channel: this.channel,
          data: {
            type: 'TRUCK_POSITION_UPDATED',
            ...payload,
          },
        }),
      });
    } catch (_err) {
      // Safe degradation: non-blocking real-time publishing
    }
  }

  async publishDispatchOffer(truckId: string, offer: unknown): Promise<void> {
    try {
      await fetch(this.publishUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          channel: `truck:${truckId}`,
          data: {
            type: 'ORDER_OFFERED',
            offer,
          },
        }),
      });
    } catch (_err) {
      // Safe degradation
    }
  }

  async publishEvent(event: unknown): Promise<void> {
    try {
      await fetch(this.publishUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          channel: this.channel,
          data: {
            type: 'EVENT_CREATED',
            event,
          },
        }),
      });
    } catch (_err) {
      // Safe degradation
    }
  }

  async publishMetrics(metrics: unknown): Promise<void> {
    try {
      await fetch(this.publishUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          channel: this.channel,
          data: {
            type: 'METRICS_UPDATED',
            metrics,
          },
        }),
      });
    } catch (_err) {
      // Safe degradation
    }
  }
}

export const centrifugoFleetBroadcaster = new CentrifugoFleetBroadcaster();
