import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  DispatchDecisionRequestSchema,
  DispatchDecisionResponse,
  validateContract,
} from '@gasconnect/contracts';
import { HandleDispatchDecisionUseCase } from '../application/handle-dispatch-decision.use-case.js';

export interface DispatchRoutesDependencies {
  handleDispatchDecisionUseCase: HandleDispatchDecisionUseCase;
}

export function registerDispatchRoutes(
  server: FastifyInstance,
  deps: DispatchRoutesDependencies
) {
  server.post(
    '/api/v1/dispatch/decision',
    async (request: FastifyRequest, reply: FastifyReply): Promise<DispatchDecisionResponse> => {
      const validation = validateContract(DispatchDecisionRequestSchema, request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: 'Faltan parámetros requeridos: orderId, truckId, decision',
          fieldErrors: validation.fieldErrors,
        });
      }

      const result = await deps.handleDispatchDecisionUseCase.execute(validation.data);
      return reply.status(200).send(result);
    }
  );
}
