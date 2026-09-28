import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { fleetService } from './fleet.service.js';

export async function fleetRoutes(server: FastifyInstance) {
  /**
   * Obtener estado en tiempo real de todos los camiones
   */
  server.get('/api/v1/fleet/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    const trucks = await fleetService.getFleetStatus();
    return reply.status(200).send({
      success: true,
      count: trucks.length,
      trucks,
    });
  });

  /**
   * Obtener resumen de métricas del día (pedidos, ventas, alertas de stock)
   */
  server.get('/api/v1/fleet/metrics', async (_request: FastifyRequest, reply: FastifyReply) => {
    const metrics = await fleetService.getDashboardMetrics();
    return reply.status(200).send({
      success: true,
      metrics,
    });
  });

  /**
   * Obtener feed de eventos de actividad en tiempo real desde la BD
   */
  server.get('/api/v1/fleet/events', async (_request: FastifyRequest, reply: FastifyReply) => {
    const events = await fleetService.getActivityEvents();
    return reply.status(200).send({
      success: true,
      count: events.length,
      events,
    });
  });

  /**
   * Actualizar posición de un camión específico
   */
  server.post(
    '/api/v1/fleet/trucks/:id/telemetry',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { latitude: number; longitude: number };
      }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const { latitude, longitude } = request.body;

      if (!latitude || !longitude) {
        return reply.status(400).send({
          success: false,
          error: 'latitude and longitude are required',
        });
      }

      await fleetService.updateTruckPosition(id, latitude, longitude);
      return reply.status(200).send({
        success: true,
        message: 'Telemetry updated',
      });
    }
  );
}
