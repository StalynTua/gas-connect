import { Centrifuge } from 'centrifuge';
import type { ICentrifugoAdapter } from '../domain/api-contracts.js';

export class CentrifugoAdapter implements ICentrifugoAdapter {
  private client: Centrifuge | null = null;
  private connected = false;

  private getEndpoint(): string {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname || 'localhost';
      // En desarrollo o producción local: ws://host:8001/connection/websocket
      // En producción con Coolify: wss://ws.gasconnect.ec/connection/websocket
      if (host === 'localhost' || host === '127.0.0.1') {
        return `${protocol}//${host}:8001/connection/websocket`;
      }
      return `${protocol}//ws.gasconnect.ec/connection/websocket`;
    }
    return 'ws://localhost:8001/connection/websocket';
  }

  connect(
    onMessage: (channel: string, data: any) => void,
    onStatusChange?: (connected: boolean) => void
  ): () => void {
    if (typeof window === 'undefined') return () => {};

    try {
      const endpoint = this.getEndpoint();
      this.client = new Centrifuge(endpoint, {
        token: '', // Canal público / anónimo o configurado según centrifugo.json
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
        console.warn('[CentrifugoAdapter] Client error:', ctx);
        this.connected = false;
        onStatusChange?.(false);
      });

      const sub = this.client.newSubscription('distributor:default:fleet');

      sub.on('publication', (ctx) => {
        onMessage('distributor:default:fleet', ctx.data);
      });

      sub.on('error', (err) => {
        console.warn('[CentrifugoAdapter] Subscription error:', err);
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
      console.warn('[CentrifugoAdapter] Connection error:', err);
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

export const centrifugoAdapter = new CentrifugoAdapter();
