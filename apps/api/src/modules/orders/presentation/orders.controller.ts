import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  CompleteOrderRequestSchema,
  CompleteOrderResponse,
  validateContract,
} from '@gasconnect/contracts';
import { CompleteOrderUseCase } from '../application/complete-order.use-case.js';

export interface OrdersRoutesDependencies {
  completeOrderUseCase: CompleteOrderUseCase;
}

export function registerOrdersRoutes(
  server: FastifyInstance,
  deps: OrdersRoutesDependencies
) {
  server.post(
    '/api/v1/orders/complete',
    async (request: FastifyRequest, reply: FastifyReply): Promise<CompleteOrderResponse> => {
      const validation = validateContract(CompleteOrderRequestSchema, request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: 'Faltan parámetros requeridos: orderId, truckId, quantityDelivered',
          fieldErrors: validation.fieldErrors,
        });
      }

      const result = await deps.completeOrderUseCase.execute(validation.data);
      return reply.status(200).send(result);
    }
  );
}
