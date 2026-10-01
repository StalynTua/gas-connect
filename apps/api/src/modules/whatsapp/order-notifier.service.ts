import { OrderNotifierService as ApplicationOrderNotifierService, TruckAssignmentInfo } from './application/order-notifier.service.js';
import { evolutionHttpClient } from './infrastructure/evolution-http.client.js';

export type { TruckAssignmentInfo };

export class OrderNotifierService extends ApplicationOrderNotifierService {
  constructor() {
    super(evolutionHttpClient);
  }
}

export const orderNotifierService = new OrderNotifierService();
