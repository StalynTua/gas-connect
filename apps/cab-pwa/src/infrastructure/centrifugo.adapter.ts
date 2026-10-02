import { Centrifuge } from 'centrifuge';
import type { ActiveOffer } from '../domain/cab-state.types.js';

export class CabCentrifugoAdapter {
  private client: Centrifuge | null = null;
  private connected = false;

  private getEndpoint(): string {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname || 'localhost';
      if (host === 'localhost' || host === '127.0.0.1') {
        return `${protocol}//${host}:8001/connection/websocket`;
      }
      return `${protocol}//ws.gasconnect.ec/connection/websocket`;
    }
    return 'ws://localhost:8001/connection/websocket';
  }

  connect(
    truckId: string,
    onOffer: (offer: ActiveOffer) => void,
    onStatusChange?: (connected: boolean) => void,
    token = ''
  ): () => void {
    if (typeof window === 'undefined') return () => {};
    if (!truckId) return () => {};

    try {
      const endpoint = this.getEndpoint();
      this.client = new Centrifuge(endpoint, {
        token: token || '',
      });

      this.client.on('connected', () => {
        this.connected = true;
        onStatusChange?.(true);
      });

      this.client.on('disconnected', () => {
        this.connected = false;
        onStatusChange?.(false);
      });

      this.client.on('error', (ctx) => {
        console.warn('[CabCentrifugoAdapter] Client error:', ctx);
        this.connected = false;
        onStatusChange?.(false);
      });

      const channel = `truck:${truckId}`;
      const sub = this.client.newSubscription(channel);

      sub.on('publication', (ctx) => {
        if (ctx.data && ctx.data.type === 'ORDER_OFFERED' && ctx.data.offer) {
          onOffer(ctx.data.offer as ActiveOffer);
        }
      });

      sub.on('error', (err) => {
        console.warn(`[CabCentrifugoAdapter] Subscription error on ${channel}:`, err);
      });

      sub.subscribe();
      this.client.connect();

      return () => {
        sub.unsubscribe();
        this.client?.disconnect();
        this.connected = false;
        onStatusChange?.(false);
      };
    } catch (err) {
      console.warn('[CabCentrifugoAdapter] Connection error:', err);
      onStatusChange?.(false);
      return () => {};
    }
  }

  disconnect() {
    if (this.client) {
      this.client.disconnect();
      this.connected = false;
    }
  }

  isConnected() {
    return this.connected;
  }
}

export const cabCentrifugoAdapter = new CabCentrifugoAdapter();
