import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  FlexibleTelemetryPingRequestSchema,
  TelemetryResponse,
  FleetStatusResponse,
  FleetMetricsResponse,
  FleetEventsResponse,
  normalizeFleetTruckSummary,
  validateContract,
} from '@gasconnect/contracts';
import { GetFleetStatusUseCase } from '../application/get-fleet-status.use-case.js';
import { GetFleetMetricsUseCase } from '../application/get-fleet-metrics.use-case.js';
import { GetActivityEventsUseCase } from '../application/get-activity-events.use-case.js';
import { UpdateTruckPositionUseCase } from '../application/update-truck-position.use-case.js';
import { UpdateTruckStatusUseCase } from '../application/update-truck-status.use-case.js';

export interface FleetRouteDeps {
  getFleetStatusUseCase: GetFleetStatusUseCase;
  getFleetMetricsUseCase: GetFleetMetricsUseCase;
  getActivityEventsUseCase: GetActivityEventsUseCase;
  updateTruckPositionUseCase: UpdateTruckPositionUseCase;
  updateTruckStatusUseCase: UpdateTruckStatusUseCase;
}

export function registerFleetRoutes(server: FastifyInstance, deps: FleetRouteDeps) {
  // GET /api/v1/fleet/status
  server.get('/api/v1/fleet/status', async (_req: FastifyRequest, reply: FastifyReply): Promise<FleetStatusResponse> => {
    const trucks = await deps.getFleetStatusUseCase.execute();
    return reply.status(200).send({
      success: true,
      count: trucks.length,
      trucks: trucks.map(normalizeFleetTruckSummary),
    });
  });

  // GET /api/v1/fleet/metrics
  server.get('/api/v1/fleet/metrics', async (_req: FastifyRequest, reply: FastifyReply): Promise<FleetMetricsResponse> => {
    const metrics = await deps.getFleetMetricsUseCase.execute();
    return reply.status(200).send({ success: true, metrics });
  });

  // GET /api/v1/fleet/events
  server.get('/api/v1/fleet/events', async (_req: FastifyRequest, reply: FastifyReply): Promise<FleetEventsResponse> => {
    const events = await deps.getActivityEventsUseCase.execute();
    return reply.status(200).send({ success: true, count: events.length, events });
  });

  // POST /api/v1/fleet/trucks/:id/telemetry
  server.post(
    '/api/v1/fleet/trucks/:id/telemetry',
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: { latitude: number; longitude: number } }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const { latitude, longitude } = request.body || {};
      if (!latitude || !longitude) {
        return reply.status(400).send({ success: false, error: 'latitude and longitude are required' });
      }
      await deps.updateTruckPositionUseCase.execute({ truckId: id, latitude, longitude });
      return reply.status(200).send({ success: true, message: 'Telemetry updated' });
    }
  );

  // POST & PATCH /api/v1/fleet/trucks/:id/status (Actualizar estado: IDLE, IN_TRANSIT, OFFLINE)
  const handleStatusUpdate = async (
    request: FastifyRequest<{ Params: { id: string }; Body: { status: any } }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const { status } = request.body || {};
    if (!status) {
      return reply.status(400).send({ success: false, error: 'status is required (IDLE, IN_TRANSIT, OFFLINE)' });
    }
    await deps.updateTruckStatusUseCase.execute({ truckId: id, status });
    return reply.status(200).send({ success: true, message: `Truck status updated to ${status}` });
  };

  server.post('/api/v1/fleet/trucks/:id/status', handleStatusUpdate);
  server.patch('/api/v1/fleet/trucks/:id/status', handleStatusUpdate);

  // POST /api/v1/trucks/telemetry (Cabin PWA ping)
  server.post('/api/v1/trucks/telemetry', async (request: FastifyRequest, reply: FastifyReply): Promise<TelemetryResponse> => {
    const validation = validateContract(FlexibleTelemetryPingRequestSchema, request.body);
    if (!validation.success) {
      return reply.status(400).send({ error: 'Invalid telemetry payload', fieldErrors: validation.fieldErrors });
    }
    const data = validation.data as { truckId: string; latitude: number; longitude: number; currentStock: number; status?: any };
    const { truckId, latitude, longitude, currentStock, status } = data;
    await deps.updateTruckPositionUseCase.execute({ truckId, latitude, longitude, currentStock, status });
    return reply.status(200).send({ status: 'ok', truckId, receivedAt: new Date().toISOString() });
  });
}
