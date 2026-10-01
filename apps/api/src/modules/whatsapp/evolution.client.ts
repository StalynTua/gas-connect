import { EvolutionHttpClient } from './infrastructure/evolution-http.client.js';
import type { InstanceStateResponse, QrCodeResponse } from './domain/evolution-instance.port.js';

export type { InstanceStateResponse, QrCodeResponse };

export interface SendMessageOptions {
  to: string;
  text: string;
  buttons?: Array<{ id: string; label: string }>;
}

export class EvolutionApiClient extends EvolutionHttpClient {}

export const evolutionClient = new EvolutionApiClient();
